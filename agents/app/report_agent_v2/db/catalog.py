"""catalog schema access: tenant registry and user↔tenant membership (read-only)."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass

from psycopg.rows import dict_row

from app.report_agent_v2.db.pools import PoolRegistry


@dataclass(frozen=True)
class TenantMembership:
    tenant_id: uuid.UUID
    role: str
    user_id: uuid.UUID | None


class _TtlCache:
    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = ttl_seconds
        self._items: dict[object, tuple[float, object]] = {}

    def get(self, key: object) -> object | None:
        hit = self._items.get(key)
        if hit is None:
            return None
        expires, value = hit
        if expires < time.monotonic():
            self._items.pop(key, None)
            return None
        return value

    def set(self, key: object, value: object) -> None:
        self._items[key] = (time.monotonic() + self._ttl, value)


class CatalogStore:
    def __init__(self, pools: PoolRegistry, cache_ttl_seconds: int) -> None:
        self._pools = pools
        self._conn_cache = _TtlCache(cache_ttl_seconds)
        self._email_cache = _TtlCache(cache_ttl_seconds)

    async def get_tenant_connection_string(self, tenant_id: uuid.UUID) -> str | None:
        """TenantConnectionStringResolver: active tenants only, cached."""
        cached = self._conn_cache.get(tenant_id)
        if isinstance(cached, str):
            return cached
        async with self._pools.catalog() as conn:
            cur = await conn.execute(
                'SELECT "ConnectionString" FROM catalog."Tenants" WHERE "Id" = %s AND "IsActive" = true',
                (tenant_id,),
            )
            row = await cur.fetchone()
        value = row[0] if row and row[0] else None
        if value:
            self._conn_cache.set(tenant_id, value)
        return value

    async def resolve_tenants_for_email(self, email: str) -> list[TenantMembership]:
        """EmailTenantResolutionMiddleware: X-Tenant-Id may carry an email instead of a GUID."""
        key = email.strip().lower()
        cached = self._email_cache.get(key)
        if isinstance(cached, list):
            return cached
        async with self._pools.catalog() as conn:
            cur = conn.cursor(row_factory=dict_row)
            await cur.execute(
                """
                SELECT ut."TenantId", ut."Role", ut."UserId"
                FROM catalog."UserTenants" ut
                JOIN catalog."Tenants" t ON t."Id" = ut."TenantId"
                WHERE t."IsActive" = true AND lower(ut."Email") = %s
                ORDER BY t."Name"
                """,
                (key,),
            )
            rows = await cur.fetchall()
        result = [TenantMembership(r["TenantId"], r["Role"], r["UserId"]) for r in rows]
        if len(result) == 1:  # v2 cache rule: only cache unambiguous resolutions
            self._email_cache.set(key, result)
        return result

    async def find_membership(
        self, tenant_id: uuid.UUID, user_id: uuid.UUID | None, email: str | None
    ) -> TenantMembership | None:
        """Is this identity registered against the tenant in catalog.UserTenants?"""
        if user_id is None and not email:
            return None
        async with self._pools.catalog() as conn:
            cur = conn.cursor(row_factory=dict_row)
            await cur.execute(
                """
                SELECT ut."TenantId", ut."Role", ut."UserId"
                FROM catalog."UserTenants" ut
                JOIN catalog."Tenants" t ON t."Id" = ut."TenantId" AND t."IsActive" = true
                WHERE ut."TenantId" = %s
                  AND ((%s::uuid IS NOT NULL AND ut."UserId" = %s::uuid)
                       OR (%s::text IS NOT NULL AND lower(ut."Email") = lower(%s::text)))
                LIMIT 1
                """,
                (tenant_id, user_id, user_id, email, email),
            )
            row = await cur.fetchone()
        return TenantMembership(row["TenantId"], row["Role"], row["UserId"]) if row else None

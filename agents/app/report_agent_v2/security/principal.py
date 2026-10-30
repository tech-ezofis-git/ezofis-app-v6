"""Authenticated identity and validated tenant context carried on request.state."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

_NAME_ID = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
_ROLE_URI = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
_TENANT_URI = "http://schemas.microsoft.com/identity/claims/tenantid"

ADMIN_ROLES = frozenset({"admin", "tenantadmin"})


def _as_uuid(value: object) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(value)) if value else None
    except (ValueError, TypeError):
        return None


def _as_list(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return [str(v) for v in value]
    return [str(value)]


@dataclass(frozen=True)
class Principal:
    """Who is calling. Built only from a signature-verified token."""

    scheme: str
    subject: str
    user_id: uuid.UUID | None
    email: str | None
    name: str | None
    roles: frozenset[str]
    token_tenant_id: uuid.UUID | None
    claims: dict = field(repr=False, compare=False)

    @classmethod
    def from_claims(cls, scheme: str, claims: dict) -> "Principal":
        # Same lookup order as ReportBuilderController.GetUserId.
        subject = str(claims.get(_NAME_ID) or claims.get("sub") or claims.get("oid") or claims.get("userId") or "")
        roles = {r for r in _as_list(claims.get("role")) + _as_list(claims.get("roles")) + _as_list(claims.get(_ROLE_URI))}
        return cls(
            scheme=scheme,
            subject=subject,
            user_id=_as_uuid(subject),
            email=(claims.get("email") or claims.get("upn") or claims.get("preferred_username") or None),
            name=claims.get("name"),
            roles=frozenset(roles),
            token_tenant_id=_as_uuid(claims.get("tid") or claims.get(_TENANT_URI)),
            claims=claims,
        )

    @property
    def token_says_admin(self) -> bool:
        return any(r.lower() in ADMIN_ROLES for r in self.roles)


@dataclass(frozen=True)
class TenantContext:
    """Tenant + tenant-local user, validated against catalog and the tenant database."""

    tenant_id: uuid.UUID
    conninfo: str  # never serialized to clients
    user_id: uuid.UUID
    user_email: str | None
    user_display_name: str | None
    db_role: str
    is_admin: bool

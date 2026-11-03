"""Connection pools: one for the catalog, a small bounded LRU of per-tenant pools.

Mirrors CatalogConnectionPool / TenantConnectionPool in v6api: small per-tenant pools that
release idle connections, because many tenant databases share one Postgres server.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from collections import OrderedDict
from contextlib import asynccontextmanager
from typing import AsyncIterator

from psycopg import AsyncConnection, sql
from psycopg_pool import AsyncConnectionPool

logger = logging.getLogger(__name__)


def _new_pool(conninfo: str, max_size: int, name: str) -> AsyncConnectionPool:
    return AsyncConnectionPool(
        conninfo,
        min_size=0,
        max_size=max(1, min(max_size, 15)),
        max_idle=20,  # ConnectionIdleLifetime = 20
        timeout=15,
        name=name,
        open=False,
        # Autocommit outside explicit transactions, so read_only_transaction() always opens a
        # real top-level transaction (SET TRANSACTION READ ONLY must be its first statement).
        kwargs={"autocommit": True},
    )


class PoolRegistry:
    def __init__(self, catalog_conninfo: str, catalog_max: int, tenant_max: int, tenant_cache_size: int) -> None:
        self._catalog = _new_pool(catalog_conninfo, catalog_max, "catalog")
        self._tenant_max = tenant_max
        self._tenant_cache_size = max(1, tenant_cache_size)
        self._tenant_pools: OrderedDict[str, AsyncConnectionPool] = OrderedDict()
        self._lock = asyncio.Lock()

    async def open(self) -> None:
        await self._catalog.open()

    async def close(self) -> None:
        await self._catalog.close()
        for pool in self._tenant_pools.values():
            await pool.close()
        self._tenant_pools.clear()

    @asynccontextmanager
    async def catalog(self) -> AsyncIterator[AsyncConnection]:
        async with self._catalog.connection() as conn:
            yield conn

    async def _tenant_pool(self, conninfo: str) -> AsyncConnectionPool:
        key = hashlib.sha256(conninfo.encode()).hexdigest()
        async with self._lock:
            pool = self._tenant_pools.get(key)
            if pool is not None:
                self._tenant_pools.move_to_end(key)
                return pool
            pool = _new_pool(conninfo, self._tenant_max, f"tenant-{key[:8]}")
            await pool.open()
            self._tenant_pools[key] = pool
            while len(self._tenant_pools) > self._tenant_cache_size:
                _, evicted = self._tenant_pools.popitem(last=False)
                asyncio.create_task(evicted.close())
            return pool

    @asynccontextmanager
    async def tenant(self, conninfo: str) -> AsyncIterator[AsyncConnection]:
        pool = await self._tenant_pool(conninfo)
        async with pool.connection() as conn:
            yield conn


@asynccontextmanager
async def read_only_transaction(conn: AsyncConnection, statement_timeout_ms: int) -> AsyncIterator[AsyncConnection]:
    """Run the block inside a READ ONLY transaction with a statement timeout.

    Postgres itself rejects any INSERT/UPDATE/DELETE/DDL inside, so even a compiler bug
    cannot write data, regardless of the privileges of the login.
    """
    async with conn.transaction():
        await conn.execute("SET TRANSACTION READ ONLY")
        await conn.execute(
            sql.SQL("SET LOCAL statement_timeout = {}").format(sql.Literal(int(statement_timeout_ms)))
        )
        yield conn

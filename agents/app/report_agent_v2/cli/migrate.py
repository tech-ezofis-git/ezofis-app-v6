"""Apply migrations/001_report_agent_tables.sql to every active tenant database.

    python -m app.report_agent_v2.cli.migrate                 # all active tenants
    python -m app.report_agent_v2.cli.migrate --tenant <guid> # one tenant

Uses the connection strings stored in catalog."Tenants" (owner credentials) unless
MIGRATION_DB_USERNAME / MIGRATION_DB_PASSWORD are set. The runtime service never runs DDL.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import uuid
from pathlib import Path

import psycopg

from app.report_agent_v2.config import get_settings
from app.report_agent_v2.db.connstr import npgsql_to_conninfo

MIGRATION = Path(__file__).resolve().parents[1] / "migrations" / "001_report_agent_tables.sql"


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant", type=uuid.UUID)
    args = parser.parse_args()

    settings = get_settings()
    if not settings.catalog_connection_string:
        print("Set REPORT_AGENT_CATALOG_CONNECTION_STRING or CATALOG_DATABASE_URL.", file=sys.stderr)
        return 2
    ddl = MIGRATION.read_text(encoding="utf-8")
    async with await psycopg.AsyncConnection.connect(npgsql_to_conninfo(settings.catalog_connection_string)) as cat:
        cur = await cat.execute(
            'SELECT "Id", "Name", "ConnectionString" FROM catalog."Tenants" WHERE "IsActive" = true'
            + (' AND "Id" = %s' if args.tenant else ""),
            (args.tenant,) if args.tenant else None,
        )
        tenants = await cur.fetchall()

    failures = 0
    for tenant_id, name, conn_str in tenants:
        conninfo = npgsql_to_conninfo(
            conn_str,
            username=os.getenv("MIGRATION_DB_USERNAME"),
            password=os.getenv("MIGRATION_DB_PASSWORD"),
            application_name="report-agent-migrate",
        )
        try:
            async with await psycopg.AsyncConnection.connect(conninfo, autocommit=False) as conn:
                await conn.execute(ddl)
                await conn.commit()
            print(f"ok      {tenant_id}  {name}")
        except psycopg.Error as exc:
            failures += 1
            print(f"FAILED  {tenant_id}  {name}: {exc.__class__.__name__}", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    raise SystemExit(asyncio.run(main()))

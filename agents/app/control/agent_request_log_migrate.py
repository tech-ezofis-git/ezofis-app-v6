"""Create ai.agent_request_logs in every active tenant database (ahead of the first agent run).

    python -m app.control.agent_request_log_migrate                  # dry run: list tenants + table state
    python -m app.control.agent_request_log_migrate --apply          # create / upgrade where needed
    python -m app.control.agent_request_log_migrate --apply --tenant <guid>

Additive and idempotent: the same SCHEMA_SQL the orchestrator runs on its first write per tenant
(CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS). When the read-only report login
report_agent_rt exists, it also gets SELECT on the table (migrations/002_least_privilege_roles.sql).

Uses catalog."Tenants".ConnectionString (owner credentials, the database Report Builder reads)
unless MIGRATION_DB_USERNAME / MIGRATION_DB_PASSWORD are set.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import uuid

import psycopg

from app.control.agent_request_log import SCHEMA_SQL
from app.report_agent_v2.config import get_settings
from app.report_agent_v2.db.connstr import npgsql_to_conninfo

_REQUIRED_COLUMNS = {"sub_agents", "llm_call_details"}
_GRANT_SQL = (
    "GRANT USAGE ON SCHEMA ai TO report_agent_rt",
    "GRANT SELECT ON ai.agent_request_logs TO report_agent_rt",
)


async def _table_state(conn: psycopg.AsyncConnection) -> str:
    cur = await conn.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'ai' AND table_name = 'agent_request_logs'"
    )
    columns = {row[0] for row in await cur.fetchall()}
    if not columns:
        return "missing"
    return "exists" if _REQUIRED_COLUMNS <= columns else "needs new columns"


async def _apply(conn: psycopg.AsyncConnection) -> bool:
    """Run the DDL in one transaction. Returns whether report_agent_rt was granted read access."""
    async with conn.transaction():
        for stmt in SCHEMA_SQL:
            await conn.execute(stmt)
        cur = await conn.execute("SELECT 1 FROM pg_roles WHERE rolname = 'report_agent_rt'")
        granted = await cur.fetchone() is not None
        if granted:
            for stmt in _GRANT_SQL:
                await conn.execute(stmt)
    return granted


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="create / upgrade the table (default: dry run)")
    parser.add_argument("--tenant", type=uuid.UUID, help="only this tenant id")
    args = parser.parse_args()

    settings = get_settings()
    if not settings.catalog_connection_string:
        print("Set REPORT_AGENT_CATALOG_CONNECTION_STRING or CATALOG_DATABASE_URL.", file=sys.stderr)
        return 2
    async with await psycopg.AsyncConnection.connect(npgsql_to_conninfo(settings.catalog_connection_string)) as cat:
        cur = await cat.execute(
            'SELECT "Id", "Name", "ConnectionString" FROM catalog."Tenants" WHERE "IsActive" = true'
            + (' AND "Id" = %s' if args.tenant else "")
            + ' ORDER BY "Name"',
            (args.tenant,) if args.tenant else None,
        )
        tenants = await cur.fetchall()

    print(f"{'APPLY' if args.apply else 'DRY RUN'}: {len(tenants)} active tenant(s)")
    failures = 0
    for tenant_id, name, conn_str in tenants:
        conninfo = npgsql_to_conninfo(
            conn_str,
            username=os.getenv("MIGRATION_DB_USERNAME"),
            password=os.getenv("MIGRATION_DB_PASSWORD"),
            application_name="agent-request-log-migrate",
        )
        try:
            async with await psycopg.AsyncConnection.connect(conninfo, autocommit=True) as conn:
                database = (await (await conn.execute("SELECT current_database()")).fetchone())[0]
                before = await _table_state(conn)
                if not args.apply or before == "exists":
                    print(f"{before:<18} {database:<28} {tenant_id}  {name}")
                    continue
                granted = await _apply(conn)
                after = await _table_state(conn)
                note = ", report_agent_rt granted" if granted else ""
                print(f"{before} -> {after}{note:<10} {database:<28} {tenant_id}  {name}")
        except psycopg.Error as exc:
            failures += 1
            print(f"FAILED             {tenant_id}  {name}: {exc.__class__.__name__}", file=sys.stderr)
    print(f"done, {failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

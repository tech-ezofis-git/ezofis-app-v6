"""Persistence for report definitions, versioned specs and run audit.

* reporting."ReportAiDefinitions" (owned by v6api, ReportAiDefinitionService) holds the report
  row in the V6 "report AI definition" format: ReportPrompt + ReportSpecJson in the existing
  ReportSpec shape (see ai_definition.py), with the same ownership/sharing columns. AI reports
  built here therefore list and open like the ones the existing report agent saves.
* reporting."ReportAgentSpecs" (this module) holds every generated v2 spec, versioned, with the
  source fingerprint used to detect form drift. The active one is what execution runs.
* reporting."ReportAgentRuns" is an execution audit log.

Every statement filters on "TenantId" even though each tenant has its own database
(defense in depth against a mis-routed connection string).
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from psycopg import AsyncConnection
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.report_agent_v2.domain.ai_definition import build_ai_spec, build_system_ai_spec, report_type
from app.report_agent_v2.domain.compiler import CompiledQuery
from app.report_agent_v2.domain.source_catalog import SourceCatalog
from app.report_agent_v2.domain.spec import SPEC_SCHEMA_VERSION, ReportSpec


def _json_list(text: str | None) -> list[str]:
    try:
        value = json.loads(text or "[]")
    except json.JSONDecodeError:
        return []
    return [str(v) for v in value] if isinstance(value, list) else []


async def load_definition(conn: AsyncConnection, tenant_id: uuid.UUID, report_id: uuid.UUID) -> dict | None:
    cur = conn.cursor(row_factory=dict_row)
    await cur.execute(
        """
        SELECT "Id", "SessionId", "Name", "Description", "ReportType", "WorkflowName", "RepositoryName",
               "ReportPrompt", "ReportSpecJson", "Status", "Runs", "LastRunAtUtc", "Visibility", "SharedUsers",
               "SharedGroups", "OwnerUserId", "CreatedAtUtc", "ModifiedAtUtc"
        FROM reporting."ReportAiDefinitions"
        WHERE "Id" = %s AND "TenantId" = %s AND "IsDeleted" = false
        """,
        (report_id, tenant_id),
    )
    row = await cur.fetchone()
    if row is not None:
        try:
            row["ReportSpec"] = json.loads(row["ReportSpecJson"] or "{}")
        except json.JSONDecodeError:
            row["ReportSpec"] = {}
        row["SharedUsers"] = _json_list(row["SharedUsers"])
        row["SharedGroups"] = _json_list(row["SharedGroups"])
        row["Domain"] = row["WorkflowName"] or row["RepositoryName"] or ""
    return row


async def load_active_spec(conn: AsyncConnection, tenant_id: uuid.UUID, report_id: uuid.UUID) -> dict | None:
    cur = conn.cursor(row_factory=dict_row)
    await cur.execute(
        """
        SELECT "Id", "Version", "SchemaVersion", "Prompt", "SpecJson", "SourceType", "WorkflowId", "RepositoryId",
               "SourceFormId", "SourceFingerprint", "Model", "Warnings", "CreatedAtUtc", "CreatedBy"
        FROM reporting."ReportAgentSpecs"
        WHERE "TenantId" = %s AND "ReportId" = %s AND "Status" = 'Active'
        ORDER BY "Version" DESC
        LIMIT 1
        """,
        (tenant_id, report_id),
    )
    return await cur.fetchone()


async def user_group_ids(conn: AsyncConnection, user_id: uuid.UUID) -> set[uuid.UUID]:
    try:
        async with conn.transaction():  # savepoint: a missing table must not poison the outer txn
            cur = await conn.execute('SELECT "GroupId" FROM users."UserGroups" WHERE "UserId" = %s', (user_id,))
            return {r[0] for r in await cur.fetchall()}
    except Exception:  # noqa: BLE001 - UserGroups may not exist on every tenant database
        return set()


def normalize_sharing(visibility: str | None, shared_users: list[str], shared_groups: list[str]) -> tuple[str, list[str], list[str]]:
    """ReportDefinitionService.NormalizeSharing."""
    users = list(dict.fromkeys(u.strip() for u in shared_users if u and u.strip()))
    groups = list(dict.fromkeys(g.strip() for g in shared_groups if g and g.strip()))
    vis = (visibility or "").strip()
    if not vis or vis.lower() == "private":
        if users:
            vis = "Selected Users"
        elif groups:
            vis = "Selected Groups"
        else:
            vis = vis or "Private"
    return vis, users, groups


async def save_definition(
    conn: AsyncConnection,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    report_id: uuid.UUID | None,
    existing: dict | None,
    name: str,
    description: str | None,
    prompt: str,
    catalog: SourceCatalog,
    spec: ReportSpec,
    compiled: CompiledQuery,
    warnings: list[str],
    model: str | None,
    visibility: str | None,
    shared_users: list[str],
    shared_groups: list[str],
    session_id: str | None = None,
) -> tuple[uuid.UUID, int, dict]:
    """Insert or update the AI definition and append a new active spec version, atomically.

    Returns (report id, spec version, the saved row as load_definition returns it).
    """
    now = datetime.now(timezone.utc)
    report_id = report_id or uuid.uuid4()
    if existing is not None:
        visibility = visibility or existing.get("Visibility")
        shared_users = shared_users or existing.get("SharedUsers") or []
        shared_groups = shared_groups or existing.get("SharedGroups") or []
        session_id = session_id or existing.get("SessionId")
    vis, users, groups = normalize_sharing(visibility, shared_users, shared_groups)
    fingerprint = catalog.fingerprint(compiled.referenced_fields)
    rtype = report_type(catalog)

    async with conn.transaction():
        cur = await conn.execute(
            """SELECT COALESCE(MAX("Version"), 0) FROM reporting."ReportAgentSpecs"
               WHERE "TenantId" = %s AND "ReportId" = %s""",
            (tenant_id, report_id),
        )
        version = int((await cur.fetchone())[0]) + 1
        spec_json, prompt_text = build_ai_spec(spec, compiled, catalog, prompt=prompt, warnings=warnings, spec_version=version)
        row = {
            "id": report_id, "tenant": tenant_id, "user": user_id, "now": now,
            "session": (session_id or f"report-{uuid.uuid4()}")[:128],
            "name": name[:256], "description": description or "", "report_type": rtype,
            "workflow_name": catalog.source_name[:256] if rtype == "specific_workflow" else None,
            "repository_name": catalog.source_name[:256] if rtype == "specific_repository" else None,
            "prompt": prompt_text, "spec": json.dumps(spec_json, ensure_ascii=False),
            "visibility": vis, "shared_users": json.dumps(users), "shared_groups": json.dumps(groups),
        }
        if existing is None:
            await conn.execute(
                """
                INSERT INTO reporting."ReportAiDefinitions"
                    ("Id", "TenantId", "OwnerUserId", "SessionId", "Name", "Description", "ReportType",
                     "WorkflowName", "RepositoryName", "ReportPrompt", "ReportSpecJson", "Status", "Runs",
                     "CreatedAtUtc", "ModifiedAtUtc", "CreatedBy", "ModifiedBy", "IsDeleted",
                     "Visibility", "SharedUsers", "SharedGroups")
                VALUES (%(id)s, %(tenant)s, %(user)s, %(session)s, %(name)s, %(description)s, %(report_type)s,
                        %(workflow_name)s, %(repository_name)s, %(prompt)s, %(spec)s, 'Draft', 0,
                        %(now)s, %(now)s, %(user)s, %(user)s, false,
                        %(visibility)s, %(shared_users)s, %(shared_groups)s)
                """,
                row,
            )
        else:
            await conn.execute(
                """
                UPDATE reporting."ReportAiDefinitions"
                SET "SessionId" = %(session)s, "Name" = %(name)s, "Description" = %(description)s,
                    "ReportType" = %(report_type)s, "WorkflowName" = %(workflow_name)s,
                    "RepositoryName" = %(repository_name)s, "ReportPrompt" = %(prompt)s, "ReportSpecJson" = %(spec)s,
                    "Visibility" = %(visibility)s, "SharedUsers" = %(shared_users)s, "SharedGroups" = %(shared_groups)s,
                    "ModifiedAtUtc" = %(now)s, "ModifiedBy" = %(user)s
                WHERE "Id" = %(id)s AND "TenantId" = %(tenant)s AND "IsDeleted" = false
                """,
                row,
            )
        await conn.execute(
            """UPDATE reporting."ReportAgentSpecs" SET "Status" = 'Superseded'
               WHERE "TenantId" = %s AND "ReportId" = %s AND "Status" = 'Active'""",
            (tenant_id, report_id),
        )
        await conn.execute(
            """
            INSERT INTO reporting."ReportAgentSpecs"
                ("Id", "TenantId", "ReportId", "Version", "SchemaVersion", "Prompt", "SpecJson", "SourceType",
                 "WorkflowId", "RepositoryId", "SourceFormId", "SourceFingerprint", "Model", "Status", "Warnings",
                 "CreatedAtUtc", "CreatedBy")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active', %s, %s, %s)
            """,
            (
                uuid.uuid4(), tenant_id, report_id, version, SPEC_SCHEMA_VERSION, prompt, Jsonb(spec.dump()),
                catalog.source_type,
                catalog.source_id if catalog.source_type == "Workflow" else None,
                catalog.source_id if catalog.source_type == "Folder" else None,
                catalog.form_id, fingerprint, model, Jsonb(warnings), now, user_id,
            ),
        )
    saved = await load_definition(conn, tenant_id, report_id)
    return report_id, version, saved


async def record_run(
    conn: AsyncConnection,
    *,
    tenant_id: uuid.UUID,
    report_id: uuid.UUID,
    spec_version: int,
    user_id: uuid.UUID,
    row_count: int,
    duration_ms: int,
    status: str,
    error: str | None,
) -> None:
    async with conn.transaction():
        await conn.execute(
            """
            INSERT INTO reporting."ReportAgentRuns"
                ("Id", "TenantId", "ReportId", "SpecVersion", "UserId", "RowCount", "DurationMs", "Status", "Error", "CreatedAtUtc")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, now())
            """,
            (uuid.uuid4(), tenant_id, report_id, spec_version, user_id, row_count, duration_ms, status, (error or "")[:2000] or None),
        )
        if status == "Succeeded":
            await conn.execute(
                """UPDATE reporting."ReportAiDefinitions" SET "Runs" = "Runs" + 1, "LastRunAtUtc" = now()
                   WHERE "Id" = %s AND "TenantId" = %s AND "IsDeleted" = false""",
                (report_id, tenant_id),
            )


DEFAULT_SESSION_PREFIX = "default:"


async def install_default_report(conn: AsyncConnection, *, tenant_id: uuid.UUID, user_id: uuid.UUID, template) -> tuple[dict, bool]:
    """Create one default report (system_reports.Template) unless it already exists.

    Defaults are identified by SessionId "default:<template key>", so re-installing is a no-op.
    They are Private: only Admins (who see every report) and the installing user see them, because
    some (login/security activity, credit usage) are tenant-wide and sensitive.
    Returns (row, created).
    """
    session = f"{DEFAULT_SESSION_PREFIX}{template.key}"
    cur = await conn.execute(
        """SELECT "Id" FROM reporting."ReportAiDefinitions"
           WHERE "TenantId" = %s AND "SessionId" = %s AND "IsDeleted" = false LIMIT 1""",
        (tenant_id, session),
    )
    found = await cur.fetchone()
    if found is not None:
        return await load_definition(conn, tenant_id, found[0]), False

    spec_json, prompt_text = build_system_ai_spec(template)
    report_id, now = uuid.uuid4(), datetime.now(timezone.utc)
    async with conn.transaction():
        await conn.execute(
            """
            INSERT INTO reporting."ReportAiDefinitions"
                ("Id", "TenantId", "OwnerUserId", "SessionId", "Name", "Description", "ReportType",
                 "WorkflowName", "RepositoryName", "ReportPrompt", "ReportSpecJson", "Status", "Runs",
                 "CreatedAtUtc", "ModifiedAtUtc", "CreatedBy", "ModifiedBy", "IsDeleted",
                 "Visibility", "SharedUsers", "SharedGroups")
            VALUES (%s, %s, %s, %s, %s, %s, %s, NULL, NULL, %s, %s, 'Published', 0, %s, %s, %s, %s, false, 'Private', '[]', '[]')
            """,
            (report_id, tenant_id, user_id, session, template.name, template.description, template.report_type,
             prompt_text, json.dumps(spec_json, ensure_ascii=False), now, now, user_id, user_id),
        )
    return await load_definition(conn, tenant_id, report_id), True


def system_template_key(definition: dict) -> str | None:
    agent = (definition.get("ReportSpec") or {}).get("agentSpec") or {}
    return agent.get("template") if agent.get("kind") == "system" else None


async def list_definitions(conn: AsyncConnection, tenant_id: uuid.UUID, search: str | None = None) -> list[dict]:
    """Every live AI definition of the tenant, newest first (access is filtered by the caller)."""
    cur = conn.cursor(row_factory=dict_row)
    await cur.execute(
        """
        SELECT "Id", "SessionId", "Name", "Description", "ReportType", "WorkflowName", "RepositoryName",
               "ReportSpecJson", "Status", "Runs", "LastRunAtUtc", "Visibility", "SharedUsers", "SharedGroups",
               "OwnerUserId", "CreatedAtUtc", "ModifiedAtUtc"
        FROM reporting."ReportAiDefinitions"
        WHERE "TenantId" = %s AND "IsDeleted" = false
          AND (%s::text IS NULL OR "Name" ILIKE %s OR "Description" ILIKE %s)
        ORDER BY COALESCE("ModifiedAtUtc", "CreatedAtUtc") DESC
        """,
        (tenant_id, search, f"%{search}%" if search else None, f"%{search}%" if search else None),
    )
    rows = await cur.fetchall()
    for row in rows:
        try:
            spec = json.loads(row.pop("ReportSpecJson") or "{}")
        except json.JSONDecodeError:
            spec = {}
        agent = spec.get("agentSpec") if isinstance(spec, dict) else None
        agent = agent if isinstance(agent, dict) else {}
        # agent: built by Report Agent v2 | default: installed default report | legacy: saved by the old builder
        row["Kind"] = "default" if agent.get("kind") == "system" else ("agent" if agent.get("engine") == "report-agent-v2" else "legacy")
        row["SharedUsers"] = _json_list(row["SharedUsers"])
        row["SharedGroups"] = _json_list(row["SharedGroups"])
    return rows

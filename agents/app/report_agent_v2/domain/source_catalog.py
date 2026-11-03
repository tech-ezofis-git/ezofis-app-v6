"""Build the field catalog for a report source by introspecting the tenant database.

Workflow source (same resolution as ReportQueryService):
    workflow."Workflows"  -> FormId (or latest workflow.process_form_{wf8}.w_form_id)
    dbo."wForm"           -> form name
    dbo.ezfb_{form8}_items              (form values, one row per form entry)
    dbo."wFormControl"    -> field labels / jsonIds / stored columnName
    workflow.process_form_{wf8}         (entry -> workflow instance)
    workflow.workflow_instances_{wf8}   (request no, status, timestamps)
    workflow.inbox_{wf8}                (current stage / last actor, latest row per instance)

Folder source:
    repository."Repositories" -> ItemsTableName (validated ^items_[a-f0-9]{8}$)
    repository."RepositoryFields" -> Name / SqlColumnName / DataType

Only fields whose physical column is confirmed in information_schema enter the catalog, so
the definition agent cannot reference anything that does not exist.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass, field

from psycopg import AsyncConnection, sql
from psycopg.rows import dict_row

from app.report_agent_v2.domain import naming
from app.report_agent_v2.errors import BadRequestError, NotFoundError

NUMBER_PG = {"numeric", "integer", "bigint", "smallint", "double precision", "real", "money", "decimal"}
DATE_PG_PREFIX = ("date", "timestamp")
NUMBER_CONTROL_HINTS = ("number", "currency", "amount", "decimal", "counter", "numeric", "price")
DATE_CONTROL_HINTS = ("date", "calendar", "time")


@dataclass(frozen=True)
class FieldDef:
    id: str
    label: str
    kind: str  # "form" | "system"
    data_type: str  # "text" | "number" | "date" | "boolean"
    alias: str  # e | wi | mb
    column: str | None = None  # physical column for direct references
    system: str | None = None  # key of a system expression (see compiler.SYSTEM_EXPRESSIONS)
    pg_type: str = "text"
    requires: frozenset[str] = frozenset()
    control_type: str | None = None
    mandatory: bool = False


@dataclass
class SourceCatalog:
    source_type: str  # Workflow | Folder
    source_id: uuid.UUID
    source_name: str
    items_schema: str
    items_table: str
    items_columns: dict[str, str]
    form_id: str | None = None
    form_name: str | None = None
    process_form_table: str | None = None
    process_form_entry_type: str | None = None
    process_form_columns: dict[str, str] = field(default_factory=dict)
    instances_table: str | None = None
    instances_columns: dict[str, str] = field(default_factory=dict)
    inbox_table: str | None = None
    inbox_columns: dict[str, str] = field(default_factory=dict)
    has_users: bool = False  # users."Users" exists: user ids can be shown as emails
    # ai.agent_request_logs is readable: AI usage per ticket/file can be joined (alias "al").
    has_ai_log: bool = False
    tenant_id: uuid.UUID | None = None
    fields: dict[str, FieldDef] = field(default_factory=dict)

    @property
    def deleted_column(self) -> str | None:
        for candidate in ("is_deleted", "IsDeleted", "isDeleted"):
            if candidate in self.items_columns:
                return candidate
        return None

    def llm_view(self) -> list[dict]:
        return [
            {"id": f.id, "label": f.label, "type": f.data_type, "kind": f.kind, **({"controlType": f.control_type} if f.control_type else {})}
            for f in self.fields.values()
        ]

    def fingerprint(self, refs: set[str]) -> str:
        """Hash of the physical shape behind the referenced fields, to detect schema drift."""
        shape = {
            "items": f"{self.items_schema}.{self.items_table}",
            "fields": {
                r: [self.fields[r].alias, self.fields[r].column, self.fields[r].system, self.fields[r].pg_type]
                for r in sorted(refs)
                if r in self.fields
            },
        }
        return hashlib.sha256(json.dumps(shape, sort_keys=True).encode()).hexdigest()


def _infer_type(pg_type: str, control_type: str | None) -> str:
    pg = (pg_type or "").lower()
    if pg in NUMBER_PG:
        return "number"
    if pg.startswith(DATE_PG_PREFIX):
        return "date"
    if pg == "boolean":
        return "boolean"
    ct = (control_type or "").lower()
    if any(h in ct for h in NUMBER_CONTROL_HINTS):
        return "number"
    if any(h in ct for h in DATE_CONTROL_HINTS):
        return "date"
    return "text"


async def _columns(conn: AsyncConnection, schema: str, table: str) -> dict[str, str]:
    cur = await conn.execute(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = %s AND table_name = %s",
        (schema, table),
    )
    return {name: dtype for name, dtype in await cur.fetchall()}


async def _table_exists(conn: AsyncConnection, schema: str, table: str) -> bool:
    cur = await conn.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = %s AND table_name = %s", (schema, table)
    )
    return await cur.fetchone() is not None


# ---------------------------------------------------------------------------------------------
# Workflow
# ---------------------------------------------------------------------------------------------


async def find_workflow(
    conn: AsyncConnection, tenant_id: uuid.UUID, workflow_id: uuid.UUID | None, workflow_name: str | None
) -> dict:
    if workflow_id is None and not (workflow_name and workflow_name.strip()):
        raise BadRequestError("workflowId or workflowName is required for a Workflow source.")
    cur = conn.cursor(row_factory=dict_row)
    await cur.execute(
        """
        SELECT "Id", "Name", "Description", "FormId"
        FROM workflow."Workflows"
        WHERE "TenantId" = %s AND "IsDeleted" = false
          AND ((%s::uuid IS NOT NULL AND "Id" = %s::uuid)
               OR (%s::uuid IS NULL AND lower(btrim("Name")) = lower(btrim(%s::text))))
        LIMIT 1
        """,
        (tenant_id, workflow_id, workflow_id, workflow_id, workflow_name),
    )
    row = await cur.fetchone()
    if row is None:
        raise NotFoundError("Workflow not found.")
    return row


async def list_workflows(conn: AsyncConnection, tenant_id: uuid.UUID) -> list[dict]:
    cur = conn.cursor(row_factory=dict_row)
    await cur.execute(
        """SELECT "Id", "Name", "Description", "FormId" FROM workflow."Workflows"
           WHERE "TenantId" = %s AND "IsDeleted" = false ORDER BY "Name" """,
        (tenant_id,),
    )
    return await cur.fetchall()


async def _controls(conn: AsyncConnection, form_id: str) -> list[dict]:
    cols = await _columns(conn, "dbo", "wFormControl")
    if not cols:
        return []
    has_column_name = "columnName" in cols
    form_param: object = form_id
    if cols.get("wFormId", "").lower() in {"integer", "bigint", "smallint"}:
        # Legacy integer wFormId (ReportEzfbNaming.ResolveWFormIdParameterAsync).
        if form_id.isdigit():
            form_param = int(form_id)
        else:
            hexpart = "".join(c for c in form_id if c in "0123456789abcdefABCDEF")[:8].rjust(8, "0")
            value = int(hexpart, 16)
            form_param = value - (1 << 32) if value >= (1 << 31) else value
    column_name_sql = '"columnName"' if has_column_name else "NULL::text"
    cur = conn.cursor(row_factory=dict_row)
    await cur.execute(
        f"""
        SELECT "jsonId" AS json_id, name, type, "isMandatory" AS mandatory, {column_name_sql} AS column_name
        FROM dbo."wFormControl"
        WHERE "wFormId" = %s AND "isDeleted" = false
        ORDER BY "parentId", id
        """,
        (form_param,),
    )
    return await cur.fetchall()


async def load_workflow_catalog(
    conn: AsyncConnection, tenant_id: uuid.UUID, workflow_id: uuid.UUID | None, workflow_name: str | None
) -> SourceCatalog:
    wf = await find_workflow(conn, tenant_id, workflow_id, workflow_name)
    wf_id: uuid.UUID = wf["Id"]
    suffix = naming.workflow_suffix(wf_id)
    process_form = f"process_form_{suffix}"
    has_process_form = await _table_exists(conn, "workflow", process_form)

    candidates: list[str] = []
    if wf.get("FormId"):
        candidates.append(str(wf["FormId"]))
    if has_process_form:
        cur = await conn.execute(
            sql.SQL(
                "SELECT w_form_id::text FROM workflow.{} "
                "WHERE (is_deleted = false OR is_deleted IS NULL) AND w_form_id IS NOT NULL ORDER BY id DESC LIMIT 1"
            ).format(sql.Identifier(process_form))
        )
        row = await cur.fetchone()
        if row and row[0] and row[0] not in candidates:
            candidates.append(row[0])

    form_id = items_table = None
    items_columns: dict[str, str] = {}
    for raw in candidates:
        try:
            fid = naming.normalize_form_id(raw)
            table = naming.ezfb_items_table(fid)
        except ValueError:
            continue
        cols = await _columns(conn, "dbo", table)
        if cols:
            form_id, items_table, items_columns = fid, table, cols
            break
    if not form_id or not items_table:
        raise BadRequestError(
            f"Workflow '{wf['Name']}' has no published form data table (dbo.ezfb_<form>_items). "
            "Link and publish its initiating form first."
        )

    cur = await conn.execute('SELECT name FROM dbo."wForm" WHERE id::text = %s LIMIT 1', (form_id,))
    form_row = await cur.fetchone()

    catalog = SourceCatalog(
        source_type="Workflow",
        source_id=wf_id,
        source_name=wf["Name"],
        items_schema="dbo",
        items_table=items_table,
        items_columns=items_columns,
        form_id=form_id,
        form_name=form_row[0] if form_row else None,
    )

    if has_process_form:
        pf_cols = await _columns(conn, "workflow", process_form)
        catalog.process_form_table = process_form
        catalog.process_form_entry_type = pf_cols.get("form_entry_id")
        catalog.process_form_columns = pf_cols
    instances = f"workflow_instances_{suffix}"
    if inst_cols := await _columns(conn, "workflow", instances):
        catalog.instances_table, catalog.instances_columns = instances, inst_cols
    inbox = f"inbox_{suffix}"
    if inbox_cols := await _columns(conn, "workflow", inbox):
        catalog.inbox_table, catalog.inbox_columns = inbox, inbox_cols

    seen_columns: set[str] = set()
    for control in await _controls(conn, form_id):
        column = naming.resolve_ezfb_column(
            control.get("column_name"), control.get("name"), control.get("json_id"), set(items_columns)
        )
        if not column or column.lower() in naming.SYSTEM_COLUMNS or column in seen_columns:
            continue
        seen_columns.add(column)
        field_id = (control.get("json_id") or column).strip()
        if field_id in catalog.fields:
            field_id = column
        pg_type = items_columns[column]
        catalog.fields[field_id] = FieldDef(
            id=field_id,
            label=(control.get("name") or field_id).strip(),
            kind="form",
            data_type=_infer_type(pg_type, control.get("type")),
            alias="e",
            column=column,
            pg_type=pg_type,
            control_type=control.get("type"),
            mandatory=bool(control.get("mandatory")),
        )

    catalog.has_users = {"Id", "Email"} <= (await _columns(conn, "users", "Users")).keys()
    _add_workflow_system_fields(catalog)
    await _add_ai_usage_fields(conn, catalog, tenant_id)
    return catalog


def _add_workflow_system_fields(c: SourceCatalog) -> None:
    def add(fid: str, label: str, dtype: str, alias: str, system: str, requires: set[str], column: str | None = None) -> None:
        c.fields[fid] = FieldDef(
            id=fid, label=label, kind="system", data_type=dtype, alias=alias, system=system,
            column=column, requires=frozenset(requires), pg_type=dtype,
        )

    if "item_id" in c.items_columns:
        add("sys.item_id", "Form Entry Id", "text", "e", "item_id", set(), "item_id")
    if "created_at" in c.items_columns:
        add("sys.submitted_at", "Submitted On", "date", "e", "submitted_at", set(), "created_at")
    if "modified_at" in c.items_columns:
        add("sys.modified_at", "Modified At", "date", "e", "modified_at", set(), "modified_at")
    ic = c.instances_columns
    if c.instances_table and c.process_form_table:
        if "reference_number" in ic:
            add("sys.request_no", "Request No", "text", "wi", "request_no", {"instances"})
        if "status" in ic:
            add("sys.request_status", "Request Status", "text", "wi", "request_status", {"instances"})
        if "created_at_utc" in ic:
            add("sys.request_raised_at", "Created At", "date", "wi", "request_raised_at", {"instances"})
        if "completed_at_utc" in ic:
            add("sys.request_completed_at", "Completed On", "date", "wi", "request_completed_at", {"instances"})
    if c.has_users and (
        (c.instances_table and c.process_form_table and "started_by" in ic)
        or "created_by" in c.process_form_columns or "created_by" in c.items_columns
    ):
        # Email of the request creator (ids resolved through users."Users"; never shown as an id).
        add("sys.created_by", "Created By", "text", "wi", "created_by",
            {"instances"} if c.instances_table and c.process_form_table and "started_by" in ic else set())
    if c.inbox_table and "form_entry_id" in c.inbox_columns:
        if {"stage", "name"} & c.inbox_columns.keys():
            add("sys.current_stage", "Stage", "text", "mb", "current_stage", {"inbox"})
        if {"activity_user_email", "transaction_created_by_email", "transaction_created_by", "user_id", "created_by_name"} & c.inbox_columns.keys():
            # A request nobody has acted on yet falls back to its creator (submitting is its last action).
            starter = {"instances"} if c.instances_table and c.process_form_table and "started_by" in ic else set()
            add("sys.last_action_by", "Action By", "text", "mb", "last_action_by", {"inbox"} | starter)
        if {"started_at_utc", "created_at_utc", "transaction_created_at"} & c.inbox_columns.keys():
            add("sys.stage_since", "In Stage Since", "date", "mb", "stage_since", {"inbox"})


# AI usage per ticket (Workflow) or file (Folder), from ai.agent_request_logs (written by the
# orchestrator, app/control/agent_request_log.py). Latest run for agent/model/status, totals for
# the rest. Only offered when the table is readable, so tenants without AI runs see no change.
AI_USAGE_FIELDS = (
    ("sys.ai_agent", "AI Agent", "text", "ai_agent"),
    ("sys.ai_model", "AI Model", "text", "ai_model"),
    ("sys.ai_burgr_model", "Burgr Suggested Model", "text", "ai_burgr_model"),
    ("sys.ai_status", "AI Status", "text", "ai_status"),
    ("sys.ai_duration", "AI Duration (s)", "number", "ai_duration"),
    ("sys.ai_tokens", "AI Tokens", "number", "ai_tokens"),
    ("sys.ai_cost", "AI Cost (USD)", "number", "ai_cost"),
    ("sys.ai_credits", "AI Credits", "number", "ai_credits"),
    ("sys.ai_runs", "AI Runs", "number", "ai_runs"),
)
AI_LOG_LINK_COLUMNS = {"tenant_id", "instance_id", "form_entry_id", "repository_item_id", "started_at_utc"}


async def _add_ai_usage_fields(conn: AsyncConnection, c: SourceCatalog, tenant_id: uuid.UUID) -> None:
    c.tenant_id = tenant_id
    if not AI_LOG_LINK_COLUMNS <= (await _columns(conn, "ai", "agent_request_logs")).keys():
        return
    # A row is linked through the ticket's instance id (or form entry id), or the file's item id.
    if c.source_type == "Workflow" and not (c.process_form_table or "item_id" in c.items_columns):
        return
    if c.source_type == "Folder" and "id" not in c.items_columns:
        return
    c.has_ai_log = True
    for fid, label, dtype, system in AI_USAGE_FIELDS:
        c.fields[fid] = FieldDef(
            id=fid, label=label, kind="system", data_type=dtype, alias="al", system=system,
            requires=frozenset({"ailog"}), pg_type="numeric" if dtype == "number" else "text",
        )


# ---------------------------------------------------------------------------------------------
# Folder (static repository)
# ---------------------------------------------------------------------------------------------


async def load_folder_catalog(
    conn: AsyncConnection, tenant_id: uuid.UUID, repository_id: uuid.UUID | None, repository_name: str | None
) -> SourceCatalog:
    if repository_id is None and not (repository_name and repository_name.strip()):
        raise BadRequestError("repositoryId or repositoryName is required for a Folder source.")
    cur = conn.cursor(row_factory=dict_row)
    await cur.execute(
        """
        SELECT "Id", "Name", "ItemsTableName"
        FROM repository."Repositories"
        WHERE "TenantId" = %s AND "IsDeleted" = false
          AND ((%s::uuid IS NOT NULL AND "Id" = %s::uuid)
               OR (%s::uuid IS NULL AND lower(btrim("Name")) = lower(btrim(%s::text))))
        LIMIT 1
        """,
        (tenant_id, repository_id, repository_id, repository_id, repository_name),
    )
    repo = await cur.fetchone()
    if repo is None:
        raise NotFoundError("Folder not found.")
    table = repo["ItemsTableName"]
    if not naming.is_valid_repository_items_table(table):
        raise BadRequestError("Folder has an invalid items table.")
    columns = await _columns(conn, "repository", table)
    if not columns:
        raise BadRequestError(f"Folder '{repo['Name']}' has no items table yet.")

    catalog = SourceCatalog(
        source_type="Folder",
        source_id=repo["Id"],
        source_name=repo["Name"],
        items_schema="repository",
        items_table=table,
        items_columns=columns,
    )
    await cur.execute(
        """
        SELECT "Name", "SqlColumnName", "DataType", "IsMandatory"
        FROM repository."RepositoryFields"
        WHERE "RepositoryId" = %s AND "IsDeleted" = false
        ORDER BY "OrderId", "Name"
        """,
        (repo["Id"],),
    )
    by_lower = {c.lower(): c for c in columns}
    for row in await cur.fetchall():
        column = by_lower.get(str(row["SqlColumnName"] or "").lower())
        if not column:
            continue
        catalog.fields[column] = FieldDef(
            id=column,
            label=row["Name"],
            kind="form",
            data_type=_infer_type(columns[column], row.get("DataType")),
            alias="e",
            column=column,
            pg_type=columns[column],
            control_type=row.get("DataType"),
            mandatory=bool(row.get("IsMandatory")),
        )
    for physical, label in (("created_at", "Uploaded On"), ("modified_at", "Last Modified On")):
        if physical in columns:
            catalog.fields[f"sys.{physical}"] = FieldDef(
                id=f"sys.{physical}", label=label, kind="system", data_type="date", alias="e",
                column=physical, system=physical, pg_type=columns[physical],
            )
    await _add_ai_usage_fields(conn, catalog, tenant_id)
    return catalog

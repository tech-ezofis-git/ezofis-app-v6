"""Default (system) reports: fixed, tenant-wide, read-only reports installed per tenant.

Unlike agent reports these never call the LLM. Each template is hand-written SQL over V6
system tables (workflow instances, SLA, login/audit logs, repository history, credit ledger).
Per-workflow / per-repository tables (workflow_instances_<8 hex>, items_<8 hex>_history, ...)
are discovered from information_schema, validated by name pattern, and quoted with
sql.Identifier; every value is a bind parameter. Queries run through executor.run_compiled, so
they get the same READ ONLY transaction and statement_timeout as agent reports.

Saved in reporting."ReportAiDefinitions" like any other AI definition, with
agentSpec = {"kind": "system", "template": <key>} instead of an executable spec.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Awaitable, Callable

from psycopg import AsyncConnection, sql

from app.report_agent_v2.domain.compiler import ColumnMeta, CompiledQuery

SYSTEM_KIND = "system"
_TABLE_SUFFIX = re.compile(r"^[0-9a-f]{8}$")
_ITEMS_TABLE = re.compile(r"^items_[0-9a-f]{8}$")
# workflow_instances_<x>.status (compiler._STATUS_LABELS order)
_STATUS_LABELS = ["Pending", "Running", "Paused", "Completed", "Failed", "Cancelled"]
_OPEN_STATUSES = (0, 1, 2)


@dataclass(frozen=True)
class Col:
    label: str
    dtype: str = "text"  # text | number | date
    role: str = "dimension"  # dimension | measure | value | link (hidden row id)
    total: bool = False


@dataclass(frozen=True)
class Template:
    key: str
    name: str
    description: str
    report_type: str
    window_days: int
    columns: tuple[Col, ...]
    build: Callable[["_Ctx"], Awaitable[tuple[sql.Composable, list[str]]]]

    def column_meta(self) -> list[ColumnMeta]:
        return [
            ColumnMeta(key=c.label, label=c.label, ref=f"c{i}", dtype=c.dtype, role=c.role,
                       is_calculated=c.role == "measure", total=c.total)
            for i, c in enumerate(self.columns)
        ]


@dataclass
class _Ctx:
    conn: AsyncConnection
    tenant_id: uuid.UUID
    since: datetime
    until: datetime
    as_of: date
    limit: int
    params: dict

    def bind(self, value: object, cast: str | None = None) -> sql.Composable:
        name = f"p{len(self.params)}"
        self.params[name] = value
        ph = sql.Placeholder(name)
        return sql.SQL("{}::{}").format(ph, sql.SQL(cast)) if cast else ph


def _t(schema: str, table: str) -> sql.Composable:
    return sql.SQL(".").join([sql.Identifier(schema), sql.Identifier(table)])


async def _columns(conn: AsyncConnection, schema: str, table: str) -> set[str]:
    cur = await conn.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = %s AND table_name = %s", (schema, table)
    )
    return {r[0] for r in await cur.fetchall()}


async def _workflow_tables(ctx: _Ctx, prefix: str, required: set[str]) -> list[tuple[str, str, set[str]]]:
    """[(workflow name, table name, columns)] for workflow.<prefix><8 hex> tables of live workflows."""
    if not {"Id", "Name", "TenantId", "IsDeleted"} <= await _columns(ctx.conn, "workflow", "Workflows"):
        return []
    cur = await ctx.conn.execute(
        """SELECT "Id", "Name" FROM workflow."Workflows" WHERE "TenantId" = %s AND "IsDeleted" = false ORDER BY "Name" """,
        (ctx.tenant_id,),
    )
    out = []
    for wf_id, name in await cur.fetchall():
        suffix = str(wf_id).replace("-", "")[:8].lower()
        if not _TABLE_SUFFIX.match(suffix):
            continue
        table = f"{prefix}{suffix}"
        cols = await _columns(ctx.conn, "workflow", table)
        if cols and required <= cols:
            out.append((name, table, cols))
    return out


def _empty(columns: tuple[Col, ...]) -> sql.Composable:
    pg = {"text": "text", "number": "numeric", "date": "timestamptz"}
    return sql.SQL("SELECT {} WHERE false").format(
        sql.SQL(", ").join(sql.SQL("NULL::{} AS {}").format(sql.SQL(pg[c.dtype]), sql.Identifier(f"c{i}")) for i, c in enumerate(columns))
    )


_REQUEST_LINKS = (Col("instanceId", role="link"), Col("workflowId", role="link"))
_FILE_LINKS = (Col("itemId", role="link"), Col("repositoryId", role="link"))


def _status_label(expr: sql.Composable) -> sql.Composable:
    whens = sql.SQL(" ").join(sql.SQL("WHEN {} THEN {}").format(sql.Literal(i), sql.Literal(lbl)) for i, lbl in enumerate(_STATUS_LABELS))
    return sql.SQL("(CASE {} {} ELSE ({})::text END)").format(expr, whens, expr)


# ---------------------------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------------------------

_CREDIT_COLS = (Col("Request No"), Col("Workflow"), Col("Skill"), Col("Status"),
                Col("Runs", "number", "measure", True), Col("Credits", "number", "measure", True),
                Col("Last Used", "date", "value")) + _REQUEST_LINKS


async def _ai_credit_consumption(ctx: _Ctx) -> tuple[sql.Composable, list[str]]:
    """Credits per request and skill. A charge belongs to an AP run (run_id); the run's item_key is
    the repository item of the invoice, whose workflow_instance_id is the request. Runs on direct
    uploads have no request: they show the invoice number (identify) instead, without a link."""
    ledger_cols = await _columns(ctx.conn, "public", "ap_credit_ledger")
    if not {"tenant_id", "skill_id", "credits", "status", "created_at"} <= ledger_cols:
        return _empty(_CREDIT_COLS), ["This organization has no AI credit ledger yet."]
    tid = ctx.bind(str(ctx.tenant_id))
    has_runs = {"id", "item_key"} <= await _columns(ctx.conn, "public", "ap_runs") and "run_id" in ledger_cols

    # repository item -> request id, for the items the AP runs processed
    item_parts = []
    if has_runs and {"Id", "ItemsTableName", "TenantId", "IsDeleted"} <= await _columns(ctx.conn, "repository", "Repositories"):
        cur = await ctx.conn.execute(
            """SELECT "ItemsTableName" FROM repository."Repositories" WHERE "TenantId" = %s AND "IsDeleted" = false""",
            (ctx.tenant_id,),
        )
        for (items_table,) in await cur.fetchall():
            if items_table and _ITEMS_TABLE.match(items_table) and {"id", "workflow_instance_id"} <= await _columns(
                    ctx.conn, "repository", items_table):
                item_parts.append(sql.SQL(
                    "SELECT (i.id)::text AS item_key, (i.workflow_instance_id)::text AS wi_id FROM {t} i "
                    "WHERE i.workflow_instance_id IS NOT NULL AND (i.id)::text IN (SELECT r0.item_key FROM public.ap_runs r0)"
                ).format(t=_t("repository", items_table)))
    # request id -> Request No / workflow
    inst_parts = []
    for name, table, cols in await _workflow_tables(ctx, "workflow_instances_", {"id"}):
        ref = sql.SQL("w.reference_number::text") if "reference_number" in cols else sql.SQL("(w.id)::text")
        wf = sql.SQL("(w.workflow_id)::text") if "workflow_id" in cols else sql.SQL("NULL::text")
        inst_parts.append(sql.SQL("SELECT (w.id)::text AS wi_id, {ref} AS ref, {wf} AS wf_id, {name}::text AS wf_name FROM {t} w").format(
            ref=ref, wf=wf, name=ctx.bind(name), t=_t("workflow", table)))

    items = sql.SQL(" UNION ALL ").join(item_parts) if item_parts else sql.SQL(
        "SELECT NULL::text AS item_key, NULL::text AS wi_id WHERE false")
    insts = sql.SQL(" UNION ALL ").join(inst_parts) if inst_parts else sql.SQL(
        "SELECT NULL::text AS wi_id, NULL::text AS ref, NULL::text AS wf_id, NULL::text AS wf_name WHERE false")
    runs_join = sql.SQL("LEFT JOIN public.ap_runs r ON r.id = l.run_id") if has_runs else sql.SQL(
        "LEFT JOIN (SELECT NULL::uuid AS id, NULL::text AS item_key WHERE false) r ON false")
    identify = sql.SQL("NULLIF(btrim(l.identify), '')") if "identify" in ledger_cols else sql.SQL("NULL::text")
    q = sql.SQL(
        """WITH items AS ({items}), insts AS ({insts})
           SELECT COALESCE(i.ref, {identify}, r.item_key, 'Not linked') AS c0, i.wf_name AS c1, l.skill_id AS c2,
                  l.status AS c3, COUNT(*) AS c4, COALESCE(SUM(l.credits), 0) AS c5, MAX(l.created_at) AS c6,
                  i.wi_id AS c7, i.wf_id AS c8
           FROM public.ap_credit_ledger l
           {runs_join}
           LEFT JOIN items it ON it.item_key = r.item_key
           LEFT JOIN insts i ON i.wi_id = it.wi_id
           WHERE lower(l.tenant_id) = lower({tid}) AND l.created_at >= {since} AND l.created_at < {until}
           GROUP BY 1, 2, 3, 4, i.wi_id, i.wf_id
           ORDER BY c6 DESC, c0, c2 LIMIT {limit}"""
    ).format(items=items, insts=insts, identify=identify, runs_join=runs_join, tid=tid,
             since=ctx.bind(ctx.since), until=ctx.bind(ctx.until), limit=sql.Literal(ctx.limit))
    return q, []


_PORTAL_COLS = (Col("Workflow"), Col("Month"), Col("Submitted", "number", "measure", True),
                Col("Completed", "number", "measure", True), Col("Pending", "number", "measure", True),
                Col("Failed / Cancelled", "number", "measure", True), Col("Completion %", "number", "measure"),
                Col("Avg Hours to Complete", "number", "measure"))


async def _portal_submission_performance(ctx: _Ctx) -> tuple[sql.Composable, list[str]]:
    tables = await _workflow_tables(ctx, "workflow_instances_", {"status", "created_at_utc"})
    if not tables:
        return _empty(_PORTAL_COLS), ["No workflow requests found."]
    parts = []
    for name, table, cols in tables:
        completed = sql.Identifier("completed_at_utc") if "completed_at_utc" in cols else sql.SQL("NULL::timestamptz")
        tenant = sql.SQL(" AND tenant_id = {}").format(ctx.bind(ctx.tenant_id)) if "tenant_id" in cols else sql.SQL("")
        parts.append(sql.SQL("SELECT {wf}::text AS wf, status, created_at_utc AS created, {done} AS done FROM {t} "
                             "WHERE created_at_utc >= {since} AND created_at_utc < {until}{tenant}").format(
            wf=ctx.bind(name), done=completed, t=_t("workflow", table), since=ctx.bind(ctx.since), until=ctx.bind(ctx.until), tenant=tenant))
    q = sql.SQL(
        """SELECT wf AS c0, to_char(date_trunc('month', created), 'YYYY-MM') AS c1, COUNT(*) AS c2,
                  COUNT(*) FILTER (WHERE status = 3) AS c3,
                  COUNT(*) FILTER (WHERE status IN (0, 1, 2)) AS c4,
                  COUNT(*) FILTER (WHERE status IN (4, 5)) AS c5,
                  round(100.0 * COUNT(*) FILTER (WHERE status = 3) / NULLIF(COUNT(*), 0), 1) AS c6,
                  round((AVG(EXTRACT(EPOCH FROM (done - created)) / 3600.0) FILTER (WHERE status = 3 AND done IS NOT NULL))::numeric, 1) AS c7
           FROM ({u}) s GROUP BY 1, 2 ORDER BY c1 DESC, c0 LIMIT {limit}"""
    ).format(u=sql.SQL(" UNION ALL ").join(parts), limit=sql.Literal(ctx.limit))
    return q, ["Every workflow request is counted as a submission (requests do not record a portal source)."]


_PENDING_COLS = (Col("Workflow"), Col("Request No"), Col("Status"), Col("Stage"), Col("Created By"), Col("Action By"),
                 Col("Created At", "date", "value"), Col("Modified At", "date", "value"),
                 Col("Days Pending", "number", "value")) + _REQUEST_LINKS


def _user_email(user_id: sql.Composable) -> sql.Composable:
    """users."Users".Email for a user id stored as uuid or text (NULL when unknown — never the raw id)."""
    return sql.SQL('(SELECT u."Email" FROM users."Users" u WHERE (u."Id")::text = NULLIF(btrim(({})::text), \'\') LIMIT 1)').format(user_id)


def _nonblank(expr: sql.Composable) -> sql.Composable:
    return sql.SQL("NULLIF(btrim(({})::text), '')").format(expr)


async def _pending_workflow_requests(ctx: _Ctx) -> tuple[sql.Composable, list[str]]:
    tables = await _workflow_tables(ctx, "workflow_instances_", {"id", "status", "created_at_utc"})
    if not tables:
        return _empty(_PENDING_COLS), ["No workflow requests found."]
    has_users = {"Id", "Email"} <= await _columns(ctx.conn, "users", "Users")
    parts = []
    for name, table, cols in tables:
        suffix = table.rsplit("_", 1)[1]
        inbox = f"inbox_{suffix}"
        inbox_cols = await _columns(ctx.conn, "workflow", inbox)
        pf_cols = await _columns(ctx.conn, "workflow", f"process_form_{suffix}")

        # Latest inbox row of the request: its stage, and who acted last (email preferred).
        if "workflow_instance_id" in inbox_cols:
            order = [c for c in ("started_at_utc", "created_at_utc", "transaction_created_at") if c in inbox_cols]
            order_sql = (sql.SQL(" ORDER BY COALESCE({}) DESC NULLS LAST").format(sql.SQL(", ").join(sql.Identifier("mb", c) for c in order))
                         if order else sql.SQL(""))
            latest = sql.SQL("FROM {ib} mb WHERE (mb.workflow_instance_id)::text = (wi.id)::text{o} LIMIT 1").format(
                ib=_t("workflow", inbox), o=order_sql)
            stage = sql.SQL("(SELECT mb.stage::text {})").format(latest) if "stage" in inbox_cols else sql.SQL("NULL::text")
            who = [_nonblank(sql.Identifier("mb", c)) for c in ("activity_user_email", "transaction_created_by_email") if c in inbox_cols]
            if has_users:
                who += [_user_email(sql.Identifier("mb", c)) for c in ("transaction_created_by", "user_id") if c in inbox_cols]
            if "created_by_name" in inbox_cols:
                who.append(_nonblank(sql.Identifier("mb", "created_by_name")))
            action_by = (sql.SQL("(SELECT COALESCE({w}) {l})").format(w=sql.SQL(", ").join(who), l=latest) if who
                         else sql.SQL("NULL::text"))
        else:
            stage = action_by = sql.SQL("NULL::text")

        # Request creator: the user who started it, else the one who created its form entry.
        creators = []
        if has_users and "started_by" in cols:
            creators.append(_user_email(sql.SQL("wi.started_by")))
        if has_users and {"workflow_instance_id", "created_by"} <= pf_cols:
            creators.append(sql.SQL("(SELECT {e} FROM {pf} pf WHERE pf.workflow_instance_id = wi.id LIMIT 1)").format(
                e=_user_email(sql.SQL("pf.created_by")), pf=_t("workflow", f"process_form_{suffix}")))
        created_by = sql.SQL("COALESCE({})").format(sql.SQL(", ").join(creators)) if creators else sql.SQL("NULL::text")

        modified = sql.SQL("wi.last_activity_at_utc") if "last_activity_at_utc" in cols else sql.SQL("NULL::timestamptz")
        ref = sql.SQL("wi.reference_number::text") if "reference_number" in cols else sql.SQL("(wi.id)::text")
        tenant = sql.SQL(" AND wi.tenant_id = {}").format(ctx.bind(ctx.tenant_id)) if "tenant_id" in cols else sql.SQL("")
        parts.append(sql.SQL(
            # Action By: nobody has acted yet on a request without an inbox entry, so its creator
            # (who submitted it) made the last action.
            "SELECT {wf}::text AS c0, {ref} AS c1, {status} AS c2, {stage} AS c3, {created_by} AS c4, "
            "COALESCE({action_by}, {created_by}) AS c5, wi.created_at_utc AS c6, {modified} AS c7, "
            "({asof} - (wi.created_at_utc AT TIME ZONE 'UTC')::date) AS c8, (wi.id)::text AS c9, {wf_id} AS c10 "
            "FROM {t} wi WHERE wi.status IN (0, 1, 2){tenant}").format(
            wf=ctx.bind(name), ref=ref, status=_status_label(sql.SQL("wi.status")), stage=stage, created_by=created_by,
            action_by=action_by, modified=modified, asof=ctx.bind(ctx.as_of, "date"), t=_t("workflow", table), tenant=tenant,
            wf_id=sql.SQL("(wi.workflow_id)::text") if "workflow_id" in cols else sql.SQL("NULL::text")))
    q = sql.SQL("SELECT * FROM ({u}) s ORDER BY c8 DESC NULLS LAST, c0 LIMIT {limit}").format(
        u=sql.SQL(" UNION ALL ").join(parts), limit=sql.Literal(ctx.limit))
    return q, []


_SLA_COLS = (Col("Workflow"), Col("Requests with SLA", "number", "measure", True),
             Col("Response Met", "number", "measure", True), Col("Response Breached", "number", "measure", True),
             Col("Resolution Met", "number", "measure", True), Col("Resolution Breached", "number", "measure", True),
             Col("In Progress", "number", "measure", True), Col("Escalated", "number", "measure", True),
             Col("Compliance %", "number", "measure"))


async def _workflow_sla_compliance(ctx: _Ctx) -> tuple[sql.Composable, list[str]]:
    need = {"response_deadline", "resolution_deadline", "response_achieved_at", "resolution_achieved_at", "is_escalated", "created_at_utc"}
    tables = await _workflow_tables(ctx, "workflow_instance_slas_", need)
    if not tables:
        return _empty(_SLA_COLS), ["No workflow has SLA tracking."]
    now = ctx.bind(ctx.until)
    parts = [
        sql.SQL("SELECT {wf}::text AS wf, s.* FROM {t} s WHERE s.created_at_utc >= {since} AND s.created_at_utc < {until}").format(
            wf=ctx.bind(name), t=_t("workflow", table), since=ctx.bind(ctx.since), until=ctx.bind(ctx.until))
        for name, table, _ in tables
    ]
    q = sql.SQL(
        """SELECT wf AS c0, COUNT(*) AS c1,
                  COUNT(*) FILTER (WHERE response_achieved_at IS NOT NULL AND response_achieved_at <= response_deadline) AS c2,
                  COUNT(*) FILTER (WHERE response_achieved_at > response_deadline
                                      OR (response_achieved_at IS NULL AND response_deadline < {now})) AS c3,
                  COUNT(*) FILTER (WHERE resolution_achieved_at IS NOT NULL AND resolution_achieved_at <= resolution_deadline) AS c4,
                  COUNT(*) FILTER (WHERE resolution_achieved_at > resolution_deadline
                                      OR (resolution_achieved_at IS NULL AND resolution_deadline < {now})) AS c5,
                  COUNT(*) FILTER (WHERE resolution_achieved_at IS NULL AND (resolution_deadline IS NULL OR resolution_deadline >= {now})) AS c6,
                  COUNT(*) FILTER (WHERE is_escalated) AS c7,
                  round(100.0 * COUNT(*) FILTER (WHERE resolution_achieved_at IS NOT NULL AND resolution_achieved_at <= resolution_deadline)
                        / NULLIF(COUNT(*) FILTER (WHERE resolution_achieved_at IS NOT NULL OR resolution_deadline < {now}), 0), 1) AS c8
           FROM ({u}) s GROUP BY 1 ORDER BY c8 ASC NULLS LAST, c0 LIMIT {limit}"""
    ).format(now=now, u=sql.SQL(" UNION ALL ").join(parts), limit=sql.Literal(ctx.limit))
    return q, []


_LOGIN_COLS = (Col("User"), Col("Logins", "number", "measure", True), Col("Web", "number", "measure", True),
               Col("Mobile", "number", "measure", True), Col("Distinct IPs", "number", "measure"),
               Col("Last Login", "date", "value"), Col("Security Events", "number", "measure", True),
               Col("Critical", "number", "measure", True), Col("Warnings", "number", "measure", True),
               Col("Permission Changes", "number", "measure", True))


async def _user_login_security(ctx: _Ctx) -> tuple[sql.Composable, list[str]]:
    has_login = {"Email", "LoggedFrom", "IpAddress", "CreatedAtUtc", "TenantId"} <= await _columns(ctx.conn, "auth", "LoginHistory")
    has_events = {"UserEmail", "Category", "Severity", "EventType", "CreatedAtUtc", "TenantId"} <= await _columns(ctx.conn, "activitylog", "EventLogs")
    if not (has_login or has_events):
        return _empty(_LOGIN_COLS), ["No login or activity logs found."]
    login = sql.SQL(
        """SELECT lower("Email") AS email, COUNT(*) AS logins, COUNT(*) FILTER (WHERE "LoggedFrom" = 'WEB') AS web,
                  COUNT(*) FILTER (WHERE "LoggedFrom" = 'MOBILE') AS mobile, COUNT(DISTINCT "IpAddress") AS ips,
                  MAX("CreatedAtUtc") AS last_login
           FROM auth."LoginHistory" WHERE "TenantId" = {tid} AND "CreatedAtUtc" >= {since} AND "CreatedAtUtc" < {until} GROUP BY 1"""
    ) if has_login else sql.SQL(
        "SELECT NULL::text AS email, 0::bigint AS logins, 0::bigint AS web, 0::bigint AS mobile, 0::bigint AS ips, NULL::timestamptz AS last_login WHERE false")
    events = sql.SQL(
        """SELECT lower("UserEmail") AS email, COUNT(*) FILTER (WHERE "Category" = 'Security') AS sec,
                  COUNT(*) FILTER (WHERE "Severity" = 'Critical') AS crit, COUNT(*) FILTER (WHERE "Severity" = 'Warning') AS warn,
                  COUNT(*) FILTER (WHERE "EventType" = 'Permission Changed') AS perm
           FROM activitylog."EventLogs" WHERE "TenantId" = {tid} AND "CreatedAtUtc" >= {since} AND "CreatedAtUtc" < {until}
             AND "UserEmail" IS NOT NULL GROUP BY 1"""
    ) if has_events else sql.SQL(
        "SELECT NULL::text AS email, 0::bigint AS sec, 0::bigint AS crit, 0::bigint AS warn, 0::bigint AS perm WHERE false")
    args = {"tid": ctx.bind(ctx.tenant_id), "since": ctx.bind(ctx.since), "until": ctx.bind(ctx.until)}
    q = sql.SQL(
        """WITH l AS ({login}), e AS ({events})
           SELECT COALESCE(l.email, e.email) AS c0, COALESCE(l.logins, 0) AS c1, COALESCE(l.web, 0) AS c2, COALESCE(l.mobile, 0) AS c3,
                  COALESCE(l.ips, 0) AS c4, l.last_login AS c5, COALESCE(e.sec, 0) AS c6, COALESCE(e.crit, 0) AS c7,
                  COALESCE(e.warn, 0) AS c8, COALESCE(e.perm, 0) AS c9
           FROM l FULL JOIN e ON e.email = l.email
           ORDER BY c7 DESC, c6 DESC, c1 DESC, c0 LIMIT {limit}"""
    ).format(login=login.format(**args), events=events.format(**args), limit=sql.Literal(ctx.limit))
    return q, []


_DOC_COLS = (Col("Document"), Col("Folder"), Col("Repository"), Col("When", "date", "value"), Col("Activity"),
             Col("Details"), Col("By")) + _FILE_LINKS

# items_<x>_history.history_operation is a trigger code (I/U/D, or the full word).
_DOC_OPERATION = sql.SQL(
    "(CASE upper(btrim(h.history_operation::text)) WHEN 'I' THEN 'Uploaded' WHEN 'INSERT' THEN 'Uploaded' "
    "WHEN 'U' THEN 'Updated' WHEN 'UPDATE' THEN 'Updated' WHEN 'D' THEN 'Deleted' WHEN 'DELETE' THEN 'Deleted' "
    "ELSE initcap(h.history_operation::text) END)"
)


async def _document_recent_activity(ctx: _Ctx) -> tuple[sql.Composable, list[str]]:
    if not {"Id", "Name", "ItemsTableName", "TenantId", "IsDeleted"} <= await _columns(ctx.conn, "repository", "Repositories"):
        return _empty(_DOC_COLS), ["This organization has no document repositories."]
    cur = await ctx.conn.execute(
        """SELECT "Id", "Name", "ItemsTableName" FROM repository."Repositories"
           WHERE "TenantId" = %s AND "IsDeleted" = false ORDER BY "Name" """,
        (ctx.tenant_id,),
    )
    repos = await cur.fetchall()
    has_folders = bool(await _columns(ctx.conn, "repository", "Folders"))
    has_meta = {"RepositoryId", "ItemId", "FieldName", "OldValue", "NewValue", "ChangedBy", "ChangedAtUtc"} <= await _columns(
        ctx.conn, "repository", "ItemMetadataHistory")
    has_users = bool(await _columns(ctx.conn, "users", "Users"))
    parts = []
    for repo_id, repo_name, items_table in repos:
        if not items_table or not _ITEMS_TABLE.match(items_table):
            continue
        item_cols = await _columns(ctx.conn, "repository", items_table)
        hist_cols = await _columns(ctx.conn, "repository", f"{items_table}_history")

        def folder_of(alias: str) -> sql.Composable:
            if not has_folders:
                return sql.SQL("NULL::text")
            return sql.SQL('(SELECT f."Name" FROM repository."Folders" f WHERE f."Id" = {}.folder_id)').format(sql.Identifier(alias))

        if {"history_recorded_at", "history_operation", "file_name", "folder_id"} <= hist_cols:
            by = sql.SQL("COALESCE(h.modified_by, h.created_by)") if {"modified_by", "created_by"} <= hist_cols else sql.SQL("NULL::uuid")
            parts.append(sql.SQL(
                "SELECT h.history_recorded_at AS at, {repo}::text AS repo, {folder} AS folder, h.file_name::text AS doc, "
                "{op} AS activity, NULLIF(concat_ws(' ', h.status, h.file_type), '') AS details, {by} AS by_id, "
                "(h.id)::text AS item_id, {rid}::text AS repo_id "
                "FROM {t} h WHERE h.history_recorded_at >= {since} AND h.history_recorded_at < {until}").format(
                repo=ctx.bind(repo_name), folder=folder_of("h"), op=_DOC_OPERATION, rid=ctx.bind(str(repo_id)),
                by=by, t=_t("repository", f"{items_table}_history"), since=ctx.bind(ctx.since), until=ctx.bind(ctx.until)))
        if has_meta:
            join_items = {"id", "file_name", "folder_id"} <= item_cols
            parts.append(sql.SQL(
                "SELECT m.\"ChangedAtUtc\" AS at, {repo}::text AS repo, {folder} AS folder, {doc} AS doc, "
                "'Metadata changed'::text AS activity, concat(m.\"FieldName\", ': ', COALESCE(m.\"OldValue\", '-'), ' -> ', COALESCE(m.\"NewValue\", '-')) AS details, "
                "m.\"ChangedBy\" AS by_id, (m.\"ItemId\")::text AS item_id, (m.\"RepositoryId\")::text AS repo_id "
                "FROM repository.\"ItemMetadataHistory\" m {join} "
                "WHERE m.\"RepositoryId\" = {rid} AND m.\"ChangedAtUtc\" >= {since} AND m.\"ChangedAtUtc\" < {until}").format(
                repo=ctx.bind(repo_name),
                folder=folder_of("i") if join_items else sql.SQL("NULL::text"),
                doc=sql.SQL("COALESCE(i.file_name::text, m.\"ItemId\"::text)") if join_items else sql.SQL("m.\"ItemId\"::text"),
                join=sql.SQL("LEFT JOIN {} i ON i.id = m.\"ItemId\"").format(_t("repository", items_table)) if join_items else sql.SQL(""),
                rid=ctx.bind(repo_id), since=ctx.bind(ctx.since), until=ctx.bind(ctx.until)))
    if not parts:
        return _empty(_DOC_COLS), ["No document activity is recorded for this organization."]
    user = (sql.SQL('COALESCE((SELECT u."Email" FROM users."Users" u WHERE u."Id" = s.by_id), s.by_id::text)') if has_users
            else sql.SQL("s.by_id::text"))
    q = sql.SQL("SELECT s.doc AS c0, s.folder AS c1, s.repo AS c2, s.at AS c3, s.activity AS c4, s.details AS c5, {user} AS c6, "
                "s.item_id AS c7, s.repo_id AS c8 "
                "FROM ({u}) s ORDER BY s.at DESC LIMIT {limit}").format(
        user=user, u=sql.SQL(" UNION ALL ").join(parts), limit=sql.Literal(ctx.limit))
    return q, []


TEMPLATES: dict[str, Template] = {t.key: t for t in (
    Template("ai_credit_consumption", "AI Credit Consumption",
             "AI credits used per skill and outcome over the last 90 days.", "tenant", 90, _CREDIT_COLS, _ai_credit_consumption),
    Template("portal_submission_performance", "Portal Submission Performance",
             "Requests submitted per workflow and month: completed, pending, failed, completion rate and average completion time "
             "(last 12 months).", "all_workflows", 365, _PORTAL_COLS, _portal_submission_performance),
    Template("user_login_security", "User Login and Security Activity",
             "Logins (web/mobile, IPs) and security, critical, warning and permission-change events per user over the last 30 days.",
             "tenant", 30, _LOGIN_COLS, _user_login_security),
    Template("workflow_sla_compliance", "Workflow SLA Compliance",
             "Response and resolution SLA met vs breached, in progress, escalations and compliance % per workflow (last 90 days).",
             "all_workflows", 90, _SLA_COLS, _workflow_sla_compliance),
    Template("pending_workflow_requests", "Pending Workflow Requests",
             "All open (pending, running, paused) requests across workflows with current stage and days pending.",
             "all_workflows", 0, _PENDING_COLS, _pending_workflow_requests),
    Template("document_recent_activity", "Document Recent Activity",
             "Document uploads, changes and metadata edits across all repositories and folders over the last 30 days.",
             "all_repositories", 30, _DOC_COLS, _document_recent_activity),
)}


async def compile_system_report(
    conn: AsyncConnection, tenant_id: uuid.UUID, key: str, *, as_of: date, limit: int
) -> CompiledQuery:
    template = TEMPLATES[key]
    until = datetime.combine(as_of + timedelta(days=1), time.min, tzinfo=timezone.utc)
    since = until - timedelta(days=template.window_days) if template.window_days else datetime(1970, 1, 1, tzinfo=timezone.utc)
    ctx = _Ctx(conn=conn, tenant_id=tenant_id, since=since, until=until, as_of=as_of, limit=max(1, limit), params={})
    query, warnings = await template.build(ctx)
    return CompiledQuery(query=query, params=ctx.params, columns=template.column_meta(), referenced_fields=set(), warnings=warnings)

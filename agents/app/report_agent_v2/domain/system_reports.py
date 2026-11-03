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
from dataclasses import dataclass, field
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
    # Credits charged through V6 billing (catalog DB): (activity, sub activity, credit, created_at, remarks, identify)
    billing: list = field(default_factory=list)

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

_CREDIT_COLS = (Col("Request No"), Col("Workflow"), Col("Skill"), Col("Billing Status"),
                Col("Runs", "number", "measure", True), Col("Credits", "number", "measure", True),
                Col("Last Used", "date", "value")) + _REQUEST_LINKS + _FILE_LINKS


# Skill names initcap() would get wrong; the rest read as "Extract Invoice", "Vendor Validate", ...
_SKILL_LABELS = {"po_match": "PO Match", "backorder_detect": "BackOrder Detect"}

_GUID = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
# Remark prefixes the V6 API writes before the file name (ActivityCreditTypes / RepositoriesController).
_REMARK_PREFIX = re.compile(r"^(OCR on upload:|OCR:|Intelligent upload|AI summary for item)\s*", re.I)
# The upload screen OCRs a working copy ("receipt_v4.pdf") and saves the file as "receipt.pdf":
# names match without a trailing _vN, case-insensitively (same rule in SQL below).
_VERSION_SUFFIX = re.compile(r"_v[0-9]+(\.[^.]*)?$")
_VERSION_SUFFIX_SQL = r"_v[0-9]+(\.[^.]*)?$"


def _match_name(name: str) -> str:
    return _VERSION_SUFFIX.sub(lambda m: m.group(1) or "", name).lower()


def _billing_entry(row: tuple) -> tuple:
    """(activity, file name, item id, repository id, credit, at) from a billing ledger row. identifyTable
    is repository.items/{repositoryId}/{itemId} (older rows: just repository.items, item in the remark)."""
    activity, sub, credit, at, remarks, identify = (tuple(row) + ("",))[:6]
    parts = (identify or "").split("/")
    repo = parts[1] if len(parts) > 1 and _GUID.fullmatch(parts[1]) else None
    item = parts[2] if len(parts) > 2 and _GUID.fullmatch(parts[2]) else None
    remark = (remarks or "").strip()
    if not item and remark.lower().startswith("ai summary for item"):
        found = _GUID.search(remark)
        item = found.group(0) if found else None
    name = _REMARK_PREFIX.sub("", remark).strip() or None
    if name and _GUID.fullmatch(name):
        name = None
    return activity or sub or "AI credit", name, item and item.lower(), repo and repo.lower(), int(credit or 0), at


async def _billing_rows(ctx: _Ctx) -> sql.Composable:
    """V6 billing charges (AI summary, OCR, intelligent upload, ...) read from the catalog DB, one row per
    activity and file, in the same columns as the AP ledger rows. The file is found by its item id, else by
    name (in its folder when known, nearest upload time), so the row can open it. Only successful charges
    are written to that ledger, so they are all "Charged"."""
    if not ctx.billing:
        return sql.SQL(
            "SELECT NULL::text AS c0, NULL::text AS c1, NULL::text AS c2, NULL::text AS c3, 0::bigint AS c4, "
            "0::bigint AS c5, NULL::timestamptz AS c6, NULL::text AS c7, NULL::text AS c8, NULL::text AS c9, "
            "NULL::text AS c10 WHERE false")
    entries = [_billing_entry(r) for r in ctx.billing]
    item_ids = sorted({e[2] for e in entries if e[2]})
    names = sorted({_match_name(e[1]) for e in entries if e[1]})

    file_parts = []
    if (item_ids or names) and {"Id", "Name", "ItemsTableName", "TenantId", "IsDeleted"} <= await _columns(
            ctx.conn, "repository", "Repositories"):
        cur = await ctx.conn.execute(
            """SELECT "Id", "Name", "ItemsTableName" FROM repository."Repositories" WHERE "TenantId" = %s AND "IsDeleted" = false""",
            (ctx.tenant_id,),
        )
        ids_param, names_param = ctx.bind(item_ids, "text[]"), ctx.bind(names, "text[]")
        for repo_id, repo_name, items_table in await cur.fetchall():
            if not (items_table and _ITEMS_TABLE.match(items_table)):
                continue
            cols = await _columns(ctx.conn, "repository", items_table)
            if not {"id", "file_name"} <= cols:
                continue
            created = sql.SQL("i.created_at_utc") if "created_at_utc" in cols else sql.SQL("NULL::timestamptz")
            file_parts.append(sql.SQL(
                "SELECT * FROM (SELECT lower(i.id::text) AS id, {repo}::text AS repo_id, {repo_name}::text AS repo_name, "
                "i.file_name::text AS file_name, lower(regexp_replace(i.file_name, {suffix}, '\\1')) AS match_name, "
                "{created} AS created_at FROM {t} i) x WHERE x.id = ANY({ids}) OR x.match_name = ANY({names})"
            ).format(repo=ctx.bind(str(repo_id).lower()), repo_name=ctx.bind(repo_name), created=created,
                     suffix=sql.Literal(_VERSION_SUFFIX_SQL), t=_t("repository", items_table), ids=ids_param, names=names_param))
    files = sql.SQL(" UNION ALL ").join(file_parts) if file_parts else sql.SQL(
        "SELECT NULL::text AS id, NULL::text AS repo_id, NULL::text AS repo_name, NULL::text AS file_name, "
        "NULL::text AS match_name, NULL::timestamptz AS created_at WHERE false")
    values = sql.SQL(", ").join(
        sql.SQL("({}, {}, {}, {}, {}, {}, {})").format(
            ctx.bind(activity, "text"), ctx.bind(name, "text"), ctx.bind(name and _match_name(name), "text"),
            ctx.bind(item, "text"), ctx.bind(repo, "text"), ctx.bind(credit, "bigint"), ctx.bind(at, "timestamptz"))
        for activity, name, item, repo, credit, at in entries
    )
    return sql.SQL(
        """WITH files AS ({files}), v(activity, fname, mname, item, repo, credit, at) AS (VALUES {values})
           SELECT COALESCE(f.file_name, v.fname, '-') AS c0, f.repo_name AS c1, v.activity AS c2, 'Charged'::text AS c3,
                  COUNT(*)::bigint AS c4, SUM(v.credit)::bigint AS c5, MAX(v.at) AS c6, NULL::text AS c7, NULL::text AS c8,
                  f.id AS c9, f.repo_id AS c10
           FROM v
           LEFT JOIN LATERAL (
               SELECT * FROM files f
               WHERE (v.item IS NOT NULL AND f.id = v.item)
                  OR (v.item IS NULL AND f.match_name = v.mname AND (v.repo IS NULL OR f.repo_id = v.repo))
               ORDER BY (f.id = v.item) DESC NULLS LAST,
                        abs(extract(epoch FROM (COALESCE(f.created_at, v.at) - v.at)))
               LIMIT 1) f ON true
           GROUP BY 1, 2, 3, f.id, f.repo_id"""
    ).format(files=files, values=values)


async def _ai_credit_consumption(ctx: _Ctx) -> tuple[sql.Composable, list[str]]:
    """Credits per request and skill. A charge belongs to an AP run (run_id); the run's item_key is
    the repository item of the invoice, whose workflow_instance_id is the request. Runs on direct
    uploads have no request: they show the invoice number (identify) instead, without a link."""
    ledger_cols = await _columns(ctx.conn, "public", "ap_credit_ledger")
    has_ledger = {"tenant_id", "skill_id", "credits", "status", "created_at"} <= ledger_cols
    if not has_ledger and not ctx.billing:
        return _empty(_CREDIT_COLS), ["This organization has no AI credit ledger yet."]
    billing = await _billing_rows(ctx)
    if not has_ledger:
        return sql.SQL("SELECT * FROM ({billing}) b ORDER BY c6 DESC, c0, c2 LIMIT {limit}").format(
            billing=billing, limit=sql.Literal(ctx.limit)), []
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
    # The ledger status is the outcome of the charge to V6 billing (/billing/credits/update),
    # not of the skill: "failed" means the skill ran but the credit was not deducted.
    # AP skill ids (backorder_detect) as readable names (BackOrder Detect).
    skill = sql.SQL("(CASE lower(l.skill_id) {} ELSE initcap(replace(l.skill_id, '_', ' ')) END)").format(
        sql.SQL(" ").join(sql.SQL("WHEN {} THEN {}").format(sql.Literal(k), sql.Literal(v)) for k, v in _SKILL_LABELS.items()))
    billing_status = sql.SQL(
        "(CASE lower(l.status) WHEN 'charged' THEN 'Charged' WHEN 'failed' THEN 'Not charged (billing call failed)' "
        "WHEN 'mocked' THEN 'Not charged (test mode)' ELSE l.status END)")
    q = sql.SQL(
        """WITH items AS ({items}), insts AS ({insts})
           SELECT COALESCE(i.ref, {identify}, r.item_key, 'Not linked') AS c0, i.wf_name AS c1, {skill} AS c2,
                  {billing_status} AS c3, COUNT(*) AS c4, COALESCE(SUM(l.credits), 0) AS c5, MAX(l.created_at) AS c6,
                  i.wi_id AS c7, i.wf_id AS c8, NULL::text AS c9, NULL::text AS c10
           FROM public.ap_credit_ledger l
           {runs_join}
           LEFT JOIN items it ON it.item_key = r.item_key
           LEFT JOIN insts i ON i.wi_id = it.wi_id
           WHERE lower(l.tenant_id) = lower({tid}) AND l.created_at >= {since} AND l.created_at < {until}
           GROUP BY 1, 2, 3, 4, i.wi_id, i.wf_id
           UNION ALL
           SELECT * FROM ({billing}) b
           ORDER BY c6 DESC, c0, c2 LIMIT {limit}"""
    ).format(items=items, insts=insts, identify=identify, skill=skill, billing_status=billing_status, billing=billing,
             runs_join=runs_join, tid=tid,
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


_DOC_COLS = (Col("Document"), Col("Repository"), Col("Updated On", "date", "value"), Col("Activity"),
             Col("Details"), Col("By")) + _FILE_LINKS

# Built-in columns of a repository items table; every other column is an index (metadata) field.
_ITEM_BUILTIN = {
    "id", "tenant_id", "repository_id", "folder_id", "storage_provider_id", "file_path", "file_name", "file_type",
    "file_size", "total_pages", "is_verified", "status", "ocr_score", "ai_status", "ocr_text", "ocr_json",
    "summary_json", "workflow_instance_id", "active_item", "created_at_utc", "modified_at_utc", "created_by",
    "modified_by", "is_deleted", "file_version", "Month", "Year", "Date",
}
_HISTORY_COLS = {"history_id", "history_operation", "history_recorded_at"}
_MAX_INDEX_FIELDS = 60  # index fields compared per repository


def _doc_change_part(
    ctx: _Ctx, repo_id: uuid.UUID, repo_name: str, items_table: str, cols: set[str], labels: dict[str, str],
    has_folders: bool,
) -> sql.Composable:
    """Activity rows of one repository from its items_<x>_history table.

    The history trigger stores a document's values *before* each change (operation U) or before
    deletion (D). So a history row is the "before" picture; the "after" picture is the item's next
    history row, or the current item when there is none. Comparing the two names what was done.
    """
    def old(c: str) -> sql.Composable:
        return sql.SQL("(h.{})::text").format(sql.Identifier(c))

    def new(c: str) -> sql.Composable:
        return sql.SQL("(CASE WHEN h.next_hid IS NULL THEN (c.{c})::text ELSE (nx.{c})::text END)").format(c=sql.Identifier(c))

    def norm(expr: sql.Composable) -> sql.Composable:
        # JSON values (e.g. extracted line items) are re-serialized with different spacing; ignore it.
        return sql.SQL(r"(CASE WHEN {e} ~ '^\s*[\[{{]' THEN regexp_replace({e}, '\s+', '', 'g') ELSE {e} END)").format(e=expr)

    def changed(*names: str) -> sql.Composable:
        present = [n for n in names if n in cols]
        if not present:
            return sql.SQL("false")
        return sql.SQL(" OR ").join(sql.SQL("({} IS DISTINCT FROM {})").format(norm(old(n)), norm(new(n))) for n in present)

    index_fields = [c for c in sorted(cols) if c not in _ITEM_BUILTIN and c not in _HISTORY_COLS][:_MAX_INDEX_FIELDS]

    def folder_name(expr: sql.Composable) -> sql.Composable:
        if not has_folders:
            return sql.SQL("NULL::text")
        return sql.SQL('(SELECT f."Name" FROM repository."Folders" f WHERE (f."Id")::text = {})').format(expr)

    actions = [
        sql.SQL("CASE WHEN {} THEN CASE WHEN {} = 'true' THEN 'Deleted' ELSE 'Restored' END END").format(
            changed("is_deleted"), new("is_deleted")) if "is_deleted" in cols else None,
        sql.SQL("CASE WHEN {} THEN CASE WHEN {} IS NULL THEN 'Unlinked from request' ELSE 'Linked to request' END END").format(
            changed("workflow_instance_id"), new("workflow_instance_id")) if "workflow_instance_id" in cols else None,
        sql.SQL("CASE WHEN {} THEN 'Moved' END").format(changed("folder_id")),
        sql.SQL("CASE WHEN {} THEN 'Renamed' END").format(changed("file_name")),
        sql.SQL("CASE WHEN {} THEN 'New version' END").format(changed("file_version", "file_size")),
        sql.SQL("CASE WHEN {} THEN 'Text extracted (OCR)' END").format(changed("ocr_text", "ocr_json")),
        sql.SQL("CASE WHEN {} THEN 'AI summary generated' END").format(changed("summary_json")),
        sql.SQL("CASE WHEN {} THEN 'Status changed' END").format(changed("status", "ai_status", "is_verified", "ocr_score")),
        # First time the index fields get values (after upload / archive): "Indexed"; later edits: "Index updated".
        sql.SQL("CASE WHEN {} THEN CASE WHEN {} THEN 'Indexed' ELSE 'Index updated' END END").format(
            changed(*index_fields),
            sql.SQL(" AND ").join(sql.SQL("NULLIF(btrim({}), '') IS NULL").format(old(f)) for f in index_fields))
        if index_fields else None,
    ]
    details = [
        sql.SQL("CASE WHEN {ch} AND {n} IS NOT NULL THEN 'Request ' || COALESCE((SELECT r.ref FROM insts r WHERE r.wi_id = {n}), {n}) END").format(
            ch=changed("workflow_instance_id"), n=new("workflow_instance_id")) if "workflow_instance_id" in cols else None,
        sql.SQL("CASE WHEN {} THEN 'to ' || COALESCE({}, '-') END").format(changed("folder_id"), folder_name(new("folder_id")))
        if "folder_id" in cols else None,
        sql.SQL("CASE WHEN {} THEN 'from ' || COALESCE({}, '-') END").format(changed("file_name"), old("file_name"))
        if "file_name" in cols else None,
        sql.SQL("CASE WHEN {} THEN 'status ' || COALESCE({}, '-') || ' -> ' || COALESCE({}, '-') END").format(
            changed("status"), old("status"), new("status")) if "status" in cols else None,
    ] + [
        sql.SQL(r"CASE WHEN {ch} THEN {lbl} || CASE WHEN {n} ~ '^\s*[\[{{]' THEN ': updated' ELSE ': ' || "
                "COALESCE(NULLIF(left({o}, 40), ''), '-') || ' -> ' || COALESCE(NULLIF(left({n}, 40), ''), '-') END END").format(
            ch=changed(f), lbl=ctx.bind(labels.get(f.lower(), f)), o=old(f), n=new(f))
        for f in index_fields
    ]
    activity = sql.SQL("concat_ws(', ', {})").format(sql.SQL(", ").join(a for a in actions if a is not None))
    detail = sql.SQL("concat_ws('; ', {})").format(sql.SQL(", ").join(d for d in details if d is not None) or sql.SQL("NULL"))
    by = (sql.SQL("COALESCE(CASE WHEN h.next_hid IS NULL THEN c.modified_by ELSE nx.modified_by END, h.modified_by, h.created_by)")
          if {"modified_by", "created_by"} <= cols else sql.SQL("NULL::uuid"))
    hist = _t("repository", f"{items_table}_history")
    return sql.SQL(
        "SELECT h.history_recorded_at AS at, {repo}::text AS repo, {folder} AS folder, h.file_name::text AS doc, "
        "CASE WHEN upper(btrim(h.history_operation::text)) IN ('D', 'DELETE') THEN 'Deleted' "
        "ELSE COALESCE(NULLIF({activity}, ''), 'Saved (no changes)') END AS activity, "
        "CASE WHEN upper(btrim(h.history_operation::text)) IN ('D', 'DELETE') THEN NULL ELSE NULLIF(left({detail}, 500), '') END AS details, "
        "{by} AS by_id, (h.id)::text AS item_id, {rid}::text AS repo_id "
        "FROM (SELECT x.*, lead(x.history_id) OVER (PARTITION BY x.id ORDER BY x.history_recorded_at, x.history_id) AS next_hid "
        "      FROM {hist} x WHERE x.history_recorded_at >= {since} AND x.history_recorded_at < {until}) h "
        "LEFT JOIN {hist} nx ON nx.history_id = h.next_hid "
        "LEFT JOIN {items} c ON h.next_hid IS NULL AND c.id = h.id"
    ).format(
        repo=ctx.bind(repo_name), folder=folder_name(sql.SQL("(h.folder_id)::text")), activity=activity, detail=detail,
        by=by, rid=ctx.bind(str(repo_id)), hist=hist, items=_t("repository", items_table),
        since=ctx.bind(ctx.since), until=ctx.bind(ctx.until),
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
    has_users = bool(await _columns(ctx.conn, "users", "Users"))
    has_field_names = {"RepositoryId", "Name", "SqlColumnName"} <= await _columns(ctx.conn, "repository", "RepositoryFields")

    parts = []
    for repo_id, repo_name, items_table in repos:
        if not items_table or not _ITEMS_TABLE.match(items_table):
            continue
        item_cols = await _columns(ctx.conn, "repository", items_table)
        hist_cols = await _columns(ctx.conn, "repository", f"{items_table}_history")
        if not {"id", "file_name"} <= item_cols:
            continue
        # New documents: the item's own creation (the history trigger only records changes). A file
        # moved in from the upload & index screen was archived (its stage row points to the item);
        # anything else was uploaded straight into the folder.
        stage_table = f"{items_table}_stage"
        archived = (sql.SQL("EXISTS (SELECT 1 FROM {} s WHERE s.promoted_item_id = c.id)").format(_t("repository", stage_table))
                    if "promoted_item_id" in await _columns(ctx.conn, "repository", stage_table) else sql.SQL("false"))
        if "created_at_utc" in item_cols:
            parts.append(sql.SQL(
                "SELECT c.created_at_utc AS at, {repo}::text AS repo, {folder} AS folder, c.file_name::text AS doc, "
                "CASE WHEN {archived} THEN 'Archived' ELSE 'Uploaded' END AS activity, {ftype} AS details, {by} AS by_id, "
                "(c.id)::text AS item_id, {rid}::text AS repo_id "
                "FROM {items} c WHERE c.created_at_utc >= {since} AND c.created_at_utc < {until}").format(
                repo=ctx.bind(repo_name), archived=archived,
                folder=(sql.SQL('(SELECT f."Name" FROM repository."Folders" f WHERE f."Id" = c.folder_id)')
                        if has_folders and "folder_id" in item_cols else sql.SQL("NULL::text")),
                ftype=sql.SQL("c.file_type::text") if "file_type" in item_cols else sql.SQL("NULL::text"),
                by=sql.SQL("c.created_by") if "created_by" in item_cols else sql.SQL("NULL::uuid"),
                rid=ctx.bind(str(repo_id)), items=_t("repository", items_table),
                since=ctx.bind(ctx.since), until=ctx.bind(ctx.until)))
        if {"history_id", "history_operation", "history_recorded_at"} <= hist_cols:
            labels: dict[str, str] = {}
            if has_field_names:
                rows = await (await ctx.conn.execute(
                    'SELECT "SqlColumnName", "Name" FROM repository."RepositoryFields" WHERE "RepositoryId" = %s',
                    (repo_id,))).fetchall()
                labels = {str(c).lower(): str(n) for c, n in rows if c and n}
            parts.append(_doc_change_part(ctx, repo_id, repo_name, items_table, item_cols & hist_cols, labels,
                                          has_folders))
    if not parts:
        return _empty(_DOC_COLS), ["No document activity is recorded for this organization."]

    # request id -> Request No, for "Linked to request" details
    inst_parts = [
        sql.SQL("SELECT (w.id)::text AS wi_id, {ref} AS ref FROM {t} w").format(
            ref=sql.SQL("w.reference_number::text") if "reference_number" in cols else sql.SQL("(w.id)::text"),
            t=_t("workflow", table))
        for _, table, cols in await _workflow_tables(ctx, "workflow_instances_", {"id"})
    ]
    insts = sql.SQL(" UNION ALL ").join(inst_parts) if inst_parts else sql.SQL(
        "SELECT NULL::text AS wi_id, NULL::text AS ref WHERE false")
    user = (sql.SQL('COALESCE((SELECT u."Email" FROM users."Users" u WHERE (u."Id")::text = (s.by_id)::text), (s.by_id)::text)')
            if has_users else sql.SQL("(s.by_id)::text"))
    q = sql.SQL(
        "WITH insts AS ({insts}) "
        "SELECT s.doc AS c0, s.repo AS c1, s.at AS c2, s.activity AS c3, s.details AS c4, {user} AS c5, "
        "s.item_id AS c6, s.repo_id AS c7 FROM ({u}) s ORDER BY s.at DESC LIMIT {limit}"
    ).format(insts=insts, user=user, u=sql.SQL(" UNION ALL ").join(parts), limit=sql.Literal(ctx.limit))
    return q, []


TEMPLATES: dict[str, Template] = {t.key: t for t in (
    Template("ai_credit_consumption", "AI Credit Consumption",
             "AI credits used per request and skill (AP agent), plus AI summary, OCR and intelligent upload credits from billing, over the last 90 days.", "tenant", 90, _CREDIT_COLS, _ai_credit_consumption),
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
             "What was done to each document across all repositories and folders over the last 30 days: uploaded, "
             "index fields updated (old -> new), linked to a request, text extracted, moved, renamed, deleted...",
             "all_repositories", 30, _DOC_COLS, _document_recent_activity),
)}


async def compile_system_report(
    conn: AsyncConnection, tenant_id: uuid.UUID, key: str, *, as_of: date, limit: int,
    billing_loader: Callable[[datetime, datetime], Awaitable[list]] | None = None,
) -> CompiledQuery:
    """billing_loader(since, until) returns V6 billing charges from the catalog DB (credit report only)."""
    template = TEMPLATES[key]
    until = datetime.combine(as_of + timedelta(days=1), time.min, tzinfo=timezone.utc)
    since = until - timedelta(days=template.window_days) if template.window_days else datetime(1970, 1, 1, tzinfo=timezone.utc)
    billing = list(await billing_loader(since, until)) if billing_loader and key == "ai_credit_consumption" else []
    ctx = _Ctx(conn=conn, tenant_id=tenant_id, since=since, until=until, as_of=as_of, limit=max(1, limit), params={},
               billing=billing)
    query, warnings = await template.build(ctx)
    return CompiledQuery(query=query, params=ctx.params, columns=template.column_meta(), referenced_fields=set(), warnings=warnings)

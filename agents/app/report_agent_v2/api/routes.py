"""HTTP endpoints: /api/report-agent-v2/* (mounted by factory.MOUNT_PATH)

Every route depends on tenant_user (policy TenantUser), which only resolves after the
authentication and tenant middleware have validated the token and the tenant membership.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import date
from typing import AsyncIterator, Literal

from fastapi import APIRouter, Depends, Query, Request, status
from psycopg import AsyncConnection
from psycopg import Error as PgError
from pydantic import ValidationError

from app.report_agent_v2.agents.definition_agent import GeneratedDefinition, SourceRef, load_catalog, with_ticket_columns
from app.report_agent_v2.agents.execution_agent import ExecutionOptions, load_report_for_user
from app.report_agent_v2.api.schemas import (
    CreateDefinitionRequest,
    ExecuteReportRequest,
    HighlightsRequest,
    PreviewDefinitionRequest,
    RegenerateDefinitionRequest,
    SaveDefinitionRequest,
    SourceSelection,
    _SpecPayload,
)
from app.report_agent_v2.domain import source_catalog, store, system_reports
from app.report_agent_v2.domain.ai_definition import apply_ui_edits, build_ai_spec, report_type
from app.report_agent_v2.domain.compiler import CompiledQuery, SpecValidationError, compile_spec
from app.report_agent_v2.domain.executor import run_compiled, shape_result
from app.report_agent_v2.domain.source_catalog import SourceCatalog
from app.report_agent_v2.domain.spec import ReportSpec
from app.report_agent_v2.errors import BadRequestError, ConflictError, ForbiddenError, UnprocessableError
from app.report_agent_v2.security.authorization import ReportAccess, evaluate_report_access, tenant_admin, tenant_user
from app.report_agent_v2.security.principal import TenantContext

logger = logging.getLogger(__name__)

router = APIRouter(tags=["report-agent-v2"])
PREVIEW_ROWS = 50


async def tenant_connection(request: Request, ctx: TenantContext = Depends(tenant_user)) -> AsyncIterator[AsyncConnection]:
    """Connection to the validated tenant's database only (TenantConnectionMiddleware analogue)."""
    async with request.app.state.pools.tenant(ctx.conninfo) as conn:
        yield conn


def _source(body: SourceSelection) -> SourceRef:
    return SourceRef(body.source_type, body.workflow_id, body.workflow_name, body.repository_id, body.repository_name)


def _iso(value) -> str | None:
    return value.isoformat() if value else None


def _generated_payload(gen: GeneratedDefinition, prompt: str, duration_ms: float, ui_spec: dict | None = None) -> dict:
    """ReportAiDefinitionDto fields that come from a fresh generation (V6 "report AI definition")."""
    spec_json, prompt_text = build_ai_spec(
        gen.spec, gen.compiled, gen.catalog, prompt=prompt, warnings=gen.warnings, ui_spec=ui_spec
    )
    rtype = report_type(gen.catalog)
    return {
        "title": gen.spec.title,
        "name": gen.spec.title,
        "description": gen.spec.description,
        "reportType": rtype,
        "workflowName": gen.catalog.source_name if rtype == "specific_workflow" else None,
        "repositoryName": gen.catalog.source_name if rtype == "specific_repository" else None,
        "reportPrompt": prompt_text,
        "reportSpec": spec_json,
        "warnings": spec_json["warnings"],
        "schemaTables": spec_json["schemaTables"],
        "durationMs": round(duration_ms, 2),
        "model": gen.model,
        "attempts": gen.attempts,
    }


def _definition_dto(row: dict, access: ReportAccess, *, spec_version: int | None, model: str | None = None) -> dict:
    """A saved reporting."ReportAiDefinitions" row as V6's ReportAiDefinitionDto (+ v2 extras)."""
    spec = row.get("ReportSpec") or {}
    return {
        "id": str(row["Id"]),
        "reportId": str(row["Id"]),
        "sessionId": row.get("SessionId") or "",
        "name": row["Name"],
        "description": row.get("Description") or "",
        "reportType": row["ReportType"],
        "workflowName": row.get("WorkflowName"),
        "repositoryName": row.get("RepositoryName"),
        "title": spec.get("title") or row["Name"],
        "reportPrompt": row.get("ReportPrompt") or "",
        "reportSpec": spec,
        "warnings": spec.get("warnings") or [],
        "schemaTables": spec.get("schemaTables") or [],
        "status": row["Status"],
        "runs": row["Runs"],
        "lastRunAtUtc": _iso(row.get("LastRunAtUtc")),
        "createdAtUtc": _iso(row.get("CreatedAtUtc")),
        "modifiedAtUtc": _iso(row.get("ModifiedAtUtc")),
        "visibility": row.get("Visibility") or "Private",
        "sharedUsers": row.get("SharedUsers") or [],
        "sharedGroups": row.get("SharedGroups") or [],
        "canEdit": access.can_manage,
        "access": access.label,
        "specVersion": spec_version,
        "model": model,
    }


# ---------------------------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------------------------


@router.get("/sources/workflows")
async def list_workflows(ctx: TenantContext = Depends(tenant_user), conn: AsyncConnection = Depends(tenant_connection)) -> list[dict]:
    rows = await source_catalog.list_workflows(conn, ctx.tenant_id)
    return [{"workflowId": str(r["Id"]), "name": r["Name"], "formId": r["FormId"], "description": r["Description"]} for r in rows]


@router.get("/sources/fields")
async def source_fields(
    source_type: str = Query(alias="sourceType"),
    workflow_id: uuid.UUID | None = Query(default=None, alias="workflowId"),
    repository_id: uuid.UUID | None = Query(default=None, alias="repositoryId"),
    ctx: TenantContext = Depends(tenant_user),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    catalog = await load_catalog(conn, ctx, SourceRef(source_type, workflow_id=workflow_id, repository_id=repository_id))
    return {"sourceType": catalog.source_type, "sourceName": catalog.source_name, "sourceFormId": catalog.form_id, "fields": catalog.llm_view()}


# ---------------------------------------------------------------------------------------------
# Report definition agent
# ---------------------------------------------------------------------------------------------


async def _spec_from_payload(
    conn: AsyncConnection, ctx: TenantContext, body: _SpecPayload, source: SourceRef, settings
) -> tuple[ReportSpec, SourceCatalog, CompiledQuery, list[str]]:
    """Validate a client-sent reportSpec, apply the wizard's edits, compile and probe it read-only.

    The spec comes from the client, so it is treated like any other input: it must match the
    closed spec schema, and both the original and the edited spec must compile against the live
    source catalog and pass a read-only LIMIT 1 probe.
    """
    try:
        spec = ReportSpec.model_validate({**body.spec_dict(), "schemaVersion": 1})
    except (ValueError, ValidationError) as exc:
        details = [f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors()[:20]] if isinstance(exc, ValidationError) else [str(exc)]
        raise BadRequestError("reportSpec is not a valid report definition.", extra={"details": details}) from exc
    catalog = await load_catalog(conn, ctx, source)
    try:
        original = compile_spec(with_ticket_columns(spec, catalog), catalog, max_rows=settings.max_rows, limit_override=1)
        spec, edit_warnings = apply_ui_edits(with_ticket_columns(spec, catalog), body.report_spec, catalog, original)
        spec = with_ticket_columns(spec, catalog)
        compiled = compile_spec(spec, catalog, max_rows=settings.max_rows, limit_override=1)
        await run_compiled(conn, compiled, settings.statement_timeout_ms)
    except SpecValidationError as exc:
        raise UnprocessableError("reportSpec does not match this data source. Preview the report again.",
                                 extra={"details": exc.errors}) from exc
    except PgError as exc:
        raise UnprocessableError("reportSpec could not be run against this data source. Preview the report again.") from exc
    return spec, catalog, compiled, edit_warnings


@router.post("/definitions/preview")
async def preview_definition(
    body: PreviewDefinitionRequest,
    request: Request,
    ctx: TenantContext = Depends(tenant_user),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    """Generate and run a definition without saving it (the wizard's "Generate Report" preview).

    With a prompt: the LLM generates the spec. With reportSpec (from an earlier preview or a
    saved report) instead: that spec is re-run with the wizard's edits applied (selected columns,
    labels, filters, title), without any LLM call.
    """
    started = time.perf_counter()
    settings = request.app.state.settings
    if body.has_spec():
        spec, catalog, probe, edit_warnings = await _spec_from_payload(conn, ctx, body, _source(body), settings)
        gen = GeneratedDefinition(spec, catalog, probe, probe.warnings + edit_warnings, attempts=0, model=None)
        prompt = body.prompt or str((body.report_spec or {}).get("userPrompt") or "")
    else:
        gen = await request.app.state.definition_agent.generate(conn, ctx, _source(body), body.prompt, body.name)
        prompt = body.prompt
    duration_ms = (time.perf_counter() - started) * 1000
    compiled = compile_spec(gen.spec, gen.catalog, max_rows=settings.max_rows, limit_override=PREVIEW_ROWS)
    rows = await run_compiled(conn, compiled, settings.statement_timeout_ms)
    columns, out_rows, totals = shape_result(compiled.columns, rows)
    return {**_generated_payload(gen, prompt, duration_ms, ui_spec=body.report_spec),
            "preview": {"columns": columns, "rows": out_rows, "totals": totals, "rowCount": len(out_rows)}}


@router.post("/definitions/save", status_code=status.HTTP_201_CREATED)
async def save_previewed_definition(
    body: SaveDefinitionRequest,
    request: Request,
    ctx: TenantContext = Depends(tenant_user),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    """Save the definition returned by /definitions/preview, exactly as previewed (no LLM call).

    The wizard's edits on reportSpec (selected columns, labels, filters, title, highlight rules)
    are applied and kept. Send "id" to overwrite an existing report (owner or Admin only), and
    "status" ("Draft" / "Published") to change its status.
    """
    existing, access = None, ReportAccess(True, True, "owner")
    if body.report_id is not None:
        existing, access = await load_report_for_user(conn, ctx, body.report_id)
        if not access.can_manage:
            raise ForbiddenError("Only the owner or an Admin can update this report.")

    spec, catalog, compiled, edit_warnings = await _spec_from_payload(
        conn, ctx, body, _source(body), request.app.state.settings
    )

    report_id, version, row = await store.save_definition(
        conn, tenant_id=ctx.tenant_id, user_id=ctx.user_id, report_id=body.report_id, existing=existing,
        name=body.name or (existing or {}).get("Name") or spec.title,
        description=body.description if body.description is not None else ((existing or {}).get("Description") or spec.description),
        prompt=body.prompt, catalog=catalog, spec=spec, compiled=compiled, warnings=compiled.warnings + edit_warnings,
        model=body.model, visibility=body.visibility, shared_users=[str(u) for u in body.shared_users],
        shared_groups=[str(g) for g in body.shared_groups], session_id=body.session_id,
        ui_spec=body.report_spec, status=body.status,
    )
    return _definition_dto(row, access, spec_version=version, model=body.model)


@router.post("/definitions", status_code=status.HTTP_201_CREATED)
async def create_definition(
    body: CreateDefinitionRequest,
    request: Request,
    ctx: TenantContext = Depends(tenant_user),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    """Generate, validate and save into reporting."ReportAiDefinitions"."""
    started = time.perf_counter()
    gen = await request.app.state.definition_agent.generate(conn, ctx, _source(body), body.prompt, body.name)
    duration_ms = (time.perf_counter() - started) * 1000
    report_id, version, row = await store.save_definition(
        conn, tenant_id=ctx.tenant_id, user_id=ctx.user_id, report_id=None, existing=None,
        name=body.name or gen.spec.title, description=body.description or gen.spec.description,
        prompt=body.prompt, catalog=gen.catalog, spec=gen.spec, compiled=gen.compiled, warnings=gen.warnings,
        model=gen.model, visibility=body.visibility, shared_users=[str(u) for u in body.shared_users],
        shared_groups=[str(g) for g in body.shared_groups], session_id=body.session_id,
    )
    access = ReportAccess(True, True, "owner")
    return {**_definition_dto(row, access, spec_version=version, model=gen.model),
            "durationMs": round(duration_ms, 2), "attempts": gen.attempts}


@router.put("/definitions/{report_id}")
async def regenerate_definition(
    report_id: uuid.UUID,
    body: RegenerateDefinitionRequest,
    request: Request,
    ctx: TenantContext = Depends(tenant_user),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    definition, access = await load_report_for_user(conn, ctx, report_id)
    if not access.can_manage:
        raise ForbiddenError("Only the owner or an Admin can update this report.")
    if store.system_template_key(definition):
        raise ConflictError("Default reports are fixed and cannot be regenerated; create a new report from a prompt instead.")
    current = await store.load_active_spec(conn, ctx.tenant_id, report_id)
    if current is None:
        raise ConflictError("This report was not built by Report Agent v2; open it in the AI report builder instead.")
    prompt = body.prompt or current["Prompt"]
    source = SourceRef(current["SourceType"], workflow_id=current["WorkflowId"], repository_id=current["RepositoryId"])

    started = time.perf_counter()
    gen = await request.app.state.definition_agent.generate(conn, ctx, source, prompt, body.name or definition["Name"])
    duration_ms = (time.perf_counter() - started) * 1000
    _, version, row = await store.save_definition(
        conn, tenant_id=ctx.tenant_id, user_id=ctx.user_id, report_id=report_id, existing=definition,
        name=body.name or definition["Name"],
        description=body.description if body.description is not None else definition.get("Description"),
        prompt=prompt, catalog=gen.catalog, spec=gen.spec, compiled=gen.compiled, warnings=gen.warnings,
        model=gen.model, visibility=body.visibility,
        shared_users=[str(u) for u in body.shared_users] if body.shared_users is not None else [],
        shared_groups=[str(g) for g in body.shared_groups] if body.shared_groups is not None else [],
    )
    return {**_definition_dto(row, access, spec_version=version, model=gen.model),
            "durationMs": round(duration_ms, 2), "attempts": gen.attempts}


@router.put("/definitions/{report_id}/highlights")
async def update_report_highlights(
    report_id: uuid.UUID,
    body: HighlightsRequest,
    ctx: TenantContext = Depends(tenant_user),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    """Set column highlight rules on a saved report, default reports included (owner or Admin).

    Keys are the report's column keys; a column the report does not have is ignored.
    """
    _, access = await load_report_for_user(conn, ctx, report_id)
    if not access.can_manage:
        raise ForbiddenError("Only the owner or an Admin can change this report's highlights.")
    highlights = {key: (h.model_dump(by_alias=True, exclude_none=True) if h else None) for key, h in body.columns.items()}
    row = await store.update_highlights(conn, tenant_id=ctx.tenant_id, user_id=ctx.user_id, report_id=report_id,
                                        highlights=highlights)
    spec_row = await store.load_active_spec(conn, ctx.tenant_id, report_id)
    return _definition_dto(row, access, spec_version=spec_row["Version"] if spec_row else None,
                           model=spec_row["Model"] if spec_row else None)


@router.get("/definitions/{report_id}")
async def get_definition(
    report_id: uuid.UUID,
    ctx: TenantContext = Depends(tenant_user),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    definition, access = await load_report_for_user(conn, ctx, report_id)
    spec_row = await store.load_active_spec(conn, ctx.tenant_id, report_id)
    return _definition_dto(
        definition, access,
        spec_version=spec_row["Version"] if spec_row else None,
        model=spec_row["Model"] if spec_row else None,
    )


# ---------------------------------------------------------------------------------------------
# Report execution agent
# ---------------------------------------------------------------------------------------------


@router.post("/reports/{report_id}/execute")
async def execute_report(
    report_id: uuid.UUID,
    request: Request,
    body: ExecuteReportRequest | None = None,
    ctx: TenantContext = Depends(tenant_user),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    """Run a saved report. The body is optional: with no body (or {}) the saved definition runs as-is."""
    body = body or ExecuteReportRequest()
    options = ExecutionOptions(as_of=body.as_of_date, filters=list(body.filters), limit=body.limit)
    return await request.app.state.execution_agent.execute(conn, ctx, report_id, options)


@router.get("/reports/{report_id}/execute")
async def execute_report_by_id(
    report_id: uuid.UUID,
    request: Request,
    as_of_date: date | None = Query(default=None, alias="asOfDate"),
    limit: int | None = Query(default=None, ge=1, le=100_000),
    ctx: TenantContext = Depends(tenant_user),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    """Run a saved report with only its id (e.g. when a report is clicked in the list). No body needed."""
    options = ExecutionOptions(as_of=as_of_date, limit=limit)
    return await request.app.state.execution_agent.execute(conn, ctx, report_id, options)


@router.get("/reports")
async def list_reports(
    search: str | None = Query(default=None, max_length=200),
    kind: Literal["executable", "agent", "default", "all"] = Query(default="executable"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500, alias="pageSize"),
    ctx: TenantContext = Depends(tenant_user),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    """Saved reports the caller may see, newest first. Each item's id can be run with GET /reports/{id}/execute.

    kind: executable (default: agent + default reports, the ones this API can run), agent, default, or all
    (also lists reports saved by the old AI builder; those have "executable": false here).
    """
    # A tenant gets its default reports the first time an Admin opens the list (new tenants included),
    # so nobody has to call /defaults/install. Never blocks the list.
    if ctx.is_admin and kind != "agent":
        try:
            created = await store.install_missing_default_reports(
                conn, tenant_id=ctx.tenant_id, user_id=ctx.user_id, templates=system_reports.TEMPLATES.values())
            if created:
                logger.info("Installed %d default report(s) for tenant %s", created, ctx.tenant_id)
        except Exception:  # noqa: BLE001 -- the list still works without them
            logger.exception("Could not install default reports for tenant %s", ctx.tenant_id)
    groups = await store.user_group_ids(conn, ctx.user_id)
    visible = []
    for row in await store.list_definitions(conn, ctx.tenant_id, (search or "").strip() or None):
        if kind == "executable" and row["Kind"] == "legacy" or kind in ("agent", "default") and row["Kind"] != kind:
            continue
        access = evaluate_report_access(ctx, row["OwnerUserId"], row["Visibility"], row["SharedUsers"], row["SharedGroups"], groups)
        if access.can_view:
            visible.append((row, access))
    start = (page - 1) * page_size
    return {
        "total": len(visible),
        "page": page,
        "pageSize": page_size,
        "items": [
            {
                "id": str(row["Id"]),
                "name": row["Name"],
                "description": row["Description"] or "",
                "kind": row["Kind"],
                "executable": row["Kind"] != "legacy",
                "reportType": row["ReportType"],
                "workflowName": row["WorkflowName"],
                "repositoryName": row["RepositoryName"],
                "status": row["Status"],
                "runs": row["Runs"],
                "lastRunAtUtc": _iso(row["LastRunAtUtc"]),
                "createdAtUtc": _iso(row["CreatedAtUtc"]),
                "modifiedAtUtc": _iso(row["ModifiedAtUtc"]),
                "visibility": row["Visibility"] or "Private",
                "canEdit": access.can_manage,
                "access": access.label,
            }
            for row, access in visible[start:start + page_size]
        ],
    }


# ---------------------------------------------------------------------------------------------
# Default reports (fixed, tenant-wide, no LLM)
# ---------------------------------------------------------------------------------------------


async def _installed_defaults(conn: AsyncConnection, tenant_id: uuid.UUID) -> dict[str, str]:
    cur = await conn.execute(
        """SELECT "SessionId", "Id" FROM reporting."ReportAiDefinitions"
           WHERE "TenantId" = %s AND "SessionId" LIKE 'default:%%' AND "IsDeleted" = false""",
        (tenant_id,),
    )
    return {sid[len(store.DEFAULT_SESSION_PREFIX):]: str(rid) for sid, rid in await cur.fetchall()}


@router.get("/defaults")
async def list_default_reports(
    ctx: TenantContext = Depends(tenant_admin),
    conn: AsyncConnection = Depends(tenant_connection),
) -> list[dict]:
    """The default report catalog and, for each, the saved report id if installed (Admin)."""
    installed = await _installed_defaults(conn, ctx.tenant_id)
    return [
        {"key": t.key, "name": t.name, "description": t.description, "reportType": t.report_type,
         "windowDays": t.window_days or None, "columns": [c.label for c in t.columns],
         "installed": t.key in installed, "id": installed.get(t.key)}
        for t in system_reports.TEMPLATES.values()
    ]


@router.post("/defaults/install")
async def install_default_reports(
    ctx: TenantContext = Depends(tenant_admin),
    conn: AsyncConnection = Depends(tenant_connection),
) -> dict:
    """Save every default report into reporting."ReportAiDefinitions" (Admin). Safe to call again:
    reports that already exist are left as they are."""
    results = []
    for template in system_reports.TEMPLATES.values():
        row, created = await store.install_default_report(conn, tenant_id=ctx.tenant_id, user_id=ctx.user_id, template=template)
        results.append({"key": template.key, "name": template.name, "id": str(row["Id"]), "created": created})
    return {"installed": sum(r["created"] for r in results), "alreadyPresent": sum(not r["created"] for r in results),
            "reports": results}

"""Report Definition Agent.

Prompt -> source catalog -> LLM spec -> schema validation (compile) -> live probe against the
database (read-only, LIMIT 1) -> persisted, versioned definition.

Validation failures are fed back to the model for a bounded number of repair rounds, so a
spec is only ever saved once it compiles AND the database accepts the query.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from psycopg import AsyncConnection
from psycopg import Error as PgError
from pydantic import ValidationError

from app.report_agent_v2.agents.planner import ReportPlanner
from app.report_agent_v2.config import Settings
from app.report_agent_v2.domain import source_catalog
from app.report_agent_v2.domain.compiler import CompiledQuery, SpecValidationError, compile_spec
from app.report_agent_v2.domain.executor import run_compiled
from app.report_agent_v2.domain.source_catalog import SourceCatalog
from app.report_agent_v2.domain.spec import OutputColumn, ReportSpec
from app.report_agent_v2.errors import BadRequestError, UnprocessableError
from app.report_agent_v2.logging_setup import log_fields
from app.report_agent_v2.security.principal import TenantContext

logger = logging.getLogger(__name__)


@dataclass
class SourceRef:
    source_type: str  # Workflow | Folder
    workflow_id: uuid.UUID | None = None
    workflow_name: str | None = None
    repository_id: uuid.UUID | None = None
    repository_name: str | None = None


@dataclass
class GeneratedDefinition:
    spec: ReportSpec
    catalog: SourceCatalog
    compiled: CompiledQuery
    warnings: list[str]
    attempts: int
    model: str | None = None


async def load_catalog(conn: AsyncConnection, ctx: TenantContext, source: SourceRef) -> SourceCatalog:
    kind = (source.source_type or "").strip().lower()
    if kind == "workflow":
        return await source_catalog.load_workflow_catalog(conn, ctx.tenant_id, source.workflow_id, source.workflow_name)
    if kind in ("folder", "repository"):
        return await source_catalog.load_folder_catalog(conn, ctx.tenant_id, source.repository_id, source.repository_name)
    raise BadRequestError("sourceType must be 'Workflow' or 'Folder'.")


# Always shown on ticket-based (one row per request) workflow reports, in this order; the first
# available ref of each tuple is used (Created At falls back to the form submission time).
TICKET_COLUMNS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("sys.request_no",), "Request No"),
    (("sys.current_stage",), "Stage"),
    (("sys.created_by",), "Created By"),
    (("sys.last_action_by",), "Action By"),
    (("sys.request_raised_at", "sys.submitted_at"), "Created At"),
    (("sys.modified_at",), "Modified At"),
)


def with_ticket_columns(spec: ReportSpec, catalog: SourceCatalog) -> ReportSpec:
    """Add Request No / Stage / Created By / Action By / Created At / Modified At to a list report.

    Only for workflow reports with one row per request (no groupBy / measures): grouped totals
    have no single ticket per row. Columns the report already shows are not repeated; Request No
    goes first, the rest after the report's own columns.
    """
    if catalog.source_type != "Workflow" or spec.group_by or spec.measures:
        return spec
    shown = {c.ref for c in spec.columns}
    lead, tail = [], []
    for refs, label in TICKET_COLUMNS:
        ref = next((r for r in refs if r in catalog.fields), None)
        if ref is None or any(r in shown for r in refs):
            continue
        (lead if ref == "sys.request_no" else tail).append(OutputColumn(ref=ref, label=label))
    if not lead and not tail:
        return spec
    return spec.model_copy(update={"columns": lead + list(spec.columns) + tail})


def _pydantic_feedback(exc: ValidationError) -> list[str]:
    return [f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in exc.errors()[:20]]


class ReportDefinitionAgent:
    def __init__(self, planner: ReportPlanner, settings: Settings) -> None:
        self._planner = planner
        self._settings = settings

    async def generate(
        self, conn: AsyncConnection, ctx: TenantContext, source: SourceRef, prompt: str, name: str | None
    ) -> GeneratedDefinition:
        catalog = await load_catalog(conn, ctx, source)
        if not catalog.fields:
            raise BadRequestError(f"'{catalog.source_name}' has no reportable fields.")

        request = {
            "prompt": prompt,
            "name": name,
            "sourceType": catalog.source_type,
            "sourceName": catalog.source_name,
            "formName": catalog.form_name,
            "tenantId": str(ctx.tenant_id),  # selects the tenant's catalog model; not sent to the LLM
        }
        history: list = []
        feedback: list[str] | None = None
        attempts = 0
        model: str | None = None
        for attempt in range(1 + max(0, self._settings.agent_max_repair_attempts)):
            attempts = attempt + 1
            raw, history, model = await self._planner.plan(request, catalog.llm_view(), feedback, history)
            raw["schemaVersion"] = 1
            try:
                spec = with_ticket_columns(ReportSpec.model_validate(raw), catalog)
                compiled = compile_spec(spec, catalog, max_rows=self._settings.max_rows, limit_override=1)
                await run_compiled(conn, compiled, self._settings.statement_timeout_ms)
            except ValidationError as exc:
                feedback = _pydantic_feedback(exc)
            except SpecValidationError as exc:
                feedback = exc.errors
            except PgError as exc:
                diag = getattr(exc, "diag", None)
                message = (diag.message_primary if diag else None) or exc.__class__.__name__
                feedback = [f"The database rejected the generated query: {message}"]
            else:
                logger.info(
                    "Report spec generated",
                    extra=log_fields(attempts=attempts, source=catalog.source_name, columns=len(spec.columns)),
                )
                return GeneratedDefinition(spec, catalog, compiled, compiled.warnings, attempts, model)
            logger.info("Report spec rejected; repairing", extra=log_fields(attempt=attempts, errors=feedback))

        raise UnprocessableError(
            "The report agent could not build a valid report for this request. Try rephrasing it.",
            extra={"details": feedback or []},
        )

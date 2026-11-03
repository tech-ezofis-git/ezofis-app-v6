"""Report Execution Agent.

reportId -> saved definition (tenant-scoped, access-checked) -> active spec -> live catalog ->
compile -> read-only query -> structured result. No LLM call happens on execution: the saved
spec is the reusable schema.
"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timezone

from psycopg import AsyncConnection
from psycopg import Error as PgError
from pydantic import ValidationError

from app.report_agent_v2.agents.definition_agent import SourceRef, load_catalog, refresh_default_columns
from app.report_agent_v2.config import Settings
from app.report_agent_v2.db.catalog import CatalogStore
from app.report_agent_v2.domain import store, system_reports
from app.report_agent_v2.domain.compiler import SpecValidationError, compile_spec
from app.report_agent_v2.domain.executor import run_compiled, shape_result
from app.report_agent_v2.domain.spec import Condition, ReportSpec
from app.report_agent_v2.errors import AppError, BadRequestError, ConflictError, NotFoundError, UnprocessableError
from app.report_agent_v2.logging_setup import log_fields
from app.report_agent_v2.security.authorization import ReportAccess, evaluate_report_access
from app.report_agent_v2.security.principal import TenantContext

logger = logging.getLogger(__name__)


@dataclass
class ExecutionOptions:
    as_of: date | None = None
    filters: list[Condition] = field(default_factory=list)
    limit: int | None = None
    # Refresh button: bring the saved report's default columns up to date before running.
    refresh_defaults: bool = False


async def load_report_for_user(conn: AsyncConnection, ctx: TenantContext, report_id: uuid.UUID) -> tuple[dict, ReportAccess]:
    definition = await store.load_definition(conn, ctx.tenant_id, report_id)
    if definition is None:
        raise NotFoundError("Report not found.")
    access = evaluate_report_access(
        ctx,
        definition["OwnerUserId"],
        definition.get("Visibility"),
        definition.get("SharedUsers"),
        definition.get("SharedGroups"),
        await store.user_group_ids(conn, ctx.user_id),
    )
    if not access.can_view:
        raise NotFoundError("Report not found.")  # same answer as a missing id
    return definition, access


class ReportExecutionAgent:
    def __init__(self, settings: Settings, catalog: CatalogStore | None = None) -> None:
        self._settings = settings
        self._catalog = catalog  # V6 billing credits for the AI Credit Consumption default report

    async def execute(self, conn: AsyncConnection, ctx: TenantContext, report_id: uuid.UUID, options: ExecutionOptions) -> dict:
        definition, access = await load_report_for_user(conn, ctx, report_id)
        template_key = store.system_template_key(definition)
        if template_key:
            return await self._execute_system(conn, ctx, report_id, definition, template_key, options)
        spec_row = await store.load_active_spec(conn, ctx.tenant_id, report_id)
        if spec_row is None:
            raise ConflictError("This report has no agent specification. Create or regenerate it with the report agent.")
        try:
            spec = ReportSpec.model_validate(spec_row["SpecJson"])
        except ValidationError as exc:
            raise ConflictError("The saved report specification is invalid. Regenerate the report.") from exc

        source = SourceRef(
            source_type=spec_row["SourceType"],
            workflow_id=spec_row["WorkflowId"],
            repository_id=spec_row["RepositoryId"],
        )
        catalog = await load_catalog(conn, ctx, source)
        defaults_refreshed = spec_saved = False
        if options.refresh_defaults:
            spec, spec_row, defaults_refreshed, spec_saved = await self._refresh_defaults(
                conn, ctx, report_id, definition, access, spec_row, spec, catalog
            )
        # Resolve "today" once, in UTC, so aging buckets don't depend on the DB server timezone.
        options.as_of = options.as_of or datetime.now(timezone.utc).date()
        started = time.perf_counter()
        status, error, rows = "Failed", None, []
        try:
            try:
                compiled = compile_spec(
                    spec, catalog, max_rows=self._settings.max_rows, as_of=options.as_of,
                    extra_filters=options.filters, limit_override=options.limit,
                )
            except SpecValidationError as exc:
                # Runtime filters are user input (400); anything else means the source schema drifted (409).
                if options.filters and all(e.startswith("filter #") for e in exc.errors):
                    raise BadRequestError("Invalid runtime filter.", extra={"details": exc.errors}) from exc
                raise ConflictError(
                    "The report no longer matches its data source (a field was removed or renamed). Regenerate it.",
                    extra={"details": exc.errors},
                ) from exc
            warnings = list(compiled.warnings)
            if catalog.fingerprint(compiled.referenced_fields) != spec_row["SourceFingerprint"]:
                warnings.append("The data source schema changed since this report was generated; review the results.")
            try:
                rows = await run_compiled(conn, compiled, self._settings.statement_timeout_ms)
            except PgError as exc:
                logger.error("Report query failed", extra=log_fields(reportId=str(report_id), error=str(exc)[:500]))
                raise UnprocessableError("The report query failed against the current data. Regenerate the report.") from exc
            status = "Succeeded"
        except AppError as exc:
            error = exc.message
            raise
        finally:
            duration_ms = int((time.perf_counter() - started) * 1000)
            try:
                await store.record_run(
                    conn, tenant_id=ctx.tenant_id, report_id=report_id, spec_version=spec_row["Version"],
                    user_id=ctx.user_id, row_count=len(rows), duration_ms=duration_ms, status=status, error=error,
                )
            except PgError:
                logger.warning("Could not record report run", exc_info=True)

        columns, out_rows, totals = shape_result(compiled.columns, rows)
        limit = min(x for x in (spec.limit, options.limit, self._settings.max_rows) if x)
        logger.info("Report executed", extra=log_fields(reportId=str(report_id), rowCount=len(out_rows), durationMs=duration_ms))
        return {
            "reportId": str(report_id),
            "name": definition["Name"],
            "domain": definition["Domain"],
            "columns": columns,
            "rows": out_rows,
            "totals": totals,
            "rowCount": len(out_rows),
            "truncated": len(out_rows) >= limit,
            "workflowId": str(catalog.source_id) if catalog.source_type == "Workflow" else None,
            "sourceFormId": catalog.form_id,
            "specVersion": spec_row["Version"],
            "asOfDate": options.as_of.isoformat(),
            "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
            "assumptions": spec.assumptions,
            "warnings": warnings,
            "defaultsRefreshed": defaults_refreshed,
            "specSaved": spec_saved,
        }

    async def _refresh_defaults(
        self, conn: AsyncConnection, ctx: TenantContext, report_id: uuid.UUID, definition: dict,
        access: ReportAccess, spec_row: dict, spec: ReportSpec, catalog,
    ) -> tuple[ReportSpec, dict, bool, bool]:
        """(spec, spec_row, defaults changed, new version saved). No LLM call.

        Owner / Admin: the refreshed spec is saved as a new version, so later opens, exports and
        schedules show the same columns. Anyone else: it is used for this run only. A refresh that
        does not compile or cannot be saved falls back to the saved spec; the run never fails on it.
        """
        refreshed = refresh_default_columns(spec, catalog)
        if refreshed.dump() == spec.dump():
            return spec, spec_row, False, False
        try:
            probe = compile_spec(refreshed, catalog, max_rows=self._settings.max_rows, limit_override=1)
        except SpecValidationError as exc:
            logger.warning("Default column refresh skipped", extra=log_fields(reportId=str(report_id), errors=exc.errors[:5]))
            return spec, spec_row, False, False
        if not access.can_manage:
            return refreshed, spec_row, True, False
        try:
            _, version, _ = await store.save_definition(
                conn, tenant_id=ctx.tenant_id, user_id=ctx.user_id, report_id=report_id, existing=definition,
                name=definition["Name"], description=definition.get("Description"),
                prompt=spec_row.get("Prompt") or "", catalog=catalog, spec=refreshed, compiled=probe,
                warnings=list(spec_row.get("Warnings") or []), model=spec_row.get("Model"),
                visibility=None, shared_users=[], shared_groups=[], ui_spec=definition.get("ReportSpec"),
            )
        except PgError:
            logger.warning("Could not save refreshed default columns", exc_info=True,
                           extra=log_fields(reportId=str(report_id)))
            return refreshed, spec_row, True, False
        updated_row = {**spec_row, "Version": version,
                       "SourceFingerprint": catalog.fingerprint(probe.referenced_fields)}
        logger.info("Report default columns refreshed", extra=log_fields(reportId=str(report_id), specVersion=version))
        return refreshed, updated_row, True, True

    def _billing_loader(self, tenant_id: uuid.UUID):
        if self._catalog is None:
            return None
        catalog = self._catalog

        async def load(since: datetime, until: datetime) -> list[tuple]:
            return [(b.activity_type, b.sub_activity, b.credit, b.created_at, b.remarks, b.identify)
                    for b in await catalog.billing_credits(tenant_id, since, until)]

        return load

    async def _execute_system(
        self, conn: AsyncConnection, ctx: TenantContext, report_id: uuid.UUID, definition: dict, key: str, options: ExecutionOptions
    ) -> dict:
        """Run a default report (fixed read-only template, no LLM). Runtime filters do not apply."""
        if key not in system_reports.TEMPLATES:
            raise ConflictError("This default report is no longer available.")
        if options.filters:
            raise BadRequestError("Runtime filters are not supported for default reports; use asOfDate and limit.")
        options.as_of = options.as_of or datetime.now(timezone.utc).date()
        limit = min(x for x in (options.limit, self._settings.max_rows) if x)
        started = time.perf_counter()
        status, error, rows = "Failed", None, []
        try:
            compiled = await system_reports.compile_system_report(
                conn, ctx.tenant_id, key, as_of=options.as_of, limit=limit, billing_loader=self._billing_loader(ctx.tenant_id))
            try:
                rows = await run_compiled(conn, compiled, self._settings.statement_timeout_ms)
            except PgError as exc:
                logger.error("Default report query failed", extra=log_fields(reportId=str(report_id), error=str(exc)[:500]))
                raise UnprocessableError("The default report could not be run against this organization's data.") from exc
            status = "Succeeded"
        except AppError as exc:
            error = exc.message
            raise
        finally:
            duration_ms = int((time.perf_counter() - started) * 1000)
            try:
                await store.record_run(
                    conn, tenant_id=ctx.tenant_id, report_id=report_id, spec_version=0,
                    user_id=ctx.user_id, row_count=len(rows), duration_ms=duration_ms, status=status, error=error,
                )
            except PgError:
                logger.warning("Could not record report run", exc_info=True)

        columns, out_rows, totals = shape_result(compiled.columns, rows)
        template = system_reports.TEMPLATES[key]
        return {
            "reportId": str(report_id),
            "name": definition["Name"],
            "domain": template.report_type,
            "columns": columns,
            "rows": out_rows,
            "totals": totals,
            "rowCount": len(out_rows),
            "truncated": len(out_rows) >= limit,
            "defaultReport": key,
            "windowDays": template.window_days or None,
            "specVersion": 0,
            "asOfDate": options.as_of.isoformat(),
            "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
            "assumptions": [],
            "warnings": compiled.warnings,
        }

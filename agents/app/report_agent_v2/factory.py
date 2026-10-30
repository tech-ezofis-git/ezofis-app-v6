"""Report Agent v2 sub-application.

Mounted by the orchestrator (app/main.py) at report_agent_v2.MOUNT_PATH. Its middleware stack
is its own, so JWT validation and tenant resolution apply only to these routes; the
orchestrator's existing endpoints (including the in-process /api/report-agent/*) never pass
through it.

    app.mount(MOUNT_PATH, create_app(settings))
    await startup(sub_app, llm_adapter, catalog_store)   # orchestrator lifespan: Starlette does not run a mounted app's lifespan
    await shutdown(sub_app)
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request, Security
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader, HTTPBearer

from app.report_agent_v2.agents.definition_agent import ReportDefinitionAgent
from app.report_agent_v2.agents.execution_agent import ReportExecutionAgent
from app.report_agent_v2.agents.planner import OrchestratorLLMPlanner, ReportPlanner
from app.report_agent_v2.api.routes import router
from app.report_agent_v2.config import Settings, get_settings
from app.report_agent_v2.db.catalog import CatalogStore
from app.report_agent_v2.db.connstr import npgsql_to_conninfo
from app.report_agent_v2.db.pools import PoolRegistry
from app.report_agent_v2.errors import AppError
from app.report_agent_v2.logging_setup import correlation_id_var
from app.report_agent_v2.middleware.pipeline import (
    AuthenticationMiddleware,
    CorrelationIdMiddleware,
    RequestLoggingMiddleware,
    TenantMiddleware,
)
from app.report_agent_v2.security.jwt_validator import JwtValidator


def is_configured(settings: Settings) -> bool:
    return settings.enabled and bool(settings.catalog_connection_string)


def create_app(settings: Settings | None = None, planner: ReportPlanner | None = None, pools: PoolRegistry | None = None) -> FastAPI:
    settings = settings or get_settings()

    app = FastAPI(title="Report Agent v2", version="1.0.0")
    app.state.settings = settings
    app.state.pools = pools or PoolRegistry(
        npgsql_to_conninfo(settings.catalog_connection_string, application_name="report-agent-catalog"),
        settings.catalog_pool_max_size,
        settings.tenant_pool_max_size,
        settings.tenant_pool_cache_size,
    )
    app.state.catalog = CatalogStore(app.state.pools, settings.tenant_cache_ttl_seconds)
    app.state.jwt_validator = JwtValidator(settings)
    # Without an injected planner, startup() wires the orchestrator's shared LLM adapter.
    app.state.definition_agent = ReportDefinitionAgent(planner, settings) if planner else None
    app.state.execution_agent = ReportExecutionAgent(settings)

    # Starlette runs the LAST added middleware first, so add innermost -> outermost.
    app.add_middleware(TenantMiddleware)
    app.add_middleware(AuthenticationMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["GET", "POST", "PUT"],
            allow_headers=["Authorization", "Content-Type", "X-Tenant-Id", "X-Correlation-ID"],
            expose_headers=["X-Correlation-ID"],
        )

    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse({"error": exc.message, "correlationId": correlation_id_var.get(), **exc.extra}, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [f"{'.'.join(str(p) for p in e['loc'] if p != 'body')}: {e['msg']}" for e in exc.errors()]
        return JSONResponse({"error": "Invalid request.", "details": details, "correlationId": correlation_id_var.get()}, status_code=400)

    @app.get("/health", include_in_schema=False)
    async def health() -> dict:
        return {"status": "ok"}

    # Documents the two headers so Swagger shows an "Authorize" button. auto_error=False: the
    # middleware (AuthenticationMiddleware / TenantMiddleware) is what actually enforces them.
    app.include_router(router, dependencies=[Security(HTTPBearer(auto_error=False)),
                                             Security(APIKeyHeader(name="X-Tenant-Id", auto_error=False))])
    return app


async def startup(app: FastAPI, llm: Any = None, catalog_store: Any = None) -> None:
    """Open pools and, unless a planner was injected, plan with the orchestrator's LLM."""
    if app.state.definition_agent is None:
        app.state.definition_agent = ReportDefinitionAgent(OrchestratorLLMPlanner(llm, catalog_store), app.state.settings)
    await app.state.pools.open()


async def shutdown(app: FastAPI) -> None:
    await app.state.jwt_validator.aclose()
    await app.state.pools.close()

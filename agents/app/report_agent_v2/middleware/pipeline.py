"""HTTP middleware pipeline.

Order (outermost first), matching v6api Program.cs:

    CorrelationIdMiddleware        -> app.UseCorrelationId()
    RequestLoggingMiddleware       -> UseSerilogRequestLogging + RequestPerformanceLoggingMiddleware
      (also the single exception boundary -> consistent {"error": ...} bodies)
    AuthenticationMiddleware       -> app.UseAuthentication()
    TenantMiddleware               -> EmailTenantResolutionMiddleware + TenantConnectionMiddleware

Authorization (per-endpoint policies and per-report ownership/sharing) runs as FastAPI
dependencies, the equivalent of [Authorize(Policy = ...)] plus the checks inside
ReportDefinitionService.
"""

from __future__ import annotations

import logging
import re
import time
import uuid

from psycopg import errors as pg_errors
from psycopg.rows import dict_row
from psycopg_pool import PoolTimeout
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.report_agent_v2.db.connstr import npgsql_to_conninfo
from app.report_agent_v2.errors import AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from app.report_agent_v2.logging_setup import correlation_id_var, log_fields, tenant_id_var, user_id_var
from app.report_agent_v2.security.principal import ADMIN_ROLES, Principal, TenantContext

logger = logging.getLogger("report_agent.http")

CORRELATION_HEADER = "X-Correlation-ID"
TENANT_HEADER = "X-Tenant-Id"
PUBLIC_PATHS = ("/health", "/docs", "/redoc", "/openapi.json")
_SAFE_CORRELATION = re.compile(r"^[A-Za-z0-9._\-]{1,128}$")


def _error(status: int, message: str, **extra: object) -> JSONResponse:
    body = {"error": message, "correlationId": correlation_id_var.get()}
    body.update(extra)
    return JSONResponse(body, status_code=status)


def _route_path(request: Request) -> str:
    # Mounted under the orchestrator: url.path carries the mount prefix (root_path).
    path, root = request.url.path, request.scope.get("root_path", "")
    return path[len(root):] if root and path.startswith(root) else path


def _is_public(request: Request) -> bool:
    path = _route_path(request)
    return path == "/" or any(path == p or path.startswith(p + "/") for p in PUBLIC_PATHS)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        incoming = request.headers.get(CORRELATION_HEADER, "")
        # The orchestrator's AuditMiddleware (outer) already assigned one; keep logs aligned.
        orchestrator_id = str(getattr(request.state, "correlation_id", "") or "")
        if _SAFE_CORRELATION.match(incoming):
            correlation_id = incoming
        elif _SAFE_CORRELATION.match(orchestrator_id):
            correlation_id = orchestrator_id
        else:
            correlation_id = uuid.uuid4().hex
        token = correlation_id_var.set(correlation_id)
        try:
            response = await call_next(request)
        finally:
            correlation_id_var.reset(token)
        response.headers[CORRELATION_HEADER] = correlation_id
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        started = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            return response
        except AppError as exc:
            status = exc.status_code
            return _error(exc.status_code, exc.message, **exc.extra)
        except Exception:  # noqa: BLE001 - last-resort boundary; details only go to the log
            logger.exception("Unhandled error")
            return _error(500, "An unexpected error occurred.")
        finally:
            logger.info(
                "HTTP %s %s -> %s",
                request.method,
                request.url.path,
                status,
                extra=log_fields(durationMs=round((time.perf_counter() - started) * 1000, 1), status=status),
            )


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """Validates the bearer token and attaches request.state.principal."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if _is_public(request) or request.method == "OPTIONS":
            return await call_next(request)
        auth = request.headers.get("Authorization", "")
        if not auth.lower().startswith("bearer ") or not auth[7:].strip():
            return _error(401, "Missing bearer token.")
        try:
            scheme, claims = await request.app.state.jwt_validator.validate(auth[7:].strip())
        except UnauthorizedError as exc:
            return _error(401, exc.message)
        principal = Principal.from_claims(scheme, claims)
        if not principal.subject:
            return _error(401, "Token has no subject.")
        request.state.principal = principal
        token = user_id_var.set(principal.subject)
        try:
            return await call_next(request)
        finally:
            user_id_var.reset(token)


class TenantMiddleware(BaseHTTPMiddleware):
    """Resolve and *authorize* the tenant, then bind its database connection info.

    v6api's HttpTenantProvider prefers the X-Tenant-Id header over the token's ``tid`` claim.
    This service keeps that precedence but never trusts the header on its own: the caller
    must either hold a token issued for that tenant, or be registered against it in
    catalog."UserTenants". The user must also exist (not soft-deleted) in the tenant's own
    users."Users" table.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if _is_public(request) or request.method == "OPTIONS":
            return await call_next(request)
        principal: Principal | None = getattr(request.state, "principal", None)
        if principal is None:
            return _error(401, "Not authenticated.")
        try:
            context = await self._resolve(request, principal)
        except AppError as exc:
            return _error(exc.status_code, exc.message, **exc.extra)
        except (PoolTimeout, pg_errors.OperationalError):
            # Catalog or tenant DB unreachable (bad host, firewall, down): say so, not a bare 500.
            logger.exception("Tenant resolution failed: database unreachable")
            return _error(503, "The tenant database directory is unavailable. Please retry later.")
        request.state.tenant = context
        token = tenant_id_var.set(str(context.tenant_id))
        try:
            return await call_next(request)
        finally:
            tenant_id_var.reset(token)

    async def _resolve(self, request: Request, principal: Principal) -> TenantContext:
        app = request.app
        catalog = app.state.catalog
        settings = app.state.settings

        tenant_id = await self._requested_tenant(request, principal, catalog)
        if tenant_id is None:
            raise BadRequestError("X-Tenant-Id header is required to select organization.")

        if principal.token_tenant_id != tenant_id:
            membership = await catalog.find_membership(tenant_id, principal.user_id, principal.email)
            if membership is None:
                logger.warning("Tenant access denied", extra=log_fields(requestedTenant=str(tenant_id)))
                raise ForbiddenError("You are not a member of this organization.")

        connection_string = await catalog.get_tenant_connection_string(tenant_id)
        if not connection_string:
            raise NotFoundError("Tenant not found or inactive.")
        conninfo = npgsql_to_conninfo(
            connection_string,
            username=settings.tenant_db_username,
            password=settings.tenant_db_password,
        )

        user = await self._tenant_user(app, conninfo, tenant_id, principal)
        if user is None:
            raise ForbiddenError("User is not active in this organization.")
        db_role = str(user.get("Role") or "")
        # Admin needs BOTH the token claim and the current tenant DB role, so a demoted
        # admin's still-unexpired token stops granting admin rights immediately.
        is_admin = principal.token_says_admin and db_role.lower() in ADMIN_ROLES
        return TenantContext(
            tenant_id=tenant_id,
            conninfo=conninfo,
            user_id=user["Id"],
            user_email=user.get("Email"),
            user_display_name=user.get("DisplayName"),
            db_role=db_role,
            is_admin=is_admin,
        )

    @staticmethod
    async def _requested_tenant(request: Request, principal: Principal, catalog) -> uuid.UUID | None:
        header = (request.headers.get(TENANT_HEADER) or "").strip()
        if header:
            try:
                return uuid.UUID(header)
            except ValueError:
                pass
            if "@" in header:
                # Email form only resolves for the caller's own email — never someone else's.
                if not principal.email or header.lower() != principal.email.lower():
                    raise ForbiddenError("X-Tenant-Id email does not match the signed-in user.")
                matches = await catalog.resolve_tenants_for_email(header)
                if len(matches) > 1:
                    raise ConflictError(
                        "Multiple tenants found for this email. Send X-Tenant-Id as the tenant GUID.",
                        extra={"requiresOrgSelection": True},
                    )
                if matches:
                    return matches[0].tenant_id
            raise UnauthorizedError("X-Tenant-Id is not a valid tenant identifier.")
        return principal.token_tenant_id

    @staticmethod
    async def _tenant_user(app, conninfo: str, tenant_id: uuid.UUID, principal: Principal) -> dict | None:
        try:
            async with app.state.pools.tenant(conninfo) as conn:
                cur = conn.cursor(row_factory=dict_row)
                await cur.execute(
                    """
                    SELECT "Id", "Email", "DisplayName", "Role"
                    FROM users."Users"
                    WHERE "TenantId" = %s
                      AND "IsDeleted" = false
                      AND ("Id" = %s::uuid OR (%s::uuid IS NULL AND lower("Email") = lower(%s::text)))
                    LIMIT 1
                    """,
                    (tenant_id, principal.user_id, principal.user_id, principal.email),
                )
                return await cur.fetchone()
        except pg_errors.UndefinedTable:
            return None  # fail closed: no users table means no verifiable membership


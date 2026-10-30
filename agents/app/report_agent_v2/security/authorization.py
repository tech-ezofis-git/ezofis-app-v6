"""Authorization: endpoint policies (FastAPI dependencies) and the per-report access policy.

The report policy is a port of ReportDefinitionService.CanSee / CanManage / AccessLabel:
  * owner or Admin  -> view, run, edit, regenerate, delete
  * shared user / member of a shared group -> view and run only
  * "Public" visibility -> every active tenant user can view and run (the wizard offers it)
  * anyone else -> the report does not exist for them (404, not 403, to avoid id probing)
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Request

from app.report_agent_v2.errors import ForbiddenError, UnauthorizedError
from app.report_agent_v2.security.principal import Principal, TenantContext


def current_principal(request: Request) -> Principal:
    principal = getattr(request.state, "principal", None)
    if principal is None:
        raise UnauthorizedError()
    return principal


def tenant_user(request: Request) -> TenantContext:
    """Policy TenantUser: any authenticated, tenant-validated, active user."""
    current_principal(request)
    tenant = getattr(request.state, "tenant", None)
    if tenant is None:
        raise UnauthorizedError("Tenant context was not established.")
    return tenant


def tenant_admin(request: Request) -> TenantContext:
    """Policy Admin."""
    tenant = tenant_user(request)
    if not tenant.is_admin:
        raise ForbiddenError("Admin role required.")
    return tenant


@dataclass(frozen=True)
class ReportAccess:
    can_view: bool
    can_manage: bool
    label: str  # owner | admin | shared


def _contains(tokens: list[str] | None, value: uuid.UUID) -> bool:
    for token in tokens or []:
        try:
            if uuid.UUID(str(token).strip()) == value:
                return True
        except ValueError:
            continue
    return False


def evaluate_report_access(
    ctx: TenantContext,
    owner_user_id: uuid.UUID,
    visibility: str | None,
    shared_users: list[str] | None,
    shared_groups: list[str] | None,
    user_group_ids: set[uuid.UUID],
) -> ReportAccess:
    if ctx.is_admin or owner_user_id == ctx.user_id:
        return ReportAccess(True, True, "owner" if owner_user_id == ctx.user_id else "admin")
    vis = (visibility or "Private").replace(" ", "").lower()
    in_users = _contains(shared_users, ctx.user_id)
    in_groups = any(_contains(shared_groups, g) for g in user_group_ids)
    can_view = in_users or in_groups or vis == "public"
    return ReportAccess(can_view, False, "shared")

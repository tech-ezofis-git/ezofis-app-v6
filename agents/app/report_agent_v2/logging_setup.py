"""Request-scoped log context (correlation, tenant, user).

Log formatting and handlers belong to the orchestrator (app.control.audit.configure_app_logging);
this module only carries the context the middleware binds and a helper for structured fields.
"""

from __future__ import annotations

import contextvars

correlation_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar("correlation_id", default=None)
tenant_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar("tenant_id", default=None)
user_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar("user_id", default=None)


def log_fields(**fields: object) -> dict:
    """Helper: logger.info("msg", extra=log_fields(rowCount=3))."""
    return {"fields": fields}

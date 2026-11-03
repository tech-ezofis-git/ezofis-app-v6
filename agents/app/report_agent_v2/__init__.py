"""Report Agent v2: natural-language prompt -> saved, reusable report spec -> live run.

Runs as a sub-app mounted at MOUNT_PATH with its own middleware (correlation -> logging ->
JWT -> tenant), so the orchestrator's other routes are unaffected. See factory.py.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI

logger = logging.getLogger(__name__)

MOUNT_PATH = "/api/report-agent-v2"


def build_mounted_app() -> FastAPI | None:
    """Build the sub-app, or None (logged) when unconfigured or misconfigured.

    Never raises: a bad REPORT_AGENT_* setting must not stop the orchestrator from starting.
    """
    from app.report_agent_v2.config import get_settings
    from app.report_agent_v2.factory import create_app, is_configured

    try:
        settings = get_settings()
        if not settings.enabled:
            logger.info("Report Agent v2 not mounted: REPORT_AGENT_V2_ENABLED is not true.")
            return None
        if not is_configured(settings):
            logger.info("Report Agent v2 not mounted: set REPORT_AGENT_CATALOG_CONNECTION_STRING or CATALOG_DATABASE_URL.")
            return None
        return create_app(settings)
    except Exception:  # noqa: BLE001 - keep the orchestrator up; details go to the log
        logger.exception("Report Agent v2 not mounted: configuration error.")
        return None


async def startup(app: FastAPI, llm_adapter: Any, catalog_store: Any) -> None:
    """Open pools; plan with the orchestrator's LLMAdapter and the tenant's "report" model."""
    from app.report_agent_v2.factory import startup as _startup

    try:
        await _startup(app, llm_adapter, catalog_store)
    except Exception:  # noqa: BLE001
        logger.exception("Report Agent v2 pools failed to open; its requests will fail until fixed.")


async def shutdown(app: FastAPI) -> None:
    from app.report_agent_v2.factory import shutdown as _shutdown

    await _shutdown(app)

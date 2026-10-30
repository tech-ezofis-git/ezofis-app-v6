"""Mounting: the v2 middleware guards only /api/report-agent-v2/*; host routes are untouched."""

from __future__ import annotations

import httpx
import pytest
from fastapi import FastAPI

from app import report_agent_v2
from app.report_agent_v2 import MOUNT_PATH
from app.report_agent_v2.config import Settings
from app.report_agent_v2.factory import create_app
from tests.report_agent_v2.conftest import SIGNING_KEY


class _NoPools:
    async def open(self) -> None: ...
    async def close(self) -> None: ...


def _host() -> FastAPI:
    host = FastAPI()

    @host.get("/api/report-agent/types")
    async def existing() -> list[str]:
        return ["in-process"]

    settings = Settings(REPORT_AGENT_CATALOG_CONNECTION_STRING="Host=127.0.0.1;Database=unused",
                        REPORT_AGENT_EZOFIS_AUTH_SIGNING_KEY=SIGNING_KEY)
    host.mount(MOUNT_PATH, create_app(settings, planner=object(), pools=_NoPools()))
    return host


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=_host()), base_url="http://test") as c:
        yield c


async def test_existing_routes_skip_v2_middleware(client):
    r = await client.get("/api/report-agent/types")  # no token, still served by the host
    assert r.status_code == 200
    assert r.json() == ["in-process"]


async def test_v2_routes_require_bearer_token(client):
    r = await client.get(f"{MOUNT_PATH}/sources/workflows")
    assert r.status_code == 401
    assert r.json()["error"] == "Missing bearer token."
    assert r.headers["X-Correlation-ID"]


async def test_v2_health_is_public_under_mount(client):
    r = await client.get(f"{MOUNT_PATH}/health")
    assert r.status_code == 200


def test_not_mounted_without_catalog(monkeypatch):
    from app.report_agent_v2.config import get_settings

    for name in ("REPORT_AGENT_CATALOG_CONNECTION_STRING", "CATALOG_DATABASE_URL"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    get_settings.cache_clear()
    try:
        assert report_agent_v2.build_mounted_app() is None
    finally:
        get_settings.cache_clear()


def test_catalog_falls_back_to_orchestrator_url(monkeypatch):
    monkeypatch.delenv("REPORT_AGENT_CATALOG_CONNECTION_STRING", raising=False)
    url = "postgresql://db.example.com:5432/catalog"
    monkeypatch.setenv("CATALOG_DATABASE_URL", url)
    monkeypatch.setitem(Settings.model_config, "env_file", None)  # ignore a local agents/.env
    assert Settings().catalog_connection_string == url


async def test_unreachable_catalog_is_503_not_500():
    import uuid
    from contextlib import asynccontextmanager

    from psycopg_pool import PoolTimeout

    from tests.report_agent_v2.conftest import make_token

    class _DownPools(_NoPools):
        @asynccontextmanager
        async def catalog(self):
            raise PoolTimeout("couldn't get a connection")
            yield  # pragma: no cover

    settings = Settings(REPORT_AGENT_CATALOG_CONNECTION_STRING="Host=127.0.0.1;Database=unused",
                        REPORT_AGENT_EZOFIS_AUTH_SIGNING_KEY=SIGNING_KEY)
    host = FastAPI()
    host.mount(MOUNT_PATH, create_app(settings, planner=object(), pools=_DownPools()))
    tid = uuid.uuid4()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=host), base_url="http://test") as c:
        r = await c.get(f"{MOUNT_PATH}/sources/workflows",
                        headers={"Authorization": f"Bearer {make_token(uuid.uuid4(), tid)}", "X-Tenant-Id": str(tid)})
    assert r.status_code == 503
    assert "unavailable" in r.json()["error"]


def _fresh_settings(monkeypatch, **env):
    from app.report_agent_v2.config import get_settings

    for name in ("REPORT_AGENT_V2_ENABLED", "REPORT_AGENT_CATALOG_CONNECTION_STRING", "CATALOG_DATABASE_URL",
                 "REPORT_AGENT_EZOFIS_AUTH_SIGNING_KEY", "EZOFIS_AUTH_SIGNING_KEY"):
        monkeypatch.delenv(name, raising=False)
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    get_settings.cache_clear()
    return get_settings


def test_off_by_default_even_with_a_catalog(monkeypatch):
    get_settings = _fresh_settings(monkeypatch, CATALOG_DATABASE_URL="postgresql://db.example.com:5432/catalog",
                                   EZOFIS_API_BASE="https://v6.example.com/api")
    try:
        assert report_agent_v2.build_mounted_app() is None
    finally:
        get_settings.cache_clear()


def test_mounted_when_enabled(monkeypatch):
    get_settings = _fresh_settings(monkeypatch, REPORT_AGENT_V2_ENABLED="true",
                                   CATALOG_DATABASE_URL="postgresql://db.example.com:5432/catalog",
                                   EZOFIS_API_BASE="https://v6.example.com/api")
    try:
        assert report_agent_v2.build_mounted_app() is not None
    finally:
        get_settings.cache_clear()


def test_safe_defaults_and_no_shared_signing_key_fallback(monkeypatch):
    _fresh_settings(monkeypatch, EZOFIS_AUTH_SIGNING_KEY="x" * 40)
    s = Settings()
    assert s.enabled is False
    assert s.ezofis_auth_signing_key is None  # the API's key is never picked up implicitly
    assert s.catalog_pool_max_size + s.tenant_pool_max_size * s.tenant_pool_cache_size <= 42

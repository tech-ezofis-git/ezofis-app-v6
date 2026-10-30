"""JwtValidator V6-session fallback: the V6 API decides when the local signing key can't."""

from __future__ import annotations

import time
import uuid

import httpx
import pytest

from app.report_agent_v2.config import Settings
from app.report_agent_v2.errors import ForbiddenError, UnauthorizedError, UpstreamError
from app.report_agent_v2.security.jwt_validator import V6_SESSION, JwtValidator
from tests.report_agent_v2.conftest import SIGNING_KEY, make_token

V6 = "https://v6.test/api"
SERVER_KEY = "rotated-server-key-0123456789-abcdefghijklmnop"  # what the live V6 API signs with


def _validator(handler, signing_key: str | None = SIGNING_KEY) -> tuple[JwtValidator, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def record(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return handler(request)

    settings = Settings(REPORT_AGENT_CATALOG_CONNECTION_STRING="x", REPORT_AGENT_V6_API_BASE=V6,
                        REPORT_AGENT_EZOFIS_AUTH_SIGNING_KEY=signing_key)
    return JwtValidator(settings, transport=httpx.MockTransport(record)), seen


async def test_local_key_match_skips_v6_call():
    validator, seen = _validator(lambda r: httpx.Response(500))
    scheme, _ = await validator.validate(make_token(uuid.uuid4(), uuid.uuid4()))
    assert scheme == "Ezofis" and seen == []


async def test_stale_key_falls_back_to_v6_session_and_caches():
    tid = uuid.uuid4()
    validator, seen = _validator(lambda r: httpx.Response(200, json={"id": "u"}))
    token = make_token(uuid.uuid4(), tid, key=SERVER_KEY)
    scheme, claims = await validator.validate(token)
    assert scheme == V6_SESSION and claims["tid"] == str(tid)
    (req,) = seen
    assert str(req.url) == f"{V6}/usersession"
    assert req.headers["authorization"] == f"Bearer {token}"
    assert req.headers["x-tenant-id"] == str(tid)
    await validator.validate(token)  # cached: no second call
    assert len(seen) == 1


async def test_no_local_key_uses_v6_session():
    validator, _ = _validator(lambda r: httpx.Response(200, json={}), signing_key=None)
    scheme, _ = await validator.validate(make_token(uuid.uuid4(), uuid.uuid4(), key=SERVER_KEY))
    assert scheme == V6_SESSION


@pytest.mark.parametrize(("status", "error"), [(401, UnauthorizedError), (404, ForbiddenError), (500, UpstreamError)])
async def test_v6_rejection_maps_to_errors(status, error):
    validator, _ = _validator(lambda r: httpx.Response(status))
    with pytest.raises(error):
        await validator.validate(make_token(uuid.uuid4(), uuid.uuid4(), key=SERVER_KEY))


async def test_v6_unreachable_is_upstream_error():
    def down(request):
        raise httpx.ConnectError("down", request=request)

    validator, _ = _validator(down)
    with pytest.raises(UpstreamError):
        await validator.validate(make_token(uuid.uuid4(), uuid.uuid4(), key=SERVER_KEY))


@pytest.mark.parametrize("overrides", [{"exp": int(time.time()) - 3600}, {"aud": "Other"}])
async def test_expired_or_wrong_audience_never_reaches_v6(overrides):
    validator, seen = _validator(lambda r: httpx.Response(200))
    with pytest.raises(UnauthorizedError):
        await validator.validate(make_token(uuid.uuid4(), uuid.uuid4(), key=SERVER_KEY, **overrides))
    assert seen == []


async def test_foreign_issuer_is_not_sent_to_v6():
    validator, seen = _validator(lambda r: httpx.Response(200))
    with pytest.raises(UnauthorizedError):
        await validator.validate(make_token(uuid.uuid4(), uuid.uuid4(), key=SERVER_KEY, iss="Someone"))
    assert seen == []

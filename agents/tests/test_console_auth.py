"""Test Console login (app/control/console_auth.py): every /console route
needs HTTP Basic credentials from settings; without configured credentials
the console is off (404); every other route is untouched.
"""
import base64

import pytest

from app.config import get_settings
from app.control.console_auth import check_basic_auth, console_auth_configured, is_console_path
from tests.conftest import CONSOLE_TEST_PASSWORD, CONSOLE_TEST_USER

USER = "ops-admin"
PASSWORD = "correct-horse-battery"


def _basic(credentials: str) -> str:
    return "Basic " + base64.b64encode(credentials.encode("utf-8")).decode("ascii")


# --- check_basic_auth ---------------------------------------------------


def test_check_basic_auth_accepts_correct_credentials():
    assert check_basic_auth(_basic(f"{USER}:{PASSWORD}"), USER, PASSWORD)


def test_check_basic_auth_accepts_password_containing_colons():
    assert check_basic_auth(_basic(f"{USER}:pass:with:colons"), USER, "pass:with:colons")


@pytest.mark.parametrize(
    "credentials",
    [
        "ops-admin:wrong-password-1",
        "someone-else:correct-horse-battery",
        "ops-admin:",
        ":correct-horse-battery",
        "no-separator",
    ],
)
def test_check_basic_auth_rejects_wrong_credentials(credentials):
    assert not check_basic_auth(_basic(credentials), USER, PASSWORD)


@pytest.mark.parametrize(
    "header",
    [None, "", "Basic", "Basic ", "Basic not-base64!!", "Bearer some.jwt.token"],
)
def test_check_basic_auth_rejects_missing_or_malformed_header(header):
    assert not check_basic_auth(header, USER, PASSWORD)


@pytest.mark.parametrize(
    "user,password,expected",
    [
        (USER, PASSWORD, True),
        ("", PASSWORD, False),
        ("   ", PASSWORD, False),
        (USER, "", False),
        (USER, "short-11chr", False),
    ],
)
def test_console_auth_configured(user, password, expected):
    assert console_auth_configured(user, password) is expected


@pytest.mark.parametrize(
    "path,expected",
    [
        ("/console", True),
        ("/console/llm-config", True),
        ("/console/catalog/tenants", True),
        ("/consoles", False),
        ("/chat", False),
        ("/health", False),
    ],
)
def test_is_console_path(path, expected):
    assert is_console_path(path) is expected


# --- middleware, through the app ----------------------------------------


def test_console_without_login_is_rejected_with_login_prompt(client):
    client.auth = None

    response = client.get("/console")

    assert response.status_code == 401
    assert response.headers["www-authenticate"].startswith("Basic realm=")
    assert "AI Orchestrator" not in response.text


def test_console_api_with_wrong_password_is_rejected(client):
    client.auth = (CONSOLE_TEST_USER, "wrong-password-123")

    assert client.get("/console/llm-config").status_code == 401
    assert client.get("/console/catalog/tenants").status_code == 401


def test_console_with_correct_login_serves_page(client):
    response = client.get("/console")

    assert response.status_code == 200
    assert "AI Orchestrator" in response.text


def test_llm_config_cannot_be_changed_without_login(client):
    before = client.get("/console/llm-config").json()

    client.auth = None
    response = client.post(
        "/console/llm-config",
        json={"model": "attacker-model", "api_base": "https://attacker.example.com", "api_key": "x"},
    )
    assert response.status_code == 401

    client.auth = (CONSOLE_TEST_USER, CONSOLE_TEST_PASSWORD)
    assert client.get("/console/llm-config").json() == before


@pytest.mark.parametrize("user,password", [("", ""), (CONSOLE_TEST_USER, ""), (CONSOLE_TEST_USER, "short-11chr")])
def test_console_is_off_without_valid_settings(client, monkeypatch, user, password):
    monkeypatch.setenv("CONSOLE_USER", user)
    monkeypatch.setenv("CONSOLE_PASSWORD", password)
    get_settings.cache_clear()

    assert client.get("/console").status_code == 404
    assert client.get("/console/llm-config").status_code == 404


def test_other_routes_need_no_console_login(client):
    client.auth = None

    assert client.get("/health").status_code == 200
    assert client.get("/metrics").status_code == 200

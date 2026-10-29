"""HTTP Basic auth gate for the operator Test Console — GET /console and
every /console/* API (LLM config, model catalog, agent packs, summary
skills, AP pipeline settings).

Those routes read and change runtime configuration (including which LLM
endpoint and key every agent uses), so they must never be reachable
without a login. One middleware covers the whole /console prefix, so a new
console route is protected without touching it.

Credentials come only from settings (CONSOLE_USER / CONSOLE_PASSWORD),
never from source control. When either is missing, or the password is
shorter than MIN_PASSWORD_LENGTH, the console is treated as switched off
and answers 404 — it can't end up open by mistake.

The browser shows its own login prompt (WWW-Authenticate) and then re-sends
the credentials on the console page's same-origin fetch() calls, so
app/static/console.html needs no changes. Every other route (/chat,
/health, agent APIs, ...) is untouched.
"""
import base64
import binascii
import hashlib
import hmac
import logging
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import get_settings

logger = logging.getLogger("orchestrator.console_auth")

MIN_PASSWORD_LENGTH = 12
_CONSOLE_PREFIX = "/console"
_WWW_AUTHENTICATE = 'Basic realm="EZOFIS Console", charset="UTF-8"'

_warned_disabled = False


def is_console_path(path: str) -> bool:
    """True for /console and anything below it, not for e.g. /consoles."""
    return path == _CONSOLE_PREFIX or path.startswith(_CONSOLE_PREFIX + "/")


def console_auth_configured(user: Optional[str], password: Optional[str]) -> bool:
    return bool(user and user.strip()) and bool(password) and len(password) >= MIN_PASSWORD_LENGTH


def _digest(value: str) -> bytes:
    return hashlib.sha256(value.encode("utf-8")).digest()


def check_basic_auth(authorization: Optional[str], user: str, password: str) -> bool:
    """Checks an Authorization header value ("Basic base64(user:password)")."""
    if not authorization:
        return False
    scheme, _, encoded = authorization.partition(" ")
    if scheme.lower() != "basic" or not encoded.strip():
        return False
    try:
        decoded = base64.b64decode(encoded.strip(), validate=True).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError):
        # Malformed header: a failed login, not a server error.
        return False

    given_user, separator, given_password = decoded.partition(":")
    if not separator or not given_user:
        return False

    # Compare both parts in constant time so timing doesn't reveal which was wrong.
    user_ok = hmac.compare_digest(_digest(given_user), _digest(user))
    password_ok = hmac.compare_digest(_digest(given_password), _digest(password))
    return user_ok and password_ok


class ConsoleAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not is_console_path(request.url.path):
            return await call_next(request)

        settings = get_settings()
        user, password = settings.console_user, settings.console_password
        if not console_auth_configured(user, password):
            global _warned_disabled
            if not _warned_disabled:
                logger.warning(
                    "Test Console is off: set CONSOLE_USER and CONSOLE_PASSWORD "
                    "(at least %d characters) to enable /console.",
                    MIN_PASSWORD_LENGTH,
                )
                _warned_disabled = True
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        if not check_basic_auth(request.headers.get("authorization"), user, password):
            return JSONResponse(
                {"detail": "Unauthorized"},
                status_code=401,
                headers={"WWW-Authenticate": _WWW_AUTHENTICATE},
            )
        return await call_next(request)

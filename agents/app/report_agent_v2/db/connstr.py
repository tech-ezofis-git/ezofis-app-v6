"""Translate Npgsql connection strings (as stored in catalog."Tenants") into libpq conninfo.

v6api stores ADO.NET-style strings such as
``Host=x;Port=5432;Database=t1;Username=<user>;Password=<password>;SSL Mode=Require;Trust Server Certificate=true``.
psycopg needs libpq keywords instead. Pool-size keys are dropped: pooling is owned by this
service (see TenantConnectionPool.Apply in v6api for the equivalent caps).
"""

from __future__ import annotations

from psycopg.conninfo import make_conninfo

_KEY_MAP = {
    "host": "host",
    "server": "host",
    "port": "port",
    "database": "dbname",
    "initialcatalog": "dbname",
    "username": "user",
    "userid": "user",
    "user": "user",
    "uid": "user",
    "password": "password",
    "pwd": "password",
    "sslmode": "sslmode",
    "timeout": "connect_timeout",
    "applicationname": "application_name",
}

_SSL_MAP = {
    "disable": "disable",
    "allow": "allow",
    "prefer": "prefer",
    "require": "require",
    "verifyca": "verify-ca",
    "verify-ca": "verify-ca",
    "verifyfull": "verify-full",
    "verify-full": "verify-full",
}


def _norm(key: str) -> str:
    return "".join(ch for ch in key.lower() if ch.isalnum())


def npgsql_to_conninfo(
    connection_string: str,
    *,
    username: str | None = None,
    password: str | None = None,
    application_name: str = "report-agent",
) -> str:
    """Return a libpq conninfo string. ``username``/``password`` override stored credentials."""
    raw = connection_string.strip()
    if raw.startswith(("postgres://", "postgresql://")):
        params: dict[str, str] = {}
        base = raw
    else:
        base = ""
        params = {}
        for part in raw.split(";"):
            if not part.strip() or "=" not in part:
                continue
            key, value = part.split("=", 1)
            mapped = _KEY_MAP.get(_norm(key))
            if mapped is None:
                continue  # Pooling, Maximum Pool Size, Command Timeout, Trust Server Certificate...
            value = value.strip()
            if mapped == "sslmode":
                value = _SSL_MAP.get(_norm(value), _SSL_MAP.get(value.lower(), "prefer"))
            params[mapped] = value

    if username:
        params["user"] = username
    if password:
        params["password"] = password
    params.setdefault("application_name", application_name)
    params.setdefault("connect_timeout", "15")
    return make_conninfo(base, **params)

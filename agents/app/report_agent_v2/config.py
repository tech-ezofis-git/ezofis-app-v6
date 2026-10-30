"""Report Agent v2 settings.

Names mirror the v6api_postgre appsettings sections (ConnectionStrings:DefaultConnection,
EzofisAuth, Auth0, AzureAd) so the same secrets can be wired into both services. Every value
comes from the environment (or the orchestrator's .env); nothing secret is ever returned to
clients. Every variable is prefixed REPORT_AGENT_ so it cannot collide with orchestrator
settings (LOG_LEVEL, MAX_ROWS, ...). Two fall back to the orchestrator's own settings: the
catalog to CATALOG_DATABASE_URL and the V6 API to EZOFIS_API_BASE. The module is off unless
REPORT_AGENT_V2_ENABLED=true.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Switch -----------------------------------------------------------------------------
    # Off by default so the module ships dark: nothing is mounted at /api/report-agent-v2 until
    # REPORT_AGENT_V2_ENABLED=true is set (and a catalog connection is configured).
    enabled: bool = Field(default=False, alias="REPORT_AGENT_V2_ENABLED")

    # --- Catalog (tenant registry) -------------------------------------------------------
    # Same value as v6api ConnectionStrings:DefaultConnection. Npgsql "Key=Value;" format or
    # a postgresql:// URL are both accepted. Unset -> the orchestrator's CATALOG_DATABASE_URL
    # (same catalog."Tenants" table); neither set -> the module is not mounted.
    catalog_connection_string: str | None = Field(
        default=None, validation_alias=AliasChoices("REPORT_AGENT_CATALOG_CONNECTION_STRING", "CATALOG_DATABASE_URL")
    )
    catalog_pool_max_size: int = Field(default=2, alias="REPORT_AGENT_CATALOG_POOL_MAX_SIZE")

    # --- Tenant databases ------------------------------------------------------------------
    # Host/port/database always come from catalog."Tenants"."ConnectionString". When these
    # are set, the user/password in that string are replaced with a least-privilege login
    # (see migrations/002_least_privilege_roles.sql). Strongly recommended in production.
    tenant_db_username: str | None = Field(default=None, alias="REPORT_AGENT_TENANT_DB_USERNAME")
    tenant_db_password: str | None = Field(default=None, alias="REPORT_AGENT_TENANT_DB_PASSWORD")
    # All tenant databases live on one shared Postgres server (with the API's pools), so the
    # worst case is catalog_pool_max_size + tenant_pool_max_size * tenant_pool_cache_size
    # connections per agents process: 2 + 2 * 20 = 42 with these defaults. Pools open
    # connections lazily (min_size 0) and close them after 20 s idle.
    tenant_pool_max_size: int = Field(default=2, alias="REPORT_AGENT_TENANT_POOL_MAX_SIZE")
    tenant_pool_cache_size: int = Field(default=20, alias="REPORT_AGENT_TENANT_POOL_CACHE_SIZE")
    tenant_cache_ttl_seconds: int = Field(default=300, alias="REPORT_AGENT_TENANT_CACHE_TTL_SECONDS")

    # --- Query guard rails -----------------------------------------------------------------
    statement_timeout_ms: int = Field(default=30_000, alias="REPORT_AGENT_STATEMENT_TIMEOUT_MS")
    max_rows: int = Field(default=10_000, alias="REPORT_AGENT_MAX_ROWS")  # ReportQueryService.MaxRows

    # --- Authentication (EzofisAuth) -------------------------------------------------------
    # Not recommended: the API's HS256 key would also let the agents mint tokens. Leave it unset
    # and tokens are checked by the V6 API itself (v6_api_base below). Explicit opt-in only:
    # deliberately no fallback to a shared EZOFIS_AUTH_SIGNING_KEY variable.
    ezofis_auth_signing_key: str | None = Field(default=None, alias="REPORT_AGENT_EZOFIS_AUTH_SIGNING_KEY")
    ezofis_auth_issuer: str = Field(default="Ezofis", alias="REPORT_AGENT_EZOFIS_AUTH_ISSUER")
    ezofis_auth_audience: str = Field(default="Ezofis", alias="REPORT_AGENT_EZOFIS_AUTH_AUDIENCE")
    # ASP.NET JwtBearer default ClockSkew is 5 minutes; keep parity unless told otherwise.
    jwt_clock_skew_seconds: int = Field(default=300, alias="REPORT_AGENT_JWT_CLOCK_SKEW_SECONDS")
    # V6 API that issued the token (base already ends in /api). When the signing key is not
    # set or does not verify a token, GET {base}/usersession with that token decides instead.
    # Falls back to the orchestrator's EZOFIS_API_BASE.
    v6_api_base: str | None = Field(
        default=None, validation_alias=AliasChoices("REPORT_AGENT_V6_API_BASE", "EZOFIS_API_BASE")
    )
    v6_session_cache_seconds: int = Field(default=120, alias="REPORT_AGENT_V6_SESSION_CACHE_SECONDS")

    # --- Optional external identity providers (same as v6api Auth0 / AzureAd) -------------
    auth0_domain: str | None = Field(default=None, alias="REPORT_AGENT_AUTH0_DOMAIN")
    auth0_audience: str | None = Field(default=None, alias="REPORT_AGENT_AUTH0_AUDIENCE")
    azuread_tenant_id: str | None = Field(default=None, alias="REPORT_AGENT_AZUREAD_TENANT_ID")
    azuread_audience: str | None = Field(default=None, alias="REPORT_AGENT_AZUREAD_AUDIENCE")

    # --- LLM (report definition agent) ---------------------------------------------------
    # The model comes from the orchestrator (catalog selection for agent "report", else LLM_MODEL).
    agent_max_repair_attempts: int = Field(default=2, alias="REPORT_AGENT_AGENT_MAX_REPAIR_ATTEMPTS")

    # --- HTTP ------------------------------------------------------------------------------
    cors_origins: list[str] = Field(default_factory=list, alias="REPORT_AGENT_CORS_ORIGINS")
    log_prompts: bool = Field(default=False, alias="REPORT_AGENT_LOG_PROMPTS")

    @field_validator("ezofis_auth_signing_key")
    @classmethod
    def _signing_key_length(cls, value: str | None) -> str | None:
        # EzofisAuthService.GenerateJwt refuses keys under 32 bytes; refuse to validate with one.
        if value is not None and len(value.strip().encode("utf-8")) < 32:
            raise ValueError("REPORT_AGENT_EZOFIS_AUTH_SIGNING_KEY must be at least 32 bytes.")
        return value.strip() if value else value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]

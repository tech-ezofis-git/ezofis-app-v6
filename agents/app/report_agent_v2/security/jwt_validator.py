"""JWT validation compatible with the v6api JwtBearer schemes.

* Ezofis  – HS256, IssuerSigningKey = UTF-8 bytes of EzofisAuth:SigningKey, ValidateIssuer,
            ValidateAudience, ValidateLifetime (EzofisAuthService.GenerateJwt).
* Auth0   – RS256 via the tenant JWKS (Authority = https://{domain}/).
* Entra   – RS256 via the Microsoft identity platform JWKS.
* V6 session – for Ezofis-issued tokens the signing key cannot verify (key not configured
            here, or rotated on the server): GET {V6 API}/usersession with the caller's own
            token. 200 means the V6 API accepted the token AND found the user in the token's
            tenant. Results are cached per token for a short time.

Signature (or the V6 API's acceptance), issuer, audience and expiry are always verified. The algorithm is pinned per
issuer so an RS256 public key can never be replayed as an HS256 secret (alg confusion), and
``alg: none`` is never accepted.
"""

from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass

import anyio
import httpx
import jwt
from jwt import PyJWKClient

from app.report_agent_v2.config import Settings
from app.report_agent_v2.errors import ForbiddenError, UnauthorizedError, UpstreamError

logger = logging.getLogger(__name__)

V6_SESSION = "V6Session"
_SESSION_CACHE_MAX = 1000


@dataclass(frozen=True)
class _Provider:
    name: str
    issuers: tuple[str, ...]
    audience: str
    algorithms: tuple[str, ...]
    key: str | None = None
    jwks: PyJWKClient | None = None


class JwtValidator:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._leeway = settings.jwt_clock_skew_seconds
        self._ezofis_issuer = settings.ezofis_auth_issuer
        self._ezofis_audience = settings.ezofis_auth_audience
        self._v6_base = (settings.v6_api_base or "").strip().rstrip("/") or None
        self._v6_ttl = max(0, settings.v6_session_cache_seconds)
        self._v6_transport = transport
        self._v6_client: httpx.AsyncClient | None = None
        self._v6_cache: dict[str, tuple[float, dict]] = {}
        self._providers: list[_Provider] = []
        if settings.ezofis_auth_signing_key:
            self._providers.append(
                _Provider(
                    name="Ezofis",
                    issuers=(settings.ezofis_auth_issuer,),
                    audience=settings.ezofis_auth_audience,
                    algorithms=("HS256",),
                    key=settings.ezofis_auth_signing_key,
                )
            )
        if settings.auth0_domain and settings.auth0_audience:
            domain = settings.auth0_domain.strip().rstrip("/")
            self._providers.append(
                _Provider(
                    name="Auth0",
                    issuers=(f"https://{domain}/",),
                    audience=settings.auth0_audience,
                    algorithms=("RS256",),
                    jwks=PyJWKClient(f"https://{domain}/.well-known/jwks.json", cache_keys=True),
                )
            )
        if settings.azuread_tenant_id and settings.azuread_audience:
            tid = settings.azuread_tenant_id.strip()
            self._providers.append(
                _Provider(
                    name="AzureAd",
                    issuers=(f"https://login.microsoftonline.com/{tid}/v2.0", f"https://sts.windows.net/{tid}/"),
                    audience=settings.azuread_audience,
                    algorithms=("RS256",),
                    jwks=PyJWKClient(
                        f"https://login.microsoftonline.com/{tid}/discovery/v2.0/keys", cache_keys=True
                    ),
                )
            )
        if not self._providers and not self._v6_base:
            raise RuntimeError("No JWT provider configured (set EZOFIS_AUTH_SIGNING_KEY or EZOFIS_API_BASE).")

    async def aclose(self) -> None:
        if self._v6_client is not None:
            await self._v6_client.aclose()
            self._v6_client = None

    async def validate(self, token: str) -> tuple[str, dict]:
        """Return (scheme name, verified claims) or raise UnauthorizedError."""
        try:
            # Unverified read is used ONLY to route to the provider owning this issuer;
            # the claims are then fully verified below before anything trusts them.
            unverified = jwt.decode(token, options={"verify_signature": False})
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("Malformed access token.") from exc

        issuer = unverified.get("iss")
        provider = next((p for p in self._providers if issuer in p.issuers), None)
        if provider is None and self._v6_base and issuer == self._ezofis_issuer:
            return V6_SESSION, await self._validate_with_v6(token, unverified)
        if provider is None:
            raise UnauthorizedError("Token issuer is not trusted.")
        if header.get("alg") not in provider.algorithms:
            raise UnauthorizedError("Token algorithm is not allowed.")

        try:
            if provider.jwks is not None:
                signing_key = (await anyio.to_thread.run_sync(provider.jwks.get_signing_key_from_jwt, token)).key
            else:
                signing_key = provider.key
            claims = jwt.decode(
                token,
                key=signing_key,
                algorithms=list(provider.algorithms),
                audience=provider.audience,
                issuer=list(provider.issuers),
                leeway=self._leeway,
                options={"require": ["exp", "iss", "aud"], "verify_signature": True},
            )
        except jwt.ExpiredSignatureError as exc:
            raise UnauthorizedError("Access token has expired.") from exc
        except jwt.InvalidSignatureError as exc:
            # Local key is stale (rotated on the V6 server): let the V6 API decide.
            if provider.name == "Ezofis" and self._v6_base:
                return V6_SESSION, await self._validate_with_v6(token, unverified)
            raise UnauthorizedError("Invalid access token.") from exc
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("Invalid access token.") from exc
        return provider.name, claims

    async def _validate_with_v6(self, token: str, unverified: dict) -> dict:
        """Accept an Ezofis token only if the V6 API that issued it accepts it."""
        # Cheap local checks first: wrong audience/issuer or expired never reaches the network.
        try:
            jwt.decode(
                token,
                # PyJWT skips exp/aud/iss when verify_signature is off unless re-enabled.
                options={"verify_signature": False, "verify_exp": True, "verify_aud": True, "verify_iss": True,
                         "require": ["exp", "iss", "aud"]},
                audience=self._ezofis_audience,
                issuer=self._ezofis_issuer,
                leeway=self._leeway,
            )
        except jwt.ExpiredSignatureError as exc:
            raise UnauthorizedError("Access token has expired.") from exc
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("Invalid access token.") from exc

        cache_key = hashlib.sha256(token.encode()).hexdigest()
        now = time.time()
        cached = self._v6_cache.get(cache_key)
        if cached and cached[0] > now:
            return cached[1]

        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        if unverified.get("tid"):
            headers["X-Tenant-Id"] = str(unverified["tid"])
        if self._v6_client is None:
            self._v6_client = httpx.AsyncClient(timeout=15, transport=self._v6_transport)
        try:
            resp = await self._v6_client.get(f"{self._v6_base}/usersession", headers=headers)
        except httpx.HTTPError as exc:
            logger.warning("V6 session check failed: %s", type(exc).__name__)
            raise UpstreamError("Could not verify the access token with the V6 API.") from exc

        if resp.status_code in (401, 403):
            raise UnauthorizedError("Invalid access token.")
        if resp.status_code == 404:
            raise ForbiddenError("User is not active in this organization.")
        if resp.status_code != 200:
            logger.warning("V6 session check returned %s", resp.status_code)
            raise UpstreamError("Could not verify the access token with the V6 API.")

        if len(self._v6_cache) >= _SESSION_CACHE_MAX:
            self._v6_cache = {k: v for k, v in self._v6_cache.items() if v[0] > now}
            if len(self._v6_cache) >= _SESSION_CACHE_MAX:
                self._v6_cache.clear()
        self._v6_cache[cache_key] = (min(float(unverified["exp"]), now + self._v6_ttl), unverified)
        return unverified

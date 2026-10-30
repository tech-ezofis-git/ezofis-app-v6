# Architecture

## Runtime picture (production)

```
Browser / Capacitor app
        │  HTTPS (TLS ends at Azure)
        ▼
┌──────────── app container (nginx :80, app/nginx.conf) ────────────┐
│  serves the SPA (app/dist)                                         │
│  /api/ezDataImport, /api/pdf/*, /api/report-agent/*  ─► agents:8000 │
│  /api/*                                              ─► api:5000    │
└────────────────────────────────────────────────────────────────────┘
        │                                   │
        ▼                                   ▼
  api (ASP.NET Core)  ◄── HTTP ──  agents (FastAPI)  (EZOFIS_API_BASE=http://app/api)
   │  Hangfire server in-process     │
   ├─ PostgreSQL catalog + tenant DBs ├─ PostgreSQL orchestrator DB (+ pgvector), catalog DB
   ├─ Redis (optional cache)          ├─ Redis (sessions, rate limit, cache)
   └─ Azure Blob Storage              └─ Azure OpenAI / Qwen LLMs, Azure Blob
```

Compose files: `docker-compose.yml` (simple app+api) and `docker-compose.azure.yml` (full stack). CI rewrites the live compose in `.github/scripts/deploy-azure-compose.sh`.

## Web front end — `app/`
Detailed notes are already in `app/CLAUDE.md`. Key points:
- Entry: `app/src/main.tsx` sets up the providers: Mantine, TanStack Query, MSAL, Google OAuth, Lingui and PostHog. The router tree is generated in `app/src/routeTree.gen.ts`.
- `app/src/routes/` contains thin file-based routes (`_app/` = signed-in shell, `_auth/`, `embed/`, `portal/`, `sign-request/`, `stories/`, `form-builder/`, `workflow-builder/`, `playground/`). The real UI lives in `app/src/pages/<feature>/`.
- `app/src/api/`: `axios.ts` has the V5 legacy clients (`_axios`, and `axiosCrypto` which AES-encrypts bodies). `axiosV6` (Bearer token) calls `VITE_V6_BASE_URL`. New work goes in `app/src/api/v6/` and `apiRouter.ts`.
- State: Zustand. The global session store is `app/src/stores/authUserStore.ts`. Feature stores sit next to their feature.
- Shared UI: `app/src/components/base` (wrapped Mantine components), `app/src/components/common`.
- `app/src/pages/mobile/` holds mobile screens, picked with `<AdaptiveScreen>`.

## Back-end API — `api/` (modular monolith, `api/SaaSApp.sln`)
- Entry: `api/src/Api/Program.cs`. It loads config (`appsettings*.json` + env vars) and sets up Serilog, multi-tenancy and the catalog, and Redis or in-memory cache. It configures JWT auth with three schemes (Entra ID, Auth0, Ezofis) and registers each module. It also sets up Hangfire (PostgreSQL storage, optional in-process server), controllers, MediatR, Swagger, health checks and CORS.
- `api/src/Api/Controllers/`: 35 REST controllers (Workflows, Form, Repositories, Dms, Dashboard, ReportBuilder, ReportAiBuilder, SignRequests, Connector, EmailIngest, BillingCredits, Branding, Users, Tenant, Signup, Admin/, Auth/, …).
- `api/src/Api/Middleware/`: tenant connection resolution, "schema ensuring" middlewares (these create or upgrade tenant tables on first use), activity/event/performance logging, repository share context.
- `api/src/BuildingBlocks/`: `Catalog` (tenant registry), `MultiTenancy` (tenant from the `X-Tenant-Id` header or the JWT `tid` claim), `Security` (JWT and policies), `Logging` (Serilog, correlation ID), `SharedKernel` (base entities, domain events).
- `api/src/Modules/<Name>/{Domain,Application,Infrastructure}`: Users, Workflow (the largest: designer, instances, forms, AP agent, SAP/HANA, end-sync), Repository, Dms, BlobStorage, Billing, Reporting, ActivityLog.
- `api/src/Workers/HangfireWorker`: a standalone Hangfire worker. Production runs the Hangfire server inside the API instead (`Hangfire__RunServerInApi=true`).
- `api/scripts/` and `api/scripts/postgres/`: SQL and PowerShell scripts for catalog and tenant schema. Some services load these at runtime (see the comment in `api/Dockerfile`).

Request flow: nginx → controller → service or MediatR handler → EF Core / Npgsql on the **tenant DB** chosen by `TenantConnectionMiddleware` → domain events are dispatched after `SaveChanges` → background work goes to Hangfire.

## AI agents — `agents/`
- Entry: `agents/app/main.py` (FastAPI). Main endpoints: `POST /chat`, `POST /actions/{id}/confirm`, `/health`, `/metrics`, `/console` (an admin UI for LLM config and agent packs), `/api/pdf/*`, `/api/report-agent/*`, `/api/ezDataImport`, `/api/agents/form-sync`, `/api/packaging/*`, plus the FTL router.
- Pipeline: guardrails (content filter → Redis rate limiter → permission check) → intent classification → dispatcher → agent. Every request writes a PII-redacted audit row to Postgres. See `agents/README.md`.
- Code layout: `agents/app/agents/` (agent implementations), `*_skills/` (prompt and skill packs), `ap_pipeline/`, `report_agent/`, `ftl/`, `llm/`, `control/` (guardrails, metrics), `integrations/`. `agents/skills/` holds the skill content files.
- DB migrations: `agents/db/migrations/*.sql`. They are applied by Postgres init scripts in `agents/docker-compose.yml`.
- Settings: `agents/app/config.py` (pydantic-settings, read from env / `.env`).

## Mobile — `mobile/`
This is a standalone React app. It calls the V6 API directly with a Bearer token and `X-Tenant-Id` (`mobile/src/api.js`, `wf.js`, `repo.js`). Details are in `mobile/CLAUDE.md`.

## External services
Azure OpenAI, a self-hosted Qwen endpoint, Google Gemini (called from the browser), Microsoft Entra ID, Google OAuth, Auth0, Azure Blob Storage, Application Insights, Azure Key Vault, PostHog, Collabora/WOPI office viewer, SAP/HANA, QuickBooks, WatchFox (webhook), Jira gateway (`api/tools/jira-gateway`), and the legacy EZOFIS V5 API (`eztapi.ezofis.com`).

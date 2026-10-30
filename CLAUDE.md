# CLAUDE.md — EZOFIS V6 monorepo

EZOFIS V6 is a multi-tenant SaaS platform for workflow automation, forms, document management (repository/DMS), e-signatures, dashboards and reports, with AI agents (AP invoice processing, OCR, summaries, chat/RAG). The monorepo holds four parts:
- `app/`: React 19 + Vite web SPA, also packaged with Capacitor
- `api/`: ASP.NET Core .NET 8 modular monolith on PostgreSQL, with Hangfire
- `agents/`: Python FastAPI AI orchestrator
- `mobile/`: a separate React 18 + Capacitor 7 app

In production, nginx in the `app` container routes `/api/*` to `api` and a few paths to `agents`. Everything runs on Azure App Service as multi-container Docker.

## Read first
- `app/CLAUDE.md` and `mobile/CLAUDE.md` have detailed per-project rules.
- Since the switch-over (30 Oct 2026), **all code is developed here**, including `api/` and `agents/`. The old `v6api` and `AIorchestrator` repos are no longer used and no longer copy into this repo.

## Branch flow
Work from **`testing`**, not `main`: `feature/…` → PR into `testing` → everyone tests locally with the test tenant → one PR `testing` → `main`, approved by `tech-ezofis-git` → deploy. Open PRs from your own GitHub account, never as `tech-ezofis-git`. Details: @docs/ai/CONVENTIONS.md

## Key commands
```bash
# Web app
cd app && npm install && npm run dev      # http://localhost:3000
npm run build | npm test | npm run type-check | npm run lint

# API
cd api && dotnet build SaaSApp.sln && dotnet test SaaSApp.sln
cd api/src/Api && dotnet run               # /swagger, /health

# Agents
cd agents && docker compose up -d          # :8010
cd agents && pytest

# Mobile
cd mobile && npm install && npm run dev
```
More details: @docs/ai/SETUP_AND_COMMANDS.md

## Important rules
- **Never commit secrets**, real customer data, or `.env` / `appsettings.*.json` with real values. Use `@example.com` test data. The repo is private now, but v6api is still public.
- **A merge to `main` deploys to production** (`.github/workflows/docker-ghcr.yml` → Azure `ezofis-app-v6`, `https://cloud.ezofis.com`), but **only if it came from a PR whose final commit was approved by `tech-ezofis-git`**. A direct push to `main`, or an unapproved PR, is not built or deployed. PRs into `testing` and `main` run the `PR checks` workflow (`.github/workflows/pr-checks.yml`).
- Secrets live in Azure App Settings only: `EzofisAuth__SigningKey`, `Hangfire__DashboardUser` / `Hangfire__DashboardPassword` (API) and `CONSOLE_USER` / `CONSOLE_PASSWORD` (agents). The deploy script never copies keys from files.
- Local testing against the shared database is **not safe yet**: a local API queues Hangfire jobs that production runs. Wait for the Hangfire separation fix.
- Never call write endpoints on `cloud.ezofis.com` from scripts or tests.
- Multi-tenant: every API call is scoped to a tenant (`X-Tenant-Id` header or JWT `tid`). Never mix tenant data.
- Web: thin routes in `src/routes`, UI in `src/pages`; use `components/base`; new APIs in `src/api/v6`; strings via Lingui; run `npm run lint`, which auto-sorts.
- Request actions: always validate form settings before stage settings (`validateBeforeAction`).
- API: Domain/Application/Infrastructure per module, registered through `Add<Module>*()` in `Program.cs`. Tenant schema changes need SQL in `api/scripts/postgres/` plus the schema-ensuring middleware.
- Agents: unit tests must not call real LLMs. `python -m app.evals.run` costs money.

## Reference docs
@docs/ai/OVERVIEW.md
@docs/ai/TECH_STACK.md
@docs/ai/ARCHITECTURE.md
@docs/ai/CONVENTIONS.md
@docs/ai/UPGRADE_NOTES.md

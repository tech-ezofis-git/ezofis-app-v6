# Setup and commands

Nothing here has been run during this analysis. Treat these as the documented commands.

## Web app — `app/`
Copy `app/.env.example` to `app/.env` and set the values. `VITE_BASE_URL` is required by `app/src/env.ts`.

```bash
cd app
npm install            # only package-lock.json is committed; Dockerfile uses `npm ci`
npm run dev            # Vite on http://localhost:3000
npm run build          # lingui extract + compile, vite build, tsc
npm run serve          # preview the production build
npm test               # vitest run (about 30 *.test.* files in src/)
npm run type-check     # tsc -b
npm run lint           # eslint . --fix   (note: this changes files)
npm run format         # prettier . --write (this changes files)
npm run pre-commit     # type-check + lint + format
```
Package manager: `app/CLAUDE.md` says to use pnpm, and there is a `pnpm-workspace.yaml`. But only `package-lock.json` is committed, and `pnpm-lock.yaml` is git-ignored. Which one is correct: Unknown – needs confirmation.

Single test: `npx vitest run src/features/sub-workflow/subWorkflow.test.ts`

Capacitor: `npx cap sync android|ios` after `npm run build`. The exact release steps: Unknown – needs confirmation.

## API — `api/`
Requirements: .NET 8 SDK, PostgreSQL (for a scratch DB: `docker compose -f api/docker-compose.postgres.yml up -d`, port 5433).

```bash
cd api
dotnet restore SaaSApp.sln
dotnet build SaaSApp.sln
dotnet test SaaSApp.sln                  # xUnit: Workflow.Infrastructure.Tests, Reporting.Infrastructure.Tests
cd src/Api && dotnet run                 # https://localhost:5001/swagger, /health, /hangfire
```
Config: copy `api/src/Api/appsettings.example.json` to `appsettings.Development.json`.
Background jobs: a local run (`Development`) uses its own Hangfire schema, `hangfire_local`, created on first start. Jobs queued locally stay there and never reach the production server. The database login needs permission to create that schema once. The local Hangfire server is off by default; set `Hangfire:RunServerInApi=true` to run queued jobs locally. DB setup: see `api/scripts/00_MASTER_SETUP_README.md` and `api/scripts/SCRIPTS_INDEX.md`. `api/README.md` still describes the older SQL Server `CreateDatabase.ps1` flow, so it may be out of date.
Lint/format: no analyzer or `dotnet format` config was found. Unknown – needs confirmation.

## Agents — `agents/`
```bash
cd agents
docker compose up -d                              # app on :8010, Postgres+pgvector :5432, Redis :6379 (needs agents/.env)
docker compose --profile monitoring up -d         # also Prometheus + Grafana
pip install -r requirements.txt                   # local, Python 3.12
pytest                                            # tests/ (fakeredis; asyncio_mode=auto)
python -m app.evals.run                           # eval harness: calls REAL LLMs and costs money
```

## Mobile — `mobile/`
See `mobile/CLAUDE.md`: `npm install`, `npm run dev`, `npm run build`, `tests/e2e/run_all.sh`.

The app calls `https://cloud.ezofis.com/api` unless `VITE_API_BASE` says otherwise. For local work, copy `mobile/.env.development.example` to `mobile/.env.development.local` (`VITE_API_BASE=/api`, `VITE_API_PROXY_TARGET=http://localhost:5000`). The Vite dev server (http://localhost:5173) then forwards `/api` to the local API, so sign-in works in the browser with no CORS problem. Vite reads that file only for `npm run dev`, so release builds and test APKs keep the production address.

## Run everything locally (auto-reload)
Use the dev servers, not IIS, Caddy or production Docker images. They reload by themselves when files change, so `git pull` updates the running stack.

| Part | Started by `dev-start.ps1` with | Reloads after a pull |
|---|---|---|
| Web app | `npm run dev` (Vite, http://localhost:3000) | Browser page reloads |
| API | `dotnet watch run` (http://localhost:5000) | Rebuilds and restarts |
| Agents | `docker compose up` (uvicorn `--reload`, http://localhost:8010) | Restarts in the container |
| Mobile (only with `-Only …,mobile`) | `npm run dev` (Vite, http://localhost:5173, `/api` → local API) | Browser page reloads |

```powershell
./scripts/dev-start.ps1            # checks settings, then opens one window per part
./scripts/dev-start.ps1 -Only app,api
./scripts/dev-start.ps1 -Only api,mobile   # mobile app against the local API (not started by default)
./scripts/dev-start.ps1 -DryRun    # checks only
./scripts/dev-pull.ps1             # switch to testing, pull, and do only the extra steps needed
./scripts/release-pr.ps1 -Pr 184   # release ONE merged testing PR to main (opens the release PR)
./scripts/release-pr.ps1 -Pr 184 -NoPush   # same checks, pushes nothing
```

Local settings (all git-ignored). `dev-start.ps1` refuses to start if any of them points at production:

| File | Setting | Local value |
|---|---|---|
| `app/.env` | `VITE_BASE_URL`, `VITE_V6_BASE_URL` | `http://localhost:5000/api` (the example file points at production) |
| `agents/.env` | `EZOFIS_API_BASE` | `http://host.docker.internal:5000/api` (the default is production) |
| `api/src/Api/appsettings.Development.json` | `ConnectionStrings:DefaultConnection` | the tester database login |
| same file | `Hangfire:SchemaName` | `hangfire_local` (never `hangfire`) |
| same file | `EzofisBlobStorage:ConnectionString` | empty (file storage off) or a **test** storage account. Never a placeholder: that makes every request fail |
| `agents/.env` | `EZOFIS_LOGIN_EMAIL`, `EZOFIS_LOGIN_PASSWORD` | the EZOFIS UAT test-tenant login |
| `agents/.env` | `EZOFIS_ENV` | `trial` (never `live`) |
| `mobile/.env.development.local` | `VITE_API_BASE` | `/api` (unset means production) |
| same file | `VITE_API_PROXY_TARGET` | `http://localhost:5000` |

`dev-start.ps1` also refuses while required values (database login, UAT login, `CATALOG_DATABASE_URL`) still contain `REPLACE_ME` / `YOUR_…` placeholders, and shows a note for optional ones (LLM keys, file storage).

`dev-pull.ps1` runs `npm ci` when `app/package-lock.json` (or, once you've installed it, `mobile/package-lock.json`) changed (or tells you to stop the web app first if it's running), rebuilds the agents container when `agents/requirements.txt` or `agents/Dockerfile` changed, and warns when database schema code changed, because the first request then changes tables in the shared database. Files the dev server regenerates (`app/src/routeTree.gen.ts`, `app/tsconfig.tsbuildinfo`, locale `messages.*`) don't count as your changes: `dev-pull.ps1` resets them and continues.

## Whole stack with Docker
```bash
docker compose -f docker-compose.azure.yml up    # needs .env.azure (copy .env.azure.example)
```

## CI / deploy
- **`.github/workflows/pr-checks.yml`** runs on every PR into `testing` or `main`, only for the parts that changed. It deploys nothing.
  - `api/`: `dotnet build` + `dotnet test`
  - `agents/`: `pytest`, skipping 4 tests that already fail on `main` (listed in the workflow)
  - `app/`: type-check, `vitest`, `npm run build`
  - `mobile/`: `npm run build` and the single-file test-APK build (the mock e2e checks still run locally)
- **`.github/workflows/docker-ghcr.yml`** runs on a push to `main` that touches `app/**`, `api/**` or `agents/**`, or by manual dispatch.
  - It builds only the services that changed, pushes `:latest` and `:sha-<short>` to GHCR, then **deploys straight to production** (Azure web app `ezofis-app-v6`) with `.github/scripts/deploy-azure-compose.sh`, and smoke-checks `https://cloud.ezofis.com`.
  - Its first job, `Approved PR check`, **blocks** the build and deploy unless the change came from a PR whose final commit was approved by `tech-ezofis-git`. Manual runs are allowed only for `tech-ezofis-git`.
- The JWT signing key is read only from the optional `EZOFIS_SIGNING_KEY` GitHub secret. When that isn't set, the deploy keeps the key already in Azure.
- The API smoke check accepts 200/401/404 from `/hangfire`, because the dashboard is password-protected.

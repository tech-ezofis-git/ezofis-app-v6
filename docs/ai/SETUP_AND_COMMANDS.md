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
Config: copy `api/src/Api/appsettings.example.json` to `appsettings.Development.json`. DB setup: see `api/scripts/00_MASTER_SETUP_README.md` and `api/scripts/SCRIPTS_INDEX.md`. `api/README.md` still describes the older SQL Server `CreateDatabase.ps1` flow, so it may be out of date.
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

## Whole stack with Docker
```bash
docker compose -f docker-compose.azure.yml up    # needs .env.azure (copy .env.azure.example)
```

## CI / deploy
- **`.github/workflows/pr-checks.yml`** runs on every PR into `testing` or `main`, only for the parts that changed. It deploys nothing.
  - `api/`: `dotnet build` + `dotnet test`
  - `agents/`: `pytest`, skipping 4 tests that already fail on `main` (listed in the workflow)
  - `app/`: type-check, `vitest`, `npm run build`
- **`.github/workflows/docker-ghcr.yml`** runs on a push to `main` that touches `app/**`, `api/**` or `agents/**`, or by manual dispatch.
  - It builds only the services that changed, pushes `:latest` and `:sha-<short>` to GHCR, then **deploys straight to production** (Azure web app `ezofis-app-v6`) with `.github/scripts/deploy-azure-compose.sh`, and smoke-checks `https://cloud.ezofis.com`.
  - Its first job, `Approved PR check`, **blocks** the build and deploy unless the change came from a PR whose final commit was approved by `tech-ezofis-git`. Manual runs are allowed only for `tech-ezofis-git`.
- The JWT signing key is read only from the optional `EZOFIS_SIGNING_KEY` GitHub secret. When that isn't set, the deploy keeps the key already in Azure.
- The API smoke check accepts 200/401/404 from `/hangfire`, because the dashboard is password-protected.

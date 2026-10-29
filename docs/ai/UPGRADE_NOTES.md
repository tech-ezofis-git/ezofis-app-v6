# Upgrade notes and risks

Found by reading the code (October 2026). Nothing was run. Secret values are deliberately **not** copied here.

## Done (29 Oct 2026)
- The JWT signing key was changed in Azure, and the deploy no longer copies it from `appsettings.Production.json` (PR #169).
- Keys were removed from `app/.env.example`, and the debug scripts were deleted (PR #170).
- The Hangfire dashboard needs a password (v6api #169). The smoke check accepts 401 (PR #171).
- The agents `/console` needs a login (AIorchestrator #106).
- `ezofis-app-v6` was made private. **v6api is still public.**
- Still open: rotate the Gemini/Qwen keys, change the pilot user password, remove the old values from `appsettings.Production.json` in v6api, and make v6api private.

## 🔴 Security — fix first
1. **Secrets committed to a public repo** (this was the state on 29 Oct 2026, before the fixes above):
   - `api/src/Api/appsettings.Production.json` contains a real-looking `EzofisAuth.SigningKey` (128 chars, the JWT signing key) and `TenantPilotUser.Password`. Anyone with the key can mint valid tokens.
   - `app/.env.example` contains what look like real `VITE_GEMINI_API_KEY`, `VITE_QWEN_API_KEY` and PostHog keys.
   - `app/debug-models.mjs`, `app/debug-models-v2.mjs` and `app/test-genai-models.mjs` match Google API key patterns.
   - Action: **rotate these keys now**, move them to App Settings or Key Vault, replace them with placeholders, and consider purging git history. Rotating is required whether or not history is cleaned.
2. **LLM keys in the browser bundle:** any `VITE_*` value is visible to every user. Gemini and Qwen calls should go through the back end.
3. **No CI gate before production:** `.github/workflows/docker-ghcr.yml` builds and deploys every push to `main` with no tests, lint or type-check.
4. `api` Swagger is enabled in production (`Swagger__Enabled: "true"` in `docker-compose.azure.yml`). The Hangfire dashboard auth in production: Unknown – needs confirmation.
5. Controllers return `ex.Message` to clients (for example `BrandingController`), which can leak internal details.
6. The agents' permission check is still a mock that allows every intent (`MockPermissionProvider`, `agents/app/control/permissions.py`).

## Outdated or vulnerable dependencies
| Package | Where | Current | Note |
|---|---|---|---|
| `xlsx` (SheetJS) | app, mobile | ^0.18.5 | npm build is abandoned; known prototype-pollution and ReDoS CVEs. Fixed builds are only on the SheetJS CDN (0.20.x) |
| `pdfjs-dist` | app ^3.4.120, mobile ^3.11.174 | 3.x | CVE-2024-4367 (arbitrary JS when opening a crafted PDF), fixed in 4.2.67+. `@react-pdf-viewer/*` is tied to pdfjs 3 and is no longer maintained |
| .NET | api | net8.0 | .NET 8 LTS support ends Nov 2026. Plan .NET 10 LTS |
| EF Core / Npgsql / ASP.NET packages | api | 8.0.x | Move with the .NET upgrade |
| Swashbuckle | api | 6.6.2 | .NET 9+ templates use `Microsoft.AspNetCore.OpenApi` instead |
| xUnit / Test SDK | api tests | 2.5.3 / 17.8.0 | Old. xUnit v3 is available |
| `@google/generative-ai` | app | ^0.24.1 | Deprecated in favour of `@google/genai`, which is also installed. Remove one |
| `@xenova/transformers` | app | ^2.17 | Renamed to `@huggingface/transformers` |
| FastAPI / Uvicorn | agents | 0.115.0 / 0.30.6 | Behind current. Upgrade together with Starlette |
| `redis` (py) | agents | 5.0.8 | 6.x available |
| `asyncpg` | agents | 0.29.0 | Older, check Python 3.12 wheels |
| Mobile React / Vite | mobile | 18 / 5 | Web app is on React 19 / Vite 6 |
| Capacitor | app 8 vs mobile 7 | – | Two different major versions in one repo |

## Dead code, junk files, inconsistencies
- Tracked build/debug output in `app/`: `build-errors.log`, `dev-server*.log`, `lint-errors.txt` (669 lines), `lint-filtered.txt`, `tsc-errors.txt` (69 lines), `tsc_out.txt`, `type-errors*.txt`, `overview_changes.diff`, `tsconfig.tsbuildinfo`, a stray file named `app/l.href)`, plus `scratch/`, `fix-case.js` and `debug-models*.mjs`.
- `.tanstack/` and `.vite/` cache folders are committed at the repo root.
- `tsc-errors.txt` and `lint-errors.txt` suggest that type-check and lint are not clean. Current state: Unknown – needs confirmation (run `npm run type-check`).
- Package manager mismatch in `app/`: `app/CLAUDE.md` says pnpm, but Docker and the committed lockfile use npm.
- `app/CLAUDE.md` mentions `src/features/builder`, but only `src/features/sub-workflow` exists.
- `api/README.md` still describes SQL Server, `ci.yml` and a test line (`dev-aravinth`).
- `api/src/Modules/Billing` and `Reporting` began as skeletons, and Reporting now has real code. Billing's status: Unknown – needs confirmation.
- Many one-off migration SQL scripts in `api/scripts/` have no version tracking. Which ones have already been applied: Unknown – needs confirmation.

## Missing tests
- Web app: about 30 test files for a very large SPA. Not run in CI.
- API: only 2 test projects (Workflow and Reporting infrastructure). There are no tests for controllers, auth, multi-tenancy, Repository/DMS or Users.
- Agents: 120+ pytest files, the best covered part, but not run in CI.
- Mobile: mock e2e only.

## Suggested upgrades (priority order)
| # | Item | Risk of change |
|---|---|---|
| 1 | Rotate and remove the committed secrets, move LLM calls behind the API | Low (code) / High (if skipped) |
| 2 | Add a CI job that runs `dotnet test`, `pytest`, `npm run type-check` and `vitest` before the deploy job | Low |
| 3 | Remove tracked logs and caches, and add them to `.gitignore` | Low |
| 4 | Replace `xlsx` 0.18.5 with the SheetJS CDN build or `exceljs` | Medium |
| 5 | Upgrade `pdfjs-dist` to 4.x or 5.x, and replace `@react-pdf-viewer` | Medium |
| 6 | Decide on one package manager for `app/` and update the docs | Low |
| 7 | Upgrade .NET 8 to .NET 10 LTS (before Nov 2026 end of support) | High |
| 8 | Upgrade FastAPI, Uvicorn and redis-py in agents | Medium |
| 9 | Remove `@google/generative-ai` and move to `@huggingface/transformers` | Low |
| 10 | Align mobile with React 19, Vite 6 and Capacitor 8 | Medium |

# Report Agent v2 (orchestrator module)

A module of the AI Orchestrator, mounted at `/api/report-agent-v2`. It turns a natural-language prompt into a saved, reusable
report definition, then runs that definition against live tenant data. It shares the PostgreSQL
databases of `v6api_postgre` and copies its auth, tenant and data-access rules.

It is a **mounted sub-app** with its own middleware stack, so the JWT and tenant checks below apply
only to `/api/report-agent-v2/*`. The orchestrator's other endpoints, including the existing
in-process `/api/report-agent/*` (`app/report_agent`), are unchanged and never pass through it.
`app/main.py` mounts it and opens/closes its pools in the orchestrator lifespan.

```
Create:   Frontend prompt → middleware → Definition Agent → catalog introspection → LLM (spec JSON)
          → compile + validate → live probe (read-only, LIMIT 1) → save to PostgreSQL → reportId
Execute:  Frontend reportId → middleware → Execution Agent → saved spec → live catalog → compile
          → read-only SELECT → structured result            (no LLM call on execution)
```

## How it maps to v6api_postgre

| Concern | v6api_postgre | This module |
|---|---|---|
| Tenant registry | `catalog."Tenants"` (database-per-tenant) | Same table, read-only. `db/catalog.py` |
| Connection strings | Npgsql, `TenantConnectionPool` (max 5) | Parsed into libpq format, bounded pool per tenant. `db/connstr.py`, `pools.py` |
| JWT | Ezofis HS256 (`sub`, `email`, `role`, `tid`); optional Auth0 / Entra | Same validation: signature, issuer, audience and expiry; algorithm pinned per issuer. `security/jwt_validator.py` |
| Tenant resolution | `X-Tenant-Id` (GUID or email), else the `tid` claim | Same order, **plus membership checks** (below). `middleware/pipeline.py` |
| Middleware order | CorrelationId → logging → Authentication → EmailTenantResolution → TenantConnection | Same order |
| Report rows | `reporting."ReportDefinitions"` | Same table, so agent reports appear on the existing dashboard |
| Access rules | `CanSee` / `CanManage`: owner or Admin edit; shared users/groups view and run | Same rules, plus "Public" means everyone in the tenant can view. `security/authorization.py` |
| Form data | `dbo.ezfb_{form8}_items`, both column-naming styles, joined to `process_form_` / `workflow_instances_` / `inbox_` | Same resolution and joins. `domain/naming.py`, `source_catalog.py` |

New tables (per tenant DB, `migrations/001_report_agent_tables.sql`):

- `reporting."ReportAgentSpecs"`: prompt plus spec JSON, versioned. Exactly one row per report is `Active`. It also stores a schema fingerprint so form changes are detected. The spec is kept here and not in `ConfigJson` because the .NET service rewrites `ConfigJson` on every edit and would drop unknown keys.
- `reporting."ReportAgentRuns"`: audit log of executions. Successful runs also increment `ReportDefinitions.Runs`.

## Security

- **The header tenant is never trusted alone.** If `X-Tenant-Id` differs from the token's `tid`, the user must have a `catalog."UserTenants"` row for that tenant (403 otherwise). An email in `X-Tenant-Id` only resolves for the caller's own email.
- **The user must exist in the tenant DB.** They need a row in `users."Users"` that is not soft-deleted (fails closed).
- **Admin needs the token role and the current DB role.** A demoted admin's unexpired token stops granting admin.
- **The LLM never writes SQL.** It fills a closed JSON schema (`domain/spec.py`). The compiler (`domain/compiler.py`) is the only code that writes SQL:
  - Identifiers come only from `information_schema` and pass through `psycopg.sql.Identifier`.
  - All values are bind parameters.
  - Only one shape is ever produced: SELECT … FROM … JOIN … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT.
- **Every data query runs in `SET TRANSACTION READ ONLY` with `statement_timeout`.** Postgres rejects writes even if the login could write. Results are capped at `MAX_ROWS`.
- **Least-privilege DB logins.** `TENANT_DB_USERNAME/PASSWORD` replace the credentials stored in the catalog (`migrations/002_least_privilege_roles.sql`). The runtime never runs DDL; migrations are a separate CLI.
- **Every query filters on `"TenantId"`,** even inside per-tenant databases.
- **Nothing sensitive is returned.** No connection strings, tokens or SQL in responses. Errors use the v6api `{"error": ...}` shape with a correlation ID.
- **The LLM sees no data rows.** It only gets field IDs, labels and types.

## API (`/api/report-agent-v2`)

Every call sends `Authorization: Bearer <v6api JWT>` and `X-Tenant-Id: <tenant guid>`, the same as `/api/report-builder`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/sources/workflows` | Workflow dropdown |
| GET | `/sources/fields?sourceType=Workflow&workflowId=…` | Fields the agent can use |
| POST | `/definitions/preview` | Generate and run (50 rows), no save. For the wizard's **Generate Report** button |
| POST | `/definitions/save` | Save the `reportSpec` returned by preview exactly as previewed (no LLM call); re-validated against the live source. Send `id` to overwrite an existing report. Saved to `reporting."ReportAiDefinitions"` (201) |
| POST | `/definitions` | Generate, validate and save in one call (201) |
| PUT | `/definitions/{id}` | Regenerate as a new version. Owner or Admin. Leave out `prompt` to re-run the last prompt (e.g. after a form change) |
| GET | `/definitions/{id}` | Metadata, prompt, active spec, `canEdit` / `access` |
| POST | `/reports/{id}/execute` | Run the saved spec. Optional body: `{asOfDate, filters, limit}` |

Create body:

```json
{
  "prompt": "Generate an Accounts Payable Aging Report showing outstanding invoices grouped by supplier, with aging buckets of 0-30, 31-60, 61-90 and over 90 days.",
  "sourceType": "Workflow",
  "workflowId": "b05ed64d-7c94-4ecd-a5b0-caa5839757f9",
  "name": "AP aging",
  "visibility": "Selected Users",
  "sharedUsers": ["c0e0d641-1e88-4fd1-ab51-d61040f607ce"]
}
```

The execute response is a superset of the .NET `ReportRunResult`. `columns[]` and `rows[]` use column labels as row keys, so the existing grid code works (`row[c.label]`). It adds `totals`, `assumptions`, `warnings`, `specVersion`, `asOfDate` and `truncated`.

Wizard mapping: **Source** step (Workflow/Folder + workflow) and **Build with AI** call `/definitions/preview`. **Continue** after Details calls `/definitions` with the name, description and sharing. Opening a report calls `/reports/{id}/execute`.

## Configuration

Set these as agents App Settings (Azure) or in a local `agents/.env`. Every name is prefixed
`REPORT_AGENT_` so nothing collides with orchestrator settings. The module ships **off**: nothing is
mounted at `/api/report-agent-v2` (and the orchestrator starts normally) unless
`REPORT_AGENT_V2_ENABLED=true` **and** a catalog connection is configured.

| Variable | Notes |
|---|---|
| `REPORT_AGENT_V2_ENABLED` | `true` to mount the module. Default `false` |
| `REPORT_AGENT_CATALOG_CONNECTION_STRING` | v6api `DefaultConnection`. Falls back to `CATALOG_DATABASE_URL` |
| `REPORT_AGENT_V6_API_BASE` | V6 API that issued the token (falls back to `EZOFIS_API_BASE`). Tokens are checked by `GET {base}/usersession` with the caller's token (accepted only if the token is valid and the user exists in the token's tenant); cached `REPORT_AGENT_V6_SESSION_CACHE_SECONDS` (120) per token. **This is the recommended setup** |
| `REPORT_AGENT_EZOFIS_AUTH_SIGNING_KEY` | Optional, **not recommended**: with the API's HS256 key the agents could also mint tokens. Explicit opt-in only; never read from a shared `EZOFIS_AUTH_SIGNING_KEY` |
| `REPORT_AGENT_TENANT_DB_USERNAME` / `_PASSWORD` | Least-privilege login `report_agent_rt` (strongly recommended). Without it the owner credentials stored in the catalog are used; queries are still `READ ONLY` per transaction |
| `REPORT_AGENT_CATALOG_POOL_MAX_SIZE` / `REPORT_AGENT_TENANT_POOL_MAX_SIZE` / `REPORT_AGENT_TENANT_POOL_CACHE_SIZE` | Default 2 / 2 / 20: at most 2 + 2 × 20 = **42** connections per agents process to the shared Postgres server (opened lazily, closed after 20 s idle). Check against the server's `max_connections` before raising them |
| `REPORT_AGENT_MAX_ROWS`, `REPORT_AGENT_STATEMENT_TIMEOUT_MS`, `REPORT_AGENT_CORS_ORIGINS`, ... | See `config.py` |

## Release steps

Before switching it on in an environment (in this order):

1. **nginx**: `app/nginx.conf` must route `^~ /api/report-agent-v2/` to the agents container (in this
   PR). Without it the path falls through to `^~ /api/` and the .NET API returns 404.
2. **Least-privilege login** (DB admin, once per server): create `report_agent_rt` from
   `migrations/002_least_privilege_roles.sql` (password from the secret store, never in git), then set
   `REPORT_AGENT_TENANT_DB_USERNAME` / `_PASSWORD` in the agents App Settings.
3. **Tables** (DB admin, owner credentials): run `python -m app.report_agent_v2.cli.migrate` for every
   active tenant, or `--tenant <guid>` per tenant. Additive only (`CREATE ... IF NOT EXISTS`);
   `reporting."ReportAiDefinitions"` matches `ReportSchemaSql.cs`. Without it, preview works but save
   and execute fail.
4. **Check pool sizes** against the Postgres server's `max_connections` (see the table above).
5. **Model**: each tenant needs a working catalog model for agent `report` (or a working process
   default); otherwise preview fails for that tenant. Default reports and saved-report runs make no
   LLM call.
6. **Switch on**: set `REPORT_AGENT_V2_ENABLED=true` (keep the signing key unset) and restart the
   agents container. Check the startup log for "Report Agent v2 not mounted" messages.
7. **Default reports**: a tenant admin calls `POST /api/report-agent-v2/defaults/install` once per tenant.

## Model

No model of its own. The definition planner calls the orchestrator's shared `LLMAdapter` with the
same selection as the existing Report Agent: the tenant's catalog model for agent `report`, then
its fallback chain, else the process default (`LLM_MODEL` / Test Console). The chosen model is
saved with each spec version. Execution makes no LLM call.

## Migrations

Run once per environment (owner credentials, or `MIGRATION_DB_USERNAME` / `MIGRATION_DB_PASSWORD`).
The runtime never runs DDL.

```bash
python -m app.report_agent_v2.cli.migrate                 # every active tenant DB
python -m app.report_agent_v2.cli.migrate --tenant <guid> # one tenant
```

## Tests

From `agents/`:

```bash
pytest tests/report_agent_v2                                                    # unit + mount tests
REPORT_AGENT_TEST_PG="host=127.0.0.1 port=5432 user=postgres" pytest tests/report_agent_v2   # + integration
```

The integration tests build a catalog DB and two tenant DBs that mirror the v6api schema. They then run the whole HTTP flow:

- AP aging values checked against hand-computed totals, including messy input: `"12,500.00"`, `"N/A"`, `2026-02-30`, `dd/mm/yyyy`, soft-deleted rows and draft entries.
- The repair loop.
- Tenant isolation, sharing rules and admin demotion.
- Hostile filter values.
- Read-only transaction enforcement.

## Known limits

- Date text values are parsed as ISO `yyyy-mm-dd` (or `yyyy/mm/dd`) first, then `dd-mm-yyyy`. US-style `mm/dd/yyyy` would be read as day-first.
- No report-level check of workflow security (`WorkflowSecurityService`). Any active tenant user can build a report on any workflow in the tenant, the same as `/api/report-builder` today.
- Scheduling and email delivery stay in v6api (Hangfire). This module does not register jobs.

# Ezofis V6 - API & Back-End Services

Production ASP.NET Core (.NET 8) Web API — modular monolith, Clean Architecture, CQRS
(MediatR), multi-tenancy (database-per-tenant), PostgreSQL.

## Structure

```
/src
  /Api                          # ASP.NET Core Web API (entry point)
  /BuildingBlocks
    /Catalog                     # Tenant registry (database-per-tenant)
    /SharedKernel                # Domain events, base entities
    /MultiTenancy                # Tenant connection resolution
    /Logging                     # Serilog, correlation ID middleware
    /Security                    # JWT auth (Entra ID, Auth0, Ezofis), policies
  /Modules
    /Users, /Workflow, /Repository, /Dms, /Billing, /Reporting
    (each split into .Domain / .Application / .Infrastructure)
  /Workers
    /HangfireWorker               # Background job worker
/scripts                          # Database bootstrap + E2E test scripts
/docs                             # API status, migration plans, specs
```

## Running locally

```bash
dotnet run --project src/Api/SaaSApp.Api.csproj
```

Requires `src/Api/appsettings.Development.json` with a `ConnectionStrings:DefaultConnection`
pointing at a Postgres server (copy from `src/Api/appsettings.example.json` — real
`appsettings*.json` files are gitignored, never commit credentials into them).

- Swagger (dev): `http://localhost:5000/swagger`
- Health: bootstraps the catalog database on first run if it doesn't exist (see
  `scripts/RunCatalogScripts.ps1` for manual/one-time catalog setup).

## Docker

```bash
docker build -t ezofis-api -f Dockerfile .
docker run -p 5000:5000 ezofis-api
```

Built and pushed to GHCR automatically on push to `main` (see
`.github/workflows/docker-ghcr.yml`).

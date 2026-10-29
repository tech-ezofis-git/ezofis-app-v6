# Tech stack

Versions are taken from the manifest files on `main` (October 2026). For the web app, `^` ranges are shown as declared; the installed versions are in `app/package-lock.json`.

## Web front end — `app/` (`app/package.json`)
- **Language:** TypeScript 5.8.3, React ^19.2.3
- **Build:** Vite ^6.4.1, `@vitejs/plugin-react` ^4.7.0, Node 20 (Docker image `node:20-alpine`)
- **Routing / data:** `@tanstack/react-router` ^1.144, `@tanstack/react-query` ^5.90, `@tanstack/react-form` ^1.27, `@tanstack/react-table` ^8.21
- **UI:** Mantine ^8.3 (core, dates, charts, tiptap, …), Tailwind CSS ^4.1.18, `tailwind-variants`, `motion` ^12, `lucide-react`, `@iconify/react`
- **State:** Zustand ^5.0.9 (also jotai ^2.16 and immer ^11)
- **Builders:** `@xyflow/react` ^12.10 (workflow canvas), `@dnd-kit/*` (drag and drop), Tiptap ^3.20 (rich text)
- **Documents:** `pdfjs-dist` ^3.4.120, `@react-pdf-viewer/*` ^3.12, `docx-preview`, `mammoth`, `xlsx` ^0.18.5, `jspdf` ^4.2, `html2canvas`, `tesseract.js` ^7
- **AI in the browser:** `@google/genai` ^1.41, `@google/generative-ai` ^0.24.1, `@xenova/transformers` ^2.17
- **Auth:** `@azure/msal-browser` ^4.27 / `@azure/msal-react` ^3.0, `@react-oauth/google` ^0.13
- **i18n:** Lingui ^5.7
- **Analytics:** `posthog-js` ^1.436, `web-vitals` ^5
- **Mobile:** Capacitor ^8.1 (`app/android`, `app/ios`)
- **Quality:** ESLint ^9.39 (perfectionist, lingui, react-hooks), Prettier ^3.7, Vitest ^3.2.4, Testing Library, jsdom
- **Serving:** nginx (`nginx:alpine`), config in `app/nginx.conf`

## Back-end API — `api/` (`api/src/**/*.csproj`)
- **Runtime:** .NET 8 (`net8.0` in all 29 projects), ASP.NET Core Web API
- **Patterns:** MediatR 12.4.1 (CQRS), Clean Architecture per module
- **Data:** PostgreSQL through Npgsql 8.0.9 and EF Core 8.0.11 (`Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.11). SQL Server was removed in "Phase 9" (`api/docs/Phase9_SQLServer_Decommission_Plan.md`)
- **Background jobs:** Hangfire 1.8.14 with `Hangfire.PostgreSql` 1.21.1
- **Cache:** Redis (`Microsoft.Extensions.Caching.StackExchangeRedis` 8.0.11), with in-memory fallback
- **Auth:** `Microsoft.Identity.Web` 3.0.0, `System.IdentityModel.Tokens.Jwt` 8.2.1, `Otp.NET` 1.4.1 (2FA), `BCrypt.Net-Next` 4.0.3
- **Logging:** Serilog.AspNetCore 8.0.3, Serilog.Sinks.ApplicationInsights 4.0.0
- **Other:** Swashbuckle 6.6.2, Azure.Storage.Blobs 12.22.2, PDFsharp 6.2.0, SixLabors.ImageSharp 3.1.12, MimeKit 4.15.1, `Sap.Data.Hana.Net.v8.0` 2.29.25
- **Tests:** xUnit 2.5.3, Microsoft.NET.Test.Sdk 17.8.0, coverlet 6.0.0

## AI agents — `agents/` (`agents/requirements.txt`)
- **Runtime:** Python 3.12 (`python:3.12-slim`), FastAPI 0.115.0, Uvicorn 0.30.6, Pydantic 2.10.6
- **LLM:** litellm 1.93.2, openai 2.20.0. Default models are set in `agents/app/config.py` (for example `gpt-4.1-mini` and `gpt-5-nano`), using Azure OpenAI endpoints and a self-hosted Qwen endpoint
- **Data:** PostgreSQL 16 + pgvector (`pgvector/pgvector:pg16`), SQLAlchemy 2.0.36, psycopg2-binary 2.9.10, asyncpg 0.29.0. Redis 7 (redis-py 5.0.8)
- **Documents / OCR:** PyMuPDF 1.26.7, pdfplumber, Tesseract (pytesseract 0.3.13), OpenCV 4.11, PassportEye 2.2.2, reportlab 4.2.5, python-docx, pandas 2.2.3, openpyxl
- **Monitoring:** prometheus-client 0.21.0, with optional Prometheus + Grafana in `agents/docker-compose.yml`
- **Tests:** pytest 9.0.3, pytest-asyncio 1.3.0, httpx, fakeredis

## Mobile — `mobile/` (`mobile/package.json`)
- JavaScript (no TypeScript), React ^18.3.1, react-router-dom ^6.30, Vite ^5.4.21, Capacitor ^7.6
- `pdfjs-dist` ^3.11.174, `xlsx` ^0.18.5, `mammoth`, `jszip`, `postal-mime`
- Tests: Playwright + Python mock e2e (`mobile/tests/e2e/`)

## Databases
- **Catalog DB** (tenant registry) plus **one database per tenant**, all PostgreSQL. Azure host `ezv6psql.postgres.database.azure.com` (`.env.azure.example`)
- **Agents** use their own `orchestrator` DB and also read the catalog DB

## Hosting
- **Azure App Service, multi-container** (resource group `rg-v6`, web app `ezofis-app-v6`) running `docker-compose.azure.yml`: `app` (nginx + SPA), `api`, `agents`, `redis`
- Images are stored in **GitHub Container Registry**: `ghcr.io/tech-ezofis-git/ezofis-app-v6/{app,api,agents}`
- Other services: Azure Blob Storage, Application Insights, Azure Key Vault (placeholder), PostHog, Collabora (office viewer)

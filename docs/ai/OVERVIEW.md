# Overview

EZOFIS V6 is a multi-tenant SaaS platform for **business process automation and document management**. Companies (tenants) build forms and workflows, route requests through approval stages, store and search documents, and use AI agents for OCR, accounts-payable (AP) invoice processing, summaries, reports and chat.

Production URL: `https://cloud.ezofis.com` (see `SMOKE_BASE_URL` in `.github/workflows/docker-ghcr.yml`).

## Who uses it
- **Tenant admins** set up forms, workflows, repositories, users, roles, branding and connectors.
- **Business users** start requests, approve/reject tasks in their inbox, upload and sign documents.
- **External users** use embeddable views (`app/src/routes/embed/`), portals and sign-request links.
- **Mobile users** use the separate mobile app in `mobile/`.

## Main features
- **Form builder and workflow builder** (node-based designer). Requests move through stages with actions such as Approve, Reject and Forward, plus SLA, delegation and sub-workflows.
- **Repository / DMS:** folders, files, versions, security, sharing, timeline and comments, bulk upload, related documents.
- **Sign requests:** e-signature flows on repository documents.
- **Dashboards, report builder and AI report builder.**
- **AI agents** (`agents/`): AP invoice pipeline, OCR, document classification, summaries and insight, chat/RAG search, FTL quote estimation, PDF generation, data import.
- **Connectors:** SAP / HANA purchase orders, QuickBooks, OAuth connectors, email ingest (mailbox).
- **Billing credits, activity logs, event logs, support tickets, notifications.**
- **Auth:** email/password, 2FA (TOTP), Microsoft Entra ID (MSAL), Google, Auth0.
- **Languages:** en, ar, fr, ms (`app/src/locales/`).

## Parts of the monorepo
| Folder | What it is |
|---|---|
| `app/` | Web front end (React SPA), also packaged with Capacitor |
| `api/` | Back-end REST API (ASP.NET Core, .NET 8 modular monolith) |
| `agents/` | AI orchestrator microservice (Python FastAPI). It is synced from the separate `AIorchestrator` repo |
| `mobile/` | Separate mobile app (React 18 + Capacitor 7) |

Note: `api/` and `agents/` are **synced copies** of other repos (commit messages such as "Sync api/ from v6api@…" and "Sync agents/ from AIorchestrator@…"). Where the real source of truth lives and how syncing works: Unknown – needs confirmation.

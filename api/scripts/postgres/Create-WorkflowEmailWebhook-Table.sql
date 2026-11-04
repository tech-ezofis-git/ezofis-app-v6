-- Tenant: per-workflow email webhook key -- Postgres
-- Run against tenant database. WorkflowEmailWebhookStore also creates it on first use.
-- A client that does not use WatchFox posts emails to
-- /api/email-ingest/webhook/{tenantId}/{workflowId} with header X-Webhook-Key.
-- Only a SHA-256 hash of the key is kept; the key is shown once when created.

CREATE SCHEMA IF NOT EXISTS dbo;

CREATE TABLE IF NOT EXISTS dbo."WorkflowEmailWebhook" (
    "Id" uuid NOT NULL CONSTRAINT "PK_WorkflowEmailWebhook" PRIMARY KEY,
    "WorkflowId" uuid NOT NULL,
    "KeyHash" varchar(64) NOT NULL,
    "KeyPrefix" varchar(16) NOT NULL,
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "LastUsedAtUtc" timestamptz NULL,
    "CreatedBy" uuid NULL,
    "CreatedAtUtc" timestamptz NOT NULL DEFAULT now(),
    "ModifiedBy" uuid NULL,
    "ModifiedAtUtc" timestamptz NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_WorkflowEmailWebhook_Workflow" ON dbo."WorkflowEmailWebhook" ("WorkflowId");

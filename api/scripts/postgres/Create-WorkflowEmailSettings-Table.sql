-- Tenant: how an email reaching a workflow's email webhook turns into tickets -- Postgres
-- Run against tenant database. WorkflowEmailSettingsStore also creates it on first use.
-- No row means the workflow's default (MJB: a ticket per attachment; others: a ticket per email).

CREATE SCHEMA IF NOT EXISTS dbo;

CREATE TABLE IF NOT EXISTS dbo."WorkflowEmailSettings" (
    "WorkflowId" uuid NOT NULL CONSTRAINT "PK_WorkflowEmailSettings" PRIMARY KEY,
    "TicketMode" varchar(16) NOT NULL,
    "NoAttachmentAction" varchar(16) NOT NULL,
    "AttachEmail" boolean NOT NULL DEFAULT false,
    "AttachmentTypes" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "ModifiedBy" uuid NULL,
    "ModifiedAtUtc" timestamptz NOT NULL DEFAULT now()
);

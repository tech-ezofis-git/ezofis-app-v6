-- Tenant: WatchFox mailbox watches, one row per workflow + mailbox -- Postgres
-- Run against tenant database. WatchFoxWatchStore also creates it on first use.
-- Each row remembers which workflow a mailbox is connected to, which webhook URL
-- WatchFox calls, and which types it catches, so the watch can be edited later.

CREATE SCHEMA IF NOT EXISTS dbo;

CREATE TABLE IF NOT EXISTS dbo."WatchFoxWatch" (
    "Id" uuid NOT NULL CONSTRAINT "PK_WatchFoxWatch" PRIMARY KEY,
    "WorkflowId" uuid NOT NULL,
    "Provider" varchar(16) NOT NULL,
    "ConnectionId" varchar(64) NULL,
    "WatchId" varchar(64) NULL,
    "MailboxEmail" varchar(320) NULL,
    "Types" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "WebhookUrl" varchar(512) NULL,
    "Status" varchar(32) NOT NULL DEFAULT 'pending',
    "LastError" varchar(2000) NULL,
    "CreatedBy" uuid NULL,
    "CreatedAtUtc" timestamptz NOT NULL DEFAULT now(),
    "ModifiedBy" uuid NULL,
    "ModifiedAtUtc" timestamptz NULL,
    "IsDeleted" boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS "IX_WatchFoxWatch_Workflow" ON dbo."WatchFoxWatch" ("WorkflowId") WHERE "IsDeleted" = false;
CREATE INDEX IF NOT EXISTS "IX_WatchFoxWatch_Connection" ON dbo."WatchFoxWatch" ("ConnectionId") WHERE "IsDeleted" = false;

-- Report Agent tables. Run once per TENANT database (database-per-tenant, see catalog."Tenants").
-- Idempotent. Apply with a migration/owner role, never with the runtime role:
--   python -m app.report_agent_v2.cli.migrate   (iterates every active tenant from the catalog)

CREATE SCHEMA IF NOT EXISTS reporting;

-- Owned by v6api (ReportSchemaSql.Ensure, ReportAiDefinitionService). Repeated here only so a
-- tenant that never opened the AI report builder still gets it; must stay identical to the .NET one.
CREATE TABLE IF NOT EXISTS reporting."ReportAiDefinitions" (
    "Id"              uuid NOT NULL CONSTRAINT "PK_ReportAiDefinitions" PRIMARY KEY,
    "TenantId"        uuid NOT NULL,
    "OwnerUserId"     uuid NOT NULL,
    "SessionId"       varchar(128) NOT NULL DEFAULT '',
    "Name"            varchar(256) NOT NULL,
    "Description"     text NOT NULL DEFAULT '',
    "ReportType"      varchar(64) NOT NULL,
    "WorkflowName"    varchar(256) NULL,
    "RepositoryName"  varchar(256) NULL,
    "ReportPrompt"    text NOT NULL DEFAULT '',
    "ReportSpecJson"  text NOT NULL DEFAULT '{}',
    "Status"          varchar(32) NOT NULL DEFAULT 'Draft',
    "Runs"            integer NOT NULL DEFAULT 0,
    "LastRunAtUtc"    timestamptz NULL,
    "CreatedAtUtc"    timestamptz NOT NULL DEFAULT now(),
    "ModifiedAtUtc"   timestamptz NULL,
    "CreatedBy"       uuid NOT NULL,
    "ModifiedBy"      uuid NULL,
    "IsDeleted"       boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS "IX_ReportAiDefinitions_Tenant"
    ON reporting."ReportAiDefinitions" ("TenantId", "IsDeleted", "ModifiedAtUtc");
CREATE INDEX IF NOT EXISTS "IX_ReportAiDefinitions_Owner"
    ON reporting."ReportAiDefinitions" ("TenantId", "OwnerUserId", "IsDeleted");
ALTER TABLE reporting."ReportAiDefinitions" ADD COLUMN IF NOT EXISTS "Visibility" varchar(32) NOT NULL DEFAULT 'Private';
ALTER TABLE reporting."ReportAiDefinitions" ADD COLUMN IF NOT EXISTS "SharedUsers" text NOT NULL DEFAULT '[]';
ALTER TABLE reporting."ReportAiDefinitions" ADD COLUMN IF NOT EXISTS "SharedGroups" text NOT NULL DEFAULT '[]';

-- Versioned, reusable report specifications produced by the definition agent.
CREATE TABLE IF NOT EXISTS reporting."ReportAgentSpecs" (
    "Id"                uuid NOT NULL CONSTRAINT "PK_ReportAgentSpecs" PRIMARY KEY,
    "TenantId"          uuid NOT NULL,
    "ReportId"          uuid NOT NULL,
    "Version"           integer NOT NULL,
    "SchemaVersion"     integer NOT NULL,
    "Prompt"            text NOT NULL,
    "SpecJson"          jsonb NOT NULL,
    "SourceType"        varchar(32) NOT NULL,           -- Workflow | Folder
    "WorkflowId"        uuid NULL,
    "RepositoryId"      uuid NULL,
    "SourceFormId"      varchar(64) NULL,
    "SourceFingerprint" varchar(64) NOT NULL,            -- detects form/table drift
    "Model"             varchar(128) NULL,
    "Status"            varchar(32) NOT NULL DEFAULT 'Active',  -- Active | Superseded
    "Warnings"          jsonb NOT NULL DEFAULT '[]'::jsonb,
    "CreatedAtUtc"      timestamptz NOT NULL DEFAULT now(),
    "CreatedBy"         uuid NOT NULL,
    CONSTRAINT "UQ_ReportAgentSpecs_Version" UNIQUE ("TenantId", "ReportId", "Version"),
    CONSTRAINT "CK_ReportAgentSpecs_Source" CHECK ("WorkflowId" IS NOT NULL OR "RepositoryId" IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS "UX_ReportAgentSpecs_Active"
    ON reporting."ReportAgentSpecs" ("TenantId", "ReportId") WHERE "Status" = 'Active';

-- Execution audit.
CREATE TABLE IF NOT EXISTS reporting."ReportAgentRuns" (
    "Id"            uuid NOT NULL CONSTRAINT "PK_ReportAgentRuns" PRIMARY KEY,
    "TenantId"      uuid NOT NULL,
    "ReportId"      uuid NOT NULL,
    "SpecVersion"   integer NOT NULL,
    "UserId"        uuid NOT NULL,
    "RowCount"      integer NOT NULL,
    "DurationMs"    integer NOT NULL,
    "Status"        varchar(32) NOT NULL,   -- Succeeded | Failed
    "Error"         varchar(2000) NULL,
    "CreatedAtUtc"  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IX_ReportAgentRuns_Report"
    ON reporting."ReportAgentRuns" ("TenantId", "ReportId", "CreatedAtUtc" DESC);

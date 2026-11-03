namespace SaaSApp.Reporting.Infrastructure.Persistence;

internal static class ReportSchemaSql
{
    public const string Ensure = """
        CREATE SCHEMA IF NOT EXISTS reporting;

        CREATE TABLE IF NOT EXISTS reporting."ReportDefinitions" (
            "Id"              uuid NOT NULL CONSTRAINT "PK_ReportDefinitions" PRIMARY KEY,
            "TenantId"        uuid NOT NULL,
            "Name"            varchar(256) NOT NULL,
            "Domain"          varchar(256) NOT NULL,
            "Description"     text NULL,
            "SourceType"      varchar(64) NULL,
            "SourceFormId"    varchar(64) NULL,
            "WorkflowId"      uuid NULL,
            "Status"          varchar(32) NOT NULL,
            "Visibility"      varchar(64) NULL,
            "OwnerUserId"     uuid NOT NULL,
            "Scheduled"       boolean NOT NULL DEFAULT false,
            "Runs"            integer NOT NULL DEFAULT 0,
            "ConfigJson"      text NOT NULL,
            "HangfireJobId"   varchar(128) NULL,
            "CreatedAtUtc"    timestamptz NOT NULL DEFAULT now(),
            "ModifiedAtUtc"   timestamptz NULL,
            "CreatedBy"       uuid NOT NULL,
            "ModifiedBy"      uuid NULL,
            "IsDeleted"       boolean NOT NULL DEFAULT false
        );

        CREATE INDEX IF NOT EXISTS "IX_ReportDefinitions_Tenant"
            ON reporting."ReportDefinitions" ("TenantId", "IsDeleted", "Status", "Domain");
        CREATE INDEX IF NOT EXISTS "IX_ReportDefinitions_Owner"
            ON reporting."ReportDefinitions" ("TenantId", "OwnerUserId", "IsDeleted");

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

        -- Private (default, owner + explicitly shared only) | Public (whole tenant) |
        -- Selected Users | Selected Groups. ALTER (not part of the CREATE above) so this is
        -- picked up on tenants whose ReportAiDefinitions table already existed.
        ALTER TABLE reporting."ReportAiDefinitions" ADD COLUMN IF NOT EXISTS "Visibility" varchar(32) NOT NULL DEFAULT 'Private';
        ALTER TABLE reporting."ReportAiDefinitions" ADD COLUMN IF NOT EXISTS "SharedUsers" text NOT NULL DEFAULT '[]';
        ALTER TABLE reporting."ReportAiDefinitions" ADD COLUMN IF NOT EXISTS "SharedGroups" text NOT NULL DEFAULT '[]';

        -- Report Agent v2 (agents service): saved report specs and run log. Same definitions as
        -- agents/app/report_agent_v2/migrations/001_report_agent_tables.sql, so a new tenant can
        -- save and run AI / default reports without a separate migration.
        CREATE TABLE IF NOT EXISTS reporting."ReportAgentSpecs" (
            "Id"                uuid NOT NULL CONSTRAINT "PK_ReportAgentSpecs" PRIMARY KEY,
            "TenantId"          uuid NOT NULL,
            "ReportId"          uuid NOT NULL,
            "Version"           integer NOT NULL,
            "SchemaVersion"     integer NOT NULL,
            "Prompt"            text NOT NULL,
            "SpecJson"          jsonb NOT NULL,
            "SourceType"        varchar(32) NOT NULL,
            "WorkflowId"        uuid NULL,
            "RepositoryId"      uuid NULL,
            "SourceFormId"      varchar(64) NULL,
            "SourceFingerprint" varchar(64) NOT NULL,
            "Model"             varchar(128) NULL,
            "Status"            varchar(32) NOT NULL DEFAULT 'Active',
            "Warnings"          jsonb NOT NULL DEFAULT '[]'::jsonb,
            "CreatedAtUtc"      timestamptz NOT NULL DEFAULT now(),
            "CreatedBy"         uuid NOT NULL,
            CONSTRAINT "UQ_ReportAgentSpecs_Version" UNIQUE ("TenantId", "ReportId", "Version"),
            CONSTRAINT "CK_ReportAgentSpecs_Source" CHECK ("WorkflowId" IS NOT NULL OR "RepositoryId" IS NOT NULL)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "UX_ReportAgentSpecs_Active"
            ON reporting."ReportAgentSpecs" ("TenantId", "ReportId") WHERE "Status" = 'Active';

        CREATE TABLE IF NOT EXISTS reporting."ReportAgentRuns" (
            "Id"            uuid NOT NULL CONSTRAINT "PK_ReportAgentRuns" PRIMARY KEY,
            "TenantId"      uuid NOT NULL,
            "ReportId"      uuid NOT NULL,
            "SpecVersion"   integer NOT NULL,
            "UserId"        uuid NOT NULL,
            "RowCount"      integer NOT NULL,
            "DurationMs"    integer NOT NULL,
            "Status"        varchar(32) NOT NULL,
            "Error"         varchar(2000) NULL,
            "CreatedAtUtc"  timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "IX_ReportAgentRuns_Report"
            ON reporting."ReportAgentRuns" ("TenantId", "ReportId", "CreatedAtUtc" DESC);
        """;
}

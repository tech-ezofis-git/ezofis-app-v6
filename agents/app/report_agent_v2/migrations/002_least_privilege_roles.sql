-- Least-privilege runtime login for the Report Agent (run per tenant database as an admin).
-- Then set REPORT_AGENT_TENANT_DB_USERNAME / REPORT_AGENT_TENANT_DB_PASSWORD so the service ignores the (usually
-- powerful) credentials stored in catalog."Tenants"."ConnectionString".
--
-- Run once per server (role is cluster-wide):
--   CREATE ROLE report_agent_rt LOGIN PASSWORD '<from secret store>' NOINHERIT;
--
-- Per tenant database:

-- GRANT CONNECT ON DATABASE "<tenant database name>" TO report_agent_rt;

-- Read-only access to business data and metadata the agent introspects.
GRANT USAGE ON SCHEMA dbo, workflow, repository, users TO report_agent_rt;
GRANT SELECT ON ALL TABLES IN SCHEMA dbo, workflow, repository TO report_agent_rt;
GRANT SELECT ON users."Users", users."UserGroups" TO report_agent_rt;
-- Form/workflow tables are created dynamically by v6api; cover future ones too.
-- (Run as the role that creates them, i.e. the v6api tenant owner.)
ALTER DEFAULT PRIVILEGES IN SCHEMA dbo, workflow, repository GRANT SELECT ON TABLES TO report_agent_rt;

-- Writes only where the agent persists definitions, specs and runs.
GRANT USAGE ON SCHEMA reporting TO report_agent_rt;
GRANT SELECT, INSERT, UPDATE ON reporting."ReportDefinitions" TO report_agent_rt;
GRANT SELECT, INSERT, UPDATE ON reporting."ReportAgentSpecs" TO report_agent_rt;
GRANT SELECT, INSERT ON reporting."ReportAgentRuns" TO report_agent_rt;

-- AI usage columns (read-only). The orchestrator creates ai.agent_request_logs on first write;
-- run this after it exists. Without it the AI columns are simply not offered.
GRANT USAGE ON SCHEMA ai TO report_agent_rt;
GRANT SELECT ON ai.agent_request_logs TO report_agent_rt;

-- Catalog database (separate login is fine; read-only is enough):
--   GRANT USAGE ON SCHEMA catalog TO report_agent_catalog_ro;
--   GRANT SELECT ON catalog."Tenants", catalog."UserTenants" TO report_agent_catalog_ro;

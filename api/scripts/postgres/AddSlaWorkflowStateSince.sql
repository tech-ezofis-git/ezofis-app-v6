-- Tenant database: when a workflow's SLA settings last changed.
-- The API also adds these columns itself on first use (WorkflowSlaStore.EnsureTablesAsync).
-- SLA timers are only created for tickets that reached the stage / were created after sla_since,
-- so saving an SLA does not notify about tickets that were already waiting.
ALTER TABLE IF EXISTS workflow.sla_workflow_state ADD COLUMN IF NOT EXISTS sla_fingerprint varchar(64) NULL;
ALTER TABLE IF EXISTS workflow.sla_workflow_state ADD COLUMN IF NOT EXISTS sla_since timestamptz NULL;

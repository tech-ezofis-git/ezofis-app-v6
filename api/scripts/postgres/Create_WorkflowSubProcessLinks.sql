-- Parent→child request links (sub-workflows) -- Postgres.
-- Run on tenant database. Normally not needed: WorkflowSubProcessService creates
-- this table on the first link, so keep the two in step. A request has at most one
-- parent; the request itself lives in the per-workflow tables.

CREATE SCHEMA IF NOT EXISTS workflow;

CREATE TABLE IF NOT EXISTS workflow.sub_process_links (
    id uuid NOT NULL CONSTRAINT pk_sub_process_links PRIMARY KEY,
    tenant_id uuid NOT NULL,
    main_workflow_id uuid NOT NULL,
    main_process_id uuid NOT NULL,
    sub_workflow_id uuid NOT NULL,
    sub_process_id uuid NOT NULL,
    created_at_utc timestamptz NOT NULL DEFAULT now(),
    created_by uuid NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sub_process_links_tenant_child
    ON workflow.sub_process_links (tenant_id, sub_process_id);
CREATE INDEX IF NOT EXISTS ix_sub_process_links_tenant_parent
    ON workflow.sub_process_links (tenant_id, main_process_id);

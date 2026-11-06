-- ai.agent_request_logs: one row per AI orchestrator agent run (per tenant database).
-- Written by the orchestrator (agents/app/control/agent_request_log.py), which also creates
-- this table on its first write per tenant. Kept here so the tenant schema is on record and a
-- DB admin can create it ahead of time. Idempotent.
-- Read by Report Agent v2 for the AI usage columns (Workflow and Folder sources).
-- sub_agents / llm_call_details: the sub-agents (e.g. AP skills) that ran and one JSON entry
-- per LLM call (sub_agent, model, provider, burgr_suggested_model, status, duration_ms, tokens, cost_usd).

CREATE SCHEMA IF NOT EXISTS ai;
CREATE TABLE IF NOT EXISTS ai.agent_request_logs (
        id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id              uuid        NOT NULL,
        correlation_id         text,
        source                 text        NOT NULL,
        agent_name             text        NOT NULL,
        skill_id               text,
        user_id                uuid,
        workflow_id            uuid,
        instance_id            uuid,
        form_entry_id          text,
        repository_id          uuid,
        repository_item_id     text,
        model_used             text,
        provider               text,
        burgr_suggested_model  text,
        followed_suggestion    boolean,
        fallback_used          boolean     NOT NULL DEFAULT false,
        status                 text        NOT NULL,
        error_type             text,
        started_at_utc         timestamptz NOT NULL,
        finished_at_utc        timestamptz,
        duration_ms            integer,
        llm_calls              integer     NOT NULL DEFAULT 0,
        prompt_tokens          integer     NOT NULL DEFAULT 0,
        completion_tokens      integer     NOT NULL DEFAULT 0,
        total_tokens           integer     NOT NULL DEFAULT 0,
        cost_usd               numeric(12,6),
        credits_charged        integer,
        sub_agents             text,
        llm_call_details       jsonb       NOT NULL DEFAULT '[]'::jsonb,
        created_at_utc         timestamptz NOT NULL DEFAULT now()
    );
ALTER TABLE ai.agent_request_logs ADD COLUMN IF NOT EXISTS sub_agents text;
ALTER TABLE ai.agent_request_logs ADD COLUMN IF NOT EXISTS llm_call_details jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS ix_agent_request_logs_instance
        ON ai.agent_request_logs (tenant_id, instance_id, started_at_utc DESC);
CREATE INDEX IF NOT EXISTS ix_agent_request_logs_repo_item
        ON ai.agent_request_logs (tenant_id, repository_item_id, started_at_utc DESC);
CREATE INDEX IF NOT EXISTS ix_agent_request_logs_started
        ON ai.agent_request_logs (tenant_id, started_at_utc DESC);

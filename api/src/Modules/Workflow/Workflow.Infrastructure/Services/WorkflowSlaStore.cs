using System.Collections.Concurrent;
using Npgsql;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Tenant tables for designer SLAs (created on first use):
/// <list type="bullet">
/// <item><c>workflow.sla_timers</c> — one row per ticket stage (response) or ticket (resolution) per rule,
/// with its due time. Status 0 pending, 1 fired, 2 cancelled, 3 failed, 4 pending Advanced. The unique key
/// makes each rule fire at most once per ticket stage. Advanced timers wait in status 4 because several API
/// versions can share one tenant database (a laptop and the server): a version that does not know Advanced
/// only ever claims or deletes status 0, so it cannot cancel them.</item>
/// <item><c>workflow.sla_notification_outbox</c> — emails/SMS written when a timer fires and sent by
/// <see cref="WorkflowSlaOutboxSender"/>. Status 0 pending, 1 sent, 2 failed.</item>
/// <item><c>workflow.sla_workflow_state</c> — per-workflow watermarks so new tickets are read once, and the
/// definition version the pending timers were built from.</item>
/// <item><c>workflow.sla_advanced_evaluations</c> — one row per ticket evaluated by the Advanced SLA rules.</item>
/// </list>
/// </summary>
internal static class WorkflowSlaStore
{
    public const short TimerPending = 0;
    public const short TimerFired = 1;
    public const short TimerCancelled = 2;
    public const short TimerFailed = 3;
    public const short TimerPendingAdvanced = 4;

    public const short OutboxPending = 0;
    public const short OutboxSent = 1;
    public const short OutboxFailed = 2;

    private static readonly ConcurrentDictionary<string, bool> Ensured = new();

    public static async Task EnsureTablesAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var key = $"{connection.Host}/{connection.Database}";
        if (Ensured.ContainsKey(key))
            return;

        const string sql = """
            CREATE SCHEMA IF NOT EXISTS workflow;

            CREATE TABLE IF NOT EXISTS workflow.sla_workflow_state (
                workflow_id uuid NOT NULL CONSTRAINT pk_sla_workflow_state PRIMARY KEY,
                definition_modified_at timestamptz NULL,
                last_transaction_id integer NOT NULL DEFAULT 0,
                last_instance_created_at timestamptz NULL,
                updated_at_utc timestamptz NOT NULL DEFAULT now()
            );
            -- When the SLA settings last changed (hash of the SLA parts only): tickets that arrived
            -- earlier get no timers.
            ALTER TABLE workflow.sla_workflow_state ADD COLUMN IF NOT EXISTS sla_fingerprint varchar(64) NULL;
            ALTER TABLE workflow.sla_workflow_state ADD COLUMN IF NOT EXISTS sla_since timestamptz NULL;

            CREATE TABLE IF NOT EXISTS workflow.sla_timers (
                id bigint GENERATED ALWAYS AS IDENTITY CONSTRAINT pk_sla_timers PRIMARY KEY,
                workflow_id uuid NOT NULL,
                workflow_instance_id uuid NOT NULL,
                scope varchar(16) NOT NULL,
                transaction_id integer NOT NULL DEFAULT 0,
                activity_id varchar(128) NULL,
                rule_id varchar(128) NOT NULL,
                due_at_utc timestamptz NOT NULL,
                status smallint NOT NULL DEFAULT 0,
                attempts integer NOT NULL DEFAULT 0,
                locked_until timestamptz NULL,
                created_at_utc timestamptz NOT NULL DEFAULT now(),
                processed_at_utc timestamptz NULL,
                outcome text NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ux_sla_timers_rule
                ON workflow.sla_timers (workflow_id, workflow_instance_id, scope, transaction_id, rule_id);
            CREATE INDEX IF NOT EXISTS ix_sla_timers_due_pending
                ON workflow.sla_timers (due_at_utc) WHERE status = 0;
            -- Advanced SLA: the values evaluated when the timer was created (rule, SLA Master entry,
            -- durations, users, deadlines). Firing uses this copy, so later master / rule edits do not
            -- change an active SLA.
            ALTER TABLE workflow.sla_timers ADD COLUMN IF NOT EXISTS snapshot_json text NULL;
            CREATE INDEX IF NOT EXISTS ix_sla_timers_due_pending_advanced
                ON workflow.sla_timers (due_at_utc) WHERE status = 4;
            CREATE INDEX IF NOT EXISTS ix_sla_timers_instance
                ON workflow.sla_timers (workflow_instance_id);

            -- Advanced SLA: each request is evaluated once (at creation); the row records the outcome
            -- (matched rules / entries, or why none) and stops a second evaluation.
            CREATE TABLE IF NOT EXISTS workflow.sla_advanced_evaluations (
                workflow_id uuid NOT NULL,
                workflow_instance_id uuid NOT NULL,
                evaluated_at_utc timestamptz NOT NULL DEFAULT now(),
                matched boolean NOT NULL,
                outcome_json text NOT NULL,
                CONSTRAINT pk_sla_advanced_evaluations PRIMARY KEY (workflow_id, workflow_instance_id)
            );

            CREATE TABLE IF NOT EXISTS workflow.sla_notification_outbox (
                id bigint GENERATED ALWAYS AS IDENTITY CONSTRAINT pk_sla_notification_outbox PRIMARY KEY,
                timer_id bigint NOT NULL,
                workflow_id uuid NOT NULL,
                workflow_instance_id uuid NOT NULL,
                channel varchar(8) NOT NULL,
                recipient_user_id uuid NOT NULL,
                address varchar(320) NOT NULL,
                display_name varchar(256) NULL,
                subject text NOT NULL,
                heading text NOT NULL,
                body_html text NOT NULL,
                sms_text text NOT NULL,
                status smallint NOT NULL DEFAULT 0,
                attempts integer NOT NULL DEFAULT 0,
                next_attempt_at timestamptz NOT NULL DEFAULT now(),
                locked_until timestamptz NULL,
                last_error text NULL,
                created_at_utc timestamptz NOT NULL DEFAULT now(),
                sent_at_utc timestamptz NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ux_sla_outbox_message
                ON workflow.sla_notification_outbox (timer_id, channel, recipient_user_id);
            CREATE INDEX IF NOT EXISTS ix_sla_outbox_pending
                ON workflow.sla_notification_outbox (next_attempt_at) WHERE status = 0;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
        Ensured[key] = true;
    }

    public static async Task<bool> TablesExistAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            "SELECT to_regclass('workflow.sla_notification_outbox') IS NOT NULL;", connection);
        return await cmd.ExecuteScalarAsync(cancellationToken) is true;
    }
}

using System.Collections.Concurrent;
using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;
using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;
using SaaSApp.Workflow.Infrastructure.Options;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Designer SLA timers for one tenant (run by <c>WorkflowSlaBackgroundService</c>).
/// <list type="number">
/// <item>Materialize: tickets that newly reached an SLA block (open transaction) or were newly created
/// (resolution SLA) get one <c>sla_timers</c> row per rule with its due time. Each transaction / ticket is
/// read once (watermark in <c>sla_workflow_state</c>); editing the SLA rebuilds pending timers.</item>
/// <item>Fire: due timers are claimed with <c>FOR UPDATE SKIP LOCKED</c> (safe across API instances),
/// re-checked (ticket still waiting / not resolved), notifications are written to the outbox, then the
/// escalation runs: User = Forward (reassign), Stage = move the ticket to the chosen stage.</item>
/// </list>
/// Advanced (SLA Master) configurations are not executed.
/// </summary>
public sealed class WorkflowSlaTimerService
{
    public const string ScopeResponse = "response";
    public const string ScopeResolution = "resolution";
    public const string EscalationReview = "SLA Escalated";
    private const string ForwardReview = "Forward";
    private const int MaxFireAttempts = 3;

    // Re-read a few recent ids each pass: identity values can commit out of order.
    private const int TransactionLookback = 200;
    private static readonly TimeSpan InstanceLookback = TimeSpan.FromMinutes(10);
    private const int MaterializeLimit = 5000;

    // Parsed SLA per workflow, refreshed when the workflow row is modified.
    private static readonly ConcurrentDictionary<Guid, CachedDefinition> Definitions = new();

    private readonly ITenantContext _tenantContext;
    private readonly IWorkflowJsonStorageService _jsonStorage;
    private readonly IMediator _mediator;
    private readonly WorkflowSlaOptions _options;
    private readonly ILogger<WorkflowSlaTimerService> _logger;

    public WorkflowSlaTimerService(
        ITenantContext tenantContext,
        IWorkflowJsonStorageService jsonStorage,
        IMediator mediator,
        IOptions<WorkflowSlaOptions> options,
        ILogger<WorkflowSlaTimerService> logger)
    {
        _tenantContext = tenantContext;
        _jsonStorage = jsonStorage;
        _mediator = mediator;
        _options = options.Value;
        _logger = logger;
    }

    private sealed record CachedDefinition(DateTime? ModifiedAtUtc, WorkflowJsonDto? Json);

    private sealed record SlaWorkflow(Guid Id, string Name, DateTime? ModifiedAtUtc, WorkflowJsonDto Json);

    private sealed record ClaimedTimer(
        long Id, Guid WorkflowId, Guid InstanceId, string Scope, int TransactionId, string? ActivityId,
        string RuleId, DateTime DueAtUtc, int Attempts);

    /// <summary>Returns the number of timers fired.</summary>
    public async Task<int> RunAsync(CancellationToken cancellationToken = default)
    {
        var connectionString = _tenantContext.ConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString))
            return 0;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var workflows = await LoadSlaWorkflowsAsync(connection, cancellationToken);
        if (workflows.Count == 0 && !await WorkflowSlaStore.TablesExistAsync(connection, cancellationToken))
            return 0;

        await WorkflowSlaStore.EnsureTablesAsync(connection, cancellationToken);

        foreach (var workflow in workflows.Values)
        {
            try
            {
                await MaterializeAsync(connection, workflow, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "SLA timers could not be created for workflow {WorkflowId}", workflow.Id);
            }
        }

        return await FireDueAsync(connection, workflows, cancellationToken);
    }

    // ---- Materialize ------------------------------------------------------------------------------

    private async Task MaterializeAsync(NpgsqlConnection connection, SlaWorkflow workflow, CancellationToken cancellationToken)
    {
        var suffix = workflow.Id.ToString("N")[..8];
        await using (var exists = new NpgsqlCommand(
            $"SELECT to_regclass('workflow.transaction_{suffix}') IS NOT NULL AND to_regclass('workflow.workflow_instances_{suffix}') IS NOT NULL;",
            connection))
        {
            if (await exists.ExecuteScalarAsync(cancellationToken) is not true)
                return;
        }

        var (lastTransactionId, lastInstanceCreatedAt, slaSince) = await PrepareStateAsync(connection, workflow, cancellationToken);

        var blocks = (workflow.Json.Blocks ?? [])
            .Where(b => WorkflowSlaSchedule.IsActiveStandard(b.Settings?.SlaSettings))
            .ToDictionary(b => b.Id, b => b.Settings.SlaSettings!, StringComparer.Ordinal);
        if (blocks.Count > 0)
            lastTransactionId = await MaterializeResponseAsync(connection, workflow.Id, suffix, blocks, lastTransactionId, slaSince, cancellationToken);

        var resolution = workflow.Json.Settings?.SlaSettings;
        if (WorkflowSlaSchedule.IsActiveStandard(resolution))
            lastInstanceCreatedAt = await MaterializeResolutionAsync(connection, workflow.Id, suffix, resolution!, lastInstanceCreatedAt, slaSince, cancellationToken);

        const string save = """
            UPDATE workflow.sla_workflow_state
            SET last_transaction_id = @LastTx, last_instance_created_at = @LastCreated, updated_at_utc = now()
            WHERE workflow_id = @WorkflowId;
            """;
        await using var cmd = new NpgsqlCommand(save, connection);
        cmd.Parameters.AddWithValue("@LastTx", lastTransactionId);
        cmd.Parameters.AddWithValue("@LastCreated", (object?)lastInstanceCreatedAt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@WorkflowId", workflow.Id);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Loads the watermarks and the time the SLA settings were set; on a new or edited workflow drops
    /// pending timers and rescans. "SLA since" only moves when the SLA settings themselves change.
    /// </summary>
    private static async Task<(int LastTransactionId, DateTime? LastInstanceCreatedAt, DateTime? SlaSince)> PrepareStateAsync(
        NpgsqlConnection connection,
        SlaWorkflow workflow,
        CancellationToken cancellationToken)
    {
        var fingerprint = WorkflowSlaSchedule.Fingerprint(workflow.Json);
        string? storedFingerprint = null;
        DateTime? storedSince = null;
        await using (var read = new NpgsqlCommand(
            """
            SELECT definition_modified_at, last_transaction_id, last_instance_created_at, sla_fingerprint, sla_since
            FROM workflow.sla_workflow_state WHERE workflow_id = @WorkflowId;
            """,
            connection))
        {
            read.Parameters.AddWithValue("@WorkflowId", workflow.Id);
            await using var reader = await read.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                var definitionAt = reader.IsDBNull(0) ? (DateTime?)null : reader.GetDateTime(0).ToUniversalTime();
                storedFingerprint = reader.IsDBNull(3) ? null : reader.GetString(3);
                storedSince = reader.IsDBNull(4) ? null : reader.GetDateTime(4).ToUniversalTime();
                // Rows from before sla_since existed fall through once, so their pending timers for
                // tickets that were already waiting are dropped too.
                if (SameInstant(definitionAt, workflow.ModifiedAtUtc) && storedSince is { } current)
                {
                    return (reader.GetInt32(1),
                        reader.IsDBNull(2) ? null : reader.GetDateTime(2).ToUniversalTime(),
                        current);
                }
            }
        }

        // Same SLA settings (another part of the workflow was saved): keep when the SLA was set.
        var since = storedFingerprint == fingerprint && storedSince is { } kept
            ? kept
            : workflow.ModifiedAtUtc is { } m ? DateTime.SpecifyKind(m, DateTimeKind.Utc) : DateTime.UtcNow;

        // New or edited definition: rebuild pending timers from every waiting ticket that arrived after
        // the SLA was set. Rules that already fired keep their row, so they do not fire again.
        const string reset = """
            DELETE FROM workflow.sla_timers WHERE workflow_id = @WorkflowId AND status = 0;
            INSERT INTO workflow.sla_workflow_state
                (workflow_id, definition_modified_at, last_transaction_id, last_instance_created_at, sla_fingerprint, sla_since)
            VALUES (@WorkflowId, @DefinitionAt, 0, NULL, @Fingerprint, @Since)
            ON CONFLICT (workflow_id) DO UPDATE
            SET definition_modified_at = EXCLUDED.definition_modified_at,
                last_transaction_id = 0, last_instance_created_at = NULL,
                sla_fingerprint = EXCLUDED.sla_fingerprint, sla_since = EXCLUDED.sla_since,
                updated_at_utc = now();
            """;
        await using var cmd = new NpgsqlCommand(reset, connection);
        cmd.Parameters.AddWithValue("@WorkflowId", workflow.Id);
        cmd.Parameters.AddWithValue("@DefinitionAt", workflow.ModifiedAtUtc is { } d ? DateTime.SpecifyKind(d, DateTimeKind.Utc) : DBNull.Value);
        cmd.Parameters.AddWithValue("@Fingerprint", fingerprint);
        cmd.Parameters.AddWithValue("@Since", since);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
        return (0, null, since);
    }

    private static bool SameInstant(DateTime? stored, DateTime? current) =>
        stored is null && current is null
        || stored is { } s && current is { } c
            && Math.Abs((s.ToUniversalTime() - DateTime.SpecifyKind(c, DateTimeKind.Utc)).TotalMilliseconds) < 1;

    private static async Task<int> MaterializeResponseAsync(
        NpgsqlConnection connection,
        Guid workflowId,
        string suffix,
        Dictionary<string, WorkflowSlaConfigurationDto> blocks,
        int lastTransactionId,
        DateTime? slaSince,
        CancellationToken cancellationToken)
    {
        int maxId;
        await using (var max = new NpgsqlCommand($"SELECT COALESCE(MAX(id), 0) FROM workflow.transaction_{suffix};", connection))
            maxId = Convert.ToInt32(await max.ExecuteScalarAsync(cancellationToken));

        var sql = $"""
            SELECT t.id, t.workflow_instance_id, t.activity_id, t.created_at
            FROM workflow.transaction_{suffix} t
            JOIN workflow.workflow_instances_{suffix} i ON i.id = t.workflow_instance_id
            WHERE t.id > @FromId AND t.id <= @MaxId
              AND t.is_deleted = false
              AND t.action_status = 0
              AND COALESCE(t.review, '') = ''
              AND t.activity_id = ANY(@ActivityIds)
              AND i.status IN (0, 1)
              AND i.is_archived = false
            ORDER BY t.id
            LIMIT @Limit;
            """;
        var instances = new List<Guid>();
        var transactions = new List<int>();
        var activities = new List<string?>();
        var rules = new List<string>();
        var dues = new List<DateTime>();
        var lastSeen = 0;
        var rows = 0;
        await using (var cmd = new NpgsqlCommand(sql, connection))
        {
            cmd.Parameters.AddWithValue("@FromId", Math.Max(0, lastTransactionId - TransactionLookback));
            cmd.Parameters.AddWithValue("@MaxId", maxId);
            cmd.Parameters.AddWithValue("@ActivityIds", blocks.Keys.ToArray());
            cmd.Parameters.AddWithValue("@Limit", MaterializeLimit);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                rows++;
                lastSeen = reader.GetInt32(0);
                var activityId = reader.GetString(2);
                var arrived = reader.GetDateTime(3).ToUniversalTime();
                if (!WorkflowSlaSchedule.AppliesTo(arrived, slaSince))
                    continue; // reached the stage before the SLA was set
                foreach (var (ruleId, due) in WorkflowSlaSchedule.Timers(blocks[activityId], arrived))
                {
                    transactions.Add(lastSeen);
                    instances.Add(reader.GetGuid(1));
                    activities.Add(activityId);
                    rules.Add(ruleId);
                    dues.Add(due);
                }
            }
        }

        await InsertTimersAsync(connection, workflowId, ScopeResponse, instances, transactions, activities, rules, dues, cancellationToken);
        // A full page means more rows remain: continue after the last one next pass.
        return rows == MaterializeLimit ? lastSeen : Math.Max(lastTransactionId, maxId);
    }

    private static async Task<DateTime?> MaterializeResolutionAsync(
        NpgsqlConnection connection,
        Guid workflowId,
        string suffix,
        WorkflowSlaConfigurationDto sla,
        DateTime? lastInstanceCreatedAt,
        DateTime? slaSince,
        CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT i.id, i.created_at_utc
            FROM workflow.workflow_instances_{suffix} i
            WHERE i.status IN (0, 1)
              AND i.completed_at_utc IS NULL
              AND i.is_archived = false
              AND (@FromCreated IS NULL OR i.created_at_utc > @FromCreated)
            ORDER BY i.created_at_utc
            LIMIT @Limit;
            """;
        var instances = new List<Guid>();
        var rules = new List<string>();
        var dues = new List<DateTime>();
        DateTime? newest = lastInstanceCreatedAt;
        var rows = 0;
        await using (var cmd = new NpgsqlCommand(sql, connection))
        {
            cmd.Parameters.Add(new NpgsqlParameter("@FromCreated", NpgsqlTypes.NpgsqlDbType.TimestampTz)
            {
                Value = lastInstanceCreatedAt is { } last ? DateTime.SpecifyKind(last - InstanceLookback, DateTimeKind.Utc) : DBNull.Value
            });
            cmd.Parameters.AddWithValue("@Limit", MaterializeLimit);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                rows++;
                var created = reader.GetDateTime(1).ToUniversalTime();
                if (newest is null || created > newest)
                    newest = created;
                if (!WorkflowSlaSchedule.AppliesTo(created, slaSince))
                    continue; // created before the SLA was set
                foreach (var (ruleId, due) in WorkflowSlaSchedule.Timers(sla, created))
                {
                    instances.Add(reader.GetGuid(0));
                    rules.Add(ruleId);
                    dues.Add(due);
                }
            }
        }

        await InsertTimersAsync(
            connection, workflowId, ScopeResolution, instances,
            Enumerable.Repeat(0, instances.Count).ToList(),
            Enumerable.Repeat<string?>(null, instances.Count).ToList(),
            rules, dues, cancellationToken);
        return rows == 0 ? lastInstanceCreatedAt : newest;
    }

    private static async Task InsertTimersAsync(
        NpgsqlConnection connection,
        Guid workflowId,
        string scope,
        List<Guid> instances,
        List<int> transactions,
        List<string?> activities,
        List<string> rules,
        List<DateTime> dues,
        CancellationToken cancellationToken)
    {
        if (instances.Count == 0)
            return;

        const string sql = """
            INSERT INTO workflow.sla_timers (workflow_id, workflow_instance_id, scope, transaction_id, activity_id, rule_id, due_at_utc)
            SELECT @WorkflowId, x.instance_id, @Scope, x.transaction_id, x.activity_id, x.rule_id, x.due_at
            FROM unnest(@Instances, @Transactions, @Activities, @Rules, @Dues)
                AS x(instance_id, transaction_id, activity_id, rule_id, due_at)
            ON CONFLICT (workflow_id, workflow_instance_id, scope, transaction_id, rule_id) DO NOTHING;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        cmd.Parameters.AddWithValue("@Scope", scope);
        cmd.Parameters.AddWithValue("@Instances", instances.ToArray());
        cmd.Parameters.AddWithValue("@Transactions", transactions.ToArray());
        cmd.Parameters.Add(new NpgsqlParameter("@Activities", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Text)
        {
            Value = activities.Select(a => (object?)a ?? DBNull.Value).ToArray()
        });
        cmd.Parameters.AddWithValue("@Rules", rules.ToArray());
        cmd.Parameters.Add(new NpgsqlParameter("@Dues", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.TimestampTz)
        {
            Value = dues.Select(d => DateTime.SpecifyKind(d, DateTimeKind.Utc)).ToArray()
        });
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    // ---- Fire -------------------------------------------------------------------------------------

    private async Task<int> FireDueAsync(
        NpgsqlConnection connection,
        IReadOnlyDictionary<Guid, SlaWorkflow> workflows,
        CancellationToken cancellationToken)
    {
        // Lease the earliest due timers; another instance skips them until the lease expires.
        const string claim = """
            UPDATE workflow.sla_timers SET locked_until = now() + interval '5 minutes'
            WHERE id IN (
                SELECT id FROM workflow.sla_timers
                WHERE status = 0 AND due_at_utc <= now() AND (locked_until IS NULL OR locked_until < now())
                ORDER BY due_at_utc
                LIMIT @Batch
                FOR UPDATE SKIP LOCKED)
            RETURNING id, workflow_id, workflow_instance_id, scope, transaction_id, activity_id, rule_id, due_at_utc, attempts;
            """;
        var timers = new List<ClaimedTimer>();
        await using (var cmd = new NpgsqlCommand(claim, connection))
        {
            cmd.Parameters.AddWithValue("@Batch", Math.Max(1, _options.TimerBatchSize));
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                timers.Add(new ClaimedTimer(
                    reader.GetInt64(0), reader.GetGuid(1), reader.GetGuid(2), reader.GetString(3), reader.GetInt32(4),
                    reader.IsDBNull(5) ? null : reader.GetString(5), reader.GetString(6),
                    reader.GetDateTime(7).ToUniversalTime(), reader.GetInt32(8)));
            }
        }

        var fired = 0;
        foreach (var timer in timers.OrderBy(t => t.DueAtUtc).ThenBy(t => t.Id))
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (WorkflowSlaSchedule.IsStale(timer.DueAtUtc, DateTime.UtcNow, _options.MaxLateMinutes))
            {
                // Came due while the SLA process was off (e.g. old tickets when SLA was switched on).
                var skipped = $"skipped: due {timer.DueAtUtc:yyyy-MM-dd HH:mm} UTC, more than {_options.MaxLateMinutes} min ago";
                await MarkAsync(connection, timer.Id, WorkflowSlaStore.TimerCancelled, skipped, cancellationToken);
                _logger.LogInformation(
                    "SLA timer {TimerId} ({Scope} rule {RuleId}, instance {InstanceId}): {Outcome}",
                    timer.Id, timer.Scope, timer.RuleId, timer.InstanceId, skipped);
                continue;
            }

            try
            {
                var (status, outcome) = await FireAsync(connection, timer, workflows, cancellationToken);
                await MarkAsync(connection, timer.Id, status, outcome, cancellationToken);
                if (status == WorkflowSlaStore.TimerFired)
                    fired++;
                _logger.LogInformation(
                    "SLA timer {TimerId} ({Scope} rule {RuleId}, instance {InstanceId}): {Status} — {Outcome}",
                    timer.Id, timer.Scope, timer.RuleId, timer.InstanceId, StatusName(status), outcome);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "SLA timer {TimerId} failed (attempt {Attempt}).", timer.Id, timer.Attempts + 1);
                await RetryOrFailAsync(connection, timer, ex.Message, cancellationToken);
            }
        }

        return fired;
    }

    private async Task<(short Status, string Outcome)> FireAsync(
        NpgsqlConnection connection,
        ClaimedTimer timer,
        IReadOnlyDictionary<Guid, SlaWorkflow> workflows,
        CancellationToken cancellationToken)
    {
        if (!workflows.TryGetValue(timer.WorkflowId, out var workflow))
            return (WorkflowSlaStore.TimerCancelled, "workflow is no longer published with an SLA");

        var suffix = workflow.Id.ToString("N")[..8];
        var isResponse = timer.Scope == ScopeResponse;
        var sla = isResponse
            ? workflow.Json.Blocks?.FirstOrDefault(b => b.Id == timer.ActivityId)?.Settings?.SlaSettings
            : workflow.Json.Settings?.SlaSettings;
        var rule = WorkflowSlaSchedule.IsActiveStandard(sla) ? WorkflowSlaSchedule.FindRule(sla, timer.RuleId) : null;
        if (rule == null)
            return (WorkflowSlaStore.TimerCancelled, "SLA rule was removed");

        var ticket = isResponse
            ? await LoadWaitingStepAsync(connection, suffix, timer, cancellationToken)
            : await LoadUnresolvedTicketAsync(connection, suffix, timer.InstanceId, cancellationToken);
        if (ticket == null)
            return (WorkflowSlaStore.TimerCancelled, isResponse ? "ticket was already acted on" : "ticket is already resolved");

        var outcome = new List<string>();
        var recipientIds = ParseUserIds(rule.NotifyUserIds);
        if (rule.Initiator == true)
            recipientIds.Add(ticket.StartedBy);
        Guid? escalationUserId = isResponse
            && IsType(rule.EscalateTo, WorkflowSlaSettingsValidator.EscalateToUser)
            && Guid.TryParse(rule.EscalateTo!.UserId, out var escUser) ? escUser : null;
        if (escalationUserId is { } eu)
            recipientIds.Add(eu);

        var reference = string.IsNullOrWhiteSpace(ticket.Reference) ? timer.InstanceId.ToString("D")[..8] : ticket.Reference;
        var limit = WorkflowSlaSchedule.Describe(rule);
        var stage = string.IsNullOrWhiteSpace(ticket.StageName) ? "a stage" : ticket.StageName;
        var message = isResponse
            ? new WorkflowSlaNotifier.Message(
                $"SLA breached: ticket {reference} at {stage}",
                $"Ticket {reference} is waiting longer than {limit}",
                $"Ticket <strong>{WorkflowSlaNotifier.Encode(reference)}</strong> in "
                    + $"<strong>{WorkflowSlaNotifier.Encode(workflow.Name)}</strong> has been waiting at "
                    + $"<strong>{WorkflowSlaNotifier.Encode(stage)}</strong> for more than "
                    + $"<strong>{WorkflowSlaNotifier.Encode(limit)}</strong> without action "
                    + $"(SLA rule <strong>{WorkflowSlaNotifier.Encode(rule.Name)}</strong>)."
                    + EscalationSentence(rule),
                $"EZOFIS SLA: ticket {reference} ({workflow.Name}) waiting at {stage} over {limit}.")
            : new WorkflowSlaNotifier.Message(
                $"Resolution SLA breached: ticket {reference}",
                $"Ticket {reference} is not resolved within {limit}",
                $"Ticket <strong>{WorkflowSlaNotifier.Encode(reference)}</strong> in "
                    + $"<strong>{WorkflowSlaNotifier.Encode(workflow.Name)}</strong> was created more than "
                    + $"<strong>{WorkflowSlaNotifier.Encode(limit)}</strong> ago and has not reached the end of the workflow "
                    + $"(SLA rule <strong>{WorkflowSlaNotifier.Encode(rule.Name)}</strong>).",
                $"EZOFIS SLA: ticket {reference} ({workflow.Name}) not resolved within {limit}.");

        // 1) Notifications go to the outbox first, so they survive a failed escalation.
        var (email, sms) = WorkflowSlaSchedule.Channels(rule, sla!);
        if (recipientIds.Count == 0)
            outcome.Add("no notify users selected");
        else if (!email && !sms)
            outcome.Add("Email and SMS are both off for this rule");
        else
            outcome.Add(await QueueNotificationsAsync(connection, timer, recipientIds, email, sms, message, cancellationToken));

        // 2) Escalation (response SLA only).
        if (isResponse)
            outcome.Add(await EscalateAsync(connection, timer, rule, ticket, limit, cancellationToken));

        return (WorkflowSlaStore.TimerFired, string.Join("; ", outcome.Where(o => o.Length > 0)));
    }

    private sealed record TicketRow(Guid StartedBy, string? Reference, string? StageName, Guid? AssigneeUserId);

    private static async Task<TicketRow?> LoadWaitingStepAsync(
        NpgsqlConnection connection, string suffix, ClaimedTimer timer, CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT i.started_by, i.reference_number, t.stage_name, t.activity_user_id
            FROM workflow.transaction_{suffix} t
            JOIN workflow.workflow_instances_{suffix} i ON i.id = t.workflow_instance_id
            WHERE t.id = @TransactionId
              AND t.is_deleted = false
              AND t.action_status = 0
              AND COALESCE(t.review, '') = ''
              AND t.activity_id = @ActivityId
              AND i.status IN (0, 1);
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@TransactionId", timer.TransactionId);
        cmd.Parameters.AddWithValue("@ActivityId", timer.ActivityId ?? string.Empty);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? new TicketRow(reader.GetGuid(0), reader.IsDBNull(1) ? null : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2), reader.IsDBNull(3) ? null : reader.GetGuid(3))
            : null;
    }

    private static async Task<TicketRow?> LoadUnresolvedTicketAsync(
        NpgsqlConnection connection, string suffix, Guid instanceId, CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT i.started_by, i.reference_number
            FROM workflow.workflow_instances_{suffix} i
            WHERE i.id = @InstanceId
              AND i.status IN (0, 1)
              AND i.completed_at_utc IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM workflow.transaction_{suffix} t
                  WHERE t.workflow_instance_id = i.id AND t.is_deleted = false
                    AND UPPER(TRIM(COALESCE(t.stage_type, ''))) = 'END');
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@InstanceId", instanceId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? new TicketRow(reader.GetGuid(0), reader.IsDBNull(1) ? null : reader.GetString(1), null, null)
            : null;
    }

    private static async Task<string> QueueNotificationsAsync(
        NpgsqlConnection connection,
        ClaimedTimer timer,
        HashSet<Guid> recipientIds,
        bool email,
        bool sms,
        WorkflowSlaNotifier.Message message,
        CancellationToken cancellationToken)
    {
        var recipients = await WorkflowSlaNotifier.LoadRecipientsAsync(connection, recipientIds, cancellationToken);
        var queued = new List<(string Channel, WorkflowSlaNotifier.Recipient Recipient, string Address)>();
        var missing = new List<string>();
        foreach (var r in recipients)
        {
            if (email)
            {
                if (string.IsNullOrWhiteSpace(r.Email)) missing.Add($"no email for user {r.UserId}");
                else queued.Add(("email", r, r.Email.Trim()));
            }

            if (sms)
            {
                if (string.IsNullOrWhiteSpace(r.Phone)) missing.Add($"no phone number for user {r.UserId}");
                else queued.Add(("sms", r, r.Phone.Trim()));
            }
        }

        foreach (var id in recipientIds.Where(id => recipients.All(r => r.UserId != id)))
            missing.Add($"user {id} not found or inactive");

        const string sql = """
            INSERT INTO workflow.sla_notification_outbox
                (timer_id, workflow_id, workflow_instance_id, channel, recipient_user_id, address, display_name,
                 subject, heading, body_html, sms_text)
            VALUES (@TimerId, @WorkflowId, @InstanceId, @Channel, @UserId, @Address, @Name,
                    @Subject, @Heading, @Body, @Sms)
            ON CONFLICT (timer_id, channel, recipient_user_id) DO NOTHING;
            """;
        foreach (var (channel, recipient, address) in queued)
        {
            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@TimerId", timer.Id);
            cmd.Parameters.AddWithValue("@WorkflowId", timer.WorkflowId);
            cmd.Parameters.AddWithValue("@InstanceId", timer.InstanceId);
            cmd.Parameters.AddWithValue("@Channel", channel);
            cmd.Parameters.AddWithValue("@UserId", recipient.UserId);
            cmd.Parameters.AddWithValue("@Address", address);
            cmd.Parameters.AddWithValue("@Name", recipient.DisplayName);
            cmd.Parameters.AddWithValue("@Subject", message.Subject);
            cmd.Parameters.AddWithValue("@Heading", message.Heading);
            cmd.Parameters.AddWithValue("@Body", message.BodyHtml);
            cmd.Parameters.AddWithValue("@Sms", message.SmsText);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        var summary = $"queued email={queued.Count(q => q.Channel == "email")} sms={queued.Count(q => q.Channel == "sms")}";
        return missing.Count == 0 ? summary : $"{summary}; {string.Join("; ", missing)}";
    }

    private async Task<string> EscalateAsync(
        NpgsqlConnection connection,
        ClaimedTimer timer,
        WorkflowSlaConfigurationRuleDto rule,
        TicketRow ticket,
        string limit,
        CancellationToken cancellationToken)
    {
        try
        {
            if (IsType(rule.EscalateTo, WorkflowSlaSettingsValidator.EscalateToUser)
                && Guid.TryParse(rule.EscalateTo!.UserId, out var forwardTo))
            {
                if (forwardTo == ticket.AssigneeUserId)
                    return "already assigned to the escalation user";

                await _mediator.Send(new MoveToNextStepCommand(
                    timer.InstanceId,
                    timer.ActivityId!,
                    Review: ForwardReview,
                    Comments: $"SLA '{rule.Name}' crossed ({limit}); reassigned automatically.",
                    ActivityUserId: forwardTo,
                    CommentAuthorName: "SLA"), cancellationToken);
                return $"reassigned to {forwardTo}";
            }

            if (IsType(rule.EscalateTo, WorkflowSlaSettingsValidator.EscalateToStage)
                && !string.IsNullOrWhiteSpace(rule.EscalateTo!.StageId))
            {
                await _mediator.Send(new MoveToNextStepCommand(
                    timer.InstanceId,
                    timer.ActivityId!,
                    Review: EscalationReview,
                    Comments: $"SLA '{rule.Name}' crossed ({limit}); moved automatically.",
                    CommentAuthorName: "SLA",
                    TargetActivityId: rule.EscalateTo.StageId), cancellationToken);

                // The ticket left this stage; its later rules here no longer apply.
                const string cancel = """
                    UPDATE workflow.sla_timers SET status = 2, processed_at_utc = now(), outcome = 'ticket moved by an earlier SLA rule'
                    WHERE workflow_id = @WorkflowId AND scope = 'response' AND transaction_id = @TransactionId
                      AND status = 0 AND id <> @TimerId;
                    """;
                await using var cmd = new NpgsqlCommand(cancel, connection);
                cmd.Parameters.AddWithValue("@WorkflowId", timer.WorkflowId);
                cmd.Parameters.AddWithValue("@TransactionId", timer.TransactionId);
                cmd.Parameters.AddWithValue("@TimerId", timer.Id);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
                return $"moved to stage {rule.EscalateTo.StageId}";
            }

            return string.Empty;
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException or PostgresException)
        {
            _logger.LogWarning(ex, "SLA escalation failed for timer {TimerId}", timer.Id);
            return $"escalation failed: {ex.Message}";
        }
    }

    private static async Task MarkAsync(NpgsqlConnection connection, long timerId, short status, string outcome, CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            "UPDATE workflow.sla_timers SET status = @Status, outcome = @Outcome, processed_at_utc = now(), locked_until = NULL WHERE id = @Id;",
            connection);
        cmd.Parameters.AddWithValue("@Status", status);
        cmd.Parameters.AddWithValue("@Outcome", outcome);
        cmd.Parameters.AddWithValue("@Id", timerId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task RetryOrFailAsync(NpgsqlConnection connection, ClaimedTimer timer, string error, CancellationToken cancellationToken)
    {
        var attempts = timer.Attempts + 1;
        await using var cmd = new NpgsqlCommand(
            """
            UPDATE workflow.sla_timers
            SET attempts = @Attempts, locked_until = NULL, outcome = @Outcome,
                status = CASE WHEN @Attempts >= @Max THEN 3 ELSE 0 END,
                processed_at_utc = CASE WHEN @Attempts >= @Max THEN now() ELSE NULL END
            WHERE id = @Id;
            """,
            connection);
        cmd.Parameters.AddWithValue("@Attempts", attempts);
        cmd.Parameters.AddWithValue("@Max", MaxFireAttempts);
        cmd.Parameters.AddWithValue("@Outcome", $"attempt {attempts} failed: {error}");
        cmd.Parameters.AddWithValue("@Id", timer.Id);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string StatusName(short status) => status switch
    {
        WorkflowSlaStore.TimerFired => "fired",
        WorkflowSlaStore.TimerCancelled => "cancelled",
        WorkflowSlaStore.TimerFailed => "failed",
        _ => "pending"
    };

    // ---- Definitions ------------------------------------------------------------------------------

    private async Task<Dictionary<Guid, SlaWorkflow>> LoadSlaWorkflowsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT "Id", "Name", "ModifiedAtUtc"
            FROM workflow."Workflows"
            WHERE "IsDeleted" = false AND "Status" = 1;
            """;
        var active = new List<(Guid Id, string Name, DateTime? Modified)>();
        await using (var cmd = new NpgsqlCommand(sql, connection))
        await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
                active.Add((reader.GetGuid(0), reader.GetString(1), reader.IsDBNull(2) ? null : reader.GetDateTime(2)));
        }

        var result = new Dictionary<Guid, SlaWorkflow>();
        foreach (var (id, name, modified) in active)
        {
            var json = await LoadDefinitionAsync(id, modified, cancellationToken);
            if (json != null && HasStandardSla(json))
                result[id] = new SlaWorkflow(id, name, modified, json);
        }

        return result;
    }

    private static bool HasStandardSla(WorkflowJsonDto json) =>
        WorkflowSlaSchedule.IsActiveStandard(json.Settings?.SlaSettings)
        || (json.Blocks ?? []).Any(b => WorkflowSlaSchedule.IsActiveStandard(b.Settings?.SlaSettings));

    private async Task<WorkflowJsonDto?> LoadDefinitionAsync(Guid workflowId, DateTime? modifiedAtUtc, CancellationToken cancellationToken)
    {
        if (Definitions.TryGetValue(workflowId, out var cached) && cached.ModifiedAtUtc == modifiedAtUtc)
            return cached.Json;

        WorkflowJsonDto? json = null;
        try
        {
            var raw = await _jsonStorage.GetWorkflowJsonAsync(workflowId, cancellationToken);
            if (!string.IsNullOrWhiteSpace(raw))
                json = JsonSerializer.Deserialize<WorkflowJsonDto>(raw, WorkflowJsonSerializerOptions.Deserialize);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "SLA: workflow {WorkflowId} JSON is not readable; skipped.", workflowId);
        }

        Definitions[workflowId] = new CachedDefinition(modifiedAtUtc, json);
        return json;
    }

    private static string EscalationSentence(WorkflowSlaConfigurationRuleDto rule)
    {
        if (IsType(rule.EscalateTo, WorkflowSlaSettingsValidator.EscalateToStage))
            return " It is being moved to the stage chosen for escalation.";
        if (IsType(rule.EscalateTo, WorkflowSlaSettingsValidator.EscalateToUser))
            return " It is being reassigned for escalation.";
        return string.Empty;
    }

    private static bool IsType(WorkflowSlaEscalationDto? escalation, string type) =>
        string.Equals(escalation?.Type?.Trim(), type, StringComparison.OrdinalIgnoreCase);

    private static HashSet<Guid> ParseUserIds(IEnumerable<string>? ids) =>
        (ids ?? [])
            .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToHashSet();
}

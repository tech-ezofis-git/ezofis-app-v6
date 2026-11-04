using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Npgsql;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;
using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Advanced SLA with SLA Master entries (settings: SLA Master → entries, each set to Notify, Escalate or both):
/// <list type="bullet">
/// <item>Stage (response SLA): when a ticket reaches the stage, one timer per entry is due after that entry's
/// Response Time / Type. Notify tells the entry's Notify users; Escalate tells its Escalate users and
/// reassigns the ticket (Forward) to the first of them.</item>
/// <item>Workflow (resolution SLA): when a ticket is created, one timer per entry is due after that entry's
/// Resolution Time / Type. Notify tells its Notify users; Escalate tells its Escalate users.</item>
/// </list>
/// The entry is read by field label when timers are created (deadline) and again when they fire
/// (users), so edits to the entry apply. Business hours apply to the deadline.
/// </summary>
public sealed partial class WorkflowSlaTimerService
{
    internal const string MasterRuleId = "master";
    internal const string MasterStepRuleId = "master-step";

    // The system user background work runs as (WorkflowSlaBackgroundService).
    private static readonly Guid SlaUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    /// <summary>The entry's values (null with the reason when the entry or its values cannot be read).</summary>
    internal sealed record MasterSla(WorkflowSlaMasterValues? Values, string? Problem);

    internal async Task<MasterSla> LoadMasterSlaAsync(
        WorkflowSlaConfigurationDto sla, CancellationToken cancellationToken, string? rowEntryId = null)
    {
        // The workflow keeps only the entry id: the entry is read now, so renames and edits apply.
        var masterId = sla.SlaMasterId!.Trim();
        var entryId = (rowEntryId ?? sla.EntryId)?.Trim();
        if (string.IsNullOrWhiteSpace(entryId))
            return new MasterSla(null, "no SLA Master entry is selected.");

        var found = await _formEntryService.GetEntriesAsync(masterId, entryId, cancellationToken);
        var row = found.Entries?.FirstOrDefault();
        if (row == null)
            return new MasterSla(null, $"SLA Master entry {entryId} was not found (deleted from the master); no SLA.");

        var fields = await _formEntryService.GetFieldLabelsAsync(masterId, cancellationToken);
        return new MasterSla(WorkflowSlaMasterEntry.Read(entryId, row, fields, sla.MasterFieldId), null);
    }

    /// <summary>
    /// One timer per row of the entry's SLA Steps table, each frozen as read now. Once a ticket has timers
    /// for this entry it gets no more, so edits to the table apply to later tickets only.
    /// </summary>
    private async Task InsertStepTimersAsync(
        NpgsqlConnection connection,
        SlaWorkflow workflow,
        WorkflowSlaConfigurationDto sla,
        WorkflowSlaSchedule.MasterRow row,
        WorkflowSlaMasterValues entry,
        Guid instanceId,
        string scope,
        int transactionId,
        string? activityId,
        DateTime startedAtUtc,
        CancellationToken cancellationToken)
    {
        await using (var exists = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1 FROM workflow.sla_timers
                WHERE workflow_id = @WorkflowId AND workflow_instance_id = @InstanceId
                  AND scope = @Scope AND transaction_id = @TransactionId
                  AND (rule_id LIKE @Steps OR rule_id LIKE @Legacy));
            """,
            connection))
        {
            exists.Parameters.AddWithValue("@WorkflowId", workflow.Id);
            exists.Parameters.AddWithValue("@InstanceId", instanceId);
            exists.Parameters.AddWithValue("@Scope", scope);
            exists.Parameters.AddWithValue("@TransactionId", transactionId);
            exists.Parameters.AddWithValue("@Steps", $"{MasterStepRuleId}|{row.RowId}|%");
            exists.Parameters.AddWithValue("@Legacy", $"{MasterRuleId}|{row.RowId}|%");
            if (await exists.ExecuteScalarAsync(cancellationToken) is true)
                return;
        }

        var isStage = scope == ScopeAdvancedResponse;
        foreach (var step in entry.Steps ?? [])
        {
            var due = WorkflowBusinessCalendar.DueAt(startedAtUtc, step.After, step.Unit, workflow.Calendar);
            if (due is not { } deadline)
                continue;
            await InsertMasterTimerAsync(
                connection, workflow.Id, instanceId, scope, transactionId, activityId,
                $"{MasterStepRuleId}|{row.RowId}|{step.Index}|{KindDue}", deadline,
                StepSnapshot(sla, entry, step, isStage, deadline, workflow.Calendar), cancellationToken);
        }
    }

    /// <summary>
    /// One row can do both. Its Notify side sends a message. Its Escalate side, on a stage, passes the
    /// request on (user: reassign; group: send to its members; stage: move there) and tells them; at
    /// workflow level it sends a message only.
    /// </summary>
    internal static AdvancedSnapshot StepSnapshot(
        WorkflowSlaConfigurationDto sla,
        WorkflowSlaMasterValues entry,
        WorkflowSlaMasterStep step,
        bool isStage,
        DateTime deadline,
        WorkflowBusinessCalendar? calendar)
    {
        string? breachType = null;
        if (step.EscalateTo != null)
        {
            breachType = !isStage
                ? WorkflowSlaSettingsValidator.BreachNotify
                : step.EscalateTo switch
                {
                    WorkflowSlaMasterEntry.SendToGroup => WorkflowSlaSettingsValidator.EscalateToGroup,
                    WorkflowSlaMasterEntry.SendToStage => WorkflowSlaSettingsValidator.BreachStage,
                    _ => WorkflowSlaSettingsValidator.BreachReassign
                };
        }

        return new AdvancedSnapshot(
            KindDue,
            MasterStepRuleId,
            "SLA Master",
            sla.SlaMasterId ?? "",
            entry.EntryId,
            entry.EntryName,
            step.After,
            step.Unit,
            deadline,
            step.NotifyUsers,
            step.EscalateUsers,
            [],
            step.NotifyInitiator,
            breachType,
            null,
            "both",
            null,
            // A row with Send by left empty sends by email.
            step.SendEmail ?? true,
            step.SendSms ?? false,
            calendar?.TimeZone.Id,
            DateTime.UtcNow,
            true,
            step.EscalateGroup,
            step.EscalateStage,
            step.NotifyGroup);
    }

    private AdvancedSnapshot MasterSnapshot(
        WorkflowSlaConfigurationDto sla,
        WorkflowSlaSchedule.MasterRow row,
        WorkflowSlaMasterValues values,
        bool response,
        DateTime deadline,
        WorkflowBusinessCalendar? calendar) =>
        new(
            KindDue,
            MasterRuleId,
            "SLA Master",
            sla.SlaMasterId ?? "",
            values.EntryId,
            values.EntryName,
            response ? values.ResponseDuration : values.ResolutionDuration,
            response ? values.ResponseUnit : values.ResolutionUnit,
            deadline,
            values.NotifyUsers,
            values.EscalationUsers,
            [],
            false,
            !row.Escalate
                ? null
                : response ? WorkflowSlaSettingsValidator.BreachReassign : WorkflowSlaSettingsValidator.BreachNotify,
            null,
            response ? "response" : "resolution",
            null,
            sla.Notifications?.Email ?? true,
            sla.Notifications?.Sms ?? false,
            calendar?.TimeZone.Id,
            DateTime.UtcNow,
            row.Notify);

    /// <summary>Stages with an SLA Master response SLA: a timer per ticket that newly waits there.</summary>
    private async Task<int> MaterializeMasterResponseAsync(
        NpgsqlConnection connection,
        SlaWorkflow workflow,
        string suffix,
        Dictionary<string, WorkflowSlaConfigurationDto> blocks,
        int lastTransactionId,
        DateTime? slaSince,
        CancellationToken cancellationToken)
    {
        // Read fresh each pass, so a change in the master applies to the next ticket.
        var values = new Dictionary<string, List<(WorkflowSlaSchedule.MasterRow Row, WorkflowSlaMasterValues Entry)>>(StringComparer.Ordinal);
        foreach (var (blockId, sla) in blocks)
        {
            foreach (var masterRow in WorkflowSlaSchedule.MasterRows(sla))
            {
                var master = await LoadMasterSlaAsync(sla, cancellationToken, masterRow.EntryId);
                if (master.Values is { } read && read.Errors.Count > 0 && read.Steps != null
                    && FirstTime($"steps|{workflow.Id}|{blockId}|{masterRow.RowId}|{string.Join(" ", read.Errors)}"))
                    _logger.LogWarning(
                        "SLA: entry {EntryId} on stage {BlockId} of workflow {WorkflowId} has steps that cannot run: {Problem}",
                        masterRow.EntryId, blockId, workflow.Id, string.Join(" ", read.Errors));

                if (master.Values is { } v && (v.Steps is { Count: > 0 } || (v.Steps == null && v.ResponseDuration != null)))
                {
                    if (!values.TryGetValue(blockId, out var list))
                        values[blockId] = list = [];
                    list.Add((masterRow, v));
                    continue;
                }

                var problem = master.Problem ?? string.Join(" ", master.Values?.Errors ?? []);
                if (FirstTime($"master|{workflow.Id}|{blockId}|{masterRow.RowId}|{problem}"))
                    _logger.LogWarning(
                        "SLA: no timers for entry {EntryId} on stage {BlockId} of workflow {WorkflowId}: {Problem}",
                        masterRow.EntryId, blockId, workflow.Id, problem);
            }
        }

        int maxId;
        await using (var max = new NpgsqlCommand($"SELECT COALESCE(MAX(id), 0) FROM workflow.transaction_{suffix};", connection))
            maxId = Convert.ToInt32(await max.ExecuteScalarAsync(cancellationToken));
        if (values.Count == 0)
            return Math.Max(lastTransactionId, maxId);

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
        var rows = new List<(int TransactionId, Guid InstanceId, string ActivityId, DateTime Arrived)>();
        await using (var cmd = new NpgsqlCommand(sql, connection))
        {
            cmd.Parameters.AddWithValue("@FromId", Math.Max(0, lastTransactionId - TransactionLookback));
            cmd.Parameters.AddWithValue("@MaxId", maxId);
            cmd.Parameters.AddWithValue("@ActivityIds", values.Keys.ToArray());
            cmd.Parameters.AddWithValue("@Limit", MaterializeLimit);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                rows.Add((reader.GetInt32(0), reader.GetGuid(1), reader.GetString(2), reader.GetDateTime(3).ToUniversalTime()));
        }

        foreach (var row in rows)
        {
            if (!WorkflowSlaSchedule.AppliesTo(row.Arrived, slaSince))
            {
                // reached the stage before the SLA was set
                if (FirstTime($"since|{workflow.Id}|{row.TransactionId}"))
                    _logger.LogInformation(
                        "SLA: no timer for transaction {TransactionId} of workflow {WorkflowId}: it reached the stage at {Arrived:u}, before the SLA was saved at {SlaSince:u}.",
                        row.TransactionId, workflow.Id, row.Arrived, slaSince);
                continue;
            }

            foreach (var (masterRow, entry) in values[row.ActivityId])
            {
                if (entry.Steps != null)
                {
                    await InsertStepTimersAsync(
                        connection, workflow, blocks[row.ActivityId], masterRow, entry, row.InstanceId,
                        ScopeAdvancedResponse, row.TransactionId, row.ActivityId, row.Arrived, cancellationToken);
                    continue;
                }

                var due = WorkflowBusinessCalendar.DueAt(row.Arrived, entry.ResponseDuration!.Value, entry.ResponseUnit, workflow.Calendar);
                if (due is not { } deadline)
                    continue;
                var snapshot = MasterSnapshot(blocks[row.ActivityId], masterRow, entry, response: true, deadline, workflow.Calendar);
                await InsertMasterTimerAsync(
                    connection, workflow.Id, row.InstanceId, ScopeAdvancedResponse, row.TransactionId, row.ActivityId,
                    $"{MasterRuleId}|{masterRow.RowId}|{KindDue}", deadline, snapshot, cancellationToken);
            }
        }

        return rows.Count == MaterializeLimit ? rows[^1].TransactionId : Math.Max(lastTransactionId, maxId);
    }

    /// <summary>Workflow SLA Master resolution SLA: a timer per newly created ticket.</summary>
    private async Task<DateTime?> MaterializeMasterResolutionAsync(
        NpgsqlConnection connection,
        SlaWorkflow workflow,
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
        var rows = new List<(Guid Id, DateTime Created)>();
        await using (var cmd = new NpgsqlCommand(sql, connection))
        {
            cmd.Parameters.Add(new NpgsqlParameter("@FromCreated", NpgsqlTypes.NpgsqlDbType.TimestampTz)
            {
                Value = lastInstanceCreatedAt is { } last ? DateTime.SpecifyKind(last - InstanceLookback, DateTimeKind.Utc) : DBNull.Value
            });
            cmd.Parameters.AddWithValue("@Limit", MaterializeLimit);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                rows.Add((reader.GetGuid(0), reader.GetDateTime(1).ToUniversalTime()));
        }

        if (rows.Count == 0)
            return lastInstanceCreatedAt;

        var newest = rows.Max(r => r.Created);
        var pending = rows.Where(r => WorkflowSlaSchedule.AppliesTo(r.Created, slaSince)).ToList();
        foreach (var (id, created) in rows.Except(pending))
        {
            if (FirstTime($"since|{workflow.Id}|{id}"))
                _logger.LogInformation(
                    "SLA: no resolution timer for ticket {InstanceId} of workflow {WorkflowId}: it was created at {Created:u}, before the SLA was saved at {SlaSince:u}.",
                    id, workflow.Id, created, slaSince);
        }

        if (pending.Count == 0)
            return newest;

        foreach (var masterRow in WorkflowSlaSchedule.MasterRows(sla))
        {
            var master = await LoadMasterSlaAsync(sla, cancellationToken, masterRow.EntryId);
            if (master.Values is { Steps: { Count: > 0 } } withSteps)
            {
                foreach (var (instanceId, created) in pending)
                {
                    await InsertStepTimersAsync(
                        connection, workflow, sla, masterRow, withSteps, instanceId,
                        ScopeAdvancedResolution, 0, null, created, cancellationToken);
                }

                continue;
            }

            if (master.Values is not { ResolutionDuration: not null } entry)
            {
                var problem = master.Problem ?? string.Join(" ", master.Values?.Errors ?? []);
                if (FirstTime($"master|{workflow.Id}|workflow|{masterRow.RowId}|{problem}"))
                    _logger.LogWarning(
                        "SLA: no resolution timers for entry {EntryId} of workflow {WorkflowId}: {Problem}",
                        masterRow.EntryId, workflow.Id, problem);
                continue;
            }

            foreach (var (instanceId, created) in pending)
            {
                var due = WorkflowBusinessCalendar.DueAt(created, entry.ResolutionDuration!.Value, entry.ResolutionUnit, workflow.Calendar);
                if (due is not { } deadline)
                    continue;
                await InsertMasterTimerAsync(
                    connection, workflow.Id, instanceId, ScopeAdvancedResolution, 0, null,
                    $"{MasterRuleId}|{masterRow.RowId}|{KindDue}", deadline,
                    MasterSnapshot(sla, masterRow, entry, response: false, deadline, workflow.Calendar), cancellationToken);
            }
        }

        return newest;
    }

    private static async Task InsertMasterTimerAsync(
        NpgsqlConnection connection,
        Guid workflowId,
        Guid instanceId,
        string scope,
        int transactionId,
        string? activityId,
        string ruleKey,
        DateTime due,
        AdvancedSnapshot snapshot,
        CancellationToken cancellationToken)
    {
        await using var insert = new NpgsqlCommand(
            """
            INSERT INTO workflow.sla_timers
                (workflow_id, workflow_instance_id, scope, transaction_id, activity_id, rule_id, due_at_utc, snapshot_json, status)
            VALUES (@WorkflowId, @InstanceId, @Scope, @TransactionId, @ActivityId, @RuleId, @Due, @Snapshot, 4)
            ON CONFLICT (workflow_id, workflow_instance_id, scope, transaction_id, rule_id) DO NOTHING;
            """,
            connection);
        insert.Parameters.AddWithValue("@WorkflowId", workflowId);
        insert.Parameters.AddWithValue("@InstanceId", instanceId);
        insert.Parameters.AddWithValue("@Scope", scope);
        insert.Parameters.AddWithValue("@TransactionId", transactionId);
        insert.Parameters.AddWithValue("@ActivityId", (object?)activityId ?? DBNull.Value);
        insert.Parameters.AddWithValue("@RuleId", ruleKey);
        insert.Parameters.AddWithValue("@Due", DateTime.SpecifyKind(due, DateTimeKind.Utc));
        insert.Parameters.AddWithValue("@Snapshot", JsonSerializer.Serialize(snapshot, SnapshotJson));
        await insert.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Sends the waiting transaction to a group. V6 stages assign people, not groups, so this uses the way
    /// several people share one open transaction: <c>user_ids</c> lists the members (their Inbox), and
    /// <c>group_ids</c> records the group and keeps the mailbox sync from replacing them with the stage's
    /// users. Move-next Forward then makes a member the assignee, with its history, Inbox copies and menu access.
    /// </summary>
    private async Task<string> EscalateToGroupAsync(
        NpgsqlConnection connection,
        ClaimedTimer timer,
        string groupId,
        IReadOnlyList<Guid> members,
        Guid? currentAssignee,
        string comment,
        CancellationToken cancellationToken)
    {
        if (members.Count == 0)
            return $"escalation skipped: group {groupId} has no active members";

        var suffix = timer.WorkflowId.ToString("N")[..8];
        var previous = await WorkflowSlaGroupEscalation.AssignAsync(
            connection, suffix, timer.TransactionId, groupId, members, cancellationToken);
        try
        {
            foreach (var member in members)
                await _workflowSecurity.EnsureUserWorkflowAccessAsync(timer.WorkflowId, member, SlaUserId, cancellationToken);

            if (currentAssignee is { } assignee && members.Contains(assignee))
            {
                // Already with a member: the others just need it in their Inbox.
                await _mailboxSync.SyncTransactionRowAsync(timer.WorkflowId, timer.TransactionId, cancellationToken);
                return $"sent to group {groupId} ({members.Count} member(s)); assignee is already a member";
            }

            await _mediator.Send(new MoveToNextStepCommand(
                timer.InstanceId,
                timer.ActivityId!,
                Review: ForwardReview,
                Comments: comment,
                ActivityUserId: members[0],
                CommentAuthorName: "SLA"), cancellationToken);
            return $"sent to group {groupId} ({members.Count} member(s))";
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Refused: the transaction stays with whoever had it. EscalateAsync records the reason.
            await WorkflowSlaGroupEscalation.RestoreAsync(connection, suffix, timer.TransactionId, previous, cancellationToken);
            throw;
        }
    }

    /// <summary>
    /// At firing, the Notify / Escalate users (and name) as the SLA Master entry has them now; null when
    /// the entry was deleted from the master since the timer was created.
    /// </summary>
    private async Task<AdvancedSnapshot?> RefreshMasterUsersAsync(AdvancedSnapshot snapshot, CancellationToken cancellationToken)
    {
        var found = await _formEntryService.GetEntriesAsync(snapshot.MasterFormId, snapshot.EntryId, cancellationToken);
        var row = found.Entries?.FirstOrDefault();
        if (row == null)
            return null;
        var fields = await _formEntryService.GetFieldLabelsAsync(snapshot.MasterFormId, cancellationToken);
        var values = WorkflowSlaMasterEntry.Read(snapshot.EntryId, row, fields, null);
        return snapshot with { NotifyUsers = values.NotifyUsers, EscalationUsers = values.EscalationUsers };
    }
}

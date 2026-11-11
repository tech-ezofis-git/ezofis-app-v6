using System.Globalization;
using Microsoft.Extensions.Logging;
using Npgsql;
using SaaSApp.Workflow.Application.Forms;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Custom Setup additions:
/// <list type="bullet">
/// <item>"It depends on the request": each ticket's own form value picks the SLA form entry
/// (<see cref="WorkflowSlaRuleSelector"/>), once, and the entry's levels become timers as usual.</item>
/// <item>"After the last level": one more timer, a wait after the last level. It reminds daily, or passes
/// the request to a group, a user or the assignee's reporting manager. It is cancelled like any other
/// timer once the ticket is acted on.</item>
/// </list>
/// </summary>
public sealed partial class WorkflowSlaTimerService
{
    internal const string DynamicRowId = "auto";
    internal const string AfterLastRuleId = "after-last";
    internal const string AfterLastRemind = "remind";
    internal const string AfterLastGroup = "group";
    internal const string AfterLastUser = "user";
    internal const string AfterLastManager = "manager";

    /// <summary>A daily reminder stops after this many, so a forgotten ticket does not send mail for ever.</summary>
    internal const int MaxAfterLastReminders = 30;

    private const int EntryNameLimit = 5000;

    // ---- Depends on the request -------------------------------------------------------------------

    private async Task<int> MaterializeDynamicResponseAsync(
        NpgsqlConnection connection,
        SlaWorkflow workflow,
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
        var rows = new List<(int TransactionId, Guid InstanceId, string ActivityId, DateTime Arrived)>();
        await using (var cmd = new NpgsqlCommand(sql, connection))
        {
            cmd.Parameters.AddWithValue("@FromId", Math.Max(0, lastTransactionId - TransactionLookback));
            cmd.Parameters.AddWithValue("@MaxId", maxId);
            cmd.Parameters.AddWithValue("@ActivityIds", blocks.Keys.ToArray());
            cmd.Parameters.AddWithValue("@Limit", MaterializeLimit);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                rows.Add((reader.GetInt32(0), reader.GetGuid(1), reader.GetString(2), reader.GetDateTime(3).ToUniversalTime()));
        }

        var names = new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.Ordinal);
        var settledBefore = DateTime.UtcNow - AdvancedSettleDelay;
        foreach (var row in rows)
        {
            // The form entry may not be saved yet: come back to this row next pass.
            if (row.Arrived > settledBefore)
                return Math.Max(0, row.TransactionId - 1);
            if (!WorkflowSlaSchedule.AppliesTo(row.Arrived, slaSince))
                continue;

            await CreateDynamicTimersAsync(
                connection, workflow, blocks[row.ActivityId], names, row.InstanceId,
                ScopeAdvancedResponse, row.TransactionId, row.ActivityId, row.Arrived, slaSince, cancellationToken);
        }

        return rows.Count == MaterializeLimit ? rows[^1].TransactionId : Math.Max(lastTransactionId, maxId);
    }

    private async Task<DateTime?> MaterializeDynamicResolutionAsync(
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
              AND i.created_at_utc <= @SettledBefore
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
            cmd.Parameters.AddWithValue("@SettledBefore", DateTime.UtcNow - AdvancedSettleDelay);
            cmd.Parameters.AddWithValue("@Limit", MaterializeLimit);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                rows.Add((reader.GetGuid(0), reader.GetDateTime(1).ToUniversalTime()));
        }

        if (rows.Count == 0)
            return lastInstanceCreatedAt;

        var names = new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.Ordinal);
        foreach (var (id, created) in rows.Where(r => WorkflowSlaSchedule.AppliesTo(r.Created, slaSince)))
        {
            await CreateDynamicTimersAsync(
                connection, workflow, sla, names, id, ScopeAdvancedResolution, 0, null, created, slaSince, cancellationToken);
        }

        return rows.Max(r => r.Created);
    }

    private async Task CreateDynamicTimersAsync(
        NpgsqlConnection connection,
        SlaWorkflow workflow,
        WorkflowSlaConfigurationDto sla,
        Dictionary<string, IReadOnlyDictionary<string, string>> names,
        Guid instanceId,
        string scope,
        int transactionId,
        string? activityId,
        DateTime startedAtUtc,
        DateTime? slaSince,
        CancellationToken cancellationToken)
    {
        var doneKey = $"dynamic|{workflow.Id}|{scope}|{transactionId}|{instanceId}|{slaSince:O}";
        if (LoggedReasons.ContainsKey(doneKey))
            return;

        // Decided once per ticket: later edits to the form or the settings leave it as it is.
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
            exists.Parameters.AddWithValue("@Steps", $"{MasterStepRuleId}|{DynamicRowId}|%");
            exists.Parameters.AddWithValue("@Legacy", $"{MasterRuleId}|{DynamicRowId}|%");
            if (await exists.ExecuteScalarAsync(cancellationToken) is true)
                return;
        }

        var (pick, problem) = await PickEntryAsync(workflow, sla, instanceId, names, cancellationToken);
        WorkflowSlaMasterValues? entry = null;
        if (pick.EntryId != null)
        {
            var master = await LoadMasterSlaAsync(sla, cancellationToken, pick.EntryId);
            entry = master.Values;
            problem ??= master.Problem;
        }

        var isResponse = scope == ScopeAdvancedResponse;
        var usable = entry is { Steps.Count: > 0 }
            || (entry is { Steps: null } && (isResponse ? entry.ResponseDuration : entry.ResolutionDuration) != null);
        if (!usable)
        {
            // Nothing to run. The answer stays the same until the settings change.
            FirstTime(doneKey);
            _logger.LogInformation(
                "SLA: no timers for ticket {InstanceId} of workflow {WorkflowId} (value '{Value}'): {Reason}",
                instanceId, workflow.Id, pick.Value, problem ?? string.Join(" ", entry?.Errors ?? ["no rule found and no default rule is set."]));
            return;
        }

        var row = new WorkflowSlaSchedule.MasterRow(DynamicRowId, entry!.EntryId, true, true);
        if (entry.Steps != null)
        {
            await InsertStepTimersAsync(
                connection, workflow, sla, row, entry, instanceId, scope, transactionId, activityId, startedAtUtc, cancellationToken,
                WorkflowSlaStore.TimerPendingCustom);
        }
        else
        {
            var duration = isResponse ? entry.ResponseDuration!.Value : entry.ResolutionDuration!.Value;
            var unit = isResponse ? entry.ResponseUnit : entry.ResolutionUnit;
            if (WorkflowBusinessCalendar.DueAt(startedAtUtc, duration, unit, workflow.Calendar) is { } deadline)
            {
                await InsertMasterTimerAsync(
                    connection, workflow.Id, instanceId, scope, transactionId, activityId,
                    $"{MasterRuleId}|{DynamicRowId}|{KindDue}", deadline,
                    MasterSnapshot(sla, row, entry, isResponse, deadline, workflow.Calendar), cancellationToken,
                    WorkflowSlaStore.TimerPendingCustom);
            }
        }

        await InsertAfterLastAsync(connection, workflow, sla, [entry], instanceId, scope, transactionId, activityId, startedAtUtc, cancellationToken);
        _logger.LogInformation(
            "SLA: ticket {InstanceId} of workflow {WorkflowId} uses '{Entry}' ({Source}, value '{Value}').",
            instanceId, workflow.Id, entry.EntryName, pick.Source, pick.Value);
    }

    private async Task<(WorkflowSlaRulePick Pick, string? Problem)> PickEntryAsync(
        SlaWorkflow workflow,
        WorkflowSlaConfigurationDto sla,
        Guid instanceId,
        Dictionary<string, IReadOnlyDictionary<string, string>> names,
        CancellationToken cancellationToken)
    {
        var selection = sla.Selection!;
        var identity = await _mailboxSync.TryGetProcessFormIdentityAsync(workflow.Id, instanceId, cancellationToken);
        IReadOnlyDictionary<string, string> formValues = new Dictionary<string, string>();
        if (!string.IsNullOrWhiteSpace(identity?.FormId) && identity?.FormEntryId is { } formEntryId && formEntryId != Guid.Empty)
        {
            formValues = await WorkflowFormFieldValues.ResolveAsync(
                _formDataLoader, identity.Value.FormId!, formEntryId, null, null, null, cancellationToken);
        }

        var values = WorkflowConditionRouter.FieldValues(formValues, selection.FieldId ?? "");
        var entryNames = selection.Method == WorkflowSlaRuleSelector.MethodMap
            ? new Dictionary<string, string>()
            : await LoadEntryNamesAsync(sla, names, cancellationToken);
        var recordRules = selection.Method == WorkflowSlaRuleSelector.MethodColumn
            ? await LoadRecordRulesAsync(selection, values, cancellationToken)
            : null;

        var pick = WorkflowSlaRuleSelector.Select(selection, values, entryNames, recordRules);
        var problem = values.Count == 0 ? $"the request has no value for field '{selection.FieldId}'." : null;
        return (pick, problem);
    }

    /// <summary>The SLA form's entries, id to name. Read once per pass.</summary>
    private async Task<IReadOnlyDictionary<string, string>> LoadEntryNamesAsync(
        WorkflowSlaConfigurationDto sla,
        Dictionary<string, IReadOnlyDictionary<string, string>> names,
        CancellationToken cancellationToken)
    {
        var formId = sla.SlaMasterId!.Trim();
        if (names.TryGetValue(formId, out var known))
            return known;

        var list = await _formEntryService.ListEntriesAsync(formId, new FormEntryAllRequest(ItemsPerPage: EntryNameLimit), cancellationToken);
        var fields = await _formEntryService.GetFieldLabelsAsync(formId, cancellationToken);
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var row in list.Entries ?? [])
        {
            var id = EntryId(row);
            if (id != null)
                result[id] = WorkflowSlaMasterEntry.Read(id, row, fields, sla.MasterFieldId).EntryName;
        }

        names[formId] = result;
        return result;
    }

    private static string? EntryId(IReadOnlyDictionary<string, object?> row)
    {
        foreach (var key in new[] { "item_id", "itemId", "id" })
        {
            if (row.TryGetValue(key, out var value) && value != null)
                return Convert.ToString(value, CultureInfo.InvariantCulture);
        }

        return null;
    }

    /// <summary>For each value, the rule named in the record the dropdown's value came from.</summary>
    private async Task<IReadOnlyDictionary<string, string>> LoadRecordRulesAsync(
        WorkflowSlaSelectionDto selection,
        IReadOnlyList<string> values,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(selection.RecordFormId) || string.IsNullOrWhiteSpace(selection.RuleColumn))
            return result;

        var fields = await _formEntryService.GetFieldLabelsAsync(selection.RecordFormId!, cancellationToken);
        foreach (var value in values.Where(v => !string.IsNullOrWhiteSpace(v)).Distinct(StringComparer.Ordinal))
        {
            var found = await _formEntryService.GetEntriesByColumnAsync(
                selection.RecordFormId!, selection.RecordValueColumn, value, cancellationToken: cancellationToken);
            var cell = found.Entries?
                .Select(row => WorkflowSlaMasterEntry.ReadCell(row, fields, selection.RuleColumn))
                .FirstOrDefault(text => !string.IsNullOrWhiteSpace(text));
            if (cell != null)
                result[value] = cell;
        }

        return result;
    }

    // ---- After the last level ---------------------------------------------------------------------

    private async Task InsertAfterLastAsync(
        NpgsqlConnection connection,
        SlaWorkflow workflow,
        WorkflowSlaConfigurationDto sla,
        IReadOnlyList<WorkflowSlaMasterValues> entries,
        Guid instanceId,
        string scope,
        int transactionId,
        string? activityId,
        DateTime startedAtUtc,
        CancellationToken cancellationToken)
    {
        if (AfterLastTimer(sla, entries, scope == ScopeAdvancedResponse, startedAtUtc, workflow.Calendar) is not { } timer)
            return;

        await InsertMasterTimerAsync(
            connection, workflow.Id, instanceId, scope, transactionId, activityId,
            $"{AfterLastRuleId}|0", timer.DueAtUtc, timer.Snapshot, cancellationToken, WorkflowSlaStore.TimerPendingCustom);
    }

    /// <summary>The timer that runs a wait after the entries' last level; null when nothing is set.</summary>
    internal static (DateTime DueAtUtc, AdvancedSnapshot Snapshot)? AfterLastTimer(
        WorkflowSlaConfigurationDto sla,
        IReadOnlyList<WorkflowSlaMasterValues> entries,
        bool isStage,
        DateTime startedAtUtc,
        WorkflowBusinessCalendar? calendar)
    {
        var after = sla.AfterLastLevel;
        var type = after?.Type?.Trim().ToLowerInvariant();
        if (after == null || string.IsNullOrEmpty(type) || type == WorkflowSlaSettingsValidator.AfterLastNone)
            return null;
        // At workflow level there is no assignee to move away from.
        if (!isStage && type != AfterLastRemind)
            return null;
        if (after.Wait is not > 0)
            return null;

        var last = LastLevel(entries, isStage, startedAtUtc, calendar);
        if (last == null)
            return null;
        var due = WorkflowBusinessCalendar.DueAt(last.Value.DueAtUtc, after.Wait.Value, after.WaitUnit, calendar);
        if (due is not { } deadline)
            return null;

        var entry = last.Value.Entry;
        var steps = entries.SelectMany(e => e.Steps ?? []).ToList();
        var lastStep = last.Value.Step;
        var told = steps.SelectMany(s => s.NotifyUsers.Concat(s.EscalateUsers))
            .Concat(entries.SelectMany(e => e.NotifyUsers.Concat(e.EscalationUsers)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var breach = type switch
        {
            AfterLastGroup => WorkflowSlaSettingsValidator.EscalateToGroup,
            AfterLastUser or AfterLastManager => WorkflowSlaSettingsValidator.BreachReassign,
            _ => null
        };

        return (deadline, new AdvancedSnapshot(
            KindDue,
            MasterStepRuleId,
            "SLA Master",
            sla.SlaMasterId ?? "",
            entry.EntryId,
            entry.EntryName,
            after.Wait,
            after.WaitUnit?.Trim().ToLowerInvariant(),
            deadline,
            type == AfterLastRemind ? told : [],
            type == AfterLastUser && !string.IsNullOrWhiteSpace(after.UserId) ? [after.UserId!] : [],
            [],
            false,
            breach,
            null,
            "both",
            null,
            lastStep?.SendEmail ?? sla.Notifications?.Email ?? true,
            lastStep?.SendSms ?? sla.Notifications?.Sms ?? false,
            calendar?.TimeZone.Id,
            DateTime.UtcNow,
            type == AfterLastRemind,
            type == AfterLastGroup ? after.GroupId : null,
            null,
            type == AfterLastRemind ? lastStep?.NotifyGroup : null,
            type,
            0));
    }

    private static (DateTime DueAtUtc, WorkflowSlaMasterValues Entry, WorkflowSlaMasterStep? Step)? LastLevel(
        IReadOnlyList<WorkflowSlaMasterValues> entries,
        bool isStage,
        DateTime startedAtUtc,
        WorkflowBusinessCalendar? calendar)
    {
        (DateTime DueAtUtc, WorkflowSlaMasterValues Entry, WorkflowSlaMasterStep? Step)? last = null;
        void Consider(DateTime? due, WorkflowSlaMasterValues entry, WorkflowSlaMasterStep? step)
        {
            if (due is { } at && (last == null || at > last.Value.DueAtUtc))
                last = (at, entry, step);
        }

        foreach (var entry in entries)
        {
            if (entry.Steps != null)
            {
                foreach (var step in entry.Steps)
                    Consider(WorkflowBusinessCalendar.DueAt(startedAtUtc, step.After, step.Unit, calendar), entry, step);
                continue;
            }

            var duration = isStage ? entry.ResponseDuration : entry.ResolutionDuration;
            if (duration is { } value)
                Consider(WorkflowBusinessCalendar.DueAt(startedAtUtc, value, isStage ? entry.ResponseUnit : entry.ResolutionUnit, calendar), entry, null);
        }

        return last;
    }

    private static async Task<Guid?> FindManagerAsync(NpgsqlConnection connection, Guid? userId, CancellationToken cancellationToken)
    {
        if (userId is not { } id)
            return null;
        await using var cmd = new NpgsqlCommand(
            """
            SELECT m."Id" FROM users."Users" u
            JOIN users."Users" m ON m."Id" = u."ManagerId" AND m."IsDeleted" = false
            WHERE u."Id" = @Id;
            """,
            connection);
        cmd.Parameters.AddWithValue("@Id", id);
        return await cmd.ExecuteScalarAsync(cancellationToken) is Guid manager ? manager : null;
    }

    /// <summary>The next daily reminder, unless the limit is reached.</summary>
    private async Task<string> ScheduleNextReminderAsync(
        NpgsqlConnection connection,
        ClaimedTimer timer,
        AdvancedSnapshot snapshot,
        WorkflowBusinessCalendar? calendar,
        CancellationToken cancellationToken)
    {
        var next = snapshot.AfterLastCount + 1;
        if (next >= MaxAfterLastReminders)
            return $"reminders stopped after {MaxAfterLastReminders}";
        if (WorkflowBusinessCalendar.DueAt(DateTime.UtcNow, 1, "days", calendar) is not { } due)
            return string.Empty;

        await InsertMasterTimerAsync(
            connection, timer.WorkflowId, timer.InstanceId, timer.Scope, timer.TransactionId, timer.ActivityId,
            $"{AfterLastRuleId}|{next}", due,
            snapshot with { AfterLastCount = next, DeadlineUtc = due }, cancellationToken, WorkflowSlaStore.TimerPendingCustom);
        return $"next reminder {due:yyyy-MM-dd HH:mm} UTC";
    }

    private static WorkflowSlaNotifier.Message AfterLastMessage(
        AdvancedSnapshot snapshot, string? breachType, string reference, string workflowName)
    {
        var moved = breachType switch
        {
            WorkflowSlaSettingsValidator.EscalateToGroup => " It is being sent to the chosen group.",
            WorkflowSlaSettingsValidator.BreachReassign => " It is being reassigned to you.",
            _ => string.Empty
        };
        return new WorkflowSlaNotifier.Message(
            $"SLA: ticket {reference} is still not done",
            $"Ticket {reference} is still not done",
            $"Ticket <strong>{WorkflowSlaNotifier.Encode(reference)}</strong> in "
                + $"<strong>{WorkflowSlaNotifier.Encode(workflowName)}</strong> has passed the last level of SLA "
                + $"<strong>{WorkflowSlaNotifier.Encode(snapshot.EntryName)}</strong> and is still not done.{moved}",
            $"EZOFIS SLA: ticket {reference} ({workflowName}) is still not done after the last SLA level.");
    }
}

using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Npgsql;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;
using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Advanced SLA (workflow settings → SLA → Advanced):
/// <list type="number">
/// <item>Evaluate: each new open ticket is evaluated once, about 20 seconds after it is created (so its
/// form entry is saved): the rules pick SLA Master entries (<see cref="WorkflowSlaAdvancedEvaluator"/>),
/// and one timer is created per entry for the response / resolution deadline, plus a reminder when the
/// rule has one. The evaluated values are stored on each timer (<c>snapshot_json</c>), so later edits to
/// the master entry or the rules do not change an active SLA. The outcome (or "no rule matched") is
/// recorded in <c>sla_advanced_evaluations</c>, which also stops a second evaluation.</item>
/// <item>Fire: the response SLA is met once the configured response stage has been acted on; the
/// resolution SLA once the ticket reaches the end. Otherwise the entry's Notify users (and the rule's
/// extra users / initiator) are notified through the outbox, and at the deadline the rule's breach
/// action runs: notify the Escalate users, reassign (Forward) to the first Escalate user, or move the
/// ticket to the chosen stage — both through move-next, so its checks and history apply.</item>
/// </list>
/// </summary>
public sealed partial class WorkflowSlaTimerService
{
    public const string ScopeAdvancedResponse = "adv-response";
    public const string ScopeAdvancedResolution = "adv-resolution";
    private const string KindDue = "due";
    private const string KindReminder = "remind";
    private const int AdvancedEvaluateLimit = 200;
    private static readonly TimeSpan AdvancedSettleDelay = TimeSpan.FromSeconds(20);

    private static readonly JsonSerializerOptions SnapshotJson = new(JsonSerializerDefaults.Web);

    /// <summary>What a timer fires with, frozen when the ticket was evaluated.</summary>
    internal sealed record AdvancedSnapshot(
        string Kind,
        string RuleId,
        string RuleName,
        string MasterFormId,
        string EntryId,
        string EntryName,
        decimal? Duration,
        string? Unit,
        DateTime DeadlineUtc,
        IReadOnlyList<string> NotifyUsers,
        IReadOnlyList<string> EscalationUsers,
        IReadOnlyList<string> RuleNotifyUserIds,
        bool Initiator,
        string? BreachType,
        string? BreachStageId,
        string? BreachOn,
        string? ResponseStageId,
        bool Email,
        bool Sms,
        string? TimeZone,
        DateTime EvaluatedAtUtc,
        bool NotifyEnabled = true,
        string? StepGroup = null,
        string? StepStage = null,
        string? StepNotifyGroup = null,
        /// <summary>Set on the "after the last level" timer: remind, group, user or manager.</summary>
        string? AfterLast = null,
        int AfterLastCount = 0);

    private static bool IsAdvancedScope(string scope) =>
        scope is ScopeAdvancedResponse or ScopeAdvancedResolution;

    // ---- Evaluate ---------------------------------------------------------------------------------

    private async Task MaterializeAdvancedAsync(
        NpgsqlConnection connection,
        SlaWorkflow workflow,
        string suffix,
        WorkflowSlaConfigurationDto sla,
        DateTime? slaSince,
        CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT i.id, i.created_at_utc
            FROM workflow.workflow_instances_{suffix} i
            WHERE i.status IN (0, 1)
              AND i.completed_at_utc IS NULL
              AND i.is_archived = false
              AND (@Since IS NULL OR i.created_at_utc >= @Since)
              AND i.created_at_utc <= @SettledBefore
              AND NOT EXISTS (
                  SELECT 1 FROM workflow.sla_advanced_evaluations e
                  WHERE e.workflow_id = @WorkflowId AND e.workflow_instance_id = i.id)
            ORDER BY i.created_at_utc
            LIMIT @Limit;
            """;
        var pending = new List<(Guid Id, DateTime CreatedAt)>();
        await using (var cmd = new NpgsqlCommand(sql, connection))
        {
            cmd.Parameters.Add(new NpgsqlParameter("@Since", NpgsqlTypes.NpgsqlDbType.TimestampTz)
            {
                Value = slaSince is { } since ? DateTime.SpecifyKind(since, DateTimeKind.Utc) : DBNull.Value
            });
            cmd.Parameters.AddWithValue("@SettledBefore", DateTime.UtcNow - AdvancedSettleDelay);
            cmd.Parameters.AddWithValue("@WorkflowId", workflow.Id);
            cmd.Parameters.AddWithValue("@Limit", AdvancedEvaluateLimit);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                pending.Add((reader.GetGuid(0), reader.GetDateTime(1).ToUniversalTime()));
        }

        if (pending.Count == 0)
            return;

        var entries = await LoadMasterEntriesAsync(sla, cancellationToken);
        foreach (var (instanceId, createdAt) in pending)
        {
            try
            {
                await EvaluateTicketAsync(connection, workflow, sla, entries, instanceId, createdAt, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Left unevaluated: retried next pass.
                _logger.LogError(ex, "Advanced SLA could not be evaluated for instance {InstanceId}", instanceId);
            }
        }
    }

    /// <summary>The SLA Master entries the rules (and fallback) use, keyed by entry id.</summary>
    internal async Task<IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>>> LoadMasterEntriesAsync(
        WorkflowSlaConfigurationDto sla,
        CancellationToken cancellationToken)
    {
        var ids = (sla.AdvancedRules ?? [])
            .Where(r => r.Enabled != false)
            .SelectMany(r => r.EntryIds ?? [])
            .Append(sla.FallbackEntryId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var result = new Dictionary<string, IReadOnlyDictionary<string, object?>>(StringComparer.OrdinalIgnoreCase);
        if (ids.Count == 0 || string.IsNullOrWhiteSpace(sla.SlaMasterId))
            return result;

        var found = await _formEntryService.GetEntriesAsync(sla.SlaMasterId!, string.Join(",", ids), cancellationToken);
        foreach (var row in found.Entries ?? [])
        {
            if (row.TryGetValue("item_id", out var id) && id != null)
                result[Convert.ToString(id, CultureInfo.InvariantCulture)!] = row;
        }

        return result;
    }

    private async Task EvaluateTicketAsync(
        NpgsqlConnection connection,
        SlaWorkflow workflow,
        WorkflowSlaConfigurationDto sla,
        IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> entries,
        Guid instanceId,
        DateTime createdAt,
        CancellationToken cancellationToken)
    {
        var identity = await _mailboxSync.TryGetProcessFormIdentityAsync(workflow.Id, instanceId, cancellationToken);
        IReadOnlyDictionary<string, string> values = new Dictionary<string, string>();
        if (!string.IsNullOrWhiteSpace(identity?.FormId) && identity?.FormEntryId is { } entryId && entryId != Guid.Empty)
        {
            values = await WorkflowFormFieldValues.ResolveAsync(
                _formDataLoader, identity.Value.FormId!, entryId, null, null, null, cancellationToken);
        }

        var result = WorkflowSlaAdvancedEvaluator.Evaluate(
            sla,
            fieldId => WorkflowConditionRouter.FieldValues(values, fieldId),
            entries,
            createdAt,
            workflow.Calendar,
            withResponse: !string.IsNullOrWhiteSpace(sla.ResponseStageId));

        var timers = BuildAdvancedTimers(sla, result, createdAt, workflow.Calendar);
        var outcome = JsonSerializer.Serialize(
            new { result.Log, result.Errors, Targets = result.Targets, formValuesFound = values.Count > 0 },
            SnapshotJson);

        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await using (var record = new NpgsqlCommand(
            """
            INSERT INTO workflow.sla_advanced_evaluations (workflow_id, workflow_instance_id, matched, outcome_json)
            VALUES (@WorkflowId, @InstanceId, @Matched, @Outcome)
            ON CONFLICT (workflow_id, workflow_instance_id) DO NOTHING;
            """,
            connection,
            transaction))
        {
            record.Parameters.AddWithValue("@WorkflowId", workflow.Id);
            record.Parameters.AddWithValue("@InstanceId", instanceId);
            record.Parameters.AddWithValue("@Matched", result.Matched);
            record.Parameters.AddWithValue("@Outcome", outcome);
            if (await record.ExecuteNonQueryAsync(cancellationToken) == 0)
            {
                await transaction.RollbackAsync(cancellationToken); // another API instance evaluated it
                return;
            }
        }

        foreach (var (scope, ruleKey, due, snapshot) in timers)
        {
            await using var insert = new NpgsqlCommand(
                """
                INSERT INTO workflow.sla_timers
                    (workflow_id, workflow_instance_id, scope, transaction_id, activity_id, rule_id, due_at_utc, snapshot_json, status)
                VALUES (@WorkflowId, @InstanceId, @Scope, 0, NULL, @RuleId, @Due, @Snapshot, 4)
                ON CONFLICT (workflow_id, workflow_instance_id, scope, transaction_id, rule_id) DO NOTHING;
                """,
                connection,
                transaction);
            insert.Parameters.AddWithValue("@WorkflowId", workflow.Id);
            insert.Parameters.AddWithValue("@InstanceId", instanceId);
            insert.Parameters.AddWithValue("@Scope", scope);
            insert.Parameters.AddWithValue("@RuleId", ruleKey);
            insert.Parameters.AddWithValue("@Due", DateTime.SpecifyKind(due, DateTimeKind.Utc));
            insert.Parameters.AddWithValue("@Snapshot", JsonSerializer.Serialize(snapshot, SnapshotJson));
            await insert.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        _logger.LogInformation(
            "Advanced SLA for instance {InstanceId}: {Targets} target(s), {Timers} timer(s). {Log} {Errors}",
            instanceId, result.Targets.Count, timers.Count, string.Join(" ", result.Log), string.Join(" ", result.Errors));
    }

    /// <summary>A due timer per deadline, and a reminder before it when the rule asks for one.</summary>
    internal static List<(string Scope, string RuleKey, DateTime DueAtUtc, AdvancedSnapshot Snapshot)> BuildAdvancedTimers(
        WorkflowSlaConfigurationDto sla,
        WorkflowSlaAdvancedResult result,
        DateTime startedAtUtc,
        WorkflowBusinessCalendar? calendar)
    {
        var timers = new List<(string, string, DateTime, AdvancedSnapshot)>();
        var rules = (sla.AdvancedRules ?? [])
            .GroupBy(r => r.Id ?? "", StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.Ordinal);
        var email = sla.Notifications?.Email ?? true;
        var sms = sla.Notifications?.Sms ?? false;
        var evaluatedAt = DateTime.UtcNow;

        foreach (var target in result.Targets)
        {
            rules.TryGetValue(target.RuleId, out var rule);
            var deadlines = new List<(string Scope, decimal? Duration, string? Unit, DateTime? Due)>
            {
                (ScopeAdvancedResponse, target.ResponseDuration, target.ResponseUnit, target.ResponseDueUtc),
                (ScopeAdvancedResolution, target.ResolutionDuration, target.ResolutionUnit, target.ResolutionDueUtc)
            };
            foreach (var (scope, duration, unit, due) in deadlines)
            {
                if (due is not { } deadline)
                    continue;

                AdvancedSnapshot Snapshot(string kind) => new(
                    kind, target.RuleId, target.RuleName, sla.SlaMasterId ?? "", target.EntryId, target.EntryName,
                    duration, unit, deadline, target.NotifyUsers, target.EscalationUsers,
                    rule?.NotifyUserIds ?? [], rule?.Initiator == true,
                    rule?.BreachAction?.Type?.Trim().ToLowerInvariant(), rule?.BreachAction?.StageId,
                    rule?.BreachAction?.On?.Trim().ToLowerInvariant(), sla.ResponseStageId,
                    email, sms, calendar?.TimeZone.Id, evaluatedAt);

                var key = $"{target.RuleId}|{target.EntryId}";
                timers.Add((scope, $"{key}|{KindDue}", deadline, Snapshot(KindDue)));

                if (rule?.ReminderMinutes is int minutes && minutes > 0)
                {
                    var before = TimeSpan.FromMinutes(minutes);
                    var remindAt = calendar?.SubtractWorkingTime(deadline, before, startedAtUtc)
                        ?? (deadline - before > startedAtUtc ? deadline - before : startedAtUtc);
                    if (remindAt > startedAtUtc && remindAt < deadline)
                        timers.Add((scope, $"{key}|{KindReminder}", remindAt, Snapshot(KindReminder)));
                }
            }
        }

        return timers;
    }

    // ---- Fire -------------------------------------------------------------------------------------

    private async Task<(short Status, string Outcome)> FireAdvancedAsync(
        NpgsqlConnection connection,
        ClaimedTimer timer,
        SlaWorkflow workflow,
        CancellationToken cancellationToken)
    {
        var snapshot = string.IsNullOrWhiteSpace(timer.SnapshotJson)
            ? null
            : JsonSerializer.Deserialize<AdvancedSnapshot>(timer.SnapshotJson, SnapshotJson);
        if (snapshot == null)
            return (WorkflowSlaStore.TimerCancelled, "advanced SLA values are missing");

        var suffix = workflow.Id.ToString("N")[..8];
        var isResponse = timer.Scope == ScopeAdvancedResponse;
        var ticket = await LoadUnresolvedTicketAsync(connection, suffix, timer.InstanceId, cancellationToken);
        if (ticket == null)
            return (WorkflowSlaStore.TimerCancelled, "ticket is already resolved or closed");
        if (isResponse && await ResponseGivenAsync(connection, suffix, timer.InstanceId, snapshot.ResponseStageId, cancellationToken))
            return (WorkflowSlaStore.TimerCancelled, "response already given");
        // Stage SLA Master timer: met once the ticket is acted on at that stage.
        var waiting = timer.TransactionId > 0 ? await LoadWaitingStepAsync(connection, suffix, timer, cancellationToken) : null;
        if (timer.TransactionId > 0 && waiting == null)
            return (WorkflowSlaStore.TimerCancelled, "ticket was already acted on");
        if (snapshot.AfterLast == AfterLastManager)
        {
            var manager = await FindManagerAsync(connection, waiting?.AssigneeUserId, cancellationToken);
            if (manager == null)
                return (WorkflowSlaStore.TimerFired, "after the last level: the assignee has no reporting manager; left as it is");
            snapshot = snapshot with { EscalationUsers = [manager.Value.ToString("D")] };
        }

        var isStep = snapshot.RuleId == MasterStepRuleId;
        if (snapshot.RuleId == MasterRuleId)
        {
            var current = await RefreshMasterUsersAsync(snapshot, cancellationToken);
            if (current == null)
                return (WorkflowSlaStore.TimerCancelled, $"SLA Master entry {snapshot.EntryId} was deleted from the master; no SLA");
            snapshot = current;
        }

        var isDue = snapshot.Kind == KindDue;
        var breachHere = isDue && BreachApplies(snapshot.BreachOn, isResponse);
        var breachType = breachHere ? snapshot.BreachType : null;

        // An SLA step can send to a group, or move the request to a stage named in the table.
        var stepProblems = new List<string>();
        var stepGroupMembers = new List<Guid>();
        foreach (var stepGroup in new[] { snapshot.StepNotifyGroup, snapshot.StepGroup }.Where(g => !string.IsNullOrWhiteSpace(g)))
        {
            var group = await WorkflowSlaGroupEscalation.FindGroupAsync(connection, stepGroup, cancellationToken);
            if (group is { } found)
                stepGroupMembers.AddRange(await WorkflowSlaGroupEscalation.ListMembersAsync(connection, found, cancellationToken));
            else
            {
                stepProblems.Add($"group '{stepGroup}' was not found");
                if (stepGroup == snapshot.StepGroup && breachType == WorkflowSlaSettingsValidator.EscalateToGroup)
                    breachType = null;
            }
        }

        if (isStep && !string.IsNullOrWhiteSpace(snapshot.StepStage))
        {
            var (stageId, stageProblem) = FindStageByName(workflow.Json, snapshot.StepStage);
            if (stageId != null && breachType == WorkflowSlaSettingsValidator.BreachStage)
                snapshot = snapshot with { BreachStageId = stageId };
            else
            {
                stepProblems.Add(stageProblem ?? $"this step cannot move the request to stage '{snapshot.StepStage}'");
                breachType = null;
            }
        }

        var recipientValues = snapshot.NotifyEnabled
            ? snapshot.NotifyUsers.Concat(snapshot.RuleNotifyUserIds).ToList()
            : [];
        if (breachType is WorkflowSlaSettingsValidator.BreachNotify or WorkflowSlaSettingsValidator.BreachReassign)
            recipientValues.AddRange(snapshot.EscalationUsers);
        var (recipientIds, unknown) = await ResolveUserIdsAsync(connection, recipientValues, cancellationToken);
        if (snapshot.Initiator)
            recipientIds.Add(ticket.StartedBy);
        recipientIds.UnionWith(stepGroupMembers);
        if (snapshot.AfterLast == AfterLastRemind && waiting?.AssigneeUserId is { } assignee)
            recipientIds.Add(assignee);

        var reference = string.IsNullOrWhiteSpace(ticket.Reference) ? timer.InstanceId.ToString("D")[..8] : ticket.Reference;
        var what = isResponse ? "Response" : "Resolution";
        var limit = DescribeAdvanced(snapshot);
        var deadline = FormatDeadline(snapshot.DeadlineUtc, snapshot.TimeZone);
        var source = $"SLA rule <strong>{WorkflowSlaNotifier.Encode(snapshot.RuleName)}</strong>, "
            + $"entry <strong>{WorkflowSlaNotifier.Encode(snapshot.EntryName)}</strong>";
        var message = snapshot.AfterLast != null
            ? AfterLastMessage(snapshot, breachType, reference, workflow.Name)
            : isStep
            ? StepMessage(snapshot, breachType, reference, workflow.Name, isResponse, limit, deadline)
            : isDue
            ? new WorkflowSlaNotifier.Message(
                $"{what} SLA breached: ticket {reference}",
                $"Ticket {reference} missed its {what.ToLowerInvariant()} SLA ({limit})",
                $"Ticket <strong>{WorkflowSlaNotifier.Encode(reference)}</strong> in "
                    + $"<strong>{WorkflowSlaNotifier.Encode(workflow.Name)}</strong> passed its "
                    + $"{what.ToLowerInvariant()} deadline of <strong>{WorkflowSlaNotifier.Encode(deadline)}</strong> "
                    + $"({WorkflowSlaNotifier.Encode(limit)}; {source})." + BreachSentence(breachType),
                $"EZOFIS SLA: ticket {reference} ({workflow.Name}) missed its {what.ToLowerInvariant()} SLA, due {deadline}.")
            : new WorkflowSlaNotifier.Message(
                $"{what} SLA due soon: ticket {reference}",
                $"Ticket {reference}: {what.ToLowerInvariant()} due {deadline}",
                $"Ticket <strong>{WorkflowSlaNotifier.Encode(reference)}</strong> in "
                    + $"<strong>{WorkflowSlaNotifier.Encode(workflow.Name)}</strong> must get its "
                    + $"{what.ToLowerInvariant()} by <strong>{WorkflowSlaNotifier.Encode(deadline)}</strong> "
                    + $"({WorkflowSlaNotifier.Encode(limit)}; {source}).",
                $"EZOFIS SLA: ticket {reference} ({workflow.Name}) {what.ToLowerInvariant()} due {deadline}.");

        var outcome = new List<string> { $"{snapshot.Kind} {timer.Scope} entry '{snapshot.EntryName}'" };
        outcome.AddRange(stepProblems);
        if (unknown.Count > 0)
            outcome.Add($"users not found: {string.Join(", ", unknown)}");
        if (recipientIds.Count == 0)
            outcome.Add("no users to notify");
        else if (!snapshot.Email && !snapshot.Sms)
            outcome.Add("Email and SMS are both off");
        else
            outcome.Add(await QueueNotificationsAsync(connection, timer, recipientIds, snapshot.Email, snapshot.Sms, message, cancellationToken));

        if (breachType is WorkflowSlaSettingsValidator.BreachReassign or WorkflowSlaSettingsValidator.BreachStage
            or WorkflowSlaSettingsValidator.EscalateToGroup)
            outcome.Add(await RunBreachActionAsync(connection, suffix, timer, snapshot, breachType, cancellationToken));
        if (snapshot.AfterLast == AfterLastRemind)
            outcome.Add(await ScheduleNextReminderAsync(connection, timer, snapshot, workflow.Calendar, cancellationToken));

        return (WorkflowSlaStore.TimerFired, string.Join("; ", outcome.Where(o => o.Length > 0)));
    }

    private static bool BreachApplies(string? on, bool isResponse) => on switch
    {
        "both" => true,
        "response" => isResponse,
        _ => !isResponse // default: resolution
    };

    /// <summary>The response stage has been acted on (approved, forwarded, …) at least once.</summary>
    private static async Task<bool> ResponseGivenAsync(
        NpgsqlConnection connection, string suffix, Guid instanceId, string? stageId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(stageId))
            return false;

        var sql = $"""
            SELECT EXISTS (
                SELECT 1 FROM workflow.transaction_{suffix} t
                WHERE t.workflow_instance_id = @InstanceId AND t.is_deleted = false
                  AND t.activity_id = @StageId
                  AND (t.action_status <> 0 OR COALESCE(t.review, '') <> ''));
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@InstanceId", instanceId);
        cmd.Parameters.AddWithValue("@StageId", stageId);
        return await cmd.ExecuteScalarAsync(cancellationToken) is true;
    }

    /// <summary>
    /// Reassign or move through move-next (Forward / SLA Escalated), from the stage the ticket is waiting
    /// at now. When move-next refuses (no such transition, closed ticket…), the ticket stays as it is and the
    /// reason is recorded on the timer.
    /// </summary>
    private async Task<string> RunBreachActionAsync(
        NpgsqlConnection connection,
        string suffix,
        ClaimedTimer timer,
        AdvancedSnapshot snapshot,
        string breachType,
        CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT t.activity_id, t.activity_user_id
            FROM workflow.transaction_{suffix} t
            WHERE t.workflow_instance_id = @InstanceId AND t.is_deleted = false
              AND t.action_status = 0 AND COALESCE(t.review, '') = ''
            ORDER BY t.id DESC
            LIMIT 1;
            """;
        string? activityId = null;
        Guid? assignee = null;
        await using (var cmd = new NpgsqlCommand(sql, connection))
        {
            cmd.Parameters.AddWithValue("@InstanceId", timer.InstanceId);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                activityId = reader.IsDBNull(0) ? null : reader.GetString(0);
                assignee = reader.IsDBNull(1) ? null : reader.GetGuid(1);
            }
        }

        if (string.IsNullOrWhiteSpace(activityId))
            return "breach action skipped: the ticket is not waiting at a stage";

        try
        {
            if (breachType == WorkflowSlaSettingsValidator.EscalateToGroup)
            {
                var group = await WorkflowSlaGroupEscalation.FindGroupAsync(connection, snapshot.StepGroup, cancellationToken);
                if (group is not { } groupId)
                    return $"group '{snapshot.StepGroup}' was not found";
                var members = await WorkflowSlaGroupEscalation.ListMembersAsync(connection, groupId, cancellationToken);
                return await EscalateToGroupAsync(
                    connection, timer, groupId.ToString("D"), members, assignee,
                    $"SLA '{snapshot.EntryName}' ({DescribeAdvanced(snapshot)}); sent to the group automatically.", cancellationToken);
            }

            if (breachType == WorkflowSlaSettingsValidator.BreachReassign)
            {
                var (ids, _) = await ResolveUserIdsAsync(connection, snapshot.EscalationUsers, cancellationToken);
                if (ids.Count == 0)
                    return "reassign skipped: no active escalation user";
                var forwardTo = ResolveFirst(snapshot.EscalationUsers, ids);
                if (forwardTo == assignee)
                    return "already assigned to the escalation user";

                await _mediator.Send(new MoveToNextStepCommand(
                    timer.InstanceId,
                    activityId,
                    Review: ForwardReview,
                    Comments: $"SLA '{snapshot.RuleName}' ({snapshot.EntryName}) breached; reassigned automatically.",
                    ActivityUserId: forwardTo,
                    CommentAuthorName: "SLA"), cancellationToken);
                return $"reassigned to {forwardTo}";
            }

            if (string.IsNullOrWhiteSpace(snapshot.BreachStageId))
                return "stage move skipped: no stage selected";
            if (string.Equals(activityId, snapshot.BreachStageId, StringComparison.Ordinal))
                return "already at the escalation stage";

            await _mediator.Send(new MoveToNextStepCommand(
                timer.InstanceId,
                activityId,
                Review: EscalationReview,
                Comments: $"SLA '{snapshot.RuleName}' ({snapshot.EntryName}) breached; moved automatically.",
                CommentAuthorName: "SLA",
                TargetActivityId: snapshot.BreachStageId), cancellationToken);
            return $"moved to stage {snapshot.BreachStageId}";
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException or PostgresException)
        {
            _logger.LogWarning(ex, "Advanced SLA breach action failed for timer {TimerId}", timer.Id);
            return $"breach action failed: {ex.Message}";
        }
    }

    /// <summary>The first configured escalation user that resolved to an active user.</summary>
    private static Guid ResolveFirst(IReadOnlyList<string> values, HashSet<Guid> resolved)
    {
        var first = values.Select(v => Guid.TryParse(v, out var g) ? g : Guid.Empty).FirstOrDefault(resolved.Contains);
        return first != Guid.Empty ? first : resolved.First();
    }

    /// <summary>User ids, or emails looked up in <c>users."Users"</c>. Unknown / inactive values are returned apart.</summary>
    private static async Task<(HashSet<Guid> Ids, List<string> Unknown)> ResolveUserIdsAsync(
        NpgsqlConnection connection,
        IEnumerable<string> values,
        CancellationToken cancellationToken)
    {
        var ids = new HashSet<Guid>();
        var emails = new List<string>();
        foreach (var raw in values.Select(v => v?.Trim()).Where(v => !string.IsNullOrEmpty(v)))
        {
            if (Guid.TryParse(raw, out var id))
                ids.Add(id);
            else
                emails.Add(raw!.ToLowerInvariant());
        }

        var unknown = new List<string>();
        if (emails.Count > 0)
        {
            const string sql = """
                SELECT "Id", lower("Email") FROM users."Users"
                WHERE "IsDeleted" = false AND lower("Email") = ANY(@Emails);
                """;
            var found = new HashSet<string>();
            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@Emails", emails.Distinct().ToArray());
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                ids.Add(reader.GetGuid(0));
                found.Add(reader.GetString(1));
            }

            unknown.AddRange(emails.Distinct().Where(e => !found.Contains(e)));
        }

        return (ids, unknown);
    }

    /// <summary>The stage an SLA step names: by id or label. A label used by several stages is not guessed.</summary>
    private static (string? StageId, string? Problem) FindStageByName(WorkflowJsonDto json, string name)
    {
        var value = name.Trim();
        var matches = (json.Blocks ?? [])
            .Where(b => string.Equals(b.Id, value, StringComparison.Ordinal)
                || string.Equals(b.Settings?.Label?.Trim(), value, StringComparison.OrdinalIgnoreCase))
            .Select(b => b.Id)
            .ToList();
        return matches.Count switch
        {
            1 => (matches[0], null),
            0 => (null, $"this workflow has no stage named '{value}'"),
            _ => (null, $"{matches.Count} stages in this workflow are named '{value}'; rename them so the step can tell them apart")
        };
    }

    private static WorkflowSlaNotifier.Message StepMessage(
        AdvancedSnapshot snapshot, string? breachType, string reference, string workflowName, bool isStage, string limit, string deadline)
    {
        var since = isStage ? "since it reached this stage" : "since it was created";
        var body = $"Ticket <strong>{WorkflowSlaNotifier.Encode(reference)}</strong> in "
            + $"<strong>{WorkflowSlaNotifier.Encode(workflowName)}</strong> has reached "
            + $"<strong>{WorkflowSlaNotifier.Encode(limit)}</strong> {since} ({WorkflowSlaNotifier.Encode(deadline)}; "
            + $"SLA <strong>{WorkflowSlaNotifier.Encode(snapshot.EntryName)}</strong>).";
        return breachType == null
            ? new WorkflowSlaNotifier.Message(
                $"SLA reminder: ticket {reference}",
                $"Ticket {reference}: {limit} {since}",
                body,
                $"EZOFIS SLA: ticket {reference} ({workflowName}) reached {limit} {since}.")
            : new WorkflowSlaNotifier.Message(
                $"SLA escalation: ticket {reference}",
                $"Ticket {reference} is escalated after {limit}",
                body + BreachSentence(breachType),
                $"EZOFIS SLA: ticket {reference} ({workflowName}) escalated after {limit} {since}.");
    }

    private static string DescribeAdvanced(AdvancedSnapshot snapshot)
    {
        var amount = snapshot.Duration?.ToString("0.##", CultureInfo.InvariantCulture) ?? "?";
        var unit = snapshot.Unit ?? "hours";
        if (amount == "1" && unit.EndsWith('s'))
            unit = unit[..^1];
        return snapshot.TimeZone == null ? $"{amount} {unit}" : $"{amount} working {unit}";
    }

    private static string FormatDeadline(DateTime deadlineUtc, string? timeZoneId)
    {
        var utc = DateTime.SpecifyKind(deadlineUtc, DateTimeKind.Utc);
        if (timeZoneId != null)
        {
            try
            {
                var zone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
                return $"{TimeZoneInfo.ConvertTimeFromUtc(utc, zone):ddd d MMM yyyy, h:mm tt} ({timeZoneId})";
            }
            catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
            }
        }

        return $"{utc:ddd d MMM yyyy, HH:mm} UTC";
    }

    private static string BreachSentence(string? breachType) => breachType switch
    {
        WorkflowSlaSettingsValidator.BreachReassign => " It is being reassigned to the escalation user.",
        WorkflowSlaSettingsValidator.BreachStage => " It is being moved to the escalation stage.",
        WorkflowSlaSettingsValidator.BreachNotify => " The escalation users are notified.",
        _ => string.Empty
    };
}

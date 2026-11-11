using System.Globalization;
using Npgsql;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// SLA preview (workflow settings) and per-ticket SLA history. The preview uses
/// <see cref="WorkflowSlaAdvancedEvaluator"/> and <see cref="WorkflowBusinessCalendar"/>, the same code the
/// timers run with, and reads the SLA Master entries through <see cref="WorkflowSlaTimerService"/>.
/// </summary>
public sealed class WorkflowSlaInsightService : IWorkflowSlaInsightService
{
    private readonly ITenantContext _tenantContext;
    private readonly WorkflowSlaTimerService _timers;

    public WorkflowSlaInsightService(ITenantContext tenantContext, WorkflowSlaTimerService timers)
    {
        _tenantContext = tenantContext;
        _timers = timers;
    }

    public async Task<WorkflowSlaPreviewResult> PreviewAsync(
        WorkflowSlaPreviewRequest request,
        CancellationToken cancellationToken = default)
    {
        var sla = request.SlaSettings
            ?? throw new InvalidOperationException("SLA settings are required.");
        if (!string.Equals(sla.Mode?.Trim(), WorkflowSlaSettingsValidator.ModeAdvanced, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Preview is for Advanced SLA settings.");
        if (string.IsNullOrWhiteSpace(sla.SlaMasterId))
            throw new InvalidOperationException("Select an SLA Master.");

        // Same checks as saving (stage ids are checked on save, where the blocks are known).
        var json = new WorkflowJsonDto(new WorkflowSettingsDto(
            General: new WorkflowGeneralDto(SlaSettings: request.BusinessHours),
            SlaSettings: sla with { ResponseStageId = null, AdvancedRules = sla.AdvancedRules?.Select(StripStage).ToList() }));
        WorkflowSlaSettingsValidator.Validate(json);

        var calendar = WorkflowBusinessCalendar.TryCreate(request.BusinessHours);
        var created = DateTime.SpecifyKind(request.CreatedAtUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        var values = new Dictionary<string, string>(request.FormValues ?? [], StringComparer.OrdinalIgnoreCase);
        var entries = await _timers.LoadMasterEntriesAsync(sla, cancellationToken);
        var result = WorkflowSlaAdvancedEvaluator.Evaluate(
            sla,
            fieldId => WorkflowConditionRouter.FieldValues(values, fieldId),
            entries,
            created,
            calendar,
            withResponse: !string.IsNullOrWhiteSpace(sla.ResponseStageId));

        var rules = (sla.AdvancedRules ?? []).Where(r => r.Id != null).GroupBy(r => r.Id!).ToDictionary(g => g.Key, g => g.First());
        var targets = result.Targets.Select(t =>
        {
            rules.TryGetValue(t.RuleId, out var rule);
            var action = rule?.BreachAction?.Type?.Trim().ToLowerInvariant() switch
            {
                WorkflowSlaSettingsValidator.BreachNotify => "Notify escalation users",
                WorkflowSlaSettingsValidator.BreachReassign => "Reassign to escalation user",
                WorkflowSlaSettingsValidator.BreachStage => $"Move to stage {rule!.BreachAction!.StageId}",
                _ => null
            };
            return new WorkflowSlaPreviewTarget(
                t.RuleId, t.RuleName, t.EntryId, t.EntryName,
                Describe(t.ResponseDuration, t.ResponseUnit), t.ResponseDueUtc,
                Describe(t.ResolutionDuration, t.ResolutionUnit), t.ResolutionDueUtc,
                t.NotifyUsers, t.EscalationUsers, action);
        }).ToList();

        return new WorkflowSlaPreviewResult(created, calendar?.TimeZone.Id, calendar != null, targets, result.Log, result.Errors);
    }

    public async Task<IReadOnlyList<WorkflowSlaFormUsageRow>> GetFormUsageAsync(CancellationToken cancellationToken = default)
    {
        var connectionString = _tenantContext.ConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString))
            return [];

        var workflows = new List<(Guid Id, string Name, DateTime? Modified, bool Published)>();
        await using (var connection = new NpgsqlConnection(connectionString))
        {
            await connection.OpenAsync(cancellationToken);
            await using var cmd = new NpgsqlCommand(
                """
                SELECT "Id", "Name", "ModifiedAtUtc", "Status"
                FROM workflow."Workflows"
                WHERE "IsDeleted" = false
                ORDER BY "Name";
                """,
                connection);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                workflows.Add((reader.GetGuid(0), reader.GetString(1),
                    reader.IsDBNull(2) ? null : reader.GetDateTime(2), reader.GetInt32(3) == 1));
            }
        }

        var rows = new List<WorkflowSlaFormUsageRow>();
        foreach (var (id, name, modified, published) in workflows)
        {
            // Read through the timers' cache, so only changed workflows go back to storage.
            var json = await _timers.LoadDefinitionAsync(id, modified, cancellationToken);
            if (json != null)
                rows.AddRange(WorkflowSlaFormUsage.Find(id, name, published, json));
        }

        return rows;
    }

    private static WorkflowSlaAdvancedRuleDto StripStage(WorkflowSlaAdvancedRuleDto rule) =>
        rule.BreachAction?.Type?.Trim().ToLowerInvariant() == WorkflowSlaSettingsValidator.BreachStage
            ? rule with { BreachAction = rule.BreachAction with { Type = WorkflowSlaSettingsValidator.BreachNotify } }
            : rule;

    private static string? Describe(decimal? duration, string? unit) =>
        duration is { } d ? $"{d.ToString("0.##", CultureInfo.InvariantCulture)} {unit}" : null;

    public async Task<WorkflowSlaHistoryResult> GetHistoryAsync(
        Guid workflowId,
        Guid instanceId,
        CancellationToken cancellationToken = default)
    {
        var connectionString = _tenantContext.ConnectionString
            ?? throw new InvalidOperationException("Tenant connection string not resolved.");
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        if (!await WorkflowSlaStore.TablesExistAsync(connection, cancellationToken))
            return new WorkflowSlaHistoryResult([], null, null, null);
        await WorkflowSlaStore.EnsureTablesAsync(connection, cancellationToken);

        var timers = new List<WorkflowSlaTimerRow>();
        await using (var cmd = new NpgsqlCommand(
            """
            SELECT id, scope, rule_id, due_at_utc, status, attempts, processed_at_utc, outcome, snapshot_json
            FROM workflow.sla_timers
            WHERE workflow_id = @WorkflowId AND workflow_instance_id = @InstanceId
            ORDER BY due_at_utc, id;
            """,
            connection))
        {
            cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
            cmd.Parameters.AddWithValue("@InstanceId", instanceId);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                timers.Add(new WorkflowSlaTimerRow(
                    reader.GetInt64(0),
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetDateTime(3).ToUniversalTime(),
                    reader.GetInt16(4) switch
                    {
                        WorkflowSlaStore.TimerFired => "fired",
                        WorkflowSlaStore.TimerCancelled => "cancelled",
                        WorkflowSlaStore.TimerFailed => "failed",
                        _ => "pending"
                    },
                    reader.GetInt32(5),
                    reader.IsDBNull(6) ? null : reader.GetDateTime(6).ToUniversalTime(),
                    reader.IsDBNull(7) ? null : reader.GetString(7),
                    reader.IsDBNull(8) ? null : reader.GetString(8)));
            }
        }

        await using var evaluation = new NpgsqlCommand(
            """
            SELECT evaluated_at_utc, matched, outcome_json FROM workflow.sla_advanced_evaluations
            WHERE workflow_id = @WorkflowId AND workflow_instance_id = @InstanceId;
            """,
            connection);
        evaluation.Parameters.AddWithValue("@WorkflowId", workflowId);
        evaluation.Parameters.AddWithValue("@InstanceId", instanceId);
        await using var row = await evaluation.ExecuteReaderAsync(cancellationToken);
        return await row.ReadAsync(cancellationToken)
            ? new WorkflowSlaHistoryResult(timers, row.GetDateTime(0).ToUniversalTime(), row.GetBoolean(1), row.GetString(2))
            : new WorkflowSlaHistoryResult(timers, null, null, null);
    }
}

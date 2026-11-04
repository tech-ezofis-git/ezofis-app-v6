using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>SLA preview for the workflow settings, and a ticket's SLA timers / history.</summary>
public interface IWorkflowSlaInsightService
{
    /// <summary>
    /// Runs the Advanced rules (unsaved settings) against sample form values with the same rule and
    /// business-hours code as the runtime. Throws <see cref="InvalidOperationException"/> for invalid settings.
    /// </summary>
    Task<WorkflowSlaPreviewResult> PreviewAsync(WorkflowSlaPreviewRequest request, CancellationToken cancellationToken = default);

    /// <summary>The ticket's SLA timers (pending, fired, cancelled, failed) and its Advanced evaluation, oldest first.</summary>
    Task<WorkflowSlaHistoryResult> GetHistoryAsync(Guid workflowId, Guid instanceId, CancellationToken cancellationToken = default);
}

public sealed record WorkflowSlaPreviewRequest(
    WorkflowSlaConfigurationDto? SlaSettings,
    WorkflowSlaSettingsDto? BusinessHours,
    Dictionary<string, string>? FormValues,
    DateTime? CreatedAtUtc);

public sealed record WorkflowSlaPreviewTarget(
    string RuleId,
    string RuleName,
    string EntryId,
    string EntryName,
    string? Response,
    DateTime? ResponseDueUtc,
    string? Resolution,
    DateTime? ResolutionDueUtc,
    IReadOnlyList<string> NotifyUsers,
    IReadOnlyList<string> EscalationUsers,
    string? BreachAction);

public sealed record WorkflowSlaPreviewResult(
    DateTime CreatedAtUtc,
    string? TimeZone,
    bool BusinessHours,
    IReadOnlyList<WorkflowSlaPreviewTarget> Targets,
    IReadOnlyList<string> Log,
    IReadOnlyList<string> Errors);

public sealed record WorkflowSlaTimerRow(
    long Id,
    string Scope,
    string RuleId,
    DateTime DueAtUtc,
    string Status,
    int Attempts,
    DateTime? ProcessedAtUtc,
    string? Outcome,
    string? SnapshotJson);

public sealed record WorkflowSlaHistoryResult(
    IReadOnlyList<WorkflowSlaTimerRow> Timers,
    DateTime? EvaluatedAtUtc,
    bool? Matched,
    string? EvaluationJson);

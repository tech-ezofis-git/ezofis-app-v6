namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>What caused an AI insight to be generated for a workflow transaction.</summary>
public static class WorkflowInsightTrigger
{
    public const string Start = "start";
    public const string StepChange = "step_change";
    public const string Completed = "completed";
    public const string Manual = "manual";
}

/// <summary>
/// Generate the AI insight for the step the instance is on now, for the user who owns that step.
/// Runs in the background; never fails the start / move-next call that queued it.
/// </summary>
public sealed record WorkflowInsightGenerateRequest(
    Guid TenantId,
    Guid UserId,
    Guid WorkflowId,
    Guid InstanceId,
    string Trigger,
    string? UserInput = null);

/// <summary>Short insight shown on mailbox rows: what the situation is and what to do next.</summary>
public sealed record WorkflowInsightDto(
    string? Summary,
    string? NextAction,
    string Status,
    string? StepName,
    string? AssigneeUserId,
    DateTime? CreatedAtUtc);

/// <summary>Fire-and-forget queue used by start / move-next.</summary>
public interface IWorkflowInsightQueue
{
    void Enqueue(WorkflowInsightGenerateRequest request);
}

public interface IWorkflowInsightService
{
    /// <summary>Builds the context, calls the agents <c>insight</c> intent and stores the result.</summary>
    Task GenerateAsync(WorkflowInsightGenerateRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Current insight per workflow instance id (key is the lower-case instance id).
    /// When several assignees have one, the one for <paramref name="preferUserId"/> wins.
    /// </summary>
    Task<IReadOnlyDictionary<string, WorkflowInsightDto>> GetCurrentAsync(
        Guid workflowId,
        IReadOnlyCollection<string> instanceIds,
        Guid? preferUserId = null,
        CancellationToken cancellationToken = default);
}

namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>One workflow+stage handed to a delegate within a delegation.</summary>
public sealed record WorkflowDelegationRowDto(
    Guid WorkflowId,
    /// <summary>Designer block id (activityId). Null/empty applies to every stage of this workflow.</summary>
    string? StageId,
    Guid DelegateUserId,
    string? Reason);

public sealed record WorkflowDelegationActionsDto(
    bool NotifyDelegates = true,
    bool RedirectNewRequests = true,
    bool TransferCurrentRequests = false);

/// <summary>"RETURN_TO_ASSIGNEE" | "KEEP_WITH_DELEGATE" -- what happens to unfinished work after the period ends.</summary>
public static class WorkflowDelegationPeriodEnd
{
    public const string ReturnToAssignee = "RETURN_TO_ASSIGNEE";
    public const string KeepWithDelegate = "KEEP_WITH_DELEGATE";
}

public sealed record WorkflowDelegationUpsertDto(
    Guid AssigneeUserId,
    IReadOnlyList<WorkflowDelegationRowDto> Delegations,
    /// <summary>yyyy-MM-dd. Null while the delegation is still a draft.</summary>
    string? FromDate,
    string? ToDate,
    bool IsDraft,
    string OnPeriodEnd,
    WorkflowDelegationActionsDto Actions);

/// <summary>Draft | Scheduled | Active | Completed | Ended (computed from dates/flags, same rule as the designer mock).</summary>
public static class WorkflowDelegationStatus
{
    public const string Draft = "Draft";
    public const string Scheduled = "Scheduled";
    public const string Active = "Active";
    public const string Completed = "Completed";
    public const string Ended = "Ended";
}

public sealed record WorkflowDelegationDto(
    Guid Id,
    Guid TenantId,
    Guid AssigneeUserId,
    IReadOnlyList<WorkflowDelegationRowDto> Delegations,
    string? FromDate,
    string? ToDate,
    bool IsDraft,
    bool IsEnded,
    string Status,
    string OnPeriodEnd,
    WorkflowDelegationActionsDto Actions,
    DateTime CreatedAtUtc,
    DateTime ModifiedAtUtc);

public interface IWorkflowDelegationService
{
    Task<WorkflowDelegationDto> CreateAsync(
        Guid tenantId, Guid userId, WorkflowDelegationUpsertDto request, CancellationToken cancellationToken = default);

    Task<WorkflowDelegationDto?> UpdateAsync(
        Guid tenantId, Guid id, Guid userId, WorkflowDelegationUpsertDto request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default);

    /// <summary>Ends an active delegation immediately (sets to_date to today and marks ended).</summary>
    Task<WorkflowDelegationDto?> EndNowAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default);

    Task<WorkflowDelegationDto?> GetAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<WorkflowDelegationDto>> ListAsync(Guid tenantId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Runtime lookup used when routing a ticket: if <paramref name="assigneeUserId"/> has an
    /// Active delegation (not draft, not ended, <paramref name="asOf"/> within [from, to]) that
    /// covers <paramref name="workflowId"/> + <paramref name="activityId"/> (or the whole workflow,
    /// when a row's StageId is empty) and has RedirectNewRequests enabled, returns the delegate's
    /// user id. Returns null when nothing applies (caller keeps the original assignee).
    /// </summary>
    Task<Guid?> ResolveDelegateAsync(
        Guid tenantId,
        Guid workflowId,
        string? activityId,
        Guid assigneeUserId,
        DateOnly asOf,
        CancellationToken cancellationToken = default);
}

namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>Parent→child request links (sub-workflows). Storage is per-tenant (workflow.sub_process_links).</summary>
public interface IWorkflowSubProcessService
{
    /// <summary>Links a child request to its parent. Repeating the same link is a no-op.</summary>
    /// <exception cref="ArgumentException">The link is invalid.</exception>
    /// <exception cref="UnauthorizedAccessException">The user can't access one of the workflows.</exception>
    /// <exception cref="KeyNotFoundException">One of the requests doesn't exist.</exception>
    /// <exception cref="InvalidOperationException">The link conflicts with an existing one.</exception>
    Task<WorkflowSubProcessLinkDto> LinkAsync(
        Guid tenantId, Guid userId, WorkflowSubProcessLinkDto link, CancellationToken cancellationToken = default);

    /// <summary>True when the request is already linked as another request's sub-process.</summary>
    Task<bool> IsSubProcessAsync(
        Guid tenantId, Guid workflowId, Guid processId, CancellationToken cancellationToken = default);

    /// <summary>Children of a request, limited to workflows the user can access.</summary>
    Task<IReadOnlyList<WorkflowSubProcessRowDto>> GetChildrenAsync(
        Guid tenantId, Guid userId, Guid workflowId, Guid processId, CancellationToken cancellationToken = default);

    /// <summary>The request's parent as a list of zero or one, limited to workflows the user can access.</summary>
    Task<IReadOnlyList<WorkflowMainProcessDto>> GetParentAsync(
        Guid tenantId, Guid userId, Guid workflowId, Guid processId, CancellationToken cancellationToken = default);
}

public sealed record WorkflowSubProcessLinkDto(
    Guid MainWorkflowId,
    Guid MainProcessId,
    Guid SubWorkflowId,
    Guid SubProcessId);

/// <summary>A child request. Field names match the V5 <c>GET workflow/subWorkflow</c> rows the web app maps.</summary>
public sealed record WorkflowSubProcessRowDto(
    Guid SubProcessId,
    Guid SubWorkflowId,
    string SubWorkflowName,
    string RequestNo,
    int FlowStatus,
    string? Stage,
    string? LastAction,
    DateTime? RaisedAt,
    long? Duration);

/// <summary>A parent request. Field names match the V5 <c>GET workflow/getDetailsforMainworkflow</c> rows.</summary>
public sealed record WorkflowMainProcessDto(
    Guid ProcessId,
    Guid WorkflowId,
    string WorkflowName,
    string RequestNo,
    int FlowStatus);

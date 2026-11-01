using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Domain.Enums;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>Rules for parent→child request links that don't need the database.</summary>
public static class WorkflowSubProcessRules
{
    /// <summary>V5 <c>flowStatus</c>: 1 once the request has finished, otherwise 0.</summary>
    public static int ToFlowStatus(WorkflowInstanceStatus status) =>
        status is WorkflowInstanceStatus.Completed or WorkflowInstanceStatus.Failed or WorkflowInstanceStatus.Cancelled
            ? 1
            : 0;

    /// <summary>Whole seconds since the last action; null when there hasn't been one.</summary>
    public static long? ToDurationSeconds(DateTime? lastActionAtUtc, DateTime nowUtc) =>
        lastActionAtUtc is { } at ? Math.Max(0, (long)(nowUtc - at).TotalSeconds) : null;

    /// <summary>Throws <see cref="ArgumentException"/> when the link can never be valid.</summary>
    public static void Validate(WorkflowSubProcessLinkDto link)
    {
        if (link.MainWorkflowId == Guid.Empty || link.MainProcessId == Guid.Empty
            || link.SubWorkflowId == Guid.Empty || link.SubProcessId == Guid.Empty)
            throw new ArgumentException("mainWorkflowId, mainProcessId, subWorkflowId and subProcessId are required.");

        if (link.MainProcessId == link.SubProcessId)
            throw new ArgumentException("A request can't be its own sub-process.");

        if (link.MainWorkflowId == link.SubWorkflowId)
            throw new ArgumentException("A workflow can't start itself as a sub-process.");
    }
}

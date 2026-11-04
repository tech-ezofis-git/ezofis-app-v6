using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;
using SaaSApp.Workflow.Domain.Entities;

namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>
/// When a ticket's open step is a designer WORKFLOW_CONNECTOR block, starts a request in the
/// connected workflow (pre-filled from matching field labels), links it as a sub-process, and
/// moves the parent on along the block's connection. The parent doesn't wait for the child.
/// </summary>
public interface IWorkflowConnectorRunner
{
    /// <summary>
    /// Returns the final move-next result when the ticket was moved on. Returns null when the open
    /// step is not a connector, or when the child could not be started: the ticket then stays on
    /// the connector step with a comment saying why. Never throws.
    /// </summary>
    /// <param name="depth">How many automatic steps were already routed in this chain (loop guard).</param>
    Task<MoveToNextStepCommandResult?> TryRunAsync(
        Guid workflowInstanceId,
        int depth = 0,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Fan-out: starts the connected workflow of every connector block that shares <paramref name="source"/>'s
    /// edge label (e.g. Start -> A, B, C), except <paramref name="exceptStepId"/> (the step the ticket moved to).
    /// The engine follows one edge per move, so the others would never run. Never throws.
    /// </summary>
    Task StartFanOutAsync(
        Guid workflowInstanceId,
        WorkflowStep source,
        string? review,
        Guid? exceptStepId,
        CancellationToken cancellationToken = default);
}

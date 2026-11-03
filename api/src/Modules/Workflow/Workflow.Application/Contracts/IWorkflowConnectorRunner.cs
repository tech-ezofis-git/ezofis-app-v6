using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;

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
}

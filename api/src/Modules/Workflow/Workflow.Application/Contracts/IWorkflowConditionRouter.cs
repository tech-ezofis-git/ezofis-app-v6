using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;

namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>
/// When a ticket's open step is a designer CONDITION block, checks its rules against the
/// ticket's form values and moves it on with review SATISFIED or NOT SATISFIED (the
/// ProceedAction on the designer's edges). Chained conditions route one after another.
/// </summary>
public interface IWorkflowConditionRouter
{
    /// <summary>
    /// Returns the final move-next result when the ticket was routed. Returns null when the open
    /// step is not a condition, or when it could not be checked: the ticket then stays on the
    /// condition step with a comment saying why. Never throws.
    /// </summary>
    /// <param name="depth">How many conditions were already routed in this chain (loop guard).</param>
    Task<MoveToNextStepCommandResult?> TryRouteAsync(
        Guid workflowInstanceId,
        int depth = 0,
        CancellationToken cancellationToken = default);
}

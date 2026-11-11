using MediatR;
using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;

namespace SaaSApp.Workflow.Application.Workflows.Commands.ReinitiateWorkflow;

/// <summary>
/// Sends a request that finished on an End block back through the workflow, from the stage set in that
/// block's Reprocess Request setting, or from the start when none is set.
/// </summary>
public record ReinitiateWorkflowCommand(Guid WorkflowInstanceId, string ActivityId)
    : IRequest<MoveToNextStepCommandResult>;

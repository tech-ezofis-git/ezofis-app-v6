using MediatR;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;
using SaaSApp.Workflow.Domain.Entities;
using SaaSApp.Workflow.Domain.Enums;

namespace SaaSApp.Workflow.Application.Workflows.Commands.ReinitiateWorkflow;

public sealed class ReinitiateWorkflowCommandHandler
    : IRequestHandler<ReinitiateWorkflowCommand, MoveToNextStepCommandResult>
{
    private readonly IWorkflowRepository _repository;
    private readonly IWorkflowJsonStorageService _workflowJsonStorage;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserProvider _currentUserProvider;
    private readonly IMediator _mediator;

    public ReinitiateWorkflowCommandHandler(
        IWorkflowRepository repository,
        IWorkflowJsonStorageService workflowJsonStorage,
        IUnitOfWork unitOfWork,
        ICurrentUserProvider currentUserProvider,
        IMediator mediator)
    {
        _repository = repository;
        _workflowJsonStorage = workflowJsonStorage;
        _unitOfWork = unitOfWork;
        _currentUserProvider = currentUserProvider;
        _mediator = mediator;
    }

    public async Task<MoveToNextStepCommandResult> Handle(
        ReinitiateWorkflowCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ActivityId))
            throw new ArgumentException("activityId is required.");

        var userId = _currentUserProvider.GetUserId()
            ?? throw new InvalidOperationException("User context is required.");

        var instance = await _repository.GetInstanceByIdAsync(request.WorkflowInstanceId, cancellationToken)
            ?? throw new InvalidOperationException("Workflow instance not found.");
        if (instance.Status != WorkflowInstanceStatus.Completed)
            throw new InvalidOperationException("Only a completed request can be re-initiated.");

        var workflow = await _repository.GetByIdWithStepsAsync(instance.WorkflowId, cancellationToken);
        if (workflow == null || workflow.IsDeleted)
            throw new InvalidOperationException("Workflow not found.");

        var orderedSteps = workflow.Steps.OrderBy(s => s.Order).ToList();
        var endStep = MoveToNextStepCommandHandler.ResolveStepByActivityId(orderedSteps, request.ActivityId);
        if (endStep == null || !IsEnd(endStep))
            throw new InvalidOperationException("A request can only be re-initiated from an End block.");

        var workflowJson = await _workflowJsonStorage.GetWorkflowJsonAsync(instance.WorkflowId, cancellationToken);
        var settings = WorkflowReprocessSettings.Read(workflowJson, endStep.ActivityId ?? request.ActivityId);
        if (!settings.Enabled)
            throw new InvalidOperationException("Re-initiate is not turned on for this workflow.");

        var target = ResolveTarget(orderedSteps, settings);
        var endActivityId = endStep.ActivityId ?? endStep.Id.ToString("D");
        var targetActivityId = target.ActivityId ?? target.Id.ToString("D");

        // The chosen stage and everything after it run again, step by step.
        WorkflowStepTransitionHelper.ReopenStepInstancesFrom(instance, target.Order);
        instance.Reopen(userId);
        await _repository.UpdateInstanceAsync(instance, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            return await _mediator.Send(
                new MoveToNextStepCommand(
                    instance.Id,
                    endActivityId,
                    WorkflowStepTransitionHelper.ReinitiateReview,
                    TargetActivityId: targetActivityId,
                    IsReinitiate: true,
                    // The start block belongs to whoever raised the request.
                    NextAssigneeUserId: IsStart(target) && instance.StartedBy != Guid.Empty
                        ? instance.StartedBy
                        : null),
                cancellationToken);
        }
        catch
        {
            // Nothing moved, so the request is still finished: keep it where the user can try again.
            instance.Complete(userId);
            await _repository.UpdateInstanceAsync(instance, CancellationToken.None);
            await _unitOfWork.SaveChangesAsync(CancellationToken.None);
            throw;
        }
    }

    public static WorkflowStep ResolveTarget(
        IReadOnlyList<WorkflowStep> orderedSteps,
        WorkflowReprocessSettings settings)
    {
        if (settings.TargetBlockId != null)
        {
            var chosen = MoveToNextStepCommandHandler.ResolveStepByActivityId(orderedSteps, settings.TargetBlockId);
            if (chosen == null || IsEnd(chosen))
                throw new InvalidOperationException(
                    "The stage chosen for re-initiate is no longer in this workflow. Update the End block settings.");
            return chosen;
        }

        return orderedSteps.FirstOrDefault(IsStart)
            ?? orderedSteps.FirstOrDefault(s => !IsEnd(s))
            ?? throw new InvalidOperationException("This workflow has no stage to re-initiate from.");
    }

    private static bool IsEnd(WorkflowStep step) =>
        string.Equals(step.StageType?.Trim(), "END", StringComparison.OrdinalIgnoreCase);

    private static bool IsStart(WorkflowStep step) =>
        string.Equals(step.StageType?.Trim(), "START", StringComparison.OrdinalIgnoreCase);
}

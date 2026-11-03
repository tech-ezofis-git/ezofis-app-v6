using MediatR;
using Microsoft.Extensions.Logging;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;
using SaaSApp.Workflow.Application.Workflows.Commands.StartWorkflow;
using SaaSApp.Workflow.Domain.Entities;
using SaaSApp.Workflow.Domain.Enums;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Runs a ticket that is open on a designer WORKFLOW_CONNECTOR block: starts a request in the
/// connected workflow with the parent's values copied by field label, links it as a sub-process,
/// then calls move-next along the block's connection. The parent doesn't wait for the child.
/// Everything that could stop the link is checked before the child is started, so a child is never
/// left unlinked. When the block can't run, the ticket stays on it with a comment saying why.
/// </summary>
public sealed class WorkflowConnectorRunner : IWorkflowConnectorRunner
{
    private const string CommentAuthorName = "Workflow Connector";

    private readonly IWorkflowRepository _repository;
    private readonly IWorkflowJsonStorageService _workflowJsonStorage;
    private readonly IFormJsonStorageService _formJsonStorage;
    private readonly IWorkflowLegacyMailboxSyncService _mailboxSync;
    private readonly IWorkflowEzfbFormDataLoader _ezfbFormDataLoader;
    private readonly IWorkflowSecurityService _workflowSecurity;
    private readonly IWorkflowSubProcessService _subProcesses;
    private readonly IDynamicTableRepository _dynamicTableRepository;
    private readonly ICurrentUserProvider _currentUserProvider;
    private readonly IMediator _mediator;
    private readonly ILogger<WorkflowConnectorRunner> _logger;

    public WorkflowConnectorRunner(
        IWorkflowRepository repository,
        IWorkflowJsonStorageService workflowJsonStorage,
        IFormJsonStorageService formJsonStorage,
        IWorkflowLegacyMailboxSyncService mailboxSync,
        IWorkflowEzfbFormDataLoader ezfbFormDataLoader,
        IWorkflowSecurityService workflowSecurity,
        IWorkflowSubProcessService subProcesses,
        IDynamicTableRepository dynamicTableRepository,
        ICurrentUserProvider currentUserProvider,
        IMediator mediator,
        ILogger<WorkflowConnectorRunner> logger)
    {
        _repository = repository;
        _workflowJsonStorage = workflowJsonStorage;
        _formJsonStorage = formJsonStorage;
        _mailboxSync = mailboxSync;
        _ezfbFormDataLoader = ezfbFormDataLoader;
        _workflowSecurity = workflowSecurity;
        _subProcesses = subProcesses;
        _dynamicTableRepository = dynamicTableRepository;
        _currentUserProvider = currentUserProvider;
        _mediator = mediator;
        _logger = logger;
    }

    public async Task<MoveToNextStepCommandResult?> TryRunAsync(
        Guid workflowInstanceId,
        int depth = 0,
        CancellationToken cancellationToken = default)
    {
        WorkflowInstance? instance = null;
        WorkflowStep? step = null;
        WorkflowStepInstance? stepInstance = null;
        string? childRequestNo = null;
        try
        {
            instance = await _repository.GetInstanceByIdAsync(workflowInstanceId, cancellationToken);
            if (instance == null
                || instance.Status is WorkflowInstanceStatus.Completed or WorkflowInstanceStatus.Cancelled
                || instance.CurrentStepInstanceId is not { } currentId)
                return null;

            stepInstance = instance.StepInstances.FirstOrDefault(s => s.Id == currentId);
            if (stepInstance == null
                || stepInstance.Status is not (StepInstanceStatus.InProgress or StepInstanceStatus.WaitingForApproval))
                return null;

            var workflow = await _repository.GetByIdWithStepsAsync(instance.WorkflowId, cancellationToken);
            step = workflow?.Steps.FirstOrDefault(s => s.Id == stepInstance.WorkflowStepId);
            if (workflow == null || step == null || !WorkflowStepTransitionHelper.IsConnectorStep(step))
                return null;

            if (depth >= WorkflowConditionRouter.MaxChainDepth)
                throw new WorkflowConnectorException(
                    $"more than {WorkflowConditionRouter.MaxChainDepth} automatic steps in a row (the designer may have a loop).");

            var activityId = !string.IsNullOrWhiteSpace(step.ActivityId)
                ? step.ActivityId!.Trim()
                : step.Id.ToString("D");

            var review = WorkflowStepActionsHelper.ParseActions(step.ActionsJson)
                .Select(a => a.ProceedAction?.Trim())
                .FirstOrDefault(a => !string.IsNullOrEmpty(a))
                ?? throw new WorkflowConnectorException("the block has no connection to move on along.");

            var workflowJson = await _workflowJsonStorage.GetWorkflowJsonAsync(instance.WorkflowId, cancellationToken);
            if (!WorkflowConnectorJson.TryReadTarget(workflowJson, activityId, out var targetId, step.Name))
                throw new WorkflowConnectorException("its settings were not found in the saved workflow.");
            if (targetId is not { } childWorkflowId)
                throw new WorkflowConnectorException("no connected workflow is selected.");
            if (childWorkflowId == instance.WorkflowId)
                throw new WorkflowConnectorException("a workflow can't start itself.");

            var childWorkflow = await _repository.GetByIdWithStepsAsync(childWorkflowId, cancellationToken);
            if (childWorkflow == null || childWorkflow.IsDeleted)
                throw new WorkflowConnectorException("the connected workflow no longer exists.");
            if (childWorkflow.Status != WorkflowStatus.Active)
                throw new WorkflowConnectorException($"'{childWorkflow.Name}' isn't published.");
            // Sub-processes are one level deep, so the child can't start children of its own.
            if (childWorkflow.Steps.Any(WorkflowStepTransitionHelper.IsConnectorStep))
                throw new WorkflowConnectorException(
                    $"'{childWorkflow.Name}' has its own Workflow Connector step, and sub-processes can only be one level deep.");

            var userId = _currentUserProvider.GetUserId() ?? instance.StartedBy;
            if (!await _workflowSecurity.CanAccessWorkflowAsync(instance.WorkflowId, userId, cancellationToken)
                || !await _workflowSecurity.CanAccessWorkflowAsync(childWorkflowId, userId, cancellationToken))
                throw new WorkflowConnectorException($"the user who moved the request can't access '{childWorkflow.Name}'.");
            if (await _subProcesses.IsSubProcessAsync(instance.TenantId, instance.WorkflowId, instance.Id, cancellationToken))
                throw new WorkflowConnectorException(
                    "this request is itself a sub-process, and sub-processes can only be one level deep.");

            var identity = await _mailboxSync.TryGetProcessFormIdentityAsync(
                instance.WorkflowId, instance.Id, cancellationToken);
            var formId = FirstNonBlank(identity?.FormId, workflow.FormId);
            var formEntryId = identity?.FormEntryId ?? Guid.Empty;
            var childFields = await BuildChildFieldsAsync(formId, formEntryId, childWorkflow.FormId, cancellationToken);

            var started = await _mediator.Send(
                new StartWorkflowCommand(childWorkflowId, FormDataFields: childFields.Count > 0 ? childFields : null),
                cancellationToken);
            childRequestNo = started.RequestNo;

            await _subProcesses.LinkAsync(
                instance.TenantId,
                userId,
                new WorkflowSubProcessLinkDto(instance.WorkflowId, instance.Id, childWorkflowId, started.InstanceId),
                cancellationToken);

            _logger.LogInformation(
                "Connector {StepName} ({ActivityId}) on instance {InstanceId} started {ChildRequestNo} ({ChildInstanceId}) in workflow {ChildWorkflowId}.",
                step.Name,
                activityId,
                instance.Id,
                started.RequestNo,
                started.InstanceId,
                childWorkflowId);

            return await _mediator.Send(
                new MoveToNextStepCommand(
                    instance.Id,
                    activityId,
                    Review: review,
                    Comments: $"Workflow Connector '{step.Name}': started {DescribeRequest(started.RequestNo)} in '{childWorkflow.Name}'.",
                    CommentAuthorName: CommentAuthorName,
                    FormId: formId,
                    FormEntryId: formEntryId == Guid.Empty ? null : formEntryId,
                    ConditionDepth: depth + 1),
                cancellationToken);
        }
        catch (WorkflowConnectorException ex)
        {
            if (instance != null && step != null && stepInstance != null)
                await LeaveOnConnectorAsync(instance, step, stepInstance, ex.Message, cancellationToken);
            return null;
        }
        catch (Exception ex)
        {
            // The move that opened this connector already succeeded; never fail it from here.
            _logger.LogError(ex, "Workflow Connector failed for workflow instance {InstanceId}.", workflowInstanceId);
            if (instance != null && step != null && stepInstance != null)
            {
                var why = childRequestNo == null
                    ? "an unexpected error occurred, so no request was started."
                    : $"{childRequestNo} was started but an error occurred after that, so it may not be linked to this request.";
                await LeaveOnConnectorAsync(instance, step, stepInstance, why, cancellationToken);
            }

            return null;
        }
    }

    private async Task<Dictionary<string, string>> BuildChildFieldsAsync(
        string? parentFormId,
        Guid parentFormEntryId,
        string? childFormId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(parentFormId) || parentFormEntryId == Guid.Empty || string.IsNullOrWhiteSpace(childFormId))
            return new Dictionary<string, string>();

        var parentValues = await WorkflowFormFieldValues.ResolveAsync(
            _ezfbFormDataLoader,
            parentFormId,
            parentFormEntryId,
            submittedFormDataJson: null,
            formDataFields: null,
            formLineItemsJson: null,
            cancellationToken);
        var parentFormJson = await _formJsonStorage.GetFormJsonAsync(parentFormId, cancellationToken);
        var childFormJson = await _formJsonStorage.GetFormJsonAsync(childFormId, cancellationToken);
        return WorkflowConnectorPrefill.Build(parentFormJson, parentValues, childFormJson);
    }

    private async Task LeaveOnConnectorAsync(
        WorkflowInstance instance,
        WorkflowStep step,
        WorkflowStepInstance stepInstance,
        string why,
        CancellationToken cancellationToken)
    {
        _logger.LogWarning(
            "Connector {StepName} on instance {InstanceId} did not run: {Why}",
            step.Name,
            instance.Id,
            why);
        try
        {
            var userId = _currentUserProvider.GetUserId() ?? instance.StartedBy;
            await _dynamicTableRepository.AddCommentAsync(
                instance.WorkflowId,
                instance.Id,
                $"Workflow Connector '{step.Name}' could not run automatically: {why} The request is waiting on this step until someone moves it on.",
                userId,
                stepInstance.Id,
                CommentAuthorName,
                cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not add the connector comment for instance {InstanceId}.", instance.Id);
        }
    }

    private static string DescribeRequest(string? requestNo) =>
        string.IsNullOrWhiteSpace(requestNo) ? "a request" : requestNo.Trim();

    private static string? FirstNonBlank(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))?.Trim();

    private sealed class WorkflowConnectorException(string message) : Exception(message);
}

using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Forms;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;
using SaaSApp.Workflow.Domain.Entities;
using SaaSApp.Workflow.Domain.Enums;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Routes a ticket that is open on a designer CONDITION block: checks the block's rules (standard
/// mode) or looks the ticket's values up in a master form (advanced mode), then calls move-next with
/// review SATISFIED or NOT SATISFIED -- the same way the FTL agents move a ticket after their step.
/// When the block cannot be checked, the ticket stays on it with a comment saying why.
/// </summary>
public sealed class WorkflowConditionRouter : IWorkflowConditionRouter
{
    /// <summary>Most conditions routed back to back in one chain (stops designer loops).</summary>
    public const int MaxChainDepth = 10;

    private const string CommentAuthorName = "Condition check";

    private readonly IWorkflowRepository _repository;
    private readonly IWorkflowJsonStorageService _workflowJsonStorage;
    private readonly IWorkflowLegacyMailboxSyncService _mailboxSync;
    private readonly IWorkflowEzfbFormDataLoader _ezfbFormDataLoader;
    private readonly IFormEntryService _formEntryService;
    private readonly IDynamicTableRepository _dynamicTableRepository;
    private readonly ICurrentUserProvider _currentUserProvider;
    private readonly IMediator _mediator;
    private readonly ILogger<WorkflowConditionRouter> _logger;

    public WorkflowConditionRouter(
        IWorkflowRepository repository,
        IWorkflowJsonStorageService workflowJsonStorage,
        IWorkflowLegacyMailboxSyncService mailboxSync,
        IWorkflowEzfbFormDataLoader ezfbFormDataLoader,
        IFormEntryService formEntryService,
        IDynamicTableRepository dynamicTableRepository,
        ICurrentUserProvider currentUserProvider,
        IMediator mediator,
        ILogger<WorkflowConditionRouter> logger)
    {
        _repository = repository;
        _workflowJsonStorage = workflowJsonStorage;
        _mailboxSync = mailboxSync;
        _ezfbFormDataLoader = ezfbFormDataLoader;
        _formEntryService = formEntryService;
        _dynamicTableRepository = dynamicTableRepository;
        _currentUserProvider = currentUserProvider;
        _mediator = mediator;
        _logger = logger;
    }

    public async Task<MoveToNextStepCommandResult?> TryRouteAsync(
        Guid workflowInstanceId,
        int depth = 0,
        CancellationToken cancellationToken = default)
    {
        WorkflowInstance? instance = null;
        WorkflowStep? step = null;
        WorkflowStepInstance? stepInstance = null;
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
            if (workflow == null || step == null || !WorkflowStepTransitionHelper.IsConditionStep(step))
                return null;

            if (depth >= MaxChainDepth)
            {
                await LeaveOnConditionAsync(
                    instance, step, stepInstance,
                    $"more than {MaxChainDepth} conditions in a row (the designer may have a loop).",
                    cancellationToken);
                return null;
            }

            var activityId = !string.IsNullOrWhiteSpace(step.ActivityId)
                ? step.ActivityId!.Trim()
                : step.Id.ToString("D");

            var workflowJson = await _workflowJsonStorage.GetWorkflowJsonAsync(instance.WorkflowId, cancellationToken);
            if (!WorkflowConditionJson.TryRead(workflowJson, activityId, out var config, step.Name) || config == null)
                throw new WorkflowConditionConfigException("its settings were not found in the saved workflow.");

            var identity = await _mailboxSync.TryGetProcessFormIdentityAsync(
                instance.WorkflowId, instance.Id, cancellationToken);
            var formId = FirstNonBlank(identity?.FormId, workflow.FormId)
                ?? throw new WorkflowConditionConfigException("the workflow has no form to read values from.");
            var formEntryId = identity?.FormEntryId ?? Guid.Empty;

            var values = await WorkflowFormFieldValues.ResolveAsync(
                _ezfbFormDataLoader,
                formId,
                formEntryId,
                submittedFormDataJson: null,
                formDataFields: null,
                formLineItemsJson: null,
                cancellationToken);
            IReadOnlyList<string> ValuesOf(string fieldId) => FieldValues(values, fieldId);

            var outcome = config.Standard
                ? WorkflowConditionEvaluator.Evaluate(config, ValuesOf)
                : await EvaluateMasterAsync(config, ValuesOf, cancellationToken);

            if (!WorkflowStepActionsHelper.HasMatchingAction(step, outcome.Review))
            {
                throw new WorkflowConditionConfigException(
                    $"the result is {outcome.Review} but the block has no {outcome.Review} connection.");
            }

            _logger.LogInformation(
                "Condition {StepName} ({ActivityId}) on instance {InstanceId}: {Review}. {Reason}",
                step.Name,
                activityId,
                instance.Id,
                outcome.Review,
                outcome.Reason);

            return await _mediator.Send(
                new MoveToNextStepCommand(
                    instance.Id,
                    activityId,
                    Review: outcome.Review,
                    Comments: $"Condition '{step.Name}': {(outcome.Satisfied ? "Satisfied" : "Not satisfied")}. {outcome.Reason}",
                    CommentAuthorName: CommentAuthorName,
                    FormId: formId,
                    FormEntryId: formEntryId == Guid.Empty ? null : formEntryId,
                    ConditionDepth: depth + 1),
                cancellationToken);
        }
        catch (WorkflowConditionConfigException ex)
        {
            if (instance != null && step != null && stepInstance != null)
                await LeaveOnConditionAsync(instance, step, stepInstance, ex.Message, cancellationToken);
            return null;
        }
        catch (WorkflowDynamicAssignmentException ex)
        {
            if (instance != null && step != null && stepInstance != null)
                await LeaveOnConditionAsync(instance, step, stepInstance, ex.Message, cancellationToken);
            return null;
        }
        catch (Exception ex)
        {
            // The move that opened this condition already succeeded; never fail it from here.
            _logger.LogError(ex, "Condition routing failed for workflow instance {InstanceId}.", workflowInstanceId);
            if (instance != null && step != null && stepInstance != null)
                await LeaveOnConditionAsync(instance, step, stepInstance, "an unexpected error occurred.", cancellationToken);
            return null;
        }
    }

    /// <summary>
    /// Advanced mode: SATISFIED when the master form has a row whose mapped columns all equal the
    /// ticket's values for the mapped fields.
    /// </summary>
    private async Task<WorkflowConditionOutcome> EvaluateMasterAsync(
        WorkflowConditionConfig config,
        Func<string, IReadOnlyList<string>> valuesOf,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(config.MasterFormId))
            throw new WorkflowConditionConfigException("no master form is selected.");
        if (config.MasterMappings.Count == 0)
            throw new WorkflowConditionConfigException("the master form has no field mappings.");

        var pairs = new List<(string FieldId, string Column, string Value)>();
        foreach (var mapping in config.MasterMappings)
        {
            if (string.IsNullOrWhiteSpace(mapping.FieldId) || string.IsNullOrWhiteSpace(mapping.MasterColumnId))
                throw new WorkflowConditionConfigException("a master form mapping is missing its field or column.");

            var value = valuesOf(mapping.FieldId.Trim()).FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))?.Trim();
            if (string.IsNullOrEmpty(value))
                return new WorkflowConditionOutcome(false, $"{mapping.FieldId.Trim()} is empty, so no master row can match.");

            pairs.Add((mapping.FieldId.Trim(), mapping.MasterColumnId.Trim(), value));
        }

        var first = pairs[0];
        var filters = pairs.Skip(1)
            .Select(p => new FormEntryColumnFilter(ColumnId: p.Column, ColumnValue: p.Value))
            .ToList();
        var lookup = await _formEntryService.GetEntriesByColumnAsync(
            config.MasterFormId,
            columnName: null,
            columnValue: first.Value,
            filters: filters,
            columnId: first.Column,
            cancellationToken: cancellationToken);

        var matchText = string.Join(", ", pairs.Select(p => $"{p.Column} = '{p.Value}'"));
        return lookup.Status switch
        {
            FormEntryByColumnStatus.Found when lookup.Entries is { Count: > 0 } =>
                new WorkflowConditionOutcome(true, $"Master form row found for {matchText}."),
            FormEntryByColumnStatus.Found or FormEntryByColumnStatus.NotFound =>
                new WorkflowConditionOutcome(false, $"No master form row for {matchText}."),
            _ => throw new WorkflowConditionConfigException(
                $"the master form lookup failed ({lookup.Message ?? lookup.Status.ToString()}).")
        };
    }

    /// <summary>
    /// A control's value, or one value per row for a table column (rows are JSON arrays of objects
    /// keyed by column name / jsonId). Empty when the field has no value.
    /// </summary>
    public static IReadOnlyList<string> FieldValues(IReadOnlyDictionary<string, string> values, string fieldId)
    {
        if (WorkflowFormFieldValues.TryGetMappedValue(values, fieldId, out var direct))
            return [direct];

        var compact = WorkflowFormFieldValues.Compact(fieldId);
        var rows = new List<string>();
        foreach (var raw in values.Values)
        {
            var trimmed = raw?.Trim();
            if (string.IsNullOrEmpty(trimmed) || !trimmed.StartsWith('['))
                continue;
            try
            {
                using var doc = JsonDocument.Parse(trimmed);
                foreach (var row in doc.RootElement.EnumerateArray())
                {
                    if (row.ValueKind != JsonValueKind.Object)
                        continue;
                    foreach (var cell in row.EnumerateObject())
                    {
                        if (!string.Equals(cell.Name, fieldId, StringComparison.OrdinalIgnoreCase)
                            && WorkflowFormFieldValues.Compact(cell.Name) != compact)
                            continue;
                        var text = WorkflowFormFieldValues.FlattenJsonValue(cell.Value);
                        if (!string.IsNullOrWhiteSpace(text))
                            rows.Add(text);
                        break;
                    }
                }
            }
            catch (JsonException)
            {
            }
        }

        return rows;
    }

    private async Task LeaveOnConditionAsync(
        WorkflowInstance instance,
        WorkflowStep step,
        WorkflowStepInstance stepInstance,
        string why,
        CancellationToken cancellationToken)
    {
        _logger.LogWarning(
            "Condition {StepName} on instance {InstanceId} was not checked automatically: {Why}",
            step.Name,
            instance.Id,
            why);
        try
        {
            var userId = _currentUserProvider.GetUserId() ?? instance.StartedBy;
            await _dynamicTableRepository.AddCommentAsync(
                instance.WorkflowId,
                instance.Id,
                $"Condition '{step.Name}' could not be checked automatically: {why} The request is waiting on this step until someone moves it on.",
                userId,
                stepInstance.Id,
                CommentAuthorName,
                cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not add the condition comment for instance {InstanceId}.", instance.Id);
        }
    }

    private static string? FirstNonBlank(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))?.Trim();
}

using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Forms;
using SaaSApp.Workflow.Application.Workflows;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// When a completed step's designer settings have <c>endSync.enabled</c> and
/// <c>target: MASTER_FORM</c>, copies the mapped workflow form values onto the master form
/// identified by <c>masterFormId</c> -- inserting a new row, or updating the one row matching the
/// mapping marked <c>isMainField</c> (the master form's unique key). Never fails the move: any
/// error here is logged and swallowed, same as the existing Quantics/HANA post-move hooks.
/// </summary>
public sealed class WorkflowEndSyncService : IWorkflowEndSyncService
{
    private readonly IWorkflowJsonStorageService _workflowJsonStorage;
    private readonly IWorkflowEzfbFormDataLoader _ezfbFormDataLoader;
    private readonly IFormEntryService _formEntryService;
    private readonly ILogger<WorkflowEndSyncService> _logger;

    public WorkflowEndSyncService(
        IWorkflowJsonStorageService workflowJsonStorage,
        IWorkflowEzfbFormDataLoader ezfbFormDataLoader,
        IFormEntryService formEntryService,
        ILogger<WorkflowEndSyncService> logger)
    {
        _workflowJsonStorage = workflowJsonStorage;
        _ezfbFormDataLoader = ezfbFormDataLoader;
        _formEntryService = formEntryService;
        _logger = logger;
    }

    public async Task TrySyncOnStepCompleteAsync(
        Guid workflowId,
        Guid instanceId,
        string activityId,
        string? workflowFormId,
        Guid? workflowFormEntryId,
        string? submittedFormDataJson,
        IReadOnlyDictionary<string, string>? formDataFields,
        CancellationToken cancellationToken = default,
        string? stepName = null,
        string? formLineItemsJson = null)
    {
        if (string.IsNullOrWhiteSpace(activityId) || string.IsNullOrWhiteSpace(workflowFormId))
            return;

        var formEntryId = workflowFormEntryId is { } entry && entry != Guid.Empty ? entry : Guid.Empty;

        try
        {
            var workflowJson = await _workflowJsonStorage.GetWorkflowJsonAsync(workflowId, cancellationToken);
            if (!WorkflowEndSyncJson.TryRead(workflowJson, activityId, out var config, stepName) || config is null)
            {
                _logger.LogDebug(
                    "End-sync skipped: activity {ActivityId} on workflow {WorkflowId} has no enabled endSync in the designer JSON.",
                    activityId,
                    workflowId);
                return;
            }

            if (!config.Enabled
                || !string.Equals(config.Target, "MASTER_FORM", StringComparison.OrdinalIgnoreCase)
                || string.IsNullOrWhiteSpace(config.MasterFormId)
                || config.FieldMappings.Count == 0)
            {
                _logger.LogInformation(
                    "End-sync skipped: activity {ActivityId} on workflow {WorkflowId} is not an enabled MASTER_FORM endSync.",
                    activityId,
                    workflowId);
                return;
            }

            // Step 1: the condition fields are the mappings marked IsMainField (the designer allows
            // several) -- together they identify which master-form row this sync applies to.
            // Without one, there is no row to find; nothing to do (never fall back to inserting
            // with no match criteria).
            var mainMappings = config.FieldMappings
                .Where(m => m.IsMainField)
                .DistinctBy(m => m.MasterFieldId, StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (mainMappings.Count == 0)
            {
                _logger.LogInformation(
                    "End-sync: no field is marked IsMainField on workflow {WorkflowId} activity {ActivityId}; skipped.",
                    workflowId,
                    activityId);
                return;
            }

            var values = await WorkflowFormFieldValues.ResolveAsync(
                _ezfbFormDataLoader,
                workflowFormId,
                formEntryId,
                submittedFormDataJson,
                formDataFields,
                formLineItemsJson,
                cancellationToken);

            // Step 2: the workflow's current value for every condition field. A partial key could
            // update the wrong row (or insert a duplicate), so a blank main field skips the sync.
            var matchValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var mainMapping in mainMappings)
            {
                if (!WorkflowFormFieldValues.TryGetMappedValue(values, mainMapping.WorkflowFieldId, out var raw)
                    || NormalizeMatchValue(raw) is not { Length: > 0 } matchValue)
                {
                    _logger.LogInformation(
                        "End-sync: condition field {WorkflowFieldId} has no value on workflow {WorkflowId} instance {InstanceId}; skipped.",
                        mainMapping.WorkflowFieldId,
                        workflowId,
                        instanceId);
                    return;
                }

                matchValues[mainMapping.MasterFieldId] = matchValue;
            }

            // Include the main fields too. Matching uses MatchColumnId/MatchValue (+ MatchFilters);
            // the write still needs the key on insert, otherwise a new row is created without the
            // id and the existing master row never changes. Main fields are written in the same
            // normalised form they are matched with, so the next sync finds the row again.
            var fields = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
            var skipped = new List<string>();
            foreach (var mapping in config.FieldMappings)
            {
                if (matchValues.TryGetValue(mapping.MasterFieldId, out var key))
                {
                    fields[mapping.MasterFieldId] = JsonSerializer.SerializeToElement(key);
                    continue;
                }

                if (!WorkflowFormFieldValues.TryGetMappedValue(values, mapping.WorkflowFieldId, out var value)
                    || string.IsNullOrWhiteSpace(value))
                {
                    skipped.Add($"{mapping.WorkflowFieldId}->{mapping.MasterFieldId}");
                    continue;
                }

                fields[mapping.MasterFieldId] = JsonSerializer.SerializeToElement(value);
            }

            if (fields.Count == 0)
            {
                _logger.LogInformation(
                    "End-sync: no mapped field values resolved for workflow {WorkflowId} instance {InstanceId}; skipped mappings: {Skipped}.",
                    workflowId,
                    instanceId,
                    string.Join(", ", skipped));
                return;
            }

            var primaryKey = mainMappings[0].MasterFieldId;
            var extraKeys = mainMappings
                .Skip(1)
                .Select(m => new FormEntryColumnFilter(ColumnId: m.MasterFieldId, ColumnValue: matchValues[m.MasterFieldId]))
                .ToList();
            var request = new FormEntryUpsertByColumnsRequest(
                fields,
                MatchColumn: null,
                MatchColumnId: primaryKey,
                MatchValue: matchValues[primaryKey],
                MatchFilters: extraKeys.Count > 0 ? extraKeys : null);

            _logger.LogInformation(
                "End-sync upsert payload for workflow {WorkflowId} instance {InstanceId}: {Payload}",
                workflowId,
                instanceId,
                SerializeUpsertPayload(config.MasterFormId, request, skipped));

            var result = await _formEntryService.UpsertEntryByColumnsAsync(
                config.MasterFormId,
                request,
                cancellationToken);

            _logger.LogInformation(
                "End-sync to master form {MasterFormId} for workflow {WorkflowId} instance {InstanceId}: {Status} {Message} (match {MatchKeys}, fields={FieldCount})",
                config.MasterFormId,
                workflowId,
                instanceId,
                result.Status,
                result.Message,
                string.Join(", ", matchValues.Select(kv => $"{kv.Key}={kv.Value}")),
                fields.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "End-sync to master form failed for workflow {WorkflowId} instance {InstanceId} activity {ActivityId}.",
                workflowId,
                instanceId,
                activityId);
        }
    }

    /// <summary>
    /// Trims and collapses runs of whitespace (newlines, tabs, NBSP from extracted text) to one
    /// space, the same way the master lookup normalises the stored column.
    /// </summary>
    internal static string NormalizeMatchValue(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : Regex.Replace(value, @"[\s ​]+", " ").Trim();

    private static string SerializeUpsertPayload(
        string? masterFormId,
        FormEntryUpsertByColumnsRequest request,
        IReadOnlyList<string> skipped)
    {
        var fields = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        if (request.Fields != null)
        {
            foreach (var (key, value) in request.Fields)
                fields[key] = WorkflowFormFieldValues.FlattenJsonValue(value);
        }

        return JsonSerializer.Serialize(new
        {
            masterFormId,
            matchColumnId = request.MatchColumnId,
            matchValue = request.MatchValue,
            matchFilters = request.MatchFilters,
            fields,
            skipped
        });
    }
}

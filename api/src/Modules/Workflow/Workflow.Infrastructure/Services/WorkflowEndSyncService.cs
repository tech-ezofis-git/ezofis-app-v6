using System.Linq;
using System.Text.Json;
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
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(activityId) || string.IsNullOrWhiteSpace(workflowFormId))
            return;

        var formEntryId = workflowFormEntryId is { } entry && entry != Guid.Empty ? entry : Guid.Empty;

        try
        {
            var workflowJson = await _workflowJsonStorage.GetWorkflowJsonAsync(workflowId, cancellationToken);
            if (!WorkflowEndSyncJson.TryRead(workflowJson, activityId, out var config) || config is null)
                return;

            if (!config.Enabled
                || !string.Equals(config.Target, "MASTER_FORM", StringComparison.OrdinalIgnoreCase)
                || string.IsNullOrWhiteSpace(config.MasterFormId)
                || config.FieldMappings.Count == 0)
                return;

            // Step 1: the condition field is the mapping marked IsMainField -- it identifies which
            // master-form row this sync applies to. Without one, there is no row to find; nothing
            // to do (never fall back to inserting with no match criteria).
            var mainMapping = config.FieldMappings.FirstOrDefault(m => m.IsMainField);
            if (mainMapping == null)
            {
                _logger.LogInformation(
                    "End-sync: no field is marked IsMainField on workflow {WorkflowId} activity {ActivityId}; skipped.",
                    workflowId,
                    activityId);
                return;
            }

            var values = await ResolveWorkflowFieldValuesAsync(
                workflowFormId, formEntryId, submittedFormDataJson, formDataFields, cancellationToken);

            // Step 2: the workflow's current value for the condition field.
            if (!TryGetMappedValue(values, mainMapping.WorkflowFieldId, out var matchValue)
                || string.IsNullOrWhiteSpace(matchValue))
            {
                _logger.LogInformation(
                    "End-sync: condition field {WorkflowFieldId} has no value on workflow {WorkflowId} instance {InstanceId}; skipped.",
                    mainMapping.WorkflowFieldId,
                    workflowId,
                    instanceId);
                return;
            }

            // Include the main field too. Matching uses MatchColumnId/MatchValue; the write
            // still needs the key on insert, otherwise a new row is created without the id
            // and the existing master row never changes.
            var fields = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
            foreach (var mapping in config.FieldMappings)
            {
                if (!TryGetMappedValue(values, mapping.WorkflowFieldId, out var value)
                    || string.IsNullOrWhiteSpace(value))
                    continue;

                fields[mapping.MasterFieldId] = JsonSerializer.SerializeToElement(value);
            }

            if (fields.Count == 0)
            {
                _logger.LogInformation(
                    "End-sync: no mapped field values resolved for workflow {WorkflowId} instance {InstanceId}; skipped.",
                    workflowId,
                    instanceId);
                return;
            }

            var request = new FormEntryUpsertByColumnsRequest(
                fields,
                MatchColumn: null,
                MatchColumnId: mainMapping.MasterFieldId,
                MatchValue: matchValue);

            var result = await _formEntryService.UpsertEntryByColumnsAsync(
                config.MasterFormId,
                request,
                cancellationToken);

            _logger.LogInformation(
                "End-sync to master form {MasterFormId} for workflow {WorkflowId} instance {InstanceId}: {Status} {Message} (match {MatchKey}={MatchValue}, fields={FieldCount})",
                config.MasterFormId,
                workflowId,
                instanceId,
                result.Status,
                result.Message,
                mainMapping.MasterFieldId,
                matchValue,
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
    /// jsonId-keyed field values for the ticket's own form entry: starts from the persisted
    /// ezfb row (freshest after this move's writes), then layers any values submitted with this
    /// move-next call that may not have been persisted yet.
    /// </summary>
    private async Task<Dictionary<string, string>> ResolveWorkflowFieldValuesAsync(
        string workflowFormId,
        Guid workflowFormEntryId,
        string? submittedFormDataJson,
        IReadOnlyDictionary<string, string>? formDataFields,
        CancellationToken cancellationToken)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (workflowFormEntryId != Guid.Empty)
        {
            var persistedJson = await _ezfbFormDataLoader.LoadFormDataJsonAsync(
                workflowFormId, workflowFormEntryId, cancellationToken);
            MergeJsonObject(values, persistedJson);
        }

        MergeJsonObject(values, submittedFormDataJson);

        if (formDataFields != null)
        {
            foreach (var (key, value) in formDataFields)
            {
                if (!string.IsNullOrWhiteSpace(value))
                    values[key] = value;
            }
        }

        return values;
    }

    private static bool TryGetMappedValue(
        IReadOnlyDictionary<string, string> values,
        string fieldId,
        out string value)
    {
        value = "";
        if (string.IsNullOrWhiteSpace(fieldId))
            return false;
        if (values.TryGetValue(fieldId, out var found) && !string.IsNullOrWhiteSpace(found))
        {
            value = found;
            return true;
        }

        var compact = Compact(fieldId);
        foreach (var (key, mapped) in values)
        {
            if (string.IsNullOrWhiteSpace(mapped))
                continue;
            if (Compact(key) == compact)
            {
                value = mapped;
                return true;
            }
        }

        return false;
    }

    private static string Compact(string value) =>
        new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

    private static void MergeJsonObject(Dictionary<string, string> values, string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return;

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return;

            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                var text = prop.Value.ValueKind switch
                {
                    JsonValueKind.String => prop.Value.GetString(),
                    JsonValueKind.Number => prop.Value.GetRawText(),
                    JsonValueKind.True or JsonValueKind.False => prop.Value.GetRawText(),
                    _ => null
                };
                if (!string.IsNullOrWhiteSpace(text))
                    values[prop.Name] = text;
            }
        }
        catch (JsonException)
        {
            // Not a flat jsonId->value object (e.g. nested table JSON) -- skip, mappings
            // only apply to simple scalar fields.
        }
    }
}

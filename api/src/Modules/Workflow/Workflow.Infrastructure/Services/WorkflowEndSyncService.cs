using System.Globalization;
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
                workflowFormId,
                formEntryId,
                submittedFormDataJson,
                formDataFields,
                formLineItemsJson,
                cancellationToken);

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

            await ApplyBudgetRemainingAsync(
                config.MasterFormId!,
                mainMapping,
                matchValue,
                config.FieldMappings,
                values,
                fields,
                cancellationToken);

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
        string? formLineItemsJson,
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
        MergeLineItems(values, formLineItemsJson);

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

    private async Task ApplyBudgetRemainingAsync(
        string masterFormId,
        WorkflowEndSyncFieldMapping mainMapping,
        string matchValue,
        IReadOnlyList<WorkflowEndSyncFieldMapping> mappings,
        IReadOnlyDictionary<string, string> values,
        Dictionary<string, JsonElement> fields,
        CancellationToken cancellationToken)
    {
        if (!TryGetAmount(values, out var amount) || amount == 0)
            return;

        foreach (var mapping in mappings)
        {
            if (!IsBudgetMoneyField(mapping.MasterFieldId) && !IsBudgetMoneyField(mapping.WorkflowFieldId))
                continue;

            var current = await TryReadMasterNumberAsync(
                masterFormId,
                mainMapping.MasterFieldId,
                matchValue,
                mapping.MasterFieldId,
                cancellationToken);
            if (current is null
                && fields.TryGetValue(mapping.MasterFieldId, out var mappedEl)
                && TryParseNumber(FlattenJsonValue(mappedEl), out var mappedNumber))
                current = mappedNumber;
            if (current is null
                && TryGetMappedValue(values, mapping.WorkflowFieldId, out var workflowBudget)
                && TryParseNumber(workflowBudget, out var workflowNumber))
                current = workflowNumber;
            if (current is null)
                continue;

            var remaining = current.Value - amount;
            fields[mapping.MasterFieldId] = JsonSerializer.SerializeToElement(
                remaining.ToString(CultureInfo.InvariantCulture));
        }
    }

    private async Task<decimal?> TryReadMasterNumberAsync(
        string masterFormId,
        string matchColumnId,
        string matchValue,
        string budgetFieldId,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _formEntryService.GetEntriesByColumnAsync(
                masterFormId,
                matchColumnId,
                matchValue,
                columnId: matchColumnId,
                cancellationToken: cancellationToken);
            var row = result.Entries?.FirstOrDefault();
            if (row is null)
                return null;

            var compact = Compact(budgetFieldId);
            foreach (var (key, raw) in row)
            {
                if (Compact(key) != compact && !key.Equals(budgetFieldId, StringComparison.OrdinalIgnoreCase))
                    continue;
                if (TryParseNumber(FlattenText(raw?.ToString()), out var number))
                    return number;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(
                ex,
                "End-sync: could not read current master {BudgetField} for match {MatchKey}={MatchValue}.",
                budgetFieldId,
                matchColumnId,
                matchValue);
        }

        return null;
    }

    private static bool TryGetMappedValue(
        IReadOnlyDictionary<string, string> values,
        string fieldId,
        out string value)
    {
        value = "";
        if (string.IsNullOrWhiteSpace(fieldId))
            return false;
        if (values.TryGetValue(fieldId, out var found))
        {
            var flattened = FlattenText(found);
            if (!string.IsNullOrWhiteSpace(flattened))
            {
                value = flattened;
                return true;
            }
        }

        var compact = Compact(fieldId);
        foreach (var (key, mapped) in values)
        {
            var flattened = FlattenText(mapped);
            if (string.IsNullOrWhiteSpace(flattened))
                continue;
            if (Compact(key) == compact)
            {
                value = flattened;
                return true;
            }
        }

        return false;
    }

    private static bool TryGetAmount(IReadOnlyDictionary<string, string> values, out decimal amount)
    {
        amount = 0;
        foreach (var (key, raw) in values)
        {
            if (!IsAmountField(key))
                continue;
            if (TryParseNumber(FlattenText(raw), out amount) && amount != 0)
                return true;
            if (TrySumTableAmounts(raw, out amount) && amount != 0)
                return true;
        }

        decimal tableSum = 0;
        var anyTable = false;
        var seenTables = new HashSet<string>(StringComparer.Ordinal);
        foreach (var raw in values.Values)
        {
            if (string.IsNullOrWhiteSpace(raw) || !seenTables.Add(raw.Trim()))
                continue;
            if (!TrySumTableAmounts(raw, out var part) || part == 0)
                continue;
            tableSum += part;
            anyTable = true;
        }

        if (anyTable)
        {
            amount = tableSum;
            return true;
        }

        return false;
    }

    private static bool TrySumTableAmounts(string? raw, out decimal sum)
    {
        sum = 0;
        if (string.IsNullOrWhiteSpace(raw))
            return false;
        var trimmed = raw.Trim();
        if (!trimmed.StartsWith('[') && !trimmed.StartsWith('{'))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(trimmed);
            return TrySumJsonAmounts(doc.RootElement, out sum);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool TrySumJsonAmounts(JsonElement element, out decimal sum)
    {
        sum = 0;
        var any = false;
        switch (element.ValueKind)
        {
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                {
                    if (!TrySumJsonAmounts(item, out var part) || part == 0)
                        continue;
                    sum += part;
                    any = true;
                }
                return any;
            case JsonValueKind.Object:
                foreach (var prop in element.EnumerateObject())
                {
                    if (IsAmountField(prop.Name) && TryParseNumber(FlattenJsonValue(prop.Value), out var fieldAmount))
                    {
                        sum += fieldAmount;
                        any = true;
                        continue;
                    }

                    if (prop.Value.ValueKind is JsonValueKind.Array or JsonValueKind.Object
                        && TrySumJsonAmounts(prop.Value, out var nested)
                        && nested != 0)
                    {
                        sum += nested;
                        any = true;
                    }
                }
                return any;
            default:
                return false;
        }
    }

    private static bool IsAmountField(string fieldId)
    {
        var compact = Compact(fieldId);
        return compact is "amount" or "total" or "totalamount" or "requestamount"
            or "requestedamount" or "invoiceamount" or "claimedamount" or "expenseamount"
            or "netamount" or "grandtotal" or "totalcost" or "lineamount" or "totallineamount";
    }

    private static bool IsBudgetMoneyField(string fieldId)
    {
        var compact = Compact(fieldId);
        return compact is "budget" or "availablebudget" or "remainingbudget"
            or "totalbudget" or "budgetamount" or "budgetbalance" or "currentbudget";
    }

    private static bool TryParseNumber(string? text, out decimal value)
    {
        value = 0;
        if (string.IsNullOrWhiteSpace(text))
            return false;
        var cleaned = text.Replace(",", "", StringComparison.Ordinal).Trim();
        return decimal.TryParse(cleaned, NumberStyles.Number, CultureInfo.InvariantCulture, out value);
    }

    private static string Compact(string value) =>
        new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

    private static void MergeLineItems(Dictionary<string, string> values, string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return;

        var trimmed = json.Trim();
        if (trimmed.StartsWith('['))
        {
            values["__lineItems"] = trimmed;
            return;
        }

        MergeJsonObject(values, trimmed);
    }

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
                var text = prop.Value.ValueKind == JsonValueKind.Array
                    ? prop.Value.GetRawText()
                    : FlattenJsonValue(prop.Value);
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

    private static string FlattenText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return "";
        var trimmed = text.Trim();
        if ((trimmed.StartsWith('{') && trimmed.EndsWith('}'))
            || (trimmed.StartsWith('[') && trimmed.EndsWith(']')))
        {
            try
            {
                using var doc = JsonDocument.Parse(trimmed);
                return FlattenJsonValue(doc.RootElement);
            }
            catch (JsonException)
            {
            }
        }

        return trimmed;
    }

    private static string FlattenJsonValue(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                return "";
            case JsonValueKind.String:
                return FlattenText(element.GetString());
            case JsonValueKind.Number:
            case JsonValueKind.True:
            case JsonValueKind.False:
                return element.GetRawText();
            case JsonValueKind.Array:
                return string.Join(
                    ", ",
                    element.EnumerateArray()
                        .Select(FlattenJsonValue)
                        .Where(v => !string.IsNullOrWhiteSpace(v)));
            case JsonValueKind.Object:
                foreach (var name in new[] { "amount", "value", "name", "label", "text", "displayName", "title" })
                {
                    foreach (var prop in element.EnumerateObject())
                    {
                        if (!prop.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                            continue;
                        var nested = FlattenJsonValue(prop.Value);
                        if (!string.IsNullOrWhiteSpace(nested))
                            return nested;
                    }
                }

                return string.Join(
                    ", ",
                    element.EnumerateObject()
                        .Select(p => FlattenJsonValue(p.Value))
                        .Where(v => !string.IsNullOrWhiteSpace(v)));
            default:
                return element.ToString();
        }
    }
}

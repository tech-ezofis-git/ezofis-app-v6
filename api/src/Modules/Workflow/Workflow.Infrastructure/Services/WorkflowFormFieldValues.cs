using System.Text.Json;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Reads a ticket's own form values (jsonId-keyed) for designer features that act on them:
/// Data Integration end-sync and condition blocks.
/// </summary>
public static class WorkflowFormFieldValues
{
    /// <summary>
    /// jsonId-keyed field values for the ticket's own form entry: starts from the persisted
    /// ezfb row (freshest after this move's writes), then layers any values submitted with this
    /// move-next call that may not have been persisted yet.
    /// </summary>
    public static async Task<Dictionary<string, string>> ResolveAsync(
        IWorkflowEzfbFormDataLoader ezfbFormDataLoader,
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
            var persistedJson = await ezfbFormDataLoader.LoadFormDataJsonAsync(
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

    public static bool TryGetMappedValue(
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


    public static string Compact(string value) =>
        new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

    public static void MergeLineItems(Dictionary<string, string> values, string? json)
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

    public static void MergeJsonObject(Dictionary<string, string> values, string? json)
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

    public static string FlattenText(string? text)
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

    public static string FlattenJsonValue(JsonElement element)
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

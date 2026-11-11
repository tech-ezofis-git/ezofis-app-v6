using System.Text.Json;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>
/// The first few filled-in values of a child request's form, in form order, for the inbox preview
/// line under a sub-process (the same kind of line the main request card shows). Layout-only
/// controls, tables and structured (JSON) values are left out.
/// </summary>
public static class WorkflowSubProcessPreview
{
    public const int DefaultMaxFields = 4;

    private static readonly HashSet<string> SkippedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "DIVIDER", "LABEL", "PARAGRAPH", "FILE", "SIGNATURE", "IMAGE", "TABLE", "DYNAMIC_TABLE"
    };

    public static IReadOnlyList<WorkflowSubProcessPreviewFieldDto> Build(
        string? formJson,
        IReadOnlyDictionary<string, string> values,
        int maxFields = DefaultMaxFields)
    {
        var result = new List<WorkflowSubProcessPreviewFieldDto>();
        foreach (var field in WorkflowConnectorPrefill.ReadFields(formJson))
        {
            if (result.Count >= maxFields)
                break;
            if (SkippedTypes.Contains(field.Type) || field.IsTable)
                continue;
            if (!values.TryGetValue(field.Id, out var raw) || string.IsNullOrWhiteSpace(raw))
                continue;

            var value = raw.Trim();
            // Structured values (lookups, lists) are not a single readable value.
            if (value.StartsWith('{') || value.StartsWith('['))
                continue;

            result.Add(new WorkflowSubProcessPreviewFieldDto(field.Label, value));
        }

        return result;
    }
}

using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>Which SLA form entry a request gets, and how it was found.</summary>
public sealed record WorkflowSlaRulePick(string? EntryId, string Source, string? Value)
{
    public const string FromValue = "value";
    public const string FromDefault = "default";
    public const string NoRule = "none";
}

/// <summary>
/// Custom Setup, "It depends on the request": a value in the request picks the SLA form entry, by the
/// selected record (<see cref="MethodColumn"/>), a list set in the settings (<see cref="MethodMap"/>) or
/// the same name (<see cref="MethodSameName"/>). When nothing is found the default entry is used.
/// </summary>
public static class WorkflowSlaRuleSelector
{
    public const string MethodColumn = "column";
    public const string MethodMap = "map";
    public const string MethodSameName = "sameName";

    public static bool IsKnownMethod(string? method) =>
        method is MethodColumn or MethodMap or MethodSameName;

    /// <summary>Compared without case or extra spaces.</summary>
    public static string Normalize(string? text) =>
        string.Join(' ', (text ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToLowerInvariant();

    /// <param name="selection">The saved choice.</param>
    /// <param name="values">The request field's values (one for a dropdown, several for a multi-select).</param>
    /// <param name="entryNames">SLA form entries: id to name.</param>
    /// <param name="recordRules">Selected record's rule cell for each value (column method only).</param>
    public static WorkflowSlaRulePick Select(
        WorkflowSlaSelectionDto selection,
        IReadOnlyList<string> values,
        IReadOnlyDictionary<string, string> entryNames,
        IReadOnlyDictionary<string, string>? recordRules = null)
    {
        foreach (var value in values.Where(v => !string.IsNullOrWhiteSpace(v)))
        {
            var entryId = selection.Method switch
            {
                MethodMap => FromMap(selection, value),
                MethodSameName => FindEntry(value, entryNames),
                MethodColumn => recordRules != null && recordRules.TryGetValue(value, out var cell)
                    ? FindEntry(cell, entryNames)
                    : null,
                _ => null
            };
            if (!string.IsNullOrWhiteSpace(entryId))
                return new WorkflowSlaRulePick(entryId, WorkflowSlaRulePick.FromValue, value);
        }

        var first = values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
        return string.IsNullOrWhiteSpace(selection.DefaultEntryId)
            ? new WorkflowSlaRulePick(null, WorkflowSlaRulePick.NoRule, first)
            : new WorkflowSlaRulePick(selection.DefaultEntryId!.Trim(), WorkflowSlaRulePick.FromDefault, first);
    }

    private static string? FromMap(WorkflowSlaSelectionDto selection, string value)
    {
        var target = Normalize(value);
        return selection.ValueRules?
            .FirstOrDefault(r => Normalize(r.Value) == target && !string.IsNullOrWhiteSpace(r.EntryId))?
            .EntryId?.Trim();
    }

    /// <summary>A cell may hold the entry's id or its name. Names are not case sensitive.</summary>
    public static string? FindEntry(string? text, IReadOnlyDictionary<string, string> entryNames)
    {
        var value = text?.Trim();
        if (string.IsNullOrEmpty(value))
            return null;
        if (entryNames.ContainsKey(value))
            return value;

        var target = Normalize(value);
        foreach (var (id, name) in entryNames)
        {
            if (Normalize(name) == target)
                return id;
        }

        return null;
    }
}

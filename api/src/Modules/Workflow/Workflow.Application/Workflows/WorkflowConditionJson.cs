using System.Text.Json;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>One standard-mode rule: <c>settings.conditions.condition[]</c>.</summary>
/// <param name="FieldId">Form field jsonId the rule reads (designer key <c>name</c>).</param>
/// <param name="Logic">Operator id, e.g. <c>IS_GREATER_THAN</c>.</param>
/// <param name="Value">Compare value, or another field's jsonId when <paramref name="ValueIsField"/>.</param>
/// <param name="ValueIsField">Designer key <c>fieldValue</c>: compare with another field instead of a fixed value.</param>
public sealed record WorkflowConditionRule(
    string? FieldId,
    string? Logic,
    string? Value,
    bool ValueIsField);

/// <summary>One advanced-mode mapping: <c>settings.masterConditions.condition[]</c>.</summary>
public sealed record WorkflowConditionMasterMapping(
    string? FieldId,
    string? MasterColumnId);

/// <summary>A condition block's designer settings.</summary>
/// <param name="Standard">True = rules (<see cref="Rules"/>); false = master form lookup (<see cref="MasterMappings"/>).</param>
/// <param name="MatchAll">Group logic: ALL (true) or ANY (false).</param>
public sealed record WorkflowConditionConfig(
    bool Standard,
    bool MatchAll,
    IReadOnlyList<WorkflowConditionRule> Rules,
    string? MasterFormId,
    IReadOnlyList<WorkflowConditionMasterMapping> MasterMappings);

/// <summary>
/// Reads a CONDITION block's settings from workflow designer JSON:
/// <c>standardCondition</c>, <c>conditions</c> (groupLogic + rules) and <c>masterConditions</c>.
/// Also accepts the duplicate keys the designer writes (<c>logicCombine</c>, top-level <c>masterFormId</c>).
/// </summary>
public static class WorkflowConditionJson
{
    public static bool TryRead(
        string? workflowJson,
        string blockId,
        out WorkflowConditionConfig? config,
        string? stepName = null)
    {
        config = null;
        if (string.IsNullOrWhiteSpace(workflowJson) || string.IsNullOrWhiteSpace(blockId))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(workflowJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return false;

            if (!WorkflowEndSyncJson.TryGetArray(doc.RootElement, out var blocks, "Blocks", "blocks"))
                return false;

            foreach (var block in blocks.EnumerateArray())
            {
                if (block.ValueKind != JsonValueKind.Object
                    || !WorkflowEndSyncJson.BlockMatches(block, blockId, stepName))
                    continue;

                if (!WorkflowEndSyncJson.TryGetObject(block, out var settings, "Settings", "settings")
                    && !WorkflowEndSyncJson.TryGetObject(block, out settings, "data", "Data"))
                    return false;

                config = Parse(settings);
                return true;
            }
        }
        catch (JsonException)
        {
            return false;
        }

        return false;
    }

    private static WorkflowConditionConfig Parse(JsonElement settings)
    {
        var standard = WorkflowEndSyncJson.ReadBool(settings, "standardCondition", "StandardCondition") ?? true;

        string? groupLogic = null;
        var rules = new List<WorkflowConditionRule>();
        if (TryGetObjectOrJsonString(settings, out var conditions, "conditions", "Conditions"))
        {
            groupLogic = WorkflowEndSyncJson.ReadString(conditions, "groupLogic", "GroupLogic");
            if (WorkflowEndSyncJson.TryGetArray(conditions, out var ruleArray, "condition", "Condition"))
            {
                foreach (var r in ruleArray.EnumerateArray())
                {
                    if (r.ValueKind != JsonValueKind.Object)
                        continue;
                    rules.Add(new WorkflowConditionRule(
                        WorkflowEndSyncJson.ReadString(r, "name", "Name"),
                        WorkflowEndSyncJson.ReadString(r, "logic", "Logic"),
                        ReadRawValue(r, "value", "Value"),
                        WorkflowEndSyncJson.ReadBool(r, "fieldValue", "FieldValue") ?? false));
                }
            }
        }

        groupLogic ??= WorkflowEndSyncJson.ReadString(settings, "logicCombine", "LogicCombine");
        var matchAll = !string.Equals(groupLogic, "ANY", StringComparison.OrdinalIgnoreCase);

        string? masterFormId = null;
        var mappings = new List<WorkflowConditionMasterMapping>();
        if (TryGetObjectOrJsonString(settings, out var master, "masterConditions", "MasterConditions"))
        {
            masterFormId = NonZero(WorkflowEndSyncJson.ReadString(master, "masterFormId", "MasterFormId"));
            if (WorkflowEndSyncJson.TryGetArray(master, out var mappingArray, "condition", "Condition"))
            {
                foreach (var m in mappingArray.EnumerateArray())
                {
                    if (m.ValueKind != JsonValueKind.Object)
                        continue;
                    mappings.Add(new WorkflowConditionMasterMapping(
                        WorkflowEndSyncJson.ReadString(m, "field", "Field"),
                        WorkflowEndSyncJson.ReadString(m, "masterColumn", "MasterColumn")));
                }
            }
        }

        // The designer also writes the chosen master form at settings.masterFormId.
        masterFormId ??= NonZero(WorkflowEndSyncJson.ReadString(settings, "masterFormId", "MasterFormId"));

        return new WorkflowConditionConfig(standard, matchAll, rules, masterFormId, mappings);
    }

    /// <summary>Older saves store <c>conditions</c> as a JSON string; the designer parses either shape.</summary>
    private static bool TryGetObjectOrJsonString(JsonElement parent, out JsonElement child, params string[] names)
    {
        if (WorkflowEndSyncJson.TryGetObject(parent, out child, names))
            return true;

        foreach (var name in names)
        {
            if (!parent.TryGetProperty(name, out var raw) || raw.ValueKind != JsonValueKind.String)
                continue;
            try
            {
                using var nested = JsonDocument.Parse(raw.GetString() ?? "");
                if (nested.RootElement.ValueKind == JsonValueKind.Object)
                {
                    child = nested.RootElement.Clone();
                    return true;
                }
            }
            catch (JsonException)
            {
            }
        }

        child = default;
        return false;
    }

    /// <summary>Rule values may be text, numbers, or arrays/objects (any-of lists, date ranges).</summary>
    private static string? ReadRawValue(JsonElement obj, params string[] names)
    {
        foreach (var name in names)
        {
            if (!obj.TryGetProperty(name, out var el))
                continue;
            return el.ValueKind switch
            {
                JsonValueKind.String => el.GetString(),
                JsonValueKind.Null or JsonValueKind.Undefined => null,
                _ => el.GetRawText()
            };
        }

        return null;
    }

    private static string? NonZero(string? id) =>
        string.IsNullOrWhiteSpace(id) || id.Trim() == "0" ? null : id.Trim();
}

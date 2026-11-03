using System.Text.Json;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>
/// Reads a WORKFLOW_CONNECTOR block's target from workflow designer JSON:
/// <c>Blocks[].Settings.subWorkflowId</c>, the V6 GUID of the workflow to start.
/// </summary>
public static class WorkflowConnectorJson
{
    public const string BlockType = "WORKFLOW_CONNECTOR";

    /// <summary>
    /// False when the block isn't in the JSON. True with a null <paramref name="targetWorkflowId"/>
    /// when the block has no target, or a target that isn't a V6 workflow id (V5 used numbers).
    /// </summary>
    public static bool TryReadTarget(
        string? workflowJson,
        string blockId,
        out Guid? targetWorkflowId,
        string? stepName = null)
    {
        targetWorkflowId = null;
        if (string.IsNullOrWhiteSpace(workflowJson) || string.IsNullOrWhiteSpace(blockId))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(workflowJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object
                || !WorkflowEndSyncJson.TryGetArray(doc.RootElement, out var blocks, "Blocks", "blocks"))
                return false;

            foreach (var block in blocks.EnumerateArray())
            {
                if (block.ValueKind != JsonValueKind.Object
                    || !WorkflowEndSyncJson.BlockMatches(block, blockId, stepName))
                    continue;

                if ((WorkflowEndSyncJson.TryGetObject(block, out var settings, "Settings", "settings")
                     || WorkflowEndSyncJson.TryGetObject(block, out settings, "data", "Data"))
                    && TryGetString(settings, out var raw, "subWorkflowId", "SubWorkflowId")
                    && Guid.TryParse(raw, out var id)
                    && id != Guid.Empty)
                    targetWorkflowId = id;
                return true;
            }
        }
        catch (JsonException)
        {
            return false;
        }

        return false;
    }

    private static bool TryGetString(JsonElement element, out string? value, params string[] names)
    {
        value = null;
        foreach (var name in names)
        {
            if (!element.TryGetProperty(name, out var prop))
                continue;
            value = prop.ValueKind switch
            {
                JsonValueKind.String => prop.GetString()?.Trim(),
                JsonValueKind.Number => prop.GetRawText(),
                _ => null,
            };
            return !string.IsNullOrEmpty(value);
        }

        return false;
    }
}

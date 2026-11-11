using System.Text.Json;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>
/// The End block's "Reprocess Request" setting (<c>settings.reprocess</c> in the workflow JSON):
/// whether a finished request can be re-initiated, and the stage it restarts from.
/// No stage means the start of the workflow.
/// </summary>
public sealed record WorkflowReprocessSettings(bool Enabled, string? TargetBlockId)
{
    public static readonly WorkflowReprocessSettings Disabled = new(false, null);

    /// <summary>Reads the setting from the End block with this id; anything missing means off.</summary>
    public static WorkflowReprocessSettings Read(string? workflowJson, string? endBlockId)
    {
        if (string.IsNullOrWhiteSpace(workflowJson) || string.IsNullOrWhiteSpace(endBlockId))
            return Disabled;

        try
        {
            using var document = JsonDocument.Parse(workflowJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object
                || !TryGet(document.RootElement, "blocks", out var blocks)
                || blocks.ValueKind != JsonValueKind.Array)
                return Disabled;

            foreach (var block in blocks.EnumerateArray())
            {
                if (block.ValueKind != JsonValueKind.Object
                    || !TryGet(block, "id", out var id)
                    || !string.Equals(id.ToString(), endBlockId.Trim(), StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!TryGet(block, "settings", out var settings)
                    || settings.ValueKind != JsonValueKind.Object
                    || !TryGet(settings, "reprocess", out var reprocess)
                    || reprocess.ValueKind != JsonValueKind.Object
                    || !TryGet(reprocess, "enabled", out var enabled)
                    || enabled.ValueKind != JsonValueKind.True)
                    return Disabled;

                var target = TryGet(reprocess, "targetBlockId", out var value)
                    && value.ValueKind == JsonValueKind.String
                    && !string.IsNullOrWhiteSpace(value.GetString())
                        ? value.GetString()!.Trim()
                        : null;
                return new WorkflowReprocessSettings(true, target);
            }
        }
        catch (JsonException)
        {
            return Disabled;
        }

        return Disabled;
    }

    private static bool TryGet(JsonElement element, string name, out JsonElement value)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }
}

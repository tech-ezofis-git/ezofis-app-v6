using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>
/// Validates designer <c>SlaSettings</c> (workflow-level and per block) before the workflow JSON is persisted.
/// Throws <see cref="InvalidOperationException"/> so controllers return the usual 400 <c>{ error }</c>.
/// </summary>
public static class WorkflowSlaSettingsValidator
{
    public const string ModeStandard = "standard";
    public const string ModeAdvanced = "advanced";
    public const string EscalateToUser = "user";
    public const string EscalateToStage = "stage";

    private static readonly HashSet<string> DurationUnits = new(StringComparer.OrdinalIgnoreCase) { "minutes", "hours", "days" };

    // Designer node kinds that are a person's stage (matches isSlaStageNode in the builder). The first
    // Manual User of a workflow is saved as a START block, so START counts when it is one of these.
    private static readonly HashSet<string> HumanStageToolTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "manual_user", "manual user", "verifier", "actor", "internal_actor"
    };

    public static void Validate(WorkflowJsonDto? json)
    {
        if (json == null)
            return;

        var errors = new List<string>();

        if (json.Settings?.SlaSettings is { } workflowSla)
            ValidateConfiguration(workflowSla, "Workflow SLA", blockId: null, json.Blocks, errors);

        foreach (var block in json.Blocks ?? [])
        {
            if (block.Settings?.SlaSettings is not { } blockSla)
                continue;

            var label = string.IsNullOrWhiteSpace(block.Settings.Label) ? block.Id : block.Settings.Label;
            ValidateConfiguration(blockSla, $"SLA for '{label}'", block.Id, json.Blocks, errors);
        }

        if (errors.Count > 0)
            throw new InvalidOperationException(string.Join(" ", errors));
    }

    private static void ValidateConfiguration(
        WorkflowSlaConfigurationDto sla,
        string scopeLabel,
        string? blockId,
        List<WorkflowBlockDto>? blocks,
        List<string> errors)
    {
        var isBlockScope = blockId != null;
        var mode = sla.Mode?.Trim();
        var rules = sla.Rules ?? [];

        if (string.Equals(mode, ModeAdvanced, StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(sla.SlaMasterId))
                errors.Add($"{scopeLabel}: select an SLA Master for Advanced mode.");
            if (rules.Count > 0)
                errors.Add($"{scopeLabel}: Advanced mode must not contain Standard rules.");
            return;
        }

        if (!string.Equals(mode, ModeStandard, StringComparison.OrdinalIgnoreCase))
        {
            errors.Add($"{scopeLabel}: mode must be 'standard' or 'advanced'.");
            return;
        }

        if (!string.IsNullOrWhiteSpace(sla.SlaMasterId))
            errors.Add($"{scopeLabel}: Standard mode must not reference an SLA Master.");

        var seenIds = new HashSet<string>(StringComparer.Ordinal);
        for (var i = 0; i < rules.Count; i++)
        {
            var rule = rules[i];
            var ruleLabel = string.IsNullOrWhiteSpace(rule.Name)
                ? $"{scopeLabel} rule {i + 1}"
                : $"{scopeLabel} rule '{rule.Name.Trim()}'";

            if (string.IsNullOrWhiteSpace(rule.Id))
                errors.Add($"{ruleLabel}: id is required.");
            else if (!seenIds.Add(rule.Id))
                errors.Add($"{ruleLabel}: duplicate rule id '{rule.Id}'.");

            if (string.IsNullOrWhiteSpace(rule.Name))
                errors.Add($"{ruleLabel}: name is required.");

            if (rule.Duration is not > 0)
                errors.Add($"{ruleLabel}: duration must be greater than zero.");

            if (string.IsNullOrWhiteSpace(rule.DurationUnit) || !DurationUnits.Contains(rule.DurationUnit))
                errors.Add($"{ruleLabel}: duration unit must be minutes, hours or days.");

            if (rule.NotifyUserIds?.Any(string.IsNullOrWhiteSpace) == true)
                errors.Add($"{ruleLabel}: notify users contain an empty id.");

            var hasRecipients = rule.NotifyUserIds?.Count > 0 || rule.Initiator == true;
            var channels = rule.Channels ?? sla.Notifications;
            var notifies = hasRecipients && (channels?.Email != false || channels?.Sms == true);
            var escalates = !string.IsNullOrWhiteSpace(rule.EscalateTo?.Type);
            if (!notifies && !escalates)
                errors.Add($"{ruleLabel}: choose who to notify (with Email or SMS) or an escalation.");

            if (!isBlockScope)
            {
                if (rule.EscalateTo != null)
                    errors.Add($"{ruleLabel}: the workflow SLA does not support Escalate To.");
                continue;
            }

            ValidateEscalation(rule.EscalateTo, ruleLabel, blockId!, blocks, errors);
        }
    }

    private static void ValidateEscalation(
        WorkflowSlaEscalationDto? escalation,
        string ruleLabel,
        string blockId,
        List<WorkflowBlockDto>? blocks,
        List<string> errors)
    {
        var type = escalation?.Type?.Trim();
        if (escalation == null || string.IsNullOrEmpty(type))
        {
            // No escalation chosen: no target may be left behind.
            if (!string.IsNullOrWhiteSpace(escalation?.UserId) || !string.IsNullOrWhiteSpace(escalation?.StageId))
                errors.Add($"{ruleLabel}: choose User or Stage for the escalation target.");
            return;
        }

        if (string.Equals(type, EscalateToUser, StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(escalation.UserId))
                errors.Add($"{ruleLabel}: select the user to escalate to.");
            if (!string.IsNullOrWhiteSpace(escalation.StageId))
                errors.Add($"{ruleLabel}: a user escalation must not also reference a stage.");
            return;
        }

        if (string.Equals(type, EscalateToStage, StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrWhiteSpace(escalation.UserId))
                errors.Add($"{ruleLabel}: a stage escalation must not also reference a user.");

            if (string.IsNullOrWhiteSpace(escalation.StageId))
            {
                errors.Add($"{ruleLabel}: select the stage to escalate to.");
                return;
            }

            if (string.Equals(escalation.StageId, blockId, StringComparison.Ordinal))
            {
                errors.Add($"{ruleLabel}: a stage cannot escalate to itself.");
                return;
            }

            var target = blocks?.FirstOrDefault(b => string.Equals(b.Id, escalation.StageId, StringComparison.Ordinal));
            if (target == null || !IsEscalationStage(target))
                errors.Add($"{ruleLabel}: escalation stage '{escalation.StageId}' is not a stage of this workflow.");
            return;
        }

        errors.Add($"{ruleLabel}: Escalate To must be 'user' or 'stage'.");
    }

    /// <summary>
    /// Any stage, including END (moving there completes the ticket). START only when it is a person's
    /// stage, not a Gmail/Outlook/form trigger.
    /// </summary>
    private static bool IsEscalationStage(WorkflowBlockDto block)
    {
        if (!string.Equals(block.Type, "START", StringComparison.OrdinalIgnoreCase))
            return true;
        var toolType = block.Settings?.ToolType?.Trim();
        return !string.IsNullOrEmpty(toolType) && HumanStageToolTypes.Contains(toolType);
    }
}

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
    public const string EscalateToGroup = "group";

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

        // Business hours (workflow main settings): SLA deadlines count working time only.
        errors.AddRange(WorkflowBusinessCalendar.Validate(json.Settings?.General?.SlaSettings));

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
            if (!string.IsNullOrWhiteSpace(sla.MasterFieldId)
                && string.IsNullOrWhiteSpace(sla.EntryId)
                && sla.MasterEntries is not { Count: > 0 })
                errors.Add($"{scopeLabel}: choose the SLA Master value (entry) for the selected field.");
            ValidateMasterEntries(sla, scopeLabel, errors);
            if (sla.AdvancedRules?.Count > 0 || sla.FieldMapping != null)
            {
                if (isBlockScope)
                    errors.Add($"{scopeLabel}: Advanced SLA rules are set in the workflow settings, not on a stage.");
                else
                    ValidateAdvanced(sla, scopeLabel, blocks, errors);
            }
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

    public const string StrategyFirst = "first";
    public const string StrategyShortest = "shortest";
    public const string StrategyLongest = "longest";
    public const string StrategyEach = "each";
    public const string BreachNotify = "notify";
    public const string BreachReassign = "reassign";
    public const string BreachStage = "stage";

    private static readonly HashSet<string> Strategies = new(StringComparer.OrdinalIgnoreCase)
    {
        StrategyFirst, StrategyShortest, StrategyLongest, StrategyEach
    };

    private static readonly HashSet<string> BreachTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "", "none", BreachNotify, BreachReassign, BreachStage
    };

    private static readonly HashSet<string> BreachOn = new(StringComparer.OrdinalIgnoreCase)
    {
        "", "response", "resolution", "both"
    };

    private static readonly HashSet<string> Operators = new(StringComparer.OrdinalIgnoreCase)
    {
        "IS_EQUALS_TO", "IS_NOT_EQUALS_TO", "CONTAINS", "NOT_CONTAINS", "IS_ANY_OF", "IS_NOT_ANY_OF",
        "IS_GREATER_THAN", "IS_GREATER_THAN_OR_EQUALS_TO", "IS_LESSER_THAN", "IS_LESSER_THAN_OR_EQUALS_TO",
        "IS_EMPTY", "IS_NOT_EMPTY", "STARTS_WITH", "ENDS_WITH"
    };

    /// <summary>Each SLA Master row needs an entry and something to do at its time.</summary>
    private static void ValidateMasterEntries(WorkflowSlaConfigurationDto sla, string scopeLabel, List<string> errors)
    {
        var rows = sla.MasterEntries ?? [];
        var seen = new HashSet<string>(StringComparer.Ordinal);
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var label = $"{scopeLabel} SLA Master row {i + 1}";
            if (string.IsNullOrWhiteSpace(row.Id))
                errors.Add($"{label}: id is required.");
            else if (!seen.Add(row.Id))
                errors.Add($"{label}: duplicate row id '{row.Id}'.");
            if (string.IsNullOrWhiteSpace(row.EntryId))
                errors.Add($"{label}: choose an SLA Master entry.");
            if (row.Notify != true && row.Escalate != true)
                errors.Add($"{label}: choose Notify, Escalate or both.");
        }
    }

    /// <summary>Advanced SLA in the workflow settings: SLA Master field mapping, rules and their actions.</summary>
    private static void ValidateAdvanced(
        WorkflowSlaConfigurationDto sla,
        string scopeLabel,
        List<WorkflowBlockDto>? blocks,
        List<string> errors)
    {
        var mapping = sla.FieldMapping;
        if (string.IsNullOrWhiteSpace(mapping?.ResolutionDuration) || string.IsNullOrWhiteSpace(mapping.ResolutionUnit))
            errors.Add($"{scopeLabel}: map the SLA Master's Resolution time and Resolution type fields.");

        if (!string.IsNullOrWhiteSpace(sla.ResponseStageId))
        {
            if (string.IsNullOrWhiteSpace(mapping?.ResponseDuration) || string.IsNullOrWhiteSpace(mapping.ResponseUnit))
                errors.Add($"{scopeLabel}: map the SLA Master's Response time and Response type fields, or clear the response stage.");
            if (blocks?.Any(b => string.Equals(b.Id, sla.ResponseStageId, StringComparison.Ordinal)) != true)
                errors.Add($"{scopeLabel}: response stage '{sla.ResponseStageId}' is not a stage of this workflow.");
        }

        var rules = sla.AdvancedRules ?? [];
        var seen = new HashSet<string>(StringComparer.Ordinal);
        for (var i = 0; i < rules.Count; i++)
        {
            var rule = rules[i];
            var label = string.IsNullOrWhiteSpace(rule.Name)
                ? $"{scopeLabel} advanced rule {i + 1}"
                : $"{scopeLabel} advanced rule '{rule.Name.Trim()}'";

            if (string.IsNullOrWhiteSpace(rule.Id))
                errors.Add($"{label}: id is required.");
            else if (!seen.Add(rule.Id))
                errors.Add($"{label}: duplicate rule id '{rule.Id}'.");
            if (string.IsNullOrWhiteSpace(rule.Name))
                errors.Add($"{label}: name is required.");
            if (rule.EntryIds is not { Count: > 0 } || rule.EntryIds.Any(string.IsNullOrWhiteSpace))
                errors.Add($"{label}: select at least one SLA Master entry.");
            if (rule.EntryIds?.Count > 1 && !Strategies.Contains(rule.EntryStrategy?.Trim() ?? ""))
                errors.Add($"{label}: choose how to use several entries (first, shortest, longest or each).");
            if (rule.ReminderMinutes is < 0)
                errors.Add($"{label}: the reminder must be zero or more minutes.");

            foreach (var condition in rule.Conditions ?? [])
            {
                var op = condition.Logic?.Trim().ToUpperInvariant() ?? "";
                if (string.IsNullOrWhiteSpace(condition.FieldId))
                    errors.Add($"{label}: a condition has no field selected.");
                if (!Operators.Contains(op))
                    errors.Add($"{label}: '{condition.Logic}' is not a supported operator.");
                else if (op is not ("IS_EMPTY" or "IS_NOT_EMPTY") && string.IsNullOrWhiteSpace(condition.Value))
                    errors.Add($"{label}: a condition on '{condition.FieldId}' needs a value.");
            }

            var action = rule.BreachAction;
            var type = action?.Type?.Trim() ?? "";
            if (!BreachTypes.Contains(type))
            {
                errors.Add($"{label}: breach action must be notify, reassign or stage.");
                continue;
            }

            if (!BreachOn.Contains(action?.On?.Trim() ?? ""))
                errors.Add($"{label}: the breach action must run on response, resolution or both.");
            if (string.Equals(type, BreachReassign, StringComparison.OrdinalIgnoreCase)
                && string.IsNullOrWhiteSpace(mapping?.EscalationUsers))
                errors.Add($"{label}: map the SLA Master's Escalate field to reassign on breach.");
            if (string.Equals(type, BreachStage, StringComparison.OrdinalIgnoreCase))
            {
                var target = blocks?.FirstOrDefault(b => string.Equals(b.Id, action!.StageId, StringComparison.Ordinal));
                if (string.IsNullOrWhiteSpace(action!.StageId))
                    errors.Add($"{label}: select the stage to move to on breach.");
                else if (target == null || !IsEscalationStage(target))
                    errors.Add($"{label}: stage '{action.StageId}' is not a stage of this workflow.");
            }
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
            if (!string.IsNullOrWhiteSpace(escalation?.UserId)
                || !string.IsNullOrWhiteSpace(escalation?.StageId)
                || !string.IsNullOrWhiteSpace(escalation?.GroupId))
                errors.Add($"{ruleLabel}: choose User, Group or Stage for the escalation target.");
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

        if (string.Equals(type, EscalateToGroup, StringComparison.OrdinalIgnoreCase))
        {
            if (!Guid.TryParse(escalation.GroupId, out _))
                errors.Add($"{ruleLabel}: select the group to escalate to.");
            if (!string.IsNullOrWhiteSpace(escalation.UserId) || !string.IsNullOrWhiteSpace(escalation.StageId))
                errors.Add($"{ruleLabel}: a group escalation must not also reference a user or stage.");
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

        errors.Add($"{ruleLabel}: Escalate To must be 'user', 'group' or 'stage'.");
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

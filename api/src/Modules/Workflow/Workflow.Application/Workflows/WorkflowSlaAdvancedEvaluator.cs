using System.Globalization;
using System.Text.Json;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>One SLA target picked for a request: a rule, its SLA Master entry, and that entry's values and deadlines.</summary>
public sealed record WorkflowSlaAdvancedTarget(
    string RuleId,
    string RuleName,
    string EntryId,
    string EntryName,
    decimal? ResponseDuration,
    string? ResponseUnit,
    DateTime? ResponseDueUtc,
    decimal? ResolutionDuration,
    string? ResolutionUnit,
    DateTime? ResolutionDueUtc,
    IReadOnlyList<string> NotifyUsers,
    IReadOnlyList<string> EscalationUsers);

/// <summary>Rules checked in order, the targets picked, and why — for the runtime log and the preview.</summary>
public sealed record WorkflowSlaAdvancedResult(
    IReadOnlyList<WorkflowSlaAdvancedTarget> Targets,
    IReadOnlyList<string> Log,
    IReadOnlyList<string> Errors)
{
    public bool Matched => Targets.Count > 0;
}

/// <summary>
/// Advanced SLA: picks SLA Master entries for a request and computes their deadlines.
/// <list type="number">
/// <item>Enabled rules sorted by priority (then their order); each rule's conditions are checked
/// against the request's form values with the condition-block operators (<see cref="WorkflowConditionEvaluator"/>).</item>
/// <item>A matching rule's entries are read through the field mapping (stable jsonIds); several entries
/// are resolved by the rule's strategy: first, shortest / longest resolution, or each separately.</item>
/// <item>Stop after match ends the evaluation; otherwise lower rules are checked too.</item>
/// <item>No match: the fallback entry when one is set, else no SLA (the reason is logged).</item>
/// </list>
/// A missing or invalid entry / mapped value is reported as an error for that entry, never replaced
/// by another entry.
/// </summary>
public static class WorkflowSlaAdvancedEvaluator
{
    public const string FallbackRuleId = "fallback";

    public static WorkflowSlaAdvancedResult Evaluate(
        WorkflowSlaConfigurationDto sla,
        Func<string, IReadOnlyList<string>> valuesOf,
        IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> entries,
        DateTime startedAtUtc,
        WorkflowBusinessCalendar? calendar,
        bool withResponse)
    {
        var log = new List<string>();
        var errors = new List<string>();
        var targets = new List<WorkflowSlaAdvancedTarget>();
        var mapping = sla.FieldMapping ?? new WorkflowSlaFieldMappingDto();

        var rules = (sla.AdvancedRules ?? [])
            .Select((rule, index) => (Rule: rule, Index: index))
            .Where(x => x.Rule.Enabled != false)
            .OrderBy(x => x.Rule.Priority ?? int.MaxValue)
            .ThenBy(x => x.Index)
            .Select(x => x.Rule)
            .ToList();
        if (rules.Count == 0)
            log.Add("No enabled rules.");

        foreach (var rule in rules)
        {
            var name = string.IsNullOrWhiteSpace(rule.Name) ? rule.Id ?? "rule" : rule.Name.Trim();
            WorkflowConditionOutcome outcome;
            try
            {
                outcome = MatchRule(rule, valuesOf);
            }
            catch (WorkflowConditionConfigException ex)
            {
                errors.Add($"Rule '{name}': {ex.Message}");
                continue;
            }

            log.Add($"Rule '{name}': {(outcome.Satisfied ? "matched" : "not matched")} ({outcome.Reason}).");
            if (!outcome.Satisfied)
                continue;

            var candidates = new List<WorkflowSlaAdvancedTarget>();
            foreach (var entryId in rule.EntryIds ?? [])
            {
                var target = ReadEntry(rule.Id ?? "", name, entryId, mapping, entries, startedAtUtc, calendar, withResponse, errors);
                if (target != null)
                    candidates.Add(target);
            }

            var picked = Pick(rule.EntryStrategy, candidates);
            foreach (var target in picked)
            {
                if (targets.Any(t => t.RuleId == target.RuleId && t.EntryId == target.EntryId))
                    continue;
                targets.Add(target);
                log.Add($"Rule '{name}': uses entry '{target.EntryName}'.");
            }

            if (picked.Count == 0)
                log.Add($"Rule '{name}': none of its entries has usable SLA values.");
            if (rule.StopAfterMatch == true)
            {
                log.Add($"Rule '{name}': stop after match.");
                break;
            }
        }

        if (targets.Count == 0)
        {
            if (!string.IsNullOrWhiteSpace(sla.FallbackEntryId))
            {
                var fallback = ReadEntry(FallbackRuleId, "Fallback", sla.FallbackEntryId!, mapping, entries, startedAtUtc, calendar, withResponse, errors);
                if (fallback != null)
                {
                    targets.Add(fallback);
                    log.Add($"No rule matched: fallback entry '{fallback.EntryName}'.");
                }
            }
            else
            {
                log.Add("No rule matched and no fallback entry is set: no SLA for this request.");
            }
        }

        return new WorkflowSlaAdvancedResult(targets, log, errors);
    }

    private static WorkflowConditionOutcome MatchRule(WorkflowSlaAdvancedRuleDto rule, Func<string, IReadOnlyList<string>> valuesOf)
    {
        var conditions = (rule.Conditions ?? [])
            .Select(c => new WorkflowConditionRule(c.FieldId, c.Logic, c.Value, ValueIsField: false))
            .ToList();
        if (conditions.Count == 0)
            return new WorkflowConditionOutcome(true, "no conditions");

        var config = new WorkflowConditionConfig(true, rule.MatchAll != false, conditions, null, []);
        return WorkflowConditionEvaluator.Evaluate(config, valuesOf);
    }

    /// <summary>first: the first usable entry in the rule's order; shortest / longest: by resolution (then response) deadline; each: all.</summary>
    private static List<WorkflowSlaAdvancedTarget> Pick(string? strategy, List<WorkflowSlaAdvancedTarget> candidates)
    {
        if (candidates.Count <= 1)
            return candidates;

        static DateTime Key(WorkflowSlaAdvancedTarget t) => t.ResolutionDueUtc ?? t.ResponseDueUtc ?? DateTime.MaxValue;
        return strategy?.Trim().ToLowerInvariant() switch
        {
            WorkflowSlaSettingsValidator.StrategyEach => candidates,
            WorkflowSlaSettingsValidator.StrategyShortest => [candidates.OrderBy(Key).First()],
            WorkflowSlaSettingsValidator.StrategyLongest => [candidates.OrderByDescending(Key).First()],
            _ => [candidates[0]]
        };
    }

    private static WorkflowSlaAdvancedTarget? ReadEntry(
        string ruleId,
        string ruleName,
        string entryId,
        WorkflowSlaFieldMappingDto mapping,
        IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> entries,
        DateTime startedAtUtc,
        WorkflowBusinessCalendar? calendar,
        bool withResponse,
        List<string> errors)
    {
        if (!entries.TryGetValue(entryId, out var entry))
        {
            errors.Add($"Rule '{ruleName}': SLA Master entry {entryId} was not found (deleted or disabled).");
            return null;
        }

        var entryName = Text(entry, mapping.Name) ?? entryId;
        var label = $"Rule '{ruleName}', entry '{entryName}'";

        var resolution = ReadTarget(entry, mapping.ResolutionDuration, mapping.ResolutionUnit, "Resolution", label, startedAtUtc, calendar, errors);
        (decimal Duration, string Unit, DateTime Due)? response = withResponse
            ? ReadTarget(entry, mapping.ResponseDuration, mapping.ResponseUnit, "Response", label, startedAtUtc, calendar, errors)
            : null;
        if (resolution == null && response == null)
            return null;

        return new WorkflowSlaAdvancedTarget(
            ruleId,
            ruleName,
            entryId,
            entryName,
            response?.Duration,
            response?.Unit,
            response?.Due,
            resolution?.Duration,
            resolution?.Unit,
            resolution?.Due,
            UserValues(entry, mapping.NotifyUsers),
            UserValues(entry, mapping.EscalationUsers));
    }

    private static (decimal Duration, string Unit, DateTime Due)? ReadTarget(
        IReadOnlyDictionary<string, object?> entry,
        string? durationField,
        string? unitField,
        string what,
        string label,
        DateTime startedAtUtc,
        WorkflowBusinessCalendar? calendar,
        List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(durationField) || string.IsNullOrWhiteSpace(unitField))
            return null;

        var durationText = Text(entry, durationField);
        var unitText = Text(entry, unitField);
        if (!decimal.TryParse(durationText, NumberStyles.Number, CultureInfo.InvariantCulture, out var duration) || duration <= 0)
        {
            errors.Add($"{label}: {what} time '{durationText ?? "empty"}' is not a number greater than zero.");
            return null;
        }

        var unit = WorkflowBusinessCalendar.NormalizeUnit(unitText);
        if (unit == null)
        {
            errors.Add($"{label}: {what} type '{unitText ?? "empty"}' must be minutes, hours or days.");
            return null;
        }

        var due = WorkflowBusinessCalendar.DueAt(startedAtUtc, duration, unit, calendar);
        return due is { } d ? (duration, unit, d) : null;
    }

    /// <summary>A mapped value as text; arrays (multi-select) are joined with commas.</summary>
    public static string? Text(IReadOnlyDictionary<string, object?> entry, string? fieldId)
    {
        if (string.IsNullOrWhiteSpace(fieldId) || !entry.TryGetValue(fieldId.Trim(), out var value) || value == null)
            return null;

        var text = value switch
        {
            JsonElement { ValueKind: JsonValueKind.Array } array => string.Join(",", array.EnumerateArray().Select(ElementText)),
            JsonElement element => ElementText(element),
            IEnumerable<object?> list when value is not string => string.Join(",", list.Select(v => Convert.ToString(v, CultureInfo.InvariantCulture))),
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString()
        };
        return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }

    /// <summary>
    /// A user field's values: user ids or emails, from a single value, a comma list, a JSON array, or
    /// objects carrying an id / value / email.
    /// </summary>
    public static IReadOnlyList<string> UserValues(IReadOnlyDictionary<string, object?> entry, string? fieldId)
    {
        var text = Text(entry, fieldId);
        if (string.IsNullOrWhiteSpace(text))
            return [];

        var trimmed = text.Trim();
        if (trimmed.StartsWith('[') || trimmed.StartsWith('{'))
        {
            try
            {
                using var doc = JsonDocument.Parse(trimmed);
                var items = doc.RootElement.ValueKind == JsonValueKind.Array
                    ? doc.RootElement.EnumerateArray().ToList()
                    : [doc.RootElement];
                return items.Select(UserText).Where(v => !string.IsNullOrWhiteSpace(v)).Select(v => v!).Distinct().ToList();
            }
            catch (JsonException)
            {
            }
        }

        return trimmed.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string? UserText(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Object)
            return ElementText(element);
        foreach (var name in new[] { "id", "userId", "value", "email" })
        {
            if (element.TryGetProperty(name, out var property) && property.ValueKind is JsonValueKind.String or JsonValueKind.Number)
                return ElementText(property);
        }

        return null;
    }

    private static string ElementText(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.String => element.GetString() ?? "",
        JsonValueKind.Number => element.GetRawText(),
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        JsonValueKind.Null or JsonValueKind.Undefined => "",
        _ => element.GetRawText()
    };
}

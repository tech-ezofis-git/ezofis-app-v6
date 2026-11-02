using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Pure SLA timing rules used by <see cref="WorkflowSlaTimerService"/>: when each Standard rule is due
/// for a ticket and which channels it uses. Durations run on calendar time from when the ticket
/// reached the stage (response SLA) or was created (resolution SLA).
/// </summary>
internal static class WorkflowSlaSchedule
{
    internal static bool IsActiveStandard(WorkflowSlaConfigurationDto? sla) =>
        sla != null
        && string.Equals(sla.Mode?.Trim(), WorkflowSlaSettingsValidator.ModeStandard, StringComparison.OrdinalIgnoreCase)
        && sla.Rules?.Any(r => ToDuration(r) != null) == true;

    internal static TimeSpan? ToDuration(WorkflowSlaConfigurationRuleDto rule)
    {
        if (rule.Duration is not > 0 || string.IsNullOrWhiteSpace(rule.Id))
            return null;

        var value = (double)rule.Duration.Value;
        return rule.DurationUnit?.Trim().ToLowerInvariant() switch
        {
            "minutes" => TimeSpan.FromMinutes(value),
            "hours" => TimeSpan.FromHours(value),
            "days" => TimeSpan.FromDays(value),
            _ => null
        };
    }

    /// <summary>
    /// One timer per valid rule, due <c>startedAtUtc + duration</c>, earliest first — so levels fire in order
    /// (e.g. 30 min → email, 1 h → SMS, 2 h → move stage).
    /// </summary>
    internal static IReadOnlyList<(string RuleId, DateTime DueAtUtc)> Timers(
        WorkflowSlaConfigurationDto sla,
        DateTime startedAtUtc) =>
        (sla.Rules ?? [])
            .Select(rule => (Rule: rule, Duration: ToDuration(rule)))
            .Where(x => x.Duration != null)
            .OrderBy(x => x.Duration)
            .Select(x => (x.Rule.Id!, startedAtUtc + x.Duration!.Value))
            .ToList();

    internal static WorkflowSlaConfigurationRuleDto? FindRule(WorkflowSlaConfigurationDto? sla, string ruleId) =>
        sla?.Rules?.FirstOrDefault(r => string.Equals(r.Id, ruleId, StringComparison.Ordinal));

    /// <summary>
    /// Hash of a workflow's Standard SLA settings only (stage SLAs and the resolution SLA). Saving other
    /// parts of the workflow keeps it, so the time the SLA was set stays the same.
    /// </summary>
    internal static string Fingerprint(WorkflowJsonDto json)
    {
        var stages = (json.Blocks ?? [])
            .Where(b => IsActiveStandard(b.Settings?.SlaSettings))
            .OrderBy(b => b.Id, StringComparer.Ordinal)
            .Select(b => new { b.Id, Sla = b.Settings!.SlaSettings });
        var resolution = IsActiveStandard(json.Settings?.SlaSettings) ? json.Settings!.SlaSettings : null;
        var text = JsonSerializer.Serialize(new { stages, resolution });
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)));
    }

    /// <summary>
    /// SLA applies to tickets that reached the stage (or were created) after the SLA was set, so saving
    /// an SLA never notifies about tickets that were already waiting.
    /// </summary>
    internal static bool AppliesTo(DateTime arrivedAtUtc, DateTime? slaSinceUtc) =>
        slaSinceUtc is not { } since || arrivedAtUtc >= since;

    /// <summary>
    /// A timer is stale when it is more than <paramref name="maxLateMinutes"/> past due: the SLA process was
    /// off or down when it came due (e.g. SLA just switched on for old tickets), so it is skipped instead of
    /// sending a late email / SMS or escalating. 0 or less never skips.
    /// </summary>
    internal static bool IsStale(DateTime dueAtUtc, DateTime nowUtc, int maxLateMinutes) =>
        maxLateMinutes > 0 && nowUtc - dueAtUtc > TimeSpan.FromMinutes(maxLateMinutes);

    /// <summary>Outbox retry delay after <paramref name="attempts"/> failures: 1, 2, 4, 8… minutes, capped at 1 hour.</summary>
    internal static TimeSpan RetryDelay(int attempts) =>
        TimeSpan.FromMinutes(Math.Min(60, Math.Pow(2, Math.Max(0, attempts - 1))));

    /// <summary>Rule channels, else the configuration's notifications; email on / SMS off by default.</summary>
    internal static (bool Email, bool Sms) Channels(WorkflowSlaConfigurationRuleDto rule, WorkflowSlaConfigurationDto sla)
    {
        var channels = rule.Channels ?? sla.Notifications;
        return (channels?.Email ?? true, channels?.Sms ?? false);
    }

    internal static string Describe(WorkflowSlaConfigurationRuleDto rule)
    {
        var amount = rule.Duration?.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) ?? "?";
        var unit = rule.DurationUnit?.Trim().ToLowerInvariant() ?? "minutes";
        if (amount == "1" && unit.EndsWith('s'))
            unit = unit[..^1];
        return $"{amount} {unit}";
    }
}

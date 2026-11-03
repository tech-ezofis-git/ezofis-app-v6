using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowSlaRuntimeTests
{
    private static readonly DateTime Arrived = new(2026, 10, 29, 9, 0, 0, DateTimeKind.Utc);

    private static WorkflowSlaConfigurationRuleDto Rule(string id, decimal duration, string unit, WorkflowSlaNotificationsDto? channels = null) =>
        new(id, id, duration, unit, ["11111111-1111-1111-1111-111111111111"], null, false, channels);

    // Level 1 email after 30 min, level 2 SMS after 1 h, level 3 after 2 h.
    private static readonly WorkflowSlaConfigurationDto Levels = new(
        "standard",
        [
            Rule("level-3", 2, "hours"),
            Rule("level-1", 30, "minutes", new(true, false)),
            Rule("level-2", 1, "hours", new(false, true)),
        ],
        null,
        new WorkflowSlaNotificationsDto(true, true));

    [Fact]
    public void Timers_AreDueAtArrivalPlusDuration_EarliestFirst()
    {
        var timers = WorkflowSlaSchedule.Timers(Levels, Arrived);
        Assert.Equal(["level-1", "level-2", "level-3"], timers.Select(t => t.RuleId));
        Assert.Equal(
            [Arrived.AddMinutes(30), Arrived.AddHours(1), Arrived.AddHours(2)],
            timers.Select(t => t.DueAtUtc));

        var withInvalid = Levels with { Rules = [.. Levels.Rules!, Rule("bad", 0, "minutes"), Rule("weeks", 1, "weeks")] };
        Assert.Equal(3, WorkflowSlaSchedule.Timers(withInvalid, Arrived).Count);
        Assert.Equal("level-2", WorkflowSlaSchedule.FindRule(Levels, "level-2")!.Id);
        Assert.Null(WorkflowSlaSchedule.FindRule(Levels, "gone"));
    }

    [Fact]
    public void IsStale_SkipsTimersLongPastDue_WhenSlaWasOff()
    {
        var due = Arrived.AddMinutes(30);

        // A normal pass runs within a minute or two of the due time: sent.
        Assert.False(WorkflowSlaSchedule.IsStale(due, due.AddMinutes(1), 60));
        Assert.False(WorkflowSlaSchedule.IsStale(due, due.AddMinutes(60), 60));
        // A ticket from last month when SLA is switched on today: skipped.
        Assert.True(WorkflowSlaSchedule.IsStale(due, due.AddDays(30), 60));
        Assert.True(WorkflowSlaSchedule.IsStale(due, due.AddMinutes(61), 60));
        // Not due yet, or skipping turned off: never stale.
        Assert.False(WorkflowSlaSchedule.IsStale(due, due.AddMinutes(-5), 60));
        Assert.False(WorkflowSlaSchedule.IsStale(due, due.AddDays(30), 0));
    }

    [Fact]
    public void AppliesTo_OnlyTicketsThatArrivedAfterTheSlaWasSet()
    {
        var slaSaved = Arrived.AddMinutes(10);

        // REQ created at 09:00, SLA saved at 09:10: no timers for it.
        Assert.False(WorkflowSlaSchedule.AppliesTo(Arrived, slaSaved));
        Assert.True(WorkflowSlaSchedule.AppliesTo(slaSaved, slaSaved));
        Assert.True(WorkflowSlaSchedule.AppliesTo(slaSaved.AddSeconds(1), slaSaved));
        Assert.True(WorkflowSlaSchedule.AppliesTo(Arrived, null));
    }

    [Fact]
    public void Fingerprint_ChangesOnlyWhenSlaSettingsChange()
    {
        WorkflowJsonDto Json(string label, decimal minutes) => new(
            Blocks:
            [
                new("a", "INTERNAL_ACTOR", new WorkflowBlockSettingsDto(Label: label,
                    SlaSettings: new("standard", [Rule("level-1", minutes, "minutes")], null, null))),
                new("b", "INTERNAL_ACTOR", new WorkflowBlockSettingsDto(Label: "B")),
            ]);

        var original = WorkflowSlaSchedule.Fingerprint(Json("Review", 2));
        // Renaming a stage keeps when the SLA was set...
        Assert.Equal(original, WorkflowSlaSchedule.Fingerprint(Json("Review step", 2)));
        // ...changing the SLA itself starts it again.
        Assert.NotEqual(original, WorkflowSlaSchedule.Fingerprint(Json("Review", 5)));
    }

    [Fact]
    public void RetryDelay_BacksOffAndCaps()
    {
        Assert.Equal(TimeSpan.FromMinutes(1), WorkflowSlaSchedule.RetryDelay(1));
        Assert.Equal(TimeSpan.FromMinutes(2), WorkflowSlaSchedule.RetryDelay(2));
        Assert.Equal(TimeSpan.FromMinutes(8), WorkflowSlaSchedule.RetryDelay(4));
        Assert.Equal(TimeSpan.FromMinutes(60), WorkflowSlaSchedule.RetryDelay(20));
    }

    [Fact]
    public void EmailHtml_EncodesNamesAndKeepsBody()
    {
        var html = WorkflowSlaNotifier.BuildEmailHtml("<Muthu>", "Heading & more", "<strong>REQ-1</strong>", "https://cloud.ezofis.com");
        Assert.Contains("Hi &lt;Muthu&gt;,", html);
        Assert.Contains("Heading &amp; more", html);
        Assert.Contains("<strong>REQ-1</strong>", html);
    }

    [Fact]
    public void Channels_UseRuleChannels_ElseConfigurationNotifications()
    {
        Assert.Equal((true, false), WorkflowSlaSchedule.Channels(Levels.Rules![1], Levels));
        Assert.Equal((false, true), WorkflowSlaSchedule.Channels(Levels.Rules[2], Levels));
        Assert.Equal((true, true), WorkflowSlaSchedule.Channels(Levels.Rules[0], Levels));
        var bare = new WorkflowSlaConfigurationDto("standard", [Rule("x", 1, "days")], null, null);
        Assert.Equal((true, false), WorkflowSlaSchedule.Channels(bare.Rules![0], bare));
    }

    [Fact]
    public void ToDuration_HandlesUnitsAndRejectsInvalidRules()
    {
        Assert.Equal(TimeSpan.FromDays(1.5), WorkflowSlaSchedule.ToDuration(Rule("a", 1.5m, "Days")));
        Assert.Null(WorkflowSlaSchedule.ToDuration(Rule("a", 0, "minutes")));
        Assert.Null(WorkflowSlaSchedule.ToDuration(Rule("a", 5, "weeks")));
        Assert.Null(WorkflowSlaSchedule.ToDuration(Rule("", 5, "minutes")));
        Assert.Equal("1 hour", WorkflowSlaSchedule.Describe(Rule("a", 1, "hours")));
        Assert.Equal("30 minutes", WorkflowSlaSchedule.Describe(Rule("a", 30, "minutes")));
    }

    [Fact]
    public void IsActiveStandard_SkipsAdvancedAndEmptyConfigurations()
    {
        Assert.True(WorkflowSlaSchedule.IsActiveStandard(Levels));
        Assert.False(WorkflowSlaSchedule.IsActiveStandard(null));
        Assert.False(WorkflowSlaSchedule.IsActiveStandard(new("advanced", [], "master-1", null)));
        Assert.False(WorkflowSlaSchedule.IsActiveStandard(new("standard", [], null, null)));
    }

    [Theory]
    [InlineData("+1 (415) 555-0100", null, "+14155550100")]
    [InlineData("9876543210", "+91", "+919876543210")]
    [InlineData("09876543210", "+91", "+919876543210")]
    [InlineData("0044 20 7946 0958", "+91", "+442079460958")]
    [InlineData("12345", "+91", null)]
    [InlineData(" ", "+91", null)]
    public void NormalizeNumber_ProducesE164(string raw, string? countryCode, string? expected)
    {
        Assert.Equal(expected, TwilioSmsSender.NormalizeNumber(raw, countryCode));
    }

    [Theory]
    [InlineData("9597707876", "+91", "+919597707876")]
    [InlineData("09597707876", "91", "+919597707876")]
    [InlineData("+14155550100", "+91", "+14155550100")]
    [InlineData("9597707876", null, "9597707876")]
    [InlineData("9597707876", "IN", "9597707876")]
    [InlineData(" ", "+91", null)]
    public void ComposePhone_JoinsCountryCodeAndNumber(string raw, string? countryCode, string? expected)
    {
        Assert.Equal(expected, WorkflowSlaNotifier.ComposePhone(raw, countryCode));
    }

    [Fact]
    public void Validate_RejectsRuleThatNeitherNotifiesNorEscalates()
    {
        WorkflowJsonDto Json(WorkflowSlaConfigurationRuleDto rule) => new(
            Blocks:
            [
                new("a", "INTERNAL_ACTOR", new WorkflowBlockSettingsDto(Label: "A",
                    SlaSettings: new("standard", [rule], null, null))),
                new("b", "INTERNAL_ACTOR", new WorkflowBlockSettingsDto(Label: "B")),
            ]);

        var silent = new WorkflowSlaConfigurationRuleDto("r", "Silent", 5, "minutes", [], null, false);
        var ex = Assert.Throws<InvalidOperationException>(() => WorkflowSlaSettingsValidator.Validate(Json(silent)));
        Assert.Contains("choose who to notify", ex.Message);

        var noChannels = silent with { NotifyUserIds = ["u"], Channels = new(false, false) };
        Assert.Throws<InvalidOperationException>(() => WorkflowSlaSettingsValidator.Validate(Json(noChannels)));

        WorkflowSlaSettingsValidator.Validate(Json(silent with { EscalateTo = new("stage", null, "b") }));
        WorkflowSlaSettingsValidator.Validate(Json(silent with { Initiator = true }));
        WorkflowSlaSettingsValidator.Validate(Json(silent with { NotifyUserIds = ["u"], Channels = new(false, true) }));
    }
}

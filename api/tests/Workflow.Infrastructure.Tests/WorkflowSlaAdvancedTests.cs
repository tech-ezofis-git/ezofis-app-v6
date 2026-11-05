using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowSlaAdvancedTests
{
    private const string Amc = "aaaaaaaa-0000-0000-0000-000000000001";
    private const string Support = "aaaaaaaa-0000-0000-0000-000000000002";
    private const string NotifyUser = "11111111-1111-1111-1111-111111111111";
    private const string EscalateUser = "22222222-2222-2222-2222-222222222222";

    private static readonly TimeSpan Ist = TimeSpan.FromHours(5.5);

    private static readonly WorkflowBusinessCalendar Calendar = WorkflowBusinessCalendar.TryCreate(new WorkflowSlaSettingsDto(
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        new WorkflowWorkHoursDto("09:00", "18:00"),
        "Asia/Kolkata"))!;

    // 3 Nov 2026 is a Tuesday.
    private static DateTime Local(int day, int hour) =>
        DateTime.SpecifyKind(new DateTime(2026, 11, day, hour, 0, 0) - Ist, DateTimeKind.Utc);

    private static readonly WorkflowSlaFieldMappingDto Mapping = new(
        Name: "f_name",
        ResponseDuration: "f_resp",
        ResponseUnit: "f_resp_type",
        ResolutionDuration: "f_res",
        ResolutionUnit: "f_res_type",
        NotifyUsers: "f_notify",
        EscalationUsers: "f_escalate");

    // SLA Master entries, keyed by jsonId as GetEntriesAsync returns them.
    private static readonly Dictionary<string, IReadOnlyDictionary<string, object?>> Entries = new()
    {
        [Amc] = new Dictionary<string, object?>
        {
            ["f_name"] = "AMC", ["f_resp"] = "1", ["f_resp_type"] = "Day", ["f_res"] = 2m, ["f_res_type"] = "Days",
            ["f_notify"] = $"[\"{NotifyUser}\"]", ["f_escalate"] = EscalateUser
        },
        [Support] = new Dictionary<string, object?>
        {
            ["f_name"] = "Support", ["f_resp"] = "2", ["f_resp_type"] = "Hours", ["f_res"] = "8", ["f_res_type"] = "Hours",
            ["f_notify"] = "notify@example.com", ["f_escalate"] = EscalateUser
        },
    };

    private static WorkflowSlaAdvancedRuleDto Rule(
        string id, string type, int priority, string[] entries, string? strategy = null, bool stop = true) =>
        new(id, $"Rule {id}", true, priority, stop, true,
            [new WorkflowSlaConditionDto("request_type", "IS_EQUALS_TO", type)],
            [.. entries], strategy);

    private static WorkflowSlaConfigurationDto Config(params WorkflowSlaAdvancedRuleDto[] rules) => new(
        Mode: "advanced",
        SlaMasterId: "sla-master",
        FieldMapping: Mapping,
        AdvancedRules: [.. rules],
        ResponseStageId: "reviewer");

    private static readonly WorkflowSlaConfigurationDto Standard = Config(
        Rule("1", "AMC", 1, [Amc]),
        Rule("2", "Support", 2, [Support]),
        Rule("3", "General", 3, [Amc, Support], "shortest"));

    private static Func<string, IReadOnlyList<string>> Form(string requestType) =>
        field => field == "request_type" ? [requestType] : [];

    private static WorkflowSlaAdvancedResult Run(WorkflowSlaConfigurationDto sla, string requestType, DateTime? start = null) =>
        WorkflowSlaAdvancedEvaluator.Evaluate(sla, Form(requestType), Entries, start ?? Local(3, 16), Calendar, withResponse: true);

    [Fact]
    public void SupportRequest_UsesSupportEntry_WithBusinessHourDeadlines()
    {
        // Tuesday 4 PM, Request Type = Support: response 2 working h → Tue 6 PM, resolution 8 h → Wed 3 PM.
        var target = Assert.Single(Run(Standard, "Support").Targets);
        Assert.Equal(("2", Support, "Support"), (target.RuleId, target.EntryId, target.EntryName));
        Assert.Equal(Local(3, 18), target.ResponseDueUtc);
        Assert.Equal(Local(4, 15), target.ResolutionDueUtc);
        Assert.Equal(["notify@example.com"], target.NotifyUsers);
        Assert.Equal([EscalateUser], target.EscalationUsers);
    }

    [Fact]
    public void AmcRequest_UsesAmcEntry_DaysAreWorkingDays()
    {
        var target = Assert.Single(Run(Standard, "AMC").Targets);
        Assert.Equal(Amc, target.EntryId);
        Assert.Equal(Local(4, 16), target.ResponseDueUtc);   // 1 working day
        Assert.Equal(Local(5, 16), target.ResolutionDueUtc); // 2 working days
        Assert.Equal([NotifyUser], target.NotifyUsers);      // JSON array value
    }

    [Theory]
    [InlineData("shortest", Support)]
    [InlineData("longest", Amc)]
    [InlineData("first", Amc)]
    public void SeveralEntries_AreResolvedByTheRuleStrategy(string strategy, string expected)
    {
        var sla = Config(Rule("3", "General", 1, [Amc, Support], strategy));
        Assert.Equal(expected, Assert.Single(Run(sla, "General").Targets).EntryId);
    }

    [Fact]
    public void EachStrategy_KeepsEveryEntry_WithSeparateTimers()
    {
        var sla = Config(Rule("3", "General", 1, [Amc, Support], "each"));
        var result = Run(sla, "General");
        Assert.Equal([Amc, Support], result.Targets.Select(t => t.EntryId));

        var timers = WorkflowSlaTimerService.BuildAdvancedTimers(sla, result, Local(3, 16), Calendar);
        // Response + resolution per entry, each uniquely keyed.
        Assert.Equal(4, timers.Count);
        Assert.Equal(4, timers.Select(t => (t.Scope, t.RuleKey)).Distinct().Count());
    }

    [Fact]
    public void Priority_And_StopAfterMatch_AreDeterministic()
    {
        var any = new WorkflowSlaAdvancedRuleDto("any", "Everything", true, 5, false, true, [], [Amc]);
        var support = Rule("2", "Support", 1, [Support], stop: false);

        // Listed out of order: priority decides; without stop both rules apply.
        var both = Run(Config(any, support), "Support");
        Assert.Equal(["2", "any"], both.Targets.Select(t => t.RuleId));

        // Stop after match: lower-priority rules are not checked.
        var stopped = Run(Config(any, support with { StopAfterMatch = true }), "Support");
        Assert.Equal(["2"], stopped.Targets.Select(t => t.RuleId));

        // Disabled rules are skipped.
        var disabled = Run(Config(any, support with { Enabled = false }), "Support");
        Assert.Equal(["any"], disabled.Targets.Select(t => t.RuleId));
    }

    [Fact]
    public void NoMatchingRule_GivesNoSla_UnlessAFallbackIsSet()
    {
        var none = Run(Standard, "Unknown");
        Assert.False(none.Matched);
        Assert.Contains(none.Log, l => l.Contains("no SLA for this request"));

        var fallback = Run(Standard with { FallbackEntryId = Support }, "Unknown");
        Assert.Equal(WorkflowSlaAdvancedEvaluator.FallbackRuleId, Assert.Single(fallback.Targets).RuleId);
    }

    [Fact]
    public void MissingEntryOrInvalidValue_IsReported_NotReplaced()
    {
        var gone = Run(Config(Rule("1", "AMC", 1, ["deleted-entry"])), "AMC");
        Assert.False(gone.Matched);
        Assert.Contains(gone.Errors, e => e.Contains("not found"));

        var badMapping = Standard with { FieldMapping = Mapping with { ResolutionUnit = "f_missing" } };
        var bad = Run(badMapping, "Support");
        Assert.Contains(bad.Errors, e => e.Contains("Resolution type"));
        // Response values are still valid, so only the response SLA is kept for the entry.
        var target = Assert.Single(bad.Targets);
        Assert.Null(target.ResolutionDueUtc);
        Assert.Equal(Local(3, 18), target.ResponseDueUtc);
    }

    [Fact]
    public void Reminder_IsWorkingMinutesBeforeTheDeadline()
    {
        var sla = Config(Rule("2", "Support", 1, [Support]) with { ReminderMinutes = 30 });
        var timers = WorkflowSlaTimerService.BuildAdvancedTimers(sla, Run(sla, "Support"), Local(3, 16), Calendar);
        var reminder = timers.Single(t => t.Scope == WorkflowSlaTimerService.ScopeAdvancedResolution && t.RuleKey.EndsWith("|remind"));
        Assert.Equal(Local(4, 15).AddMinutes(-30), reminder.DueAtUtc);
        // The snapshot keeps the evaluated values for firing later.
        Assert.Equal("Support", reminder.Snapshot.EntryName);
        Assert.Equal(Local(4, 15), reminder.Snapshot.DeadlineUtc);
    }

    [Fact]
    public void Validator_ChecksAdvancedRules()
    {
        var blocks = new List<WorkflowBlockDto> { new("reviewer", "ACTIVITY", new WorkflowBlockSettingsDto()) };
        var json = new WorkflowJsonDto(new WorkflowSettingsDto(SlaSettings: Standard), blocks);
        WorkflowSlaSettingsValidator.Validate(json);

        var noEntries = Standard with { AdvancedRules = [Rule("1", "AMC", 1, [])] };
        var error = Assert.Throws<InvalidOperationException>(() =>
            WorkflowSlaSettingsValidator.Validate(json with { Settings = new WorkflowSettingsDto(SlaSettings: noEntries) }));
        Assert.Contains("at least one SLA Master entry", error.Message);

        var badStage = Standard with
        {
            AdvancedRules = [Rule("1", "AMC", 1, [Amc]) with { BreachAction = new WorkflowSlaBreachActionDto("stage", "nowhere") }]
        };
        error = Assert.Throws<InvalidOperationException>(() =>
            WorkflowSlaSettingsValidator.Validate(json with { Settings = new WorkflowSettingsDto(SlaSettings: badStage) }));
        Assert.Contains("not a stage of this workflow", error.Message);

        // Saved before this change (only an SLA Master): still valid.
        var legacy = new WorkflowSlaConfigurationDto("advanced", SlaMasterId: "sla-master");
        WorkflowSlaSettingsValidator.Validate(json with { Settings = new WorkflowSettingsDto(SlaSettings: legacy) });
    }
}

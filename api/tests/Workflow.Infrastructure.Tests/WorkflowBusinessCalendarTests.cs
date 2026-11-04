using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowBusinessCalendarTests
{
    // Monday to Friday, 9 AM to 6 PM, Asia/Kolkata (UTC+5:30, no daylight saving).
    private static readonly WorkflowSlaSettingsDto Kolkata = new(
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        new WorkflowWorkHoursDto("09:00", "18:00"),
        "Asia/Kolkata");

    private static readonly TimeSpan Ist = TimeSpan.FromHours(5.5);

    // 2 Nov 2026 is a Monday.
    private static DateTime Local(int day, int hour, int minute = 0) =>
        DateTime.SpecifyKind(new DateTime(2026, 11, day, hour, minute, 0) - Ist, DateTimeKind.Utc);

    private static WorkflowBusinessCalendar Calendar(WorkflowSlaSettingsDto settings) =>
        WorkflowBusinessCalendar.TryCreate(settings)!;

    [Theory]
    // Friday 5 PM + 2 working hours → Monday 10 AM.
    [InlineData(6, 17, 2, 9, 10)]
    // Monday 10 AM + 4 h → Monday 2 PM (same day).
    [InlineData(2, 10, 4, 2, 14)]
    // Monday 5 PM + 3 h → Tuesday 11 AM (next business day).
    [InlineData(2, 17, 3, 3, 11)]
    // Saturday 2 PM + 2 h → Monday 11 AM (weekend excluded, starts at opening).
    [InlineData(7, 14, 2, 9, 11)]
    // Tuesday 4 PM + 2 h → Tuesday 6 PM (ends exactly at closing).
    [InlineData(3, 16, 2, 3, 18)]
    // Tuesday 4 PM + 8 h → Wednesday 3 PM.
    [InlineData(3, 16, 8, 4, 15)]
    // Tuesday 7 AM (before opening) + 1 h → Tuesday 10 AM.
    [InlineData(3, 7, 1, 3, 10)]
    // Tuesday 8 PM (after closing) + 1 h → Wednesday 10 AM.
    [InlineData(3, 20, 1, 4, 10)]
    public void AddWorkingTime_CountsOnlyWorkingHours(int startDay, int startHour, int hours, int dueDay, int dueHour)
    {
        var due = Calendar(Kolkata).AddWorkingTime(Local(startDay, startHour), TimeSpan.FromHours(hours));
        Assert.Equal(Local(dueDay, dueHour), due);
        Assert.Equal(DateTimeKind.Utc, due.Kind);
    }

    [Fact]
    public void Days_AreWorkingDayEquivalents()
    {
        var calendar = Calendar(Kolkata);
        Assert.Equal(TimeSpan.FromHours(9), calendar.WorkingDayLength);
        // AMC: 1 working day from Tuesday 4 PM → Wednesday 4 PM; 2 days → Thursday 4 PM.
        Assert.Equal(Local(4, 16), calendar.AddWorkingDays(Local(3, 16), 1));
        Assert.Equal(Local(5, 16), calendar.AddWorkingDays(Local(3, 16), 2));
        // Friday 4 PM + 1 day crosses the weekend → Monday 4 PM.
        Assert.Equal(Local(9, 16), calendar.AddWorkingDays(Local(6, 16), 1));
    }

    [Fact]
    public void DueAt_UsesCalendarTimeWithoutBusinessHours_AndWorkingTimeWithThem()
    {
        var start = Local(6, 17);
        Assert.Equal(start.AddHours(2), WorkflowSlaSchedule.DueAt(start, 2, "hours", null));
        Assert.Equal(start.AddDays(1), WorkflowSlaSchedule.DueAt(start, 1, "Day", null));
        Assert.Equal(Local(9, 10), WorkflowSlaSchedule.DueAt(start, 2, "hours", Calendar(Kolkata)));
        Assert.Equal(Local(9, 9, 30), WorkflowSlaSchedule.DueAt(start, 90, "minutes", Calendar(Kolkata)));
        Assert.Null(WorkflowSlaSchedule.DueAt(start, 2, "weeks", Calendar(Kolkata)));
        Assert.Null(WorkflowSlaSchedule.DueAt(start, 0, "hours", Calendar(Kolkata)));
    }

    [Fact]
    public void StandardTimers_UseBusinessHours()
    {
        var sla = new WorkflowSlaConfigurationDto(
            "standard",
            [new("r1", "Two hours", 2, "hours", ["11111111-1111-1111-1111-111111111111"])]);
        var timers = WorkflowSlaSchedule.Timers(sla, Local(6, 17), Calendar(Kolkata));
        Assert.Equal(Local(9, 10), Assert.Single(timers).DueAtUtc);
    }

    [Fact]
    public void SubtractWorkingTime_FindsReminderBeforeDeadline()
    {
        var calendar = Calendar(Kolkata);
        // 30 working minutes before Monday 9:30 AM is Friday 5:30 PM… but not before the SLA started.
        Assert.Equal(Local(6, 17, 30), calendar.SubtractWorkingTime(Local(9, 9, 30), TimeSpan.FromMinutes(60), Local(6, 17)));
        Assert.Equal(Local(6, 17), calendar.SubtractWorkingTime(Local(9, 9, 30), TimeSpan.FromHours(5), Local(6, 17)));
        Assert.Equal(Local(3, 14, 30), calendar.SubtractWorkingTime(Local(3, 15), TimeSpan.FromMinutes(30), Local(3, 9)));
    }

    [Fact]
    public void DaylightSavingChange_CountsRealElapsedTime()
    {
        // New York falls back on Sunday 1 Nov 2026 at 2 AM: 0:30–3:30 that day is 4 real hours.
        var newYork = new WorkflowSlaSettingsDto(["Sunday"], new WorkflowWorkHoursDto("00:30", "03:30"), "America/New_York");
        var calendar = Calendar(newYork);
        var open = new DateTime(2026, 11, 1, 4, 30, 0, DateTimeKind.Utc); // 0:30 EDT
        Assert.Equal(new DateTime(2026, 11, 1, 8, 30, 0, DateTimeKind.Utc), calendar.AddWorkingTime(open, TimeSpan.FromHours(4)));
        // Past the window: the next Sunday (EST, UTC−5) opens at 5:30 UTC.
        Assert.Equal(new DateTime(2026, 11, 8, 6, 30, 0, DateTimeKind.Utc), calendar.AddWorkingTime(open, TimeSpan.FromHours(5)));

        // Springs forward on Sunday 14 Mar 2027 at 2 AM: 1:00–4:00 that day is 2 real hours.
        var spring = Calendar(new WorkflowSlaSettingsDto(["Sun"], new WorkflowWorkHoursDto("01:00", "04:00"), "America/New_York"));
        var springOpen = new DateTime(2027, 3, 14, 6, 0, 0, DateTimeKind.Utc); // 1:00 EST
        Assert.Equal(new DateTime(2027, 3, 14, 8, 0, 0, DateTimeKind.Utc), spring.AddWorkingTime(springOpen, TimeSpan.FromHours(2)));
    }

    // Tuesday off: Mon, Wed, Thu, Fri, 05:00–21:00, Asia/Calcutta (the old name of Asia/Kolkata).
    private static readonly WorkflowSlaSettingsDto TuesdayOff = new(
        ["Monday", "Wednesday", "Thursday", "Friday"],
        new WorkflowWorkHoursDto("05:00", "21:00"),
        "Asia/Calcutta");

    [Theory]
    // Monday 20:30 + 2 h: 30 min Monday, Tuesday off → Wednesday 06:30.
    [InlineData(2, 20, 30, 120, 4, 6, 30)]
    // Monday 22:00 (after closing) + 30 min → Wednesday 05:30.
    [InlineData(2, 22, 0, 30, 4, 5, 30)]
    // Tuesday 10:00 (day off) + 1 h → Wednesday 06:00.
    [InlineData(3, 10, 0, 60, 4, 6, 0)]
    // Friday 20:00 + 2 h → Monday 06:00 (weekend off).
    [InlineData(6, 20, 0, 120, 9, 6, 0)]
    // Wednesday 04:00 (before opening) + 15 min → Wednesday 05:15.
    [InlineData(4, 4, 0, 15, 4, 5, 15)]
    public void TuesdayOffCalendar_SkipsDayOffAndClosedHours(
        int day, int hour, int minute, int minutes, int dueDay, int dueHour, int dueMinute)
    {
        var due = Calendar(TuesdayOff).AddWorkingTime(Local(day, hour, minute), TimeSpan.FromMinutes(minutes));
        Assert.Equal(Local(dueDay, dueHour, dueMinute), due);
    }

    [Fact]
    public void TuesdayOffCalendar_AppliesToResponseAndResolutionTimers()
    {
        var calendar = Calendar(TuesdayOff);
        // Block response SLA: 1 h reminder level, 2 h breach level (email + SMS each).
        var response = new WorkflowSlaConfigurationDto(
            "standard",
            [
                new("remind", "Reminder", 1, "hours", ["11111111-1111-1111-1111-111111111111"], Channels: new(true, true)),
                new("breach", "Breach", 2, "hours", ["11111111-1111-1111-1111-111111111111"], Channels: new(true, true)),
            ]);
        var timers = WorkflowSlaSchedule.Timers(response, Local(2, 20, 30), calendar);
        Assert.Equal(["remind", "breach"], timers.Select(t => t.RuleId));
        Assert.Equal([Local(4, 5, 30), Local(4, 6, 30)], timers.Select(t => t.DueAtUtc));

        // Workflow resolution SLA: 1 day = one 16 h working day → Wednesday 20:30.
        var resolution = new WorkflowSlaConfigurationDto(
            "standard",
            [new("resolve", "Resolve", 1, "days", ["11111111-1111-1111-1111-111111111111"])]);
        Assert.Equal(Local(4, 20, 30), Assert.Single(WorkflowSlaSchedule.Timers(resolution, Local(2, 20, 30), calendar)).DueAtUtc);
    }

    [Fact]
    public void Off_WhenNoWorkingDays()
    {
        Assert.Null(WorkflowBusinessCalendar.TryCreate(null));
        Assert.Null(WorkflowBusinessCalendar.TryCreate(new WorkflowSlaSettingsDto([], new WorkflowWorkHoursDto("", ""), "")));
        Assert.Empty(WorkflowBusinessCalendar.Validate(new WorkflowSlaSettingsDto([], null, null)));
    }

    [Theory]
    [InlineData("09:00", "09:00", "Asia/Kolkata", "different from the start time")]
    [InlineData("18:00", "09:00", "Asia/Kolkata", "later than the start time")]
    [InlineData("", "18:00", "Asia/Kolkata", "valid start time")]
    [InlineData("09:00", "18:00", "Mars/Olympus", "not known")]
    [InlineData("09:00", "18:00", "", "select the work time zone")]
    public void Validate_RejectsInvalidSchedules(string from, string to, string zone, string expected)
    {
        var settings = new WorkflowSlaSettingsDto(["Monday"], new WorkflowWorkHoursDto(from, to), zone);
        Assert.Contains(WorkflowBusinessCalendar.Validate(settings), e => e.Contains(expected));
        Assert.Throws<InvalidOperationException>(() => WorkflowBusinessCalendar.TryCreate(settings));
    }

    [Fact]
    public void Validate_AcceptsDayNamesAndTwelveHourTimes()
    {
        var settings = new WorkflowSlaSettingsDto(["MON", "tuesday", "3"], new WorkflowWorkHoursDto("9:00 AM", "6:00 PM"), "Asia/Kolkata");
        Assert.Empty(WorkflowBusinessCalendar.Validate(settings));
        Assert.Contains(
            WorkflowBusinessCalendar.Validate(settings with { WorkDays = ["Funday"] }),
            e => e.Contains("not a day of the week"));
    }

    [Fact]
    public void WorkflowValidator_RejectsInvalidBusinessHours()
    {
        var json = new WorkflowJsonDto(new WorkflowSettingsDto(
            General: new WorkflowGeneralDto(SlaSettings: new WorkflowSlaSettingsDto(["Monday"], new WorkflowWorkHoursDto("18:00", "09:00"), "Asia/Kolkata"))));
        var error = Assert.Throws<InvalidOperationException>(() => WorkflowSlaSettingsValidator.Validate(json));
        Assert.Contains("later than the start time", error.Message);
    }
}

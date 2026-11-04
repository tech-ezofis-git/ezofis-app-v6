using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Infrastructure.Options;
using SaaSApp.Workflow.Application.Forms;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowSlaMasterEntryTests
{
    // "SLA Master" fields as wFormControl has them: jsonId, label, type, ezfb column.
    private static readonly List<FormFieldLabel> Fields =
    [
        new("f1", "Name", "SHORT_TEXT", "name"),
        new("f2", "Description", "LONG_TEXT", "description"),
        new("f3", "Response Time", "NUMBER", "response_time"),
        new("f4", "Response Type", "SINGLE_SELECT", "response_type"),
        new("f5", "Resolution Time", "NUMBER", "resolution_time"),
        new("f6", "Resolution Type", "SINGLE_SELECT", "resolution_type"),
        new("f7", "Notify", "MULTI_SELECT", "notify"),
        new("f8", "Escalate", "SINGLE_SELECT", "escalate"),
    ];

    private static readonly Dictionary<string, object?> Support = new(StringComparer.OrdinalIgnoreCase)
    {
        ["item_id"] = "e-support",
        ["f1"] = "Support",
        ["f3"] = 2,
        ["f4"] = "Hours",
        ["f5"] = "8",
        ["f6"] = "Hours",
        ["f7"] = "[\"raja@example.com\"]",
        ["f8"] = "admin@example.com",
    };

    [Fact]
    public void ReadsSlaValuesByLabel()
    {
        var values = WorkflowSlaMasterEntry.Read("e-support", Support, Fields, "f1");
        Assert.Equal("Support", values.EntryName);
        Assert.Equal((2m, "hours"), (values.ResponseDuration, values.ResponseUnit));
        Assert.Equal((8m, "hours"), (values.ResolutionDuration, values.ResolutionUnit));
        Assert.Equal(["raja@example.com"], values.NotifyUsers);
        Assert.Equal(["admin@example.com"], values.EscalationUsers);
        Assert.Empty(values.Errors);
    }

    [Fact]
    public void MatchesColumnNamesAndLabelsIgnoringCaseSpacesAndUnderscores()
    {
        // Only ezfb column keys, no jsonIds, and no field list: "RESOLUTION_TIME" still matches "Resolution Time".
        var byColumn = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["RESPONSE_TIME"] = "1", ["Response-Type"] = "Day", ["resolution time"] = "2", ["ResolutionType"] = "Days",
        };
        var values = WorkflowSlaMasterEntry.Read("e-amc", byColumn, [], null);
        Assert.Equal((1m, "days"), (values.ResponseDuration, values.ResponseUnit));
        Assert.Equal((2m, "days"), (values.ResolutionDuration, values.ResolutionUnit));
    }

    [Fact]
    public void ReportsMissingOrInvalidValues()
    {
        var broken = new Dictionary<string, object?>(Support) { ["f3"] = "soon", ["f6"] = "weeks" };
        var values = WorkflowSlaMasterEntry.Read("e-support", broken, Fields, "f1");
        Assert.Null(values.ResponseDuration);
        Assert.Null(values.ResolutionDuration);
        Assert.Contains(values.Errors, e => e.Contains("Response Time 'soon'"));
        Assert.Contains(values.Errors, e => e.Contains("Resolution Type 'weeks'"));

        Assert.Equal(["Resolution Time", "Resolution Type"], WorkflowSlaMasterEntry.MissingFields(Fields.Take(4).ToList(), false, true));
        Assert.Empty(WorkflowSlaMasterEntry.MissingFields(Fields, true, true));
    }

    [Fact]
    public void MasterEntrySetting_IsActive_AndValidated()
    {
        var sla = new WorkflowSlaConfigurationDto("advanced", SlaMasterId: "master", MasterFieldId: "f1", MasterValue: "Support", EntryId: "e-support");
        Assert.True(WorkflowSlaSchedule.IsMasterEntry(sla));
        Assert.False(WorkflowSlaSchedule.IsMasterEntry(sla with { EntryId = null, MasterValue = null }));
        Assert.False(WorkflowSlaSchedule.IsMasterEntry(sla with { Mode = "standard" }));

        var json = new WorkflowJsonDto(new WorkflowSettingsDto(SlaSettings: sla));
        WorkflowSlaSettingsValidator.Validate(json);
        var error = Assert.Throws<InvalidOperationException>(() => WorkflowSlaSettingsValidator.Validate(
            json with { Settings = new WorkflowSettingsDto(SlaSettings: sla with { EntryId = null, MasterValue = null }) }));
        Assert.Contains("choose the SLA Master value", error.Message);
    }

    private static string StepsJson(params object[] rows) => JsonSerializer.Serialize(rows);

    [Fact]
    public void StepsTable_IsReadFromTheEntry_AndOlderColumnsAreIgnored()
    {
        // Rows keyed by generated column ids, resolved through the form's column labels.
        var fields = new List<FormFieldLabel>
        {
            new("f1", "Name", "SHORT_TEXT", "Name"),
            new("t1", "SLA Steps", "TABLE", "SLA_Steps"),
            new("c1", "After", "NUMBER", null),
            new("c2", "Unit", "SINGLE_SELECT", null),
            new("c3", "Action", "SINGLE_SELECT", null),
            new("c4", "Send to", "SINGLE_SELECT", null),
            new("c5", "Users", "MULTI_SELECT", null),
            new("c6", "Group", "SINGLE_SELECT", null),
        };
        var entry = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["f1"] = "Support",
            ["Response_Time"] = "99",
            ["Response_Type"] = "Days",
            ["SLA_Steps"] = StepsJson(
                new Dictionary<string, object> { ["c1"] = "1", ["c2"] = "Minutes", ["c3"] = "Notify", ["c4"] = "Users", ["c5"] = new[] { "raja@example.com", "muthu@example.com" } },
                new Dictionary<string, object> { ["c1"] = 8, ["c2"] = "Hours", ["c3"] = "Escalate", ["c4"] = "Group", ["c6"] = "Sales Team" }),
        };

        var values = WorkflowSlaMasterEntry.Read("e1", entry, fields, "f1");

        Assert.Empty(values.Errors);
        Assert.Null(values.ResponseDuration);
        Assert.Equal(2, values.Steps!.Count);
        Assert.Equal((1m, "minutes", null), (values.Steps[0].After, values.Steps[0].Unit, values.Steps[0].EscalateTo));
        Assert.Equal(["raja@example.com", "muthu@example.com"], values.Steps[0].NotifyUsers);
        Assert.Equal((8m, "hours", "group", "Sales Team"), (values.Steps[1].After, values.Steps[1].Unit, values.Steps[1].EscalateTo, values.Steps[1].EscalateGroup));
    }

    [Fact]
    public void OneRow_CanNotifySomeAndEscalateToSomeoneElse()
    {
        var entry = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["SLA_Steps"] = StepsJson(
                new { after = 1, unit = "Hours", notifyUsers = new[] { "raja@example.com" }, notifyGroup = "Support Leads", notifyInitiator = "Yes", escalateTo = "User", escalateUser = "lead@example.com", escalateGroup = "", escalateStage = "" },
                new { after = 2, unit = "Hours", notifyUsers = Array.Empty<string>(), notifyGroup = "", notifyInitiator = "Yes", escalateTo = "Stage", escalateUser = "ignored@example.com", escalateGroup = "", escalateStage = "Team Lead" },
                new { after = 3, unit = "Hours", notifyUsers = Array.Empty<string>(), notifyGroup = "", notifyInitiator = "", escalateTo = "", escalateUser = "", escalateGroup = "Sales Team", escalateStage = "" }),
        };

        var steps = WorkflowSlaMasterEntry.Read("e1", entry, [], null).Steps!;

        Assert.Equal(["raja@example.com"], steps[0].NotifyUsers);
        Assert.Equal(("Support Leads", true, "users"), (steps[0].NotifyGroup, steps[0].NotifyInitiator, steps[0].EscalateTo));
        Assert.Equal(["lead@example.com"], steps[0].EscalateUsers);
        // Only the chosen target is kept.
        Assert.Equal(("stage", "Team Lead"), (steps[1].EscalateTo, steps[1].EscalateStage));
        Assert.Empty(steps[1].EscalateUsers);
        // Escalate to left empty: the target that is filled in.
        Assert.Equal(("group", "Sales Team"), (steps[2].EscalateTo, steps[2].EscalateGroup));
    }

    [Theory]
    [InlineData(new[] { "Email" }, true, false)]
    [InlineData(new[] { "SMS" }, false, true)]
    [InlineData(new[] { "Email", "SMS" }, true, true)]
    public void SendBy_OnTheRow_ChoosesTheChannels(string[] sendBy, bool email, bool sms)
    {
        var entry = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["SLA_Steps"] = StepsJson(new { after = 1, unit = "Hours", notifyInitiator = "Yes", sendBy }),
        };
        var values = WorkflowSlaMasterEntry.Read("e1", entry, [], null);
        var step = Assert.Single(values.Steps!);

        // The SLA's setting is the opposite; the row wins.
        var sla = new WorkflowSlaConfigurationDto("advanced", SlaMasterId: "m", Notifications: new(!email, !sms));
        var snapshot = WorkflowSlaTimerService.StepSnapshot(sla, values, step, true, DateTime.UtcNow, null);
        Assert.Equal((email, sms), (snapshot.Email, snapshot.Sms));
    }

    [Fact]
    public void SendBy_LeftEmpty_SendsEmail_AndTimeUnitAndPolicyNameAreRead()
    {
        var fields = new List<FormFieldLabel>
        {
            new("f1", "Policy Name", "SHORT_TEXT", "Policy_Name"),
            new("t1", "SLA Steps", "TABLE", "SLA_Steps"),
            new("u1", "Time unit", "SINGLE_SELECT", null),
        };
        var entry = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["f1"] = "Support",
            ["SLA_Steps"] = StepsJson(new Dictionary<string, object> { ["after"] = 2, ["u1"] = "Hours", ["notifyInitiator"] = "Yes" }),
        };
        var values = WorkflowSlaMasterEntry.Read("e1", entry, fields, null);
        Assert.Equal("Support", values.EntryName);
        var step = Assert.Single(values.Steps!);
        Assert.Equal("hours", step.Unit);
        Assert.Null(step.SendEmail);

        var sla = new WorkflowSlaConfigurationDto("advanced", SlaMasterId: "m", Notifications: new(false, true));
        var snapshot = WorkflowSlaTimerService.StepSnapshot(sla, values, step, true, DateTime.UtcNow, null);
        Assert.Equal((true, false), (snapshot.Email, snapshot.Sms));
    }

    [Fact]
    public void Row_WithAnEmptyEscalateTarget_StillNotifies_AndSaysWhy()
    {
        var entry = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["SLA_Steps"] = StepsJson(
                new { after = 1, unit = "Hours", notifyInitiator = "Yes", escalateTo = "Group", escalateGroup = "" },
                new { after = 2, unit = "Hours", notifyInitiator = "No", escalateTo = "" }),
        };

        var values = WorkflowSlaMasterEntry.Read("e1", entry, [], null);

        var step = Assert.Single(values.Steps!);
        Assert.Null(step.EscalateTo);
        Assert.True(step.NotifyInitiator);
        Assert.Contains(values.Errors, e => e.Contains("SLA step 1: Escalate group is empty"));
        Assert.Contains(values.Errors, e => e.Contains("SLA step 2: choose who to notify or where to escalate"));
    }

    [Fact]
    public void StepsTable_ReportsRowsThatCannotRun_AndKeepsTheOthers()
    {
        var entry = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["SLA_Steps"] = StepsJson(
                new { after = "soon", unit = "Hours", action = "Notify", sendTo = "Users", users = new[] { "a@example.com" } },
                new { after = 1, unit = "Weeks", action = "Notify", sendTo = "Users", users = new[] { "a@example.com" } },
                new { after = 1, unit = "Hours", action = "Shout", sendTo = "Users", users = new[] { "a@example.com" } },
                new { after = 1, unit = "Hours", action = "Notify", sendTo = "Group", users = Array.Empty<string>() },
                new { after = 2, unit = "Hours", action = "Notify", sendTo = "Users", users = new[] { "a@example.com" } }),
        };

        var values = WorkflowSlaMasterEntry.Read("e1", entry, [], null);

        Assert.Equal(4, values.Errors.Count);
        Assert.Contains(values.Errors, e => e.Contains("SLA step 1: After 'soon'"));
        Assert.Contains(values.Errors, e => e.Contains("SLA step 4: Group is empty"));
        Assert.Equal(4, Assert.Single(values.Steps!).Index);
    }

    [Fact]
    public void StepsTable_WithNoRows_GivesNoStepsAndAReason_NotTheOlderColumns()
    {
        var fields = new List<FormFieldLabel> { new("t1", "SLA Steps", "TABLE", "SLA_Steps") };
        var entry = new Dictionary<string, object?>(Support, StringComparer.OrdinalIgnoreCase) { ["SLA_Steps"] = null };
        var values = WorkflowSlaMasterEntry.Read("e1", entry, fields, null);
        Assert.Empty(values.Steps!);
        Assert.Contains("no SLA Steps", values.Errors[0]);
        Assert.Empty(WorkflowSlaMasterEntry.MissingFields(fields, true, true));
    }

    [Theory]
    [InlineData(null, true, null)]
    [InlineData("users", true, "reassign")]
    [InlineData("group", true, "group")]
    [InlineData("stage", true, "stage")]
    [InlineData("users", false, "notify")]
    [InlineData("group", false, "notify")]
    public void StepSnapshot_DecidesTheActionFromTheRowAndWhereItRuns(string? escalateTo, bool isStage, string? breach)
    {
        var sla = new WorkflowSlaConfigurationDto("advanced", SlaMasterId: "m");
        var values = new WorkflowSlaMasterValues("e", "Support", null, null, null, null, [], [], []);
        var step = new WorkflowSlaMasterStep(
            0, 1, "hours", ["n@example.com"], "Notify Team", true, escalateTo,
            escalateTo == "users" ? ["a@example.com"] : [], escalateTo == "group" ? "Team" : null, escalateTo == "stage" ? "Lead" : null);

        var snapshot = WorkflowSlaTimerService.StepSnapshot(sla, values, step, isStage, DateTime.UtcNow, null);

        Assert.Equal(breach, snapshot.BreachType);
        Assert.Equal(["n@example.com"], snapshot.NotifyUsers);
        Assert.Equal(("Notify Team", true), (snapshot.StepNotifyGroup, snapshot.Initiator));
        Assert.Equal(escalateTo == "group" ? "Team" : null, snapshot.StepGroup);
    }

    [Fact]
    public void MasterRows_ComeFromTheListOrASingleSavedEntry()
    {
        var single = new WorkflowSlaConfigurationDto("advanced", SlaMasterId: "master", EntryId: "e1");
        var row = Assert.Single(WorkflowSlaSchedule.MasterRows(single));
        // Same key as timers created before rows existed; does both, as it did then.
        Assert.Equal(("e1", "e1", true, true), (row.RowId, row.EntryId, row.Notify, row.Escalate));

        var several = new WorkflowSlaConfigurationDto("advanced", SlaMasterId: "master", MasterEntries:
        [
            new("a", "e1", true, false),
            new("b", "e2", false, true),
            new("idle", "e3", false, false),
        ]);
        Assert.True(WorkflowSlaSchedule.IsMasterEntry(several));
        Assert.Equal(["a", "b"], WorkflowSlaSchedule.MasterRows(several).Select(r => r.RowId));
    }

    [Fact]
    public void Validator_ChecksMasterRowsAndGroupEscalation()
    {
        void Validate(WorkflowSlaConfigurationDto sla) =>
            WorkflowSlaSettingsValidator.Validate(new WorkflowJsonDto(new WorkflowSettingsDto(SlaSettings: sla)));
        string Error(WorkflowSlaConfigurationDto sla) =>
            Assert.Throws<InvalidOperationException>(() => Validate(sla)).Message;

        var ok = new WorkflowSlaConfigurationDto("advanced", SlaMasterId: "m", MasterFieldId: "f1", MasterEntries: [new("a", "e1", true, null)]);
        Validate(ok);
        Assert.Contains("choose Notify, Escalate or both", Error(ok with { MasterEntries = [new("a", "e1", false, false)] }));
        Assert.Contains("choose an SLA Master entry", Error(ok with { MasterEntries = [new("a", null, true, null)] }));
        Assert.Contains("duplicate row id", Error(ok with { MasterEntries = [new("a", "e1", true, null), new("a", "e2", true, null)] }));

        WorkflowJsonDto Block(WorkflowSlaEscalationDto escalation) => new(
            new WorkflowSettingsDto(),
            [new("s1", "INTERNAL_ACTOR", new WorkflowBlockSettingsDto(SlaSettings: new WorkflowSlaConfigurationDto(
                "standard", [new("r1", "Rule", 1, "minutes", null, escalation)])))]);
        WorkflowSlaSettingsValidator.Validate(Block(new("group", GroupId: "2ef67fae-5dba-498d-846d-45be8c67bb73")));
        Assert.Contains("select the group", Assert.Throws<InvalidOperationException>(
            () => WorkflowSlaSettingsValidator.Validate(Block(new("group")))).Message);
        Assert.Contains("must not also reference", Assert.Throws<InvalidOperationException>(
            () => WorkflowSlaSettingsValidator.Validate(Block(new("group", UserId: "u", GroupId: "2ef67fae-5dba-498d-846d-45be8c67bb73")))).Message);
    }

    // The workflow saves only the entry id and field id; the entry is read from the master each time.
    private static readonly WorkflowSlaConfigurationDto Saved =
        new("advanced", SlaMasterId: "master", MasterFieldId: "f1", EntryId: "e-support");

    private static WorkflowSlaTimerService Service(FakeMaster master) =>
        new(null!, null!, null!, Microsoft.Extensions.Options.Options.Create(new WorkflowSlaOptions()), NullLogger<WorkflowSlaTimerService>.Instance,
            null!, null!, master, null!);

    [Fact]
    public async Task RenamedEntry_IsStillUsed_WithItsNewName()
    {
        var master = new FakeMaster(new Dictionary<string, object?>(Support) { ["f1"] = "Support Plus" });
        var sla = await Service(master).LoadMasterSlaAsync(Saved, CancellationToken.None);
        Assert.Equal("Support Plus", sla.Values!.EntryName);
        Assert.Equal("e-support", sla.Values.EntryId);
        Assert.Equal(["e-support"], master.Requested);
    }

    [Fact]
    public async Task ChangedValues_InTheMaster_ApplyWithoutSavingTheWorkflow()
    {
        var master = new FakeMaster(Support);
        var service = Service(master);
        Assert.Equal(2m, (await service.LoadMasterSlaAsync(Saved, CancellationToken.None)).Values!.ResponseDuration);

        // Someone edits the master entry: 2 Hours → 3 Days, new escalate user.
        master.Row = new Dictionary<string, object?>(Support) { ["f3"] = "3", ["f4"] = "Days", ["f8"] = "lead@example.com" };
        var updated = (await service.LoadMasterSlaAsync(Saved, CancellationToken.None)).Values!;
        Assert.Equal((3m, "days"), (updated.ResponseDuration, updated.ResponseUnit));
        Assert.Equal(["lead@example.com"], updated.EscalationUsers);
    }

    [Fact]
    public async Task DeletedEntry_GivesNoSla_WithAReason()
    {
        var sla = await Service(new FakeMaster(null)).LoadMasterSlaAsync(Saved, CancellationToken.None);
        Assert.Null(sla.Values);
        Assert.Contains("was not found", sla.Problem);
    }

    private sealed class FakeMaster(Dictionary<string, object?>? row) : IFormEntryService
    {
        public Dictionary<string, object?>? Row { get; set; } = row;
        public List<string> Requested { get; } = [];

        public Task<FormEntryGetResult> GetEntriesAsync(string formId, string entryIds, CancellationToken cancellationToken = default)
        {
            Requested.Add(entryIds);
            return Task.FromResult(Row == null
                ? new FormEntryGetResult(FormEntryGetStatus.NotFound, null)
                : new FormEntryGetResult(FormEntryGetStatus.Found, [Row]));
        }

        public Task<IReadOnlyList<FormFieldLabel>> GetFieldLabelsAsync(string formId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<FormFieldLabel>>(Fields);

        public Task<FormEntryResult> UpsertEntryAsync(string formId, Guid entryId, FormEntryUpsertRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryResult> UpsertEntryAsync(string formId, Guid entryId, JsonElement body, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryDeleteResult> DeleteEntryAsync(string formId, Guid entryId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryRestoreResult> RestoreEntryAsync(string formId, Guid entryId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryPermanentDeleteResult> PermanentlyDeleteEntryAsync(string formId, Guid entryId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryAllResult> ListEntriesAsync(string formId, FormEntryAllRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormControlDistinctValuesResult> GetDistinctControlValuesAsync(string wFormId, string wFormControlName, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryByColumnResult> GetEntriesByColumnAsync(string formId, string? columnName, string? columnValue = null,
            IReadOnlyList<FormEntryColumnFilter>? filters = null, string? columnId = null, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryByColumnResult> UpsertEntryByColumnsAsync(string formId, FormEntryUpsertByColumnsRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryByColumnResult> UpdateEntriesByColumnAsync(string formId, string columnName, string columnValue,
            FormEntryUpsertRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
    }

    [Fact]
    public void ResponseDeadline_UsesBusinessHours()
    {
        // Tuesday off, 05:00–21:00 IST; Support response 2 h from Monday 20:30 → Wednesday 06:30.
        var calendar = WorkflowBusinessCalendar.TryCreate(new WorkflowSlaSettingsDto(
            ["Monday", "Wednesday", "Thursday", "Friday"], new WorkflowWorkHoursDto("05:00", "21:00"), "Asia/Calcutta"));
        var values = WorkflowSlaMasterEntry.Read("e-support", Support, Fields, "f1");
        var ist = TimeSpan.FromHours(5.5);
        var arrived = DateTime.SpecifyKind(new DateTime(2026, 11, 2, 20, 30, 0) - ist, DateTimeKind.Utc);
        var due = WorkflowBusinessCalendar.DueAt(arrived, values.ResponseDuration!.Value, values.ResponseUnit, calendar);
        Assert.Equal(DateTime.SpecifyKind(new DateTime(2026, 11, 4, 6, 30, 0) - ist, DateTimeKind.Utc), due);
    }
}

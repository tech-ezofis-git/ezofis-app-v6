using System.Text.Json;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowSlaCustomSetupTests
{
    private static readonly Dictionary<string, string> Entries = new() { ["e1"] = "Support", ["e2"] = "AMC Plan" };

    private static WorkflowSlaConfigurationDto Advanced(WorkflowSlaSelectionDto? selection = null, WorkflowSlaAfterLastDto? after = null) =>
        new("advanced", SlaMasterId: "sla-form", MasterFieldId: "f1", Selection: selection, AfterLastLevel: after);

    private static string? Error(WorkflowSlaConfigurationDto sla, bool onStage = false)
    {
        var json = JsonSerializer.Deserialize<WorkflowJsonDto>(
            onStage
                ? JsonSerializer.Serialize(new { blocks = new[] { new { id = "s1", type = "INTERNAL_ACTOR", settings = new { SlaSettings = sla } } } })
                : JsonSerializer.Serialize(new { settings = new { SlaSettings = sla } }),
            WorkflowJsonSerializerOptions.Deserialize);
        try
        {
            WorkflowSlaSettingsValidator.Validate(json);
            return null;
        }
        catch (InvalidOperationException ex)
        {
            return ex.Message;
        }
    }

    [Theory]
    [InlineData("map", "Hardware", "e2", "value")]
    [InlineData("map", "  HARDWARE ", "e2", "value")]
    [InlineData("map", "Other", "e1", "default")]
    [InlineData("sameName", "amc   plan", "e2", "value")]
    [InlineData("sameName", "Other", "e1", "default")]
    [InlineData("column", "Project A", "e2", "value")]
    [InlineData("column", "Project B", "e1", "value")]
    [InlineData("column", "Project C", "e1", "default")]
    public void Select_FindsTheRule_OrUsesTheDefault(string method, string value, string entry, string source)
    {
        var selection = new WorkflowSlaSelectionDto(
            "req", method, ValueRules: [new("hardware", "e2"), new("empty", null)], DefaultEntryId: "e1");
        var records = new Dictionary<string, string> { ["Project A"] = "AMC PLAN", ["Project B"] = "e1", ["Project C"] = "gone" };

        var pick = WorkflowSlaRuleSelector.Select(selection, [value], Entries, records);

        Assert.Equal((entry, source), (pick.EntryId, pick.Source));
    }

    [Fact]
    public void Select_WithoutARuleOrDefault_GivesNone_AndTriesEveryValue()
    {
        var selection = new WorkflowSlaSelectionDto("req", "sameName");
        Assert.Equal(WorkflowSlaRulePick.NoRule, WorkflowSlaRuleSelector.Select(selection, [], Entries).Source);
        Assert.Null(WorkflowSlaRuleSelector.Select(selection, ["x"], Entries).EntryId);
        Assert.Equal("e1", WorkflowSlaRuleSelector.Select(selection, ["x", "Support"], Entries).EntryId);
    }

    [Fact]
    public void NewSettings_AreLeftOutOfTheJsonWhenNotUsed_SoExistingWorkflowsKeepTheirFingerprint()
    {
        var text = JsonSerializer.Serialize(Advanced());
        Assert.DoesNotContain("selection", text);
        Assert.DoesNotContain("afterLastLevel", text);
    }

    [Fact]
    public void PerRequestSettings_AreActive_AndRoundTrip()
    {
        var sla = Advanced(new WorkflowSlaSelectionDto("req", "map", DefaultEntryId: "e1"));
        Assert.True(WorkflowSlaSchedule.IsMasterEntry(sla));
        Assert.True(WorkflowSlaSchedule.IsDynamic(sla));
        Assert.False(WorkflowSlaSchedule.IsDynamic(Advanced()));
        Assert.Null(Error(sla));

        var back = JsonSerializer.Deserialize<WorkflowSlaConfigurationDto>(
            """{"mode":"advanced","slaMasterId":12,"selection":{"fieldId":"req","method":"column","recordFormId":7,"ruleColumn":"c1","defaultEntryId":3},"afterLastLevel":{"type":"remind","wait":"2","waitUnit":"days"}}""");
        Assert.Equal(("7", "3", 2m), (back!.Selection!.RecordFormId, back.Selection.DefaultEntryId, back.AfterLastLevel!.Wait));
    }

    [Theory]
    [InlineData(null, "map", "request field")]
    [InlineData("req", "guess", "how to find the rule")]
    [InlineData("req", "column", "column that names the rule")]
    public void Selection_IsValidated(string? field, string method, string message)
    {
        Assert.Contains(message, Error(Advanced(new WorkflowSlaSelectionDto(field, method))));
    }

    [Theory]
    [InlineData("later", 1, "days", null, null, "what happens after the last level")]
    [InlineData("remind", 0, "days", null, null, "how long to wait")]
    [InlineData("remind", 1, "weeks", null, null, "minutes, hours or days")]
    [InlineData("group", 1, "days", "not-a-guid", null, "select the group")]
    [InlineData("user", 1, "days", null, " ", "select the user")]
    public void AfterLast_IsValidated(string type, int wait, string unit, string? group, string? user, string message)
    {
        var after = new WorkflowSlaAfterLastDto(type, wait, unit, group, user);
        Assert.Contains(message, Error(Advanced(after: after) with { EntryId = "e1" }, onStage: true));
    }

    [Fact]
    public void AfterLast_OnTheWorkflow_CanOnlyRemind()
    {
        var move = new WorkflowSlaAfterLastDto("manager", 1, "days");
        Assert.Contains("only send a reminder", Error(Advanced(after: move) with { EntryId = "e1" }));
        Assert.Null(Error(Advanced(after: move) with { EntryId = "e1" }, onStage: true));
        Assert.Null(Error(Advanced(after: move with { Type = "remind" }) with { EntryId = "e1" }));
        Assert.Null(Error(Advanced(after: new("none")) with { EntryId = "e1" }));
    }

    [Fact]
    public void FormUsage_FindsWorkflowAndStageSlas_AndWhichEntries()
    {
        var workflowId = Guid.NewGuid();
        var fixedEntry = new WorkflowSlaConfigurationDto(
            "advanced", SlaMasterId: "form-a", MasterEntries: [new("r1", "e1", true), new("r2", "e2", false, true)]);
        var perRequest = Advanced(new WorkflowSlaSelectionDto("req", "column", DefaultEntryId: "e9"));
        var mapped = new WorkflowSlaConfigurationDto(
            "advanced", SlaMasterId: "form-a", Selection: new("req", "map", ValueRules: [new("x", "e3")], DefaultEntryId: "e3"));
        var json = JsonSerializer.Deserialize<WorkflowJsonDto>(
            JsonSerializer.Serialize(new
            {
                settings = new { SlaSettings = fixedEntry },
                blocks = new object[]
                {
                    new { id = "s1", type = "INTERNAL_ACTOR", settings = new { label = "Review", SlaSettings = perRequest } },
                    new { id = "s2", type = "INTERNAL_ACTOR", settings = new { label = "Approve", SlaSettings = mapped } },
                    new { id = "s3", type = "INTERNAL_ACTOR", settings = new { label = "Basic", SlaSettings = new WorkflowSlaConfigurationDto("standard") } },
                    new { id = "s4", type = "INTERNAL_ACTOR", settings = new { label = "No SLA" } },
                },
            }),
            WorkflowJsonSerializerOptions.Deserialize)!;

        var rows = WorkflowSlaFormUsage.Find(workflowId, "Flow", true, json);

        Assert.Equal(3, rows.Count);
        Assert.Equal(("workflow", null, false), (rows[0].Scope, rows[0].StageName, rows[0].AnyEntry));
        Assert.Equal(["e1", "e2"], rows[0].EntryIds);
        Assert.Equal(("sla-form", "Review", true), (rows[1].FormId, rows[1].StageName, rows[1].AnyEntry));
        Assert.Equal(["e9"], rows[1].EntryIds);
        Assert.Equal(("Approve", false), (rows[2].StageName, rows[2].AnyEntry));
        Assert.Equal(["e3"], rows[2].EntryIds);
    }

    [Fact]
    public void StandardMode_RefusesTheCustomSettings()
    {
        var sla = new WorkflowSlaConfigurationDto("standard", AfterLastLevel: new("none"));
        Assert.Contains("Standard mode must not", Error(sla));
    }
}

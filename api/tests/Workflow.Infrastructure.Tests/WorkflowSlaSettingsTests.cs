using System.Text.Json;
using System.Text.Json.Nodes;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowSlaSettingsTests
{
    private const string DesignerJson = """
        {
          "blocks": [
            { "id": "start-1", "type": "START", "settings": { "label": "Gmail" } },
            {
              "id": "verifier-1", "type": "INTERNAL_ACTOR",
              "settings": {
                "label": "Verifier",
                "customUnknownFlag": true,
                "SlaSettings": {
                  "mode": "standard",
                  "rules": [
                    {
                      "id": "sla-001", "name": "First Escalation", "duration": 30, "durationUnit": "minutes",
                      "notifyUserIds": ["user-101"],
                      "escalateTo": { "type": "user", "userId": "user-205", "stageId": null },
                      "initiator": false
                    },
                    {
                      "id": "sla-002", "name": "Second Escalation", "duration": 2, "durationUnit": "hours",
                      "notifyUserIds": ["user-102"],
                      "escalateTo": { "type": "stage", "userId": null, "stageId": "approver-1" },
                      "initiator": true
                    }
                  ],
                  "slaMasterId": null,
                  "notifications": { "email": true, "sms": false }
                }
              }
            },
            {
              "id": "approver-1", "type": "INTERNAL_ACTOR",
              "settings": {
                "label": "Approver",
                "SlaSettings": {
                  "mode": "advanced", "rules": [], "slaMasterId": 42,
                  "notifications": { "email": true, "sms": true }
                }
              }
            },
            { "id": "end-1", "type": "END", "settings": { "label": "End" } }
          ],
          "rules": [],
          "settings": {
            "general": {
              "name": "SLA test",
              "slaSettings": { "slaType": "STANDARD", "workDays": [], "timeZone": "" }
            },
            "SlaSettings": {
              "mode": "standard",
              "rules": [
                { "id": "g-1", "name": "Resolve", "duration": 3, "durationUnit": "days", "notifyUserIds": ["user-1"], "initiator": true }
              ],
              "slaMasterId": null,
              "notifications": { "email": true, "sms": false }
            }
          }
        }
        """;

    private static WorkflowJsonDto Parse(string json) =>
        JsonSerializer.Deserialize<WorkflowJsonDto>(json, WorkflowJsonSerializerOptions.Deserialize)!;

    private static WorkflowJsonDto WithBlockSla(WorkflowJsonDto json, string blockId, WorkflowSlaConfigurationDto sla) =>
        json with
        {
            Blocks = json.Blocks!.Select(b => b.Id == blockId ? b with { Settings = b.Settings with { SlaSettings = sla } } : b).ToList()
        };

    private static WorkflowSlaConfigurationDto StandardRule(WorkflowSlaConfigurationRuleDto rule) =>
        new("standard", [rule], null, new WorkflowSlaNotificationsDto(true, false));

    private static WorkflowSlaConfigurationRuleDto ValidRule(WorkflowSlaEscalationDto? escalateTo = null) =>
        new("r-1", "Rule", 10, "minutes", ["user-1"], escalateTo, false);

    [Fact]
    public void Deserialize_ReadsBlockAndWorkflowSlaSettings_WithoutTouchingLegacyGeneralSlaSettings()
    {
        var json = Parse(DesignerJson);

        var verifier = json.Blocks!.Single(b => b.Id == "verifier-1").Settings.SlaSettings!;
        Assert.Equal("standard", verifier.Mode);
        Assert.Equal(2, verifier.Rules!.Count);
        Assert.Equal("user-205", verifier.Rules[0].EscalateTo!.UserId);
        Assert.Null(verifier.Rules[0].EscalateTo!.StageId);
        Assert.Equal("approver-1", verifier.Rules[1].EscalateTo!.StageId);
        Assert.Equal(2m, verifier.Rules[1].Duration);

        var approver = json.Blocks!.Single(b => b.Id == "approver-1").Settings.SlaSettings!;
        Assert.Equal("advanced", approver.Mode);
        Assert.Equal("42", approver.SlaMasterId); // numeric legacy form id read as string

        Assert.Equal("days", json.Settings!.SlaSettings!.Rules![0].DurationUnit);
        Assert.NotNull(json.Settings.General!.SlaSettings); // legacy work-hours object still binds to its own DTO
    }

    [Fact]
    public void Serialize_WithStorageOptions_KeepsExactSlaSettingsPropertyName()
    {
        var stored = JsonSerializer.Serialize(Parse(DesignerJson), WorkflowJsonSerializerOptions.Storage);
        var node = JsonNode.Parse(stored)!.AsObject();

        Assert.NotNull(node["settings"]!["SlaSettings"]);
        Assert.Null(node["settings"]!.AsObject().FirstOrDefault(p => p.Key == "slaSettings").Value);
        Assert.NotNull(node["settings"]!["general"]!["slaSettings"]); // legacy work-hours object stays separate
        Assert.NotNull(node["blocks"]![1]!["settings"]!["SlaSettings"]);
        Assert.Equal("sla-002", node["blocks"]![1]!["settings"]!["SlaSettings"]!["rules"]![1]!["id"]!.GetValue<string>());
    }

    [Fact]
    public void RawDesignerJson_RoundTrip_PreservesSlaSettingsAndUnknownProperties()
    {
        // Create/Update persist the raw designer text verbatim; GET re-parses it through JsonNode.
        var reparsed = JsonNode.Parse(JsonNode.Parse(DesignerJson)!.ToJsonString())!;

        Assert.True(reparsed["blocks"]![1]!["settings"]!["customUnknownFlag"]!.GetValue<bool>());
        Assert.True(JsonNode.DeepEquals(
            JsonNode.Parse(DesignerJson)!["blocks"]![1]!["settings"]!["SlaSettings"],
            reparsed["blocks"]![1]!["settings"]!["SlaSettings"]));
    }

    [Fact]
    public void Validate_AcceptsValidConfiguration()
    {
        WorkflowSlaSettingsValidator.Validate(Parse(DesignerJson));
    }

    [Fact]
    public void Validate_AcceptsWorkflowWithoutSlaSettings()
    {
        WorkflowSlaSettingsValidator.Validate(Parse("""{ "blocks": [ { "id": "a", "type": "INTERNAL_ACTOR", "settings": {} } ], "settings": { "general": { "name": "x" } } }"""));
        WorkflowSlaSettingsValidator.Validate(null);
    }

    [Fact]
    public void Validate_AcceptsRuleWithoutEscalation()
    {
        WorkflowSlaSettingsValidator.Validate(WithBlockSla(Parse(DesignerJson), "verifier-1", StandardRule(ValidRule())));
    }

    public static IEnumerable<object[]> InvalidBlockConfigurations()
    {
        yield return [new WorkflowSlaConfigurationDto("fast", [], null, null), "mode must be"];
        yield return [new WorkflowSlaConfigurationDto(null, [], null, null), "mode must be"];
        yield return [new WorkflowSlaConfigurationDto("advanced", [], null, null), "select an SLA Master"];
        yield return [new WorkflowSlaConfigurationDto("advanced", [ValidRule()], "m-1", null), "must not contain Standard rules"];
        yield return [new WorkflowSlaConfigurationDto("standard", [ValidRule()], "m-1", null), "must not reference an SLA Master"];
        yield return [StandardRule(ValidRule() with { Duration = 0 }), "greater than zero"];
        yield return [StandardRule(ValidRule() with { Duration = null }), "greater than zero"];
        yield return [StandardRule(ValidRule() with { DurationUnit = "weeks" }), "duration unit"];
        yield return [StandardRule(ValidRule() with { Name = " " }), "name is required"];
        yield return [StandardRule(ValidRule() with { Id = null }), "id is required"];
        yield return [new WorkflowSlaConfigurationDto("standard", [ValidRule(), ValidRule() with { Name = "Other" }], null, null), "duplicate rule id"];
        yield return [StandardRule(ValidRule(new("user", null, null))), "select the user"];
        yield return [StandardRule(ValidRule(new("user", "u-1", "approver-1"))), "must not also reference a stage"];
        yield return [StandardRule(ValidRule(new("stage", "u-1", "approver-1"))), "must not also reference a user"];
        yield return [StandardRule(ValidRule(new("stage", null, null))), "select the stage"];
        yield return [StandardRule(ValidRule(new("stage", null, "other-workflow-stage"))), "is not a stage of this workflow"];
        yield return [StandardRule(ValidRule(new("stage", null, "start-1"))), "is not a stage of this workflow"]; // Gmail trigger
        yield return [StandardRule(ValidRule(new("stage", null, "verifier-1"))), "cannot escalate to itself"];
        yield return [StandardRule(ValidRule(new("group", "g", null))), "must be 'user' or 'stage'"];
        yield return [StandardRule(ValidRule(new(null, "stale-user", null))), "choose User or Stage"];
    }

    [Theory]
    [MemberData(nameof(InvalidBlockConfigurations))]
    public void Validate_RejectsInvalidBlockConfiguration(WorkflowSlaConfigurationDto sla, string expectedMessage)
    {
        var json = WithBlockSla(Parse(DesignerJson), "verifier-1", sla);

        var ex = Assert.Throws<InvalidOperationException>(() => WorkflowSlaSettingsValidator.Validate(json));
        Assert.Contains(expectedMessage, ex.Message);
        Assert.Contains("'Verifier'", ex.Message);
    }

    [Fact]
    public void Validate_AcceptsManualUserStartBlockAsEscalationStage()
    {
        // The designer saves the first Manual User as a START block.
        var json = Parse(DesignerJson);
        json = json with
        {
            Blocks = json.Blocks!
                .Select(b => b.Id == "start-1" ? b with { Settings = b.Settings with { ToolType = "manual_user" } } : b)
                .ToList()
        };

        WorkflowSlaSettingsValidator.Validate(WithBlockSla(json, "verifier-1", StandardRule(ValidRule(new("stage", null, "start-1")))));
    }

    [Fact]
    public void Validate_AcceptsEndBlockAsEscalationStage()
    {
        // Escalating to END completes the ticket.
        WorkflowSlaSettingsValidator.Validate(WithBlockSla(Parse(DesignerJson), "verifier-1", StandardRule(ValidRule(new("stage", null, "end-1")))));
    }

    [Fact]
    public void Validate_RejectsEscalationOnWorkflowSla()
    {
        var json = Parse(DesignerJson);
        json = json with
        {
            Settings = json.Settings! with { SlaSettings = StandardRule(ValidRule(new("user", "u-1", null))) }
        };

        var ex = Assert.Throws<InvalidOperationException>(() => WorkflowSlaSettingsValidator.Validate(json));
        Assert.Contains("Workflow SLA", ex.Message);
        Assert.Contains("does not support Escalate To", ex.Message);
    }
}

using SaaSApp.Workflow.Application.Workflows;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class WorkflowConditionJsonTests
{
    [Fact]
    public void Reads_standard_rules_and_group_logic()
    {
        const string json = """
            {"blocks":[
              {"id":"start","type":"START","settings":{}},
              {"id":"cond-1","type":"CONDITION","settings":{
                "standardCondition":true,
                "conditions":{"groupLogic":"ANY","condition":[
                  {"id":"r1","name":"Amount","logic":"IS_GREATER_THAN","value":"10000","fieldValue":false},
                  {"id":"r2","name":"Amount","logic":"IS_LESSER_THAN","value":"Limit","fieldValue":true}
                ]}
              }}
            ]}
            """;

        Assert.True(WorkflowConditionJson.TryRead(json, "cond-1", out var config));
        Assert.NotNull(config);
        Assert.True(config!.Standard);
        Assert.False(config.MatchAll);
        Assert.Equal(2, config.Rules.Count);
        Assert.Equal(new WorkflowConditionRule("Amount", "IS_GREATER_THAN", "10000", false), config.Rules[0]);
        Assert.True(config.Rules[1].ValueIsField);
    }

    [Fact]
    public void Reads_advanced_mode_and_designer_duplicate_keys()
    {
        const string json = """
            {"Blocks":[{"Id":"cond-2","Settings":{
              "standardCondition":false,
              "masterFormId":"master-7",
              "masterConditions":{"masterFormId":0,"condition":[{"id":"m1","field":"Vendor","masterColumn":"VendorName"}]}
            }}]}
            """;

        Assert.True(WorkflowConditionJson.TryRead(json, "cond-2", out var config));
        Assert.False(config!.Standard);
        Assert.Equal("master-7", config.MasterFormId);
        Assert.Equal(new WorkflowConditionMasterMapping("Vendor", "VendorName"), Assert.Single(config.MasterMappings));
    }

    [Fact]
    public void Reads_conditions_saved_as_a_json_string_and_logic_combine()
    {
        const string json = """
            {"blocks":[{"id":"cond-3","settings":{
              "logicCombine":"ANY",
              "conditions":"{\"condition\":[{\"name\":\"Category\",\"logic\":\"IS_ANY_OF\",\"value\":[\"A\",\"B\"]}]}"
            }}]}
            """;

        Assert.True(WorkflowConditionJson.TryRead(json, "cond-3", out var config));
        Assert.True(config!.Standard);
        Assert.False(config.MatchAll);
        Assert.Equal("""["A","B"]""", Assert.Single(config.Rules).Value);
    }

    [Fact]
    public void Missing_block_returns_false()
    {
        Assert.False(WorkflowConditionJson.TryRead("""{"blocks":[]}""", "cond-1", out _));
        Assert.False(WorkflowConditionJson.TryRead("not json", "cond-1", out _));
    }
}

using SaaSApp.Workflow.Application.Workflows;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class WorkflowEndSyncJsonTests
{
    [Fact]
    public void TryRead_loads_camelCase_endSync_from_block_settings()
    {
        var json = """
            {"blocks":[{"id":"step-1","type":"INTERNAL_ACTOR","settings":{
              "endSync":{
                "enabled":true,
                "target":"MASTER_FORM",
                "masterFormId":"8aaadcde-f2f9-4c11-9abc-1234567890ab",
                "fieldMappings":[
                  {"workflowFieldId":"Vendor_Name","masterFieldId":"Vendor","IsMainField":true},
                  {"workflowFieldId":"Amount","masterFieldId":"Total","IsMainField":false}
                ]
              }
            }}]}
            """;

        Assert.True(WorkflowEndSyncJson.TryRead(json, "step-1", out var config));
        Assert.NotNull(config);
        Assert.True(config!.Enabled);
        Assert.Equal("MASTER_FORM", config.Target);
        Assert.Equal("8aaadcde-f2f9-4c11-9abc-1234567890ab", config.MasterFormId);
        Assert.Equal(2, config.FieldMappings.Count);
        Assert.True(config.FieldMappings[0].IsMainField);
        Assert.Equal("Vendor_Name", config.FieldMappings[0].WorkflowFieldId);
    }

    [Fact]
    public void TryRead_accepts_numeric_masterFormId_and_string_bool()
    {
        var json = """
            {"Blocks":[{"Id":"step-1","Type":"END","Settings":{
              "EndSync":{
                "Enabled":"true",
                "Target":"MASTER_FORM",
                "MasterFormId":42,
                "FieldMappings":[
                  {"WorkflowFieldId":"Code","MasterFieldId":"ItemCode","isMainField":"true"}
                ]
              }
            }}]}
            """;

        Assert.True(WorkflowEndSyncJson.TryRead(json, "step-1", out var config));
        Assert.Equal("42", config!.MasterFormId);
        Assert.True(config.Enabled);
        Assert.True(config.FieldMappings[0].IsMainField);
    }

    [Fact]
    public void TryRead_finds_END_block_by_type_when_id_is_END()
    {
        var json = """
            {"blocks":[
              {"id":"human-1","type":"INTERNAL_ACTOR","settings":{}},
              {"id":"finish","type":"END","data":{
                "endSync":{
                  "enabled":true,
                  "target":"MASTER_FORM",
                  "masterFormId":"master-form",
                  "fieldMappings":[
                    {"workflowFieldId":"Code","masterFieldId":"ItemCode","IsMainField":true}
                  ]
                }
              }}
            ]}
            """;

        Assert.True(WorkflowEndSyncJson.TryRead(json, "END", out var config));
        Assert.Equal("master-form", config!.MasterFormId);
        Assert.True(config.Enabled);
        Assert.True(config.FieldMappings[0].IsMainField);
    }

    [Fact]
    public void TryRead_returns_false_when_that_activity_is_not_enabled()
    {
        var json = """
            {"blocks":[
              {"id":"step-1","type":"INTERNAL_ACTOR","settings":{
                "endSync":{
                  "enabled":true,
                  "target":"MASTER_FORM",
                  "masterFormId":"master-form",
                  "fieldMappings":[
                    {"workflowFieldId":"Code","masterFieldId":"ItemCode","IsMainField":true}
                  ]
                }
              }},
              {"id":"step-2","type":"INTERNAL_ACTOR","settings":{
                "endSync":{
                  "enabled":false,
                  "target":"MASTER_FORM",
                  "masterFormId":"master-form",
                  "fieldMappings":[
                    {"workflowFieldId":"Code","masterFieldId":"ItemCode","IsMainField":true}
                  ]
                }
              }}
            ]}
            """;

        Assert.True(WorkflowEndSyncJson.TryRead(json, "step-1", out var enabled));
        Assert.True(enabled!.Enabled);
        Assert.False(WorkflowEndSyncJson.TryRead(json, "step-2", out _));
        Assert.False(WorkflowEndSyncJson.TryRead(json, "step-missing", out _));
    }

    [Fact]
    public void TryRead_finds_enabled_node_by_step_label()
    {
        var json = """
            {"blocks":[{"id":"abc123","type":"INTERNAL_ACTOR","settings":{
              "label":"Approved",
              "endSync":{
                "enabled":true,
                "target":"MASTER_FORM",
                "masterFormId":"master-form",
                "fieldMappings":[
                  {"workflowFieldId":"Code","masterFieldId":"ItemCode","IsMainField":true}
                ]
              }
            }}]}
            """;

        Assert.True(WorkflowEndSyncJson.TryRead(json, "abc123", out var byId, "Approved"));
        Assert.Equal("master-form", byId!.MasterFormId);
        Assert.True(WorkflowEndSyncJson.TryRead(json, "missing-id", out var byName, "Approved"));
        Assert.Equal("master-form", byName!.MasterFormId);
    }

    [Fact]
    public void TryRead_uses_data_endSync_when_settings_toggle_is_off()
    {
        var json = """
            {"blocks":[{"id":"step-1","settings":{
              "endSync":{"enabled":false,"target":"MASTER_FORM","masterFormId":"ignored"}
            },"data":{
              "endSync":{
                "enabled":true,
                "target":"MASTER_FORM",
                "masterFormId":"master-form",
                "fieldMappings":[
                  {"workflowFieldId":"Code","masterFieldId":"ItemCode","IsMainField":true}
                ]
              }
            }}]}
            """;

        Assert.True(WorkflowEndSyncJson.TryRead(json, "step-1", out var config));
        Assert.Equal("master-form", config!.MasterFormId);
    }
}

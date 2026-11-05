using SaaSApp.Workflow.Application.Workflows;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class WorkflowConnectorJsonTests
{
    private const string Target = "800cf884-274c-442a-8dab-ed9f4584a9ab";

    [Fact]
    public void Reads_the_target_workflow_id()
    {
        var json = $$$"""{"blocks":[{"id":"conn-1","type":"WORKFLOW_CONNECTOR","settings":{"subWorkflowId":"{{{Target}}}"}}]}""";

        Assert.True(WorkflowConnectorJson.TryReadTarget(json, "conn-1", out var target));
        Assert.Equal(Guid.Parse(Target), target);
    }

    [Fact]
    public void Reads_data_when_there_are_no_settings()
    {
        var json = $$$"""{"Blocks":[{"Id":"conn-1","data":{"subWorkflowId":"{{{Target}}}"}}]}""";

        Assert.True(WorkflowConnectorJson.TryReadTarget(json, "conn-1", out var target));
        Assert.Equal(Guid.Parse(Target), target);
    }

    [Theory]
    [InlineData("""{"blocks":[{"id":"conn-1","settings":{}}]}""")]
    [InlineData("""{"blocks":[{"id":"conn-1","settings":{"subWorkflowId":""}}]}""")]
    [InlineData("""{"blocks":[{"id":"conn-1","settings":{"subWorkflowId":42}}]}""")]
    [InlineData("""{"blocks":[{"id":"conn-1","settings":{"subWorkflowId":"00000000-0000-0000-0000-000000000000"}}]}""")]
    public void Block_without_a_V6_target_has_no_target(string json)
    {
        Assert.True(WorkflowConnectorJson.TryReadTarget(json, "conn-1", out var target));
        Assert.Null(target);
    }

    [Theory]
    [InlineData("""{"blocks":[{"id":"other","settings":{}}]}""")]
    [InlineData("not json")]
    [InlineData("")]
    public void Missing_block_or_bad_json_is_not_found(string json)
    {
        Assert.False(WorkflowConnectorJson.TryReadTarget(json, "conn-1", out _));
    }
}

using System.Text.Json;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;
using SaaSApp.Workflow.Domain.Enums;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowSubProcessRulesTests
{
    private static readonly Guid MainWorkflow = Guid.NewGuid();
    private static readonly Guid MainProcess = Guid.NewGuid();
    private static readonly Guid SubWorkflow = Guid.NewGuid();
    private static readonly Guid SubProcess = Guid.NewGuid();

    [Theory]
    [InlineData("\"7f3c1f1e-8f43-4a55-9a65-3c1e2b0d9a11\"")] // V6 workflow GUID
    [InlineData("\"\"")] // connector with no target yet
    [InlineData("0")] // initiator off
    [InlineData("42")] // V5 workflow id
    [InlineData("null")]
    public void Block_settings_accept_every_sub_workflow_id_shape_the_builder_sends(string subWorkflowId)
    {
        var json = $$"""{ "id": "b1", "type": "WORKFLOW_CONNECTOR", "settings": { "subWorkflowId": {{subWorkflowId}}, "workflowInitiator": true, "subWorkflowName": "Child" } }""";

        var block = JsonSerializer.Deserialize<WorkflowBlockDto>(json, WorkflowJsonSerializerOptions.Deserialize);

        Assert.Equal("WORKFLOW_CONNECTOR", block!.Type);
        if (subWorkflowId == "null")
            Assert.Null(block.Settings.SubWorkflowId);
        else
            Assert.Equal(subWorkflowId, block.Settings.SubWorkflowId!.Value.GetRawText());
    }

    [Fact]
    public void Block_settings_keep_the_sub_workflow_id_when_written_back_for_storage()
    {
        const string guid = "7f3c1f1e-8f43-4a55-9a65-3c1e2b0d9a11";
        var block = JsonSerializer.Deserialize<WorkflowBlockDto>(
            $$"""{ "id": "b1", "type": "START", "settings": { "subWorkflowId": "{{guid}}" } }""",
            WorkflowJsonSerializerOptions.Deserialize);

        var stored = JsonSerializer.Serialize(block, WorkflowJsonSerializerOptions.Storage);

        Assert.Contains($"\"subWorkflowId\":\"{guid}\"", stored);
    }

    [Theory]
    [InlineData(WorkflowInstanceStatus.Pending, 0)]
    [InlineData(WorkflowInstanceStatus.Running, 0)]
    [InlineData(WorkflowInstanceStatus.Paused, 0)]
    [InlineData(WorkflowInstanceStatus.Completed, 1)]
    [InlineData(WorkflowInstanceStatus.Failed, 1)]
    [InlineData(WorkflowInstanceStatus.Cancelled, 1)]
    public void Flow_status_is_one_only_once_the_request_has_finished(WorkflowInstanceStatus status, int expected)
    {
        Assert.Equal(expected, WorkflowSubProcessRules.ToFlowStatus(status));
    }

    [Fact]
    public void Duration_is_whole_seconds_since_the_last_action()
    {
        var now = new DateTime(2026, 10, 31, 12, 0, 0, DateTimeKind.Utc);

        Assert.Equal(90, WorkflowSubProcessRules.ToDurationSeconds(now.AddSeconds(-90.4), now));
        Assert.Equal(0, WorkflowSubProcessRules.ToDurationSeconds(now.AddSeconds(5), now));
        Assert.Null(WorkflowSubProcessRules.ToDurationSeconds(null, now));
    }

    [Fact]
    public void Validate_accepts_a_link_between_two_requests_of_different_workflows()
    {
        WorkflowSubProcessRules.Validate(new WorkflowSubProcessLinkDto(MainWorkflow, MainProcess, SubWorkflow, SubProcess));
    }

    [Fact]
    public void Validate_rejects_a_request_linked_to_itself()
    {
        var link = new WorkflowSubProcessLinkDto(MainWorkflow, MainProcess, SubWorkflow, MainProcess);

        Assert.Throws<ArgumentException>(() => WorkflowSubProcessRules.Validate(link));
    }

    [Fact]
    public void Validate_rejects_a_workflow_starting_itself()
    {
        var link = new WorkflowSubProcessLinkDto(MainWorkflow, MainProcess, MainWorkflow, SubProcess);

        Assert.Throws<ArgumentException>(() => WorkflowSubProcessRules.Validate(link));
    }

    [Fact]
    public void Validate_rejects_missing_ids()
    {
        var link = new WorkflowSubProcessLinkDto(Guid.Empty, MainProcess, SubWorkflow, SubProcess);

        Assert.Throws<ArgumentException>(() => WorkflowSubProcessRules.Validate(link));
    }
}

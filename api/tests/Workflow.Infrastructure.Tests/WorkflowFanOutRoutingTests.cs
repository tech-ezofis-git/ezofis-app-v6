using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Domain.Entities;
using SaaSApp.Workflow.Domain.Enums;
using WorkflowEntity = SaaSApp.Workflow.Domain.Entities.Workflow;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class WorkflowFanOutRoutingTests
{
    [Theory]
    [InlineData("conn-first")]
    [InlineData("conn-last")]
    public void Ticket_follows_the_real_step_not_a_connector_when_an_edge_fans_out(string connectorPosition)
    {
        var wf = WorkflowEntity.Create(Guid.NewGuid(), "DSSA", null, TriggerType.Manual, Guid.NewGuid());
        var edges = new List<string>
        {
            """{"Id":"e1","ProceedAction":"Submit","ToBlockId":"conn-a"}""",
            """{"Id":"e2","ProceedAction":"Submit","ToBlockId":"user-b"}""",
        };
        if (connectorPosition == "conn-last")
            edges.Reverse();

        var start = WorkflowStep.Create(
            wf.Id, "Start", StepType.Manual, 1, activityId: "start", stageType: "START",
            actionsJson: "[" + string.Join(",", edges) + "]");
        var connector = WorkflowStep.Create(wf.Id, "A", StepType.Manual, 2, activityId: "conn-a", stageType: "WORKFLOW_CONNECTOR");
        var user = WorkflowStep.Create(wf.Id, "Manual User", StepType.Manual, 3, activityId: "user-b", stageType: "INTERNAL_ACTOR");

        var next = WorkflowStepActionsHelper.ResolveNextStepByReview(start, "Submit", [start, connector, user]);

        Assert.Equal(user.Id, next?.Id);
    }

    [Fact]
    public void Connector_is_used_when_it_is_the_only_target()
    {
        var wf = WorkflowEntity.Create(Guid.NewGuid(), "DSSA", null, TriggerType.Manual, Guid.NewGuid());
        var start = WorkflowStep.Create(
            wf.Id, "Start", StepType.Manual, 1, activityId: "start", stageType: "START",
            actionsJson: """[{"Id":"e1","ProceedAction":"Submit","ToBlockId":"conn-a"}]""");
        var connector = WorkflowStep.Create(wf.Id, "A", StepType.Manual, 2, activityId: "conn-a", stageType: "WORKFLOW_CONNECTOR");

        Assert.Equal(connector.Id, WorkflowStepActionsHelper.ResolveNextStepByReview(start, "Submit", [start, connector])?.Id);
    }
}

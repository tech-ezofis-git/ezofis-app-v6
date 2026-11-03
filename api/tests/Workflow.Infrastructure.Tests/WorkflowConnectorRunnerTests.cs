using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;
using SaaSApp.Workflow.Application.Workflows.Commands.StartWorkflow;
using SaaSApp.Workflow.Domain.Entities;
using SaaSApp.Workflow.Domain.Enums;
using SaaSApp.Workflow.Infrastructure.Services;
using WorkflowEntity = SaaSApp.Workflow.Domain.Entities.Workflow;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class WorkflowConnectorRunnerTests
{
    private const string SubmitEdge = """[{"Id":"e1","ProceedAction":"Submit","ToBlockId":"approve"}]""";

    private const string ParentForm = """[{"id":"p-vendor","label":"Vendor","type":"SHORT_TEXT"}]""";
    private const string ChildForm = """[{"id":"c-vendor","label":"Vendor","type":"SHORT_TEXT"}]""";

    [Fact]
    public async Task Starts_links_and_moves_the_parent_on()
    {
        var setup = new Setup();

        var result = await setup.Runner().TryRunAsync(setup.Instance.Id, depth: 1);

        Assert.NotNull(result);
        var start = Assert.Single(setup.Started);
        Assert.Equal(setup.Child.Id, start.WorkflowId);
        Assert.Equal("Acme", start.FormDataFields!["c-vendor"]);

        var link = Assert.Single(setup.Links);
        Assert.Equal(setup.Parent.Id, link.MainWorkflowId);
        Assert.Equal(setup.Instance.Id, link.MainProcessId);
        Assert.Equal(setup.Child.Id, link.SubWorkflowId);
        Assert.Equal(setup.ChildInstanceId, link.SubProcessId);

        var move = Assert.Single(setup.Moves);
        Assert.Equal("conn-1", move.ActivityId);
        Assert.Equal("Submit", move.Review);
        Assert.Equal(2, move.ConditionDepth);
        Assert.Equal("Workflow Connector 'Start purchase': started REQ-9 in 'Purchase'.", move.Comments);
        Assert.Empty(setup.Comments);
    }

    [Fact]
    public async Task No_target_leaves_the_request_with_a_comment()
    {
        var setup = new Setup(workflowJson: """{"blocks":[{"id":"conn-1","settings":{}}]}""");

        Assert.Null(await setup.Runner().TryRunAsync(setup.Instance.Id));
        AssertNothingStarted(setup, "no connected workflow is selected");
    }

    [Fact]
    public async Task Unpublished_child_workflow_is_not_started()
    {
        var setup = new Setup(publishChild: false);

        Assert.Null(await setup.Runner().TryRunAsync(setup.Instance.Id));
        AssertNothingStarted(setup, "'Purchase' isn't published");
    }

    [Fact]
    public async Task Child_workflow_with_its_own_connector_is_not_started()
    {
        var setup = new Setup(childHasConnector: true);

        Assert.Null(await setup.Runner().TryRunAsync(setup.Instance.Id));
        AssertNothingStarted(setup, "one level deep");
    }

    [Fact]
    public async Task User_without_access_to_the_child_workflow_starts_nothing()
    {
        var setup = new Setup(canAccessChild: false);

        Assert.Null(await setup.Runner().TryRunAsync(setup.Instance.Id));
        AssertNothingStarted(setup, "can't access 'Purchase'");
    }

    [Fact]
    public async Task Request_that_is_itself_a_sub_process_starts_nothing()
    {
        var setup = new Setup(parentIsSubProcess: true);

        Assert.Null(await setup.Runner().TryRunAsync(setup.Instance.Id));
        AssertNothingStarted(setup, "itself a sub-process");
    }

    [Fact]
    public async Task Block_without_a_connection_starts_nothing()
    {
        var setup = new Setup(actionsJson: null);

        Assert.Null(await setup.Runner().TryRunAsync(setup.Instance.Id));
        AssertNothingStarted(setup, "no connection");
    }

    [Fact]
    public async Task Link_failure_after_start_says_which_request_was_started()
    {
        var setup = new Setup { LinkFailure = new InvalidOperationException("boom") };

        Assert.Null(await setup.Runner().TryRunAsync(setup.Instance.Id));
        Assert.Single(setup.Started);
        Assert.Empty(setup.Moves);
        Assert.Contains("REQ-9 was started", Assert.Single(setup.Comments));
    }

    [Fact]
    public async Task Chain_limit_stops_loops()
    {
        var setup = new Setup();

        Assert.Null(await setup.Runner().TryRunAsync(setup.Instance.Id, WorkflowConditionRouter.MaxChainDepth));
        AssertNothingStarted(setup, "automatic steps in a row");
    }

    [Fact]
    public async Task Non_connector_step_is_ignored()
    {
        var setup = new Setup(stageType: "INTERNAL_ACTOR");

        Assert.Null(await setup.Runner().TryRunAsync(setup.Instance.Id));
        Assert.Empty(setup.Started);
        Assert.Empty(setup.Comments);
    }

    private static void AssertNothingStarted(Setup setup, string reason)
    {
        Assert.Empty(setup.Started);
        Assert.Empty(setup.Links);
        Assert.Empty(setup.Moves);
        Assert.Contains(reason, Assert.Single(setup.Comments));
    }

    private sealed class Setup
    {
        private readonly string _workflowJson;
        private readonly bool _canAccessChild;
        private readonly bool _parentIsSubProcess;

        public Setup(
            string? workflowJson = null,
            string? actionsJson = SubmitEdge,
            string stageType = "WORKFLOW_CONNECTOR",
            bool publishChild = true,
            bool childHasConnector = false,
            bool canAccessChild = true,
            bool parentIsSubProcess = false)
        {
            _canAccessChild = canAccessChild;
            _parentIsSubProcess = parentIsSubProcess;

            Child = WorkflowEntity.Create(Guid.NewGuid(), "Purchase", null, TriggerType.Manual, Guid.NewGuid());
            Child.SetInitiateLinks(null, "child-form", Guid.NewGuid());
            Child.AddStep(WorkflowStep.Create(
                Child.Id, childHasConnector ? "Nested" : "Manager", StepType.Approval, 1,
                activityId: "c-1", stageType: childHasConnector ? "WORKFLOW_CONNECTOR" : "INTERNAL_ACTOR"));
            if (publishChild)
                Child.Publish();

            _workflowJson = workflowJson
                ?? $$$"""{"blocks":[{"id":"conn-1","type":"WORKFLOW_CONNECTOR","settings":{"subWorkflowId":"{{{Child.Id}}}"}}]}""";

            Parent = WorkflowEntity.Create(Guid.NewGuid(), "Expense", null, TriggerType.Manual, Guid.NewGuid());
            Parent.SetInitiateLinks(null, "parent-form", Guid.NewGuid());
            var step = WorkflowStep.Create(
                Parent.Id, "Start purchase", StepType.Manual, 2, activityId: "conn-1", stageType: stageType, actionsJson: actionsJson);
            Parent.AddStep(step);
            Parent.Publish();

            Instance = WorkflowInstance.Create(Guid.NewGuid(), Parent.Id, "Expense", 1, Guid.NewGuid());
            var stepInstance = WorkflowStepInstance.Create(Instance.Id, step.Id, step.Name, step.StepType, step.Order);
            stepInstance.Start();
            Instance.AddStepInstance(stepInstance);
            Instance.SetCurrentStep(stepInstance.Id);
            Instance.Start();
        }

        public WorkflowEntity Parent { get; }
        public WorkflowEntity Child { get; }
        public WorkflowInstance Instance { get; }
        public Guid ChildInstanceId { get; } = Guid.NewGuid();
        public Exception? LinkFailure { get; init; }
        public List<StartWorkflowCommand> Started { get; } = [];
        public List<WorkflowSubProcessLinkDto> Links { get; } = [];
        public List<MoveToNextStepCommand> Moves { get; } = [];
        public List<string> Comments { get; } = [];

        public WorkflowConnectorRunner Runner() => new(
            Stub.Of<IWorkflowRepository>((m, a) => m.Name switch
            {
                nameof(IWorkflowRepository.GetInstanceByIdAsync) => Task.FromResult<WorkflowInstance?>(Instance),
                nameof(IWorkflowRepository.GetByIdWithStepsAsync) =>
                    Task.FromResult<WorkflowEntity?>((Guid)a![0]! == Child.Id ? Child : Parent),
                _ => null
            }),
            Stub.Of<IWorkflowJsonStorageService>((m, _) =>
                m.Name == nameof(IWorkflowJsonStorageService.GetWorkflowJsonAsync)
                    ? Task.FromResult<string?>(_workflowJson)
                    : null),
            Stub.Of<IFormJsonStorageService>((m, a) =>
                m.Name == nameof(IFormJsonStorageService.GetFormJsonAsync)
                    ? Task.FromResult<string?>((string)a![0]! == "child-form" ? ChildForm : ParentForm)
                    : null),
            Stub.Of<IWorkflowLegacyMailboxSyncService>((m, _) =>
                m.Name == nameof(IWorkflowLegacyMailboxSyncService.TryGetProcessFormIdentityAsync)
                    ? Task.FromResult<(string? FormId, Guid? FormEntryId)?>(("parent-form", Guid.NewGuid()))
                    : null),
            Stub.Of<IWorkflowEzfbFormDataLoader>((_, _) => Task.FromResult<string?>("""{"p-vendor":"Acme"}""")),
            Stub.Of<IWorkflowSecurityService>((m, a) =>
                m.Name == nameof(IWorkflowSecurityService.CanAccessWorkflowAsync)
                    ? Task.FromResult((Guid)a![0]! != Child.Id || _canAccessChild)
                    : null),
            Stub.Of<IWorkflowSubProcessService>((m, a) =>
            {
                if (m.Name == nameof(IWorkflowSubProcessService.IsSubProcessAsync))
                    return Task.FromResult(_parentIsSubProcess);
                if (m.Name != nameof(IWorkflowSubProcessService.LinkAsync))
                    return null;
                if (LinkFailure != null)
                    return Task.FromException<WorkflowSubProcessLinkDto>(LinkFailure);
                var link = (WorkflowSubProcessLinkDto)a![2]!;
                Links.Add(link);
                return Task.FromResult(link);
            }),
            Stub.Of<IDynamicTableRepository>((m, a) =>
            {
                if (m.Name != nameof(IDynamicTableRepository.AddCommentAsync))
                    return null;
                Comments.Add((string)a![2]!);
                return Task.FromResult(Guid.NewGuid());
            }),
            Stub.Of<ICurrentUserProvider>((_, _) => (Guid?)Guid.NewGuid()),
            Stub.Of<IMediator>((m, a) =>
            {
                if (m.Name != nameof(IMediator.Send))
                    return null;
                switch (a![0])
                {
                    case StartWorkflowCommand start:
                        Started.Add(start);
                        return Task.FromResult(new StartWorkflowCommandResult(ChildInstanceId, RequestNo: "REQ-9"));
                    case MoveToNextStepCommand move:
                        Moves.Add(move);
                        return Task.FromResult(new MoveToNextStepCommandResult(
                            true, "Moved.", Guid.NewGuid(), "Approve", 3, false));
                    default:
                        return null;
                }
            }),
            NullLogger<WorkflowConnectorRunner>.Instance);
    }
}

using System.Reflection;
using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Forms;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;
using SaaSApp.Workflow.Domain.Entities;
using SaaSApp.Workflow.Domain.Enums;
using SaaSApp.Workflow.Infrastructure.Services;
using WorkflowEntity = SaaSApp.Workflow.Domain.Entities.Workflow;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class WorkflowConditionRouterTests
{
    private const string BothEdges = """
        [{"Id":"e1","ProceedAction":"SATISFIED","ToBlockId":"approve"},
         {"Id":"e2","ProceedAction":"NOT SATISFIED","ToBlockId":"reject"}]
        """;

    private static string StandardJson(string logic, string value) => $$$"""
        {"blocks":[{"id":"cond-1","type":"CONDITION","settings":{
          "standardCondition":true,
          "conditions":{"groupLogic":"ALL","condition":[{"name":"Amount","logic":"{{{logic}}}","value":"{{{value}}}"}]}
        }}]}
        """;

    [Fact]
    public async Task Satisfied_rules_move_next_with_SATISFIED()
    {
        var setup = new Setup(StandardJson("IS_GREATER_THAN", "10000"), """{"Amount":"15000"}""");

        var result = await setup.Router().TryRouteAsync(setup.Instance.Id, depth: 2);

        Assert.NotNull(result);
        var sent = Assert.Single(setup.Sent);
        Assert.Equal(WorkflowConditionEvaluator.SatisfiedReview, sent.Review);
        Assert.Equal("cond-1", sent.ActivityId);
        Assert.Equal(3, sent.ConditionDepth);
        Assert.Equal("form-1", sent.FormId);
        Assert.StartsWith("Condition 'Amount check': Satisfied.", sent.Comments);
        Assert.Empty(setup.Comments);
    }

    [Fact]
    public async Task Failed_rules_move_next_with_NOT_SATISFIED()
    {
        var setup = new Setup(StandardJson("IS_GREATER_THAN", "10000"), """{"Amount":"500"}""");

        await setup.Router().TryRouteAsync(setup.Instance.Id);

        Assert.Equal(WorkflowConditionEvaluator.NotSatisfiedReview, Assert.Single(setup.Sent).Review);
    }

    [Fact]
    public async Task Missing_edge_leaves_ticket_on_condition_with_comment()
    {
        var setup = new Setup(
            StandardJson("IS_GREATER_THAN", "10000"),
            """{"Amount":"500"}""",
            actionsJson: """[{"Id":"e1","ProceedAction":"SATISFIED","ToBlockId":"approve"}]""");

        var result = await setup.Router().TryRouteAsync(setup.Instance.Id);

        Assert.Null(result);
        Assert.Empty(setup.Sent);
        Assert.Contains("no NOT SATISFIED connection", Assert.Single(setup.Comments));
    }

    [Fact]
    public async Task Bad_rule_leaves_ticket_on_condition_with_comment()
    {
        var setup = new Setup(StandardJson("IS_SIMILAR_TO", "1"), """{"Amount":"500"}""");

        Assert.Null(await setup.Router().TryRouteAsync(setup.Instance.Id));
        Assert.Empty(setup.Sent);
        Assert.Contains("Unknown condition operator", Assert.Single(setup.Comments));
    }

    [Fact]
    public async Task Non_condition_step_is_ignored()
    {
        var setup = new Setup(StandardJson("IS_GREATER_THAN", "1"), "{}", stepType: StepType.Approval, stageType: "INTERNAL_ACTOR");

        Assert.Null(await setup.Router().TryRouteAsync(setup.Instance.Id));
        Assert.Empty(setup.Sent);
        Assert.Empty(setup.Comments);
    }

    [Fact]
    public async Task Chain_limit_stops_loops()
    {
        var setup = new Setup(StandardJson("IS_GREATER_THAN", "1"), """{"Amount":"5"}""");

        Assert.Null(await setup.Router().TryRouteAsync(setup.Instance.Id, WorkflowConditionRouter.MaxChainDepth));
        Assert.Empty(setup.Sent);
        Assert.Single(setup.Comments);
    }

    [Fact]
    public async Task Advanced_mode_looks_up_master_form()
    {
        const string json = """
            {"blocks":[{"id":"cond-1","settings":{
              "standardCondition":false,
              "masterConditions":{"masterFormId":"master-9","condition":[
                {"field":"Vendor","masterColumn":"VendorName"},
                {"field":"Code","masterColumn":"VendorCode"}
              ]}
            }}]}
            """;
        var setup = new Setup(json, """{"Vendor":"Acme","Code":"A1"}""") { MasterRowFound = true };

        await setup.Router().TryRouteAsync(setup.Instance.Id);

        Assert.Equal(WorkflowConditionEvaluator.SatisfiedReview, Assert.Single(setup.Sent).Review);
        var lookup = Assert.Single(setup.MasterLookups);
        Assert.Equal("master-9", lookup.FormId);
        Assert.Equal("VendorName", lookup.ColumnId);
        Assert.Equal("Acme", lookup.Value);
        Assert.Equal(new FormEntryColumnFilter(ColumnId: "VendorCode", ColumnValue: "A1"), Assert.Single(lookup.Filters));
    }

    [Fact]
    public void Field_values_read_table_columns_row_by_row()
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Amount"] = "10",
            ["Items"] = """[{"Item Name":"Laptop","Qty":2},{"Item Name":"Chair","Qty":1}]""",
        };

        Assert.Equal(["10"], WorkflowConditionRouter.FieldValues(values, "Amount"));
        Assert.Equal(["Laptop", "Chair"], WorkflowConditionRouter.FieldValues(values, "ItemName"));
        Assert.Empty(WorkflowConditionRouter.FieldValues(values, "Missing"));
    }

    private sealed class Setup
    {
        private readonly string _workflowJson;
        private readonly string _formDataJson;
        private readonly WorkflowEntity _workflow;

        public Setup(
            string workflowJson,
            string formDataJson,
            string actionsJson = BothEdges,
            StepType stepType = StepType.Condition,
            string stageType = "CONDITION")
        {
            _workflowJson = workflowJson;
            _formDataJson = formDataJson;
            _workflow = WorkflowEntity.Create(Guid.NewGuid(), "Expense", null, TriggerType.Manual, Guid.NewGuid());
            _workflow.SetInitiateLinks(null, "form-1", Guid.NewGuid());
            var step = WorkflowStep.Create(
                _workflow.Id, "Amount check", stepType, 2, activityId: "cond-1", stageType: stageType, actionsJson: actionsJson);
            _workflow.AddStep(step);

            Instance = WorkflowInstance.Create(Guid.NewGuid(), _workflow.Id, "Expense", 1, Guid.NewGuid());
            var stepInstance = WorkflowStepInstance.Create(Instance.Id, step.Id, step.Name, step.StepType, step.Order);
            stepInstance.Start();
            Instance.AddStepInstance(stepInstance);
            Instance.SetCurrentStep(stepInstance.Id);
            Instance.Start();
        }

        public WorkflowInstance Instance { get; }
        public bool MasterRowFound { get; init; }
        public List<MoveToNextStepCommand> Sent { get; } = [];
        public List<string> Comments { get; } = [];
        public List<(string FormId, string? ColumnId, string? Value, IReadOnlyList<FormEntryColumnFilter> Filters)> MasterLookups { get; } = [];

        public WorkflowConditionRouter Router() => new(
            Stub.Of<IWorkflowRepository>((m, _) => m.Name switch
            {
                nameof(IWorkflowRepository.GetInstanceByIdAsync) => Task.FromResult<WorkflowInstance?>(Instance),
                nameof(IWorkflowRepository.GetByIdWithStepsAsync) => Task.FromResult<WorkflowEntity?>(_workflow),
                _ => null
            }),
            Stub.Of<IWorkflowJsonStorageService>((m, _) =>
                m.Name == nameof(IWorkflowJsonStorageService.GetWorkflowJsonAsync)
                    ? Task.FromResult<string?>(_workflowJson)
                    : null),
            Stub.Of<IWorkflowLegacyMailboxSyncService>((m, _) =>
                m.Name == nameof(IWorkflowLegacyMailboxSyncService.TryGetProcessFormIdentityAsync)
                    ? Task.FromResult<(string? FormId, Guid? FormEntryId)?>(("form-1", Guid.NewGuid()))
                    : null),
            Stub.Of<IWorkflowEzfbFormDataLoader>((_, _) => Task.FromResult<string?>(_formDataJson)),
            Stub.Of<IFormEntryService>((m, a) =>
            {
                if (m.Name != nameof(IFormEntryService.GetEntriesByColumnAsync))
                    return null;
                MasterLookups.Add(((string)a![0]!, (string?)a[4], (string?)a[2], (IReadOnlyList<FormEntryColumnFilter>)a[3]!));
                var entries = MasterRowFound
                    ? new List<Dictionary<string, object?>> { new() { ["VendorName"] = "Acme" } }
                    : null;
                return Task.FromResult(new FormEntryByColumnResult(
                    MasterRowFound ? FormEntryByColumnStatus.Found : FormEntryByColumnStatus.NotFound,
                    null, "master-9", null, null, entries));
            }),
            Stub.Of<IDynamicTableRepository>((m, a) =>
            {
                if (m.Name == nameof(IDynamicTableRepository.AddCommentAsync))
                {
                    Comments.Add((string)a![2]!);
                    return Task.FromResult(Guid.NewGuid());
                }
                return null;
            }),
            Stub.Of<ICurrentUserProvider>((_, _) => (Guid?)Guid.NewGuid()),
            Stub.Of<IMediator>((m, a) =>
            {
                if (m.Name != nameof(IMediator.Send) || a![0] is not MoveToNextStepCommand command)
                    return null;
                Sent.Add(command);
                return Task.FromResult(new MoveToNextStepCommandResult(
                    true, "Review updated.", Guid.NewGuid(), "Approve", 3, false));
            }),
            NullLogger<WorkflowConditionRouter>.Instance);
    }
}

/// <summary>Interface stub: answers calls through a handler, default values otherwise.</summary>
public class Stub : DispatchProxy
{
    private Func<MethodInfo, object?[]?, object?> _handler = (_, _) => null;

    public static T Of<T>(Func<MethodInfo, object?[]?, object?> handler) where T : class
    {
        var proxy = Create<T, Stub>();
        ((Stub)(object)proxy)._handler = handler;
        return proxy;
    }

    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
        var result = _handler(targetMethod!, args);
        return result ?? DefaultFor(targetMethod!.ReturnType);
    }

    private static object? DefaultFor(Type type)
    {
        if (type == typeof(void))
            return null;
        if (type == typeof(Task))
            return Task.CompletedTask;
        if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Task<>))
        {
            var inner = type.GetGenericArguments()[0];
            var value = inner.IsValueType ? Activator.CreateInstance(inner) : null;
            return typeof(Task).GetMethod(nameof(Task.FromResult))!
                .MakeGenericMethod(inner)
                .Invoke(null, [value]);
        }
        return type.IsValueType ? Activator.CreateInstance(type) : null;
    }
}

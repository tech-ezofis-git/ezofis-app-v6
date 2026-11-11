using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Application.Workflows.Commands.ReinitiateWorkflow;
using SaaSApp.Workflow.Domain.Entities;
using SaaSApp.Workflow.Domain.Enums;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowReinitiateTests
{
    private static readonly Guid WorkflowId = Guid.Parse("b1c2d3e4-0000-0000-0000-000000000001");

    private static List<WorkflowStep> Steps() =>
    [
        WorkflowStep.Create(WorkflowId, "Raise", StepType.Approval, 1, activityId: "start", stageType: "START"),
        WorkflowStep.Create(WorkflowId, "Review", StepType.Approval, 2, activityId: "review", stageType: "INTERNAL_ACTOR"),
        WorkflowStep.Create(WorkflowId, "Done", StepType.Approval, 3, activityId: "end", stageType: "END"),
    ];

    private static string Json(object? reprocess) => System.Text.Json.JsonSerializer.Serialize(new
    {
        blocks = new object[]
        {
            new { id = "review", type = "INTERNAL_ACTOR", settings = new { label = "Review" } },
            new { id = "end", type = "END", settings = new { label = "Done", reprocess } },
        },
    });

    [Fact]
    public void Setting_is_read_from_the_end_block()
    {
        var on = WorkflowReprocessSettings.Read(Json(new { enabled = true, targetBlockId = "review" }), "end");
        Assert.True(on.Enabled);
        Assert.Equal("review", on.TargetBlockId);

        var cleared = WorkflowReprocessSettings.Read(Json(new { enabled = true, targetBlockId = (string?)null }), "end");
        Assert.True(cleared.Enabled);
        Assert.Null(cleared.TargetBlockId);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not json")]
    public void Setting_is_off_for_bad_json(string? json) =>
        Assert.False(WorkflowReprocessSettings.Read(json, "end").Enabled);

    [Fact]
    public void Setting_is_off_when_missing_disabled_or_on_another_block()
    {
        Assert.False(WorkflowReprocessSettings.Read(Json(null), "end").Enabled);
        Assert.False(WorkflowReprocessSettings.Read(Json(new { enabled = false }), "end").Enabled);
        Assert.False(WorkflowReprocessSettings.Read(Json(new { enabled = true }), "review").Enabled);
    }

    [Fact]
    public void Target_is_the_chosen_stage_or_else_the_start_block()
    {
        var steps = Steps();

        Assert.Equal("review", ReinitiateWorkflowCommandHandler.ResolveTarget(steps, new(true, "review")).ActivityId);
        Assert.Equal("start", ReinitiateWorkflowCommandHandler.ResolveTarget(steps, new(true, null)).ActivityId);
    }

    [Theory]
    [InlineData("deleted-stage")]
    [InlineData("end")]
    public void Target_cannot_be_a_missing_stage_or_the_end_block(string target) =>
        Assert.Throws<InvalidOperationException>(
            () => ReinitiateWorkflowCommandHandler.ResolveTarget(Steps(), new(true, target)));

    [Fact]
    public void A_reopened_step_can_run_again()
    {
        var step = WorkflowStepInstance.Create(
            Guid.NewGuid(), Guid.NewGuid(), "Review", StepType.Approval, 2, activityId: "review");
        step.Start();
        step.Complete(Guid.NewGuid());

        step.Reopen();

        Assert.Equal(StepInstanceStatus.Pending, step.Status);
        Assert.Null(step.CompletedAtUtc);
        step.Start();
        Assert.Equal(StepInstanceStatus.InProgress, step.Status);
    }

    // Against a real Postgres, given in SLA_E2E_POSTGRES (a login that may create a throwaway database).
    // Without it the test returns at once, so CI and normal runs are unaffected. Nothing is emailed.
    [Fact]
    public async Task A_finished_request_runs_again_step_by_step_and_finishes_again()
    {
        var server = Environment.GetEnvironmentVariable("SLA_E2E_POSTGRES");
        if (string.IsNullOrWhiteSpace(server))
            return;

        var starter = Guid.NewGuid();
        var approver = Guid.NewGuid();
        var instanceId = Guid.NewGuid();
        var name = $"reinit_e2e_{Guid.NewGuid():N}";
        await using (var admin = new NpgsqlConnection(server))
        {
            await admin.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE {name};", admin);
            await create.ExecuteNonQueryAsync();
        }

        var connectionString = new NpgsqlConnectionStringBuilder(server) { Database = name, Pooling = false }.ConnectionString;
        try
        {
            await Exec(connectionString, """
                CREATE SCHEMA workflow;
                CREATE SCHEMA users;
                CREATE TABLE users."Users" ("Id" uuid PRIMARY KEY, "Email" text, "DisplayName" text, "IsDeleted" boolean NOT NULL DEFAULT false);
                CREATE TABLE workflow."Workflows" ("Id" uuid PRIMARY KEY, "Name" text, "FormId" text, "RepositoryId" text, "IsDeleted" boolean NOT NULL DEFAULT false);
                CREATE TABLE workflow."WorkflowSteps" ("Id" uuid PRIMARY KEY, "WorkflowId" uuid, "ActivityId" text, "ApproversJson" text, "AssignedToUserId" uuid, "IsDeleted" boolean NOT NULL DEFAULT false);
                """);
            var tenant = new FakeTenant(connectionString);
            var creator = new WorkflowTableCreator();
            await creator.EnsureWorkflowTablesForStartAsync(WorkflowId, connectionString);
            await Exec(connectionString, $"""
                INSERT INTO workflow.workflow_instances_b1c2d3e4
                    (id, tenant_id, workflow_id, workflow_name, workflow_version, status, started_by)
                VALUES ('{instanceId}', '{Guid.Empty}', '{WorkflowId}', 'E2E', 1, {(int)WorkflowInstanceStatus.Running}, '{starter}');
                """);

            var mailbox = new WorkflowLegacyMailboxSyncService(
                tenant, creator, NullLogger<WorkflowLegacyMailboxSyncService>.Instance);
            var mail = new WorkflowDelegationMailService(
                tenant,
                Stub<IUserEmailLookup>(),
                null!,
                new ConfigurationBuilder().Build(),
                NullLogger<WorkflowDelegationMailService>.Instance);
            var sync = new WorkflowLegacyTransactionSyncService(
                tenant,
                creator,
                mailbox,
                Stub<SaaSApp.Repository.Application.Contracts.IRepositoryItemShareService>(),
                Stub<IWorkflowDelegationService>(),
                mail,
                NullLogger<WorkflowLegacyTransactionSyncService>.Instance);

            var steps = Steps();
            var (start, review, end) = (steps[0], steps[1], steps[2]);
            Task<WorkflowLegacyTransactionSyncResult> Move(
                WorkflowStep step, string reviewText, WorkflowStep? next = null, Guid? nextAssignee = null) =>
                sync.SyncTransactionByActivityIdAsync(
                    WorkflowId, instanceId, null, step, steps, step.ActivityId!, approver, null, reviewText,
                    overrideNextStep: next, overrideNextAssigneeUserId: nextAssignee);

            // First pass: raised, approved, finished.
            await Move(start, "Submit");
            var finished = await Move(review, "Approve");
            Assert.True(finished.WorkflowCompleted);
            Assert.Equal(1, await CountCompleted(connectionString));
            Assert.Equal(0, await CountInbox(connectionString));

            // Re-initiate from Review: the request leaves Completed and Review is open again on a new row.
            var reinitiated = await Move(end, WorkflowStepTransitionHelper.ReinitiateReview, review);
            Assert.False(reinitiated.WorkflowCompleted);
            Assert.NotNull(reinitiated.NextTransactionId);
            Assert.Equal(0, await CountCompleted(connectionString));
            Assert.Equal(1, await CountInbox(connectionString));
            Assert.Equal(2, await CountRows(connectionString, "review"));
            // The old End row is history: lists must not read the request as finished.
            Assert.Equal(0, await CountFinishedEndRows(connectionString));

            // It runs on from there and finishes again, on a new End row.
            var finishedAgain = await Move(review, "Approve");
            Assert.True(finishedAgain.WorkflowCompleted);
            Assert.Equal(1, await CountCompleted(connectionString));
            Assert.Equal(0, await CountInbox(connectionString));
            Assert.Equal(2, await CountRows(connectionString, "end"));
            Assert.Equal(1, await CountFinishedEndRows(connectionString));

            // No stage chosen: back to the start block, with whoever raised it.
            var backToStart = await Move(end, WorkflowStepTransitionHelper.ReinitiateReview, start, starter);
            Assert.Equal(starter, backToStart.NextActivityUserId);
            Assert.Equal(0, await CountCompleted(connectionString));
            Assert.Equal(1, await CountInbox(connectionString));
            await Move(start, "Submit");
            Assert.Equal(3, await CountRows(connectionString, "review"));
            Assert.Equal(1, await CountInbox(connectionString));
        }
        finally
        {
            await using var admin = new NpgsqlConnection(server);
            await admin.OpenAsync();
            await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS {name} WITH (FORCE);", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private static async Task Exec(string connectionString, string sql)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var cmd = new NpgsqlCommand(sql, connection);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<int> Count(string connectionString, string sql)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var cmd = new NpgsqlCommand(sql, connection);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private static Task<int> CountCompleted(string connectionString) =>
        Count(connectionString, "SELECT COUNT(*) FROM workflow.completed_b1c2d3e4");

    private static Task<int> CountFinishedEndRows(string connectionString) =>
        Count(
            connectionString,
            $"SELECT COUNT(*) FROM workflow.transaction_b1c2d3e4 t WHERE {WorkflowStepTransitionHelper.FinishedEndRowSql("t")}");

    private static Task<int> CountInbox(string connectionString) =>
        Count(connectionString, "SELECT COUNT(*) FROM workflow.inbox_b1c2d3e4");

    private static Task<int> CountRows(string connectionString, string activityId) =>
        Count(connectionString, $"SELECT COUNT(*) FROM workflow.transaction_b1c2d3e4 WHERE activity_id = '{activityId}'");

    private sealed class FakeTenant(string connectionString) : ITenantContext
    {
        public Guid? TenantId => Guid.Empty;
        public string? ConnectionString => connectionString;
    }

    private static T Stub<T>() where T : class => DispatchProxy.Create<T, StubProxy>();

    /// <summary>Answers every call with an empty result: this test uses no delegates, shares or user lookups.</summary>
    private class StubProxy : DispatchProxy
    {
        protected override object? Invoke(MethodInfo? method, object?[]? args)
        {
            var type = method!.ReturnType;
            if (type == typeof(Task))
                return Task.CompletedTask;
            if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Task<>))
            {
                var inner = type.GetGenericArguments()[0];
                return typeof(Task)
                    .GetMethod(nameof(Task.FromResult))!
                    .MakeGenericMethod(inner)
                    .Invoke(null, [inner.IsValueType ? Activator.CreateInstance(inner) : null]);
            }

            return type.IsValueType ? Activator.CreateInstance(type) : null;
        }
    }
}

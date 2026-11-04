using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Forms;
using SaaSApp.Workflow.Application.Workflows.Commands.MoveToNextStep;
using SaaSApp.Workflow.Infrastructure.Options;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

/// <summary>
/// Runs <see cref="WorkflowSlaTimerService"/> against a real Postgres: create timers, fire them, check the
/// outbox and the move-next it asks for. Nothing is emailed (the outbox sender is not run). Needs a server
/// where the login may create a throwaway database, given as a connection string in
/// <c>SLA_E2E_POSTGRES</c>. Without it each test returns at once, so CI and normal runs are unaffected.
/// </summary>
public class WorkflowSlaEndToEndTests
{
    private const string TargetActivity = "stage-2";
    private const string ColumnsForName = "f1";

    private static readonly Guid WorkflowId = Guid.Parse("72c7ac44-3bd4-4b1e-b79a-9bbd8a94b15d");
    private static readonly Guid InstanceId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid Starter = Guid.Parse("10000000-0000-0000-0000-000000000001");
    private static readonly Guid Assignee = Guid.Parse("10000000-0000-0000-0000-000000000002");
    private static readonly Guid Raja = Guid.Parse("10000000-0000-0000-0000-000000000003");
    private static readonly Guid Lead = Guid.Parse("10000000-0000-0000-0000-000000000004");
    private static readonly Guid MemberA = Guid.Parse("10000000-0000-0000-0000-000000000005");
    private static readonly Guid MemberB = Guid.Parse("10000000-0000-0000-0000-000000000006");
    private static readonly Guid GroupId = Guid.Parse("20000000-0000-0000-0000-000000000001");

    private static string? Server => Environment.GetEnvironmentVariable("SLA_E2E_POSTGRES");

    private static readonly List<FormFieldLabel> Fields =
    [
        new("f1", "Name", "SHORT_TEXT", null),
        new("f3", "Response Time", "NUMBER", null),
        new("f4", "Response Type", "SINGLE_SELECT", null),
        new("f7", "Notify", "MULTI_SELECT", null),
        new("f8", "Escalate", "SINGLE_SELECT", null),
    ];

    private static Dictionary<string, object?> Entry(string name, int minutes) => new(StringComparer.OrdinalIgnoreCase)
    {
        ["item_id"] = name,
        ["f1"] = name,
        ["f3"] = minutes,
        ["f4"] = "Minutes",
        ["f7"] = "raja@example.com",
        ["f8"] = "lead@example.com",
    };

    private static string Json(object slaSettings) => JsonSerializer.Serialize(new
    {
        settings = new { general = new { name = "E2E" } },
        blocks = new object[]
        {
            new { id = TargetActivity, type = "INTERNAL_ACTOR", settings = new { label = "Reviewer", SlaSettings = slaSettings } },
            new { id = "stage-3", type = "INTERNAL_ACTOR", settings = new { label = "Team Lead" } },
            new { id = "stage-4", type = "INTERNAL_ACTOR", settings = new { label = "Twin" } },
            new { id = "stage-5", type = "INTERNAL_ACTOR", settings = new { label = "Twin" } },
        },
    });

    private static string WorkflowJson(object slaSettings) => JsonSerializer.Serialize(new
    {
        settings = new { general = new { name = "E2E" }, SlaSettings = slaSettings },
        blocks = new object[]
        {
            new { id = TargetActivity, type = "INTERNAL_ACTOR", settings = new { label = "Reviewer" } },
        },
    });

    private static readonly List<FormFieldLabel> StepFields =
    [
        new("f1", "Name", "SHORT_TEXT", "Name"),
        new("t1", "SLA Steps", "TABLE", "SLA_Steps"),
    ];

    private static object Step(int after, string unit, string action, string sendTo, string[]? users = null, string? group = null, string? stage = null) =>
        new { after, unit, action, sendTo, users = users ?? [], group, stage };

    private static Dictionary<string, object?> StepEntry(string name, params object[] steps) => new(StringComparer.OrdinalIgnoreCase)
    {
        ["item_id"] = name,
        ["f1"] = name,
        // Older columns left behind on a converted form are ignored.
        ["Response_Time"] = "99",
        ["Response_Type"] = "Days",
        ["SLA_Steps"] = JsonSerializer.Serialize(steps),
    };

    private static object MasterSla(string entryId = "Support") => new
    {
        mode = "advanced",
        slaMasterId = "master",
        rules = Array.Empty<object>(),
        notifications = new { email = true, sms = false },
        masterFieldId = ColumnsForName,
        masterEntries = new object[] { new { id = "row-1", entryId, notify = true, escalate = false } },
    };

    private static Task DueNowAsync(TestDatabase database) =>
        database.ExecuteAsync("UPDATE workflow.sla_timers SET due_at_utc = now() - interval '1 minute' WHERE status = 4;");

    [Fact]
    public async Task EntryWithStepsTable_OnAStage_RunsEachRowWithItsOwnAction()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        await using var database = await TestDatabase.CreateAsync();
        var mediator = new FakeMediator();
        var master = new FakeMaster(StepFields, StepEntry(
            "Support",
            Step(1, "Minutes", "Notify", "Users", ["raja@example.com", "lead@example.com"]),
            Step(30, "Minutes", "Notify", "Group", group: "Sales Team"),
            Step(1, "Hours", "Escalate", "Users", ["lead@example.com"])));
        var service = NewService(database, Json(MasterSla()), mediator, master);

        await service.RunAsync();

        var timers = await ReadTimersAsync(database);
        Assert.Equal(3, timers.Count);
        Assert.All(timers, t => Assert.Equal(4, t.Status));
        Assert.Equal(
            [1, 30, 60],
            await database.ListAsync(
                "SELECT round(extract(epoch FROM due_at_utc - now()) / 60)::int FROM workflow.sla_timers ORDER BY due_at_utc;",
                r => r.GetInt32(0)));

        await DueNowAsync(database);
        await service.RunAsync();

        var sent = await ReadOutboxAsync(database);
        Assert.Equal(["lead@example.com", "raja@example.com"], sent.Where(s => s.RuleId.Contains("|0|")).Select(s => s.Address).Order());
        Assert.Equal(["member.a@example.com", "member.b@example.com"], sent.Where(s => s.RuleId.Contains("|1|")).Select(s => s.Address).Order());
        Assert.Equal(["lead@example.com"], sent.Where(s => s.RuleId.Contains("|2|")).Select(s => s.Address));
        Assert.Equal(("Forward", (Guid?)Lead), (Assert.Single(mediator.Sent).Review, mediator.Sent[0].ActivityUserId));
    }

    [Fact]
    public async Task OneRow_NotifiesAndEscalates_ToDifferentPeople()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        await using var database = await TestDatabase.CreateAsync();
        var mediator = new FakeMediator();
        var master = new FakeMaster(StepFields, StepEntry(
            "Support",
            new
            {
                after = 1,
                unit = "Hours",
                notifyUsers = new[] { "raja@example.com" },
                notifyGroup = "Sales Team",
                notifyInitiator = "Yes",
                escalateTo = "User",
                escalateUser = "lead@example.com",
            }));
        var service = NewService(database, Json(MasterSla()), mediator, master);

        await service.RunAsync();
        Assert.Single(await ReadTimersAsync(database));

        await DueNowAsync(database);
        await service.RunAsync();

        // Notify users, the group's members, the initiator, and the escalation user; only the last gets the request.
        Assert.Equal(
            ["lead@example.com", "member.a@example.com", "member.b@example.com", "raja@example.com", "starter@example.com"],
            (await ReadOutboxAsync(database)).Select(s => s.Address).Order());
        Assert.Equal(("Forward", (Guid?)Lead), (Assert.Single(mediator.Sent).Review, mediator.Sent[0].ActivityUserId));
    }

    [Fact]
    public async Task ActingOnTheStage_CancelsTheRemainingSteps()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        await using var database = await TestDatabase.CreateAsync();
        var mediator = new FakeMediator();
        var master = new FakeMaster(StepFields, StepEntry(
            "Support", Step(1, "Minutes", "Notify", "Users", ["raja@example.com"]), Step(1, "Hours", "Escalate", "Users", ["lead@example.com"])));
        var service = NewService(database, Json(MasterSla()), mediator, master);

        await service.RunAsync();
        await database.ExecuteAsync("UPDATE workflow.transaction_72c7ac44 SET action_status = 1, review = 'Approve' WHERE id = 2;");
        await DueNowAsync(database);
        await service.RunAsync();

        Assert.All(await ReadTimersAsync(database), t =>
        {
            Assert.Equal(2, t.Status);
            Assert.Contains("already acted on", t.Outcome);
        });
        Assert.Empty(await ReadOutboxAsync(database));
        Assert.Empty(mediator.Sent);
    }

    [Fact]
    public async Task EditingTheTable_LeavesOpenTicketsAsTheyAre()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        await using var database = await TestDatabase.CreateAsync();
        var master = new FakeMaster(StepFields, StepEntry("Support", Step(2, "Hours", "Notify", "Users", ["raja@example.com"])));
        var service = NewService(database, Json(MasterSla()), new FakeMediator(), master);
        await service.RunAsync();

        master.Replace(StepEntry(
            "Support", Step(5, "Minutes", "Notify", "Users", ["raja@example.com"]), Step(9, "Hours", "Escalate", "Users", ["lead@example.com"])));
        await service.RunAsync();

        Assert.Equal("master-step|row-1|0|due", Assert.Single(await ReadTimersAsync(database)).RuleId);
        Assert.Equal(
            120,
            Assert.Single(await database.ListAsync(
                "SELECT round(extract(epoch FROM due_at_utc - now()) / 60)::int FROM workflow.sla_timers;",
                r => r.GetInt32(0))));
    }

    [Fact]
    public async Task ConvertingAnEntry_DoesNotTouchTicketsThatAlreadyHadItsTimer()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        // The ticket's single-entry timer already ran before the form was converted.
        await using var database = await TestDatabase.CreateAsync();
        var oldFormat = new FakeMaster(Entry("A", 1));
        var json = Json(new { mode = "advanced", slaMasterId = "master", rules = Array.Empty<object>(), masterFieldId = ColumnsForName, entryId = "A" });
        await NewService(database, json, new FakeMediator(), oldFormat).RunAsync();
        Assert.Equal("master|A|due", Assert.Single(await ReadTimersAsync(database)).RuleId);

        var converted = new FakeMaster(StepFields, StepEntry("A", Step(1, "Minutes", "Notify", "Users", ["raja@example.com"])));
        await NewService(database, json, new FakeMediator(), converted).RunAsync();

        Assert.Equal("master|A|due", Assert.Single(await ReadTimersAsync(database)).RuleId);
    }

    [Fact]
    public async Task OnTheWorkflow_EscalateOnlySendsAMessage()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        await using var database = await TestDatabase.CreateAsync();
        var mediator = new FakeMediator();
        var master = new FakeMaster(StepFields, StepEntry(
            "Support", Step(1, "Minutes", "Notify", "Users", ["raja@example.com"]), Step(8, "Hours", "Escalate", "Users", ["lead@example.com"])));
        var service = NewService(database, WorkflowJson(MasterSla()), mediator, master);

        await service.RunAsync();
        Assert.Equal(2, (await ReadTimersAsync(database)).Count(t => t.Scope == WorkflowSlaTimerService.ScopeAdvancedResolution));

        await DueNowAsync(database);
        await service.RunAsync();

        Assert.Equal(["lead@example.com", "raja@example.com"], (await ReadOutboxAsync(database)).Select(s => s.Address).Order());
        Assert.Empty(mediator.Sent);
    }

    [Theory]
    [InlineData("Team Lead", "stage-3", null)]
    [InlineData("Twin", null, "2 stages in this workflow are named 'Twin'")]
    [InlineData("Nowhere", null, "no stage named 'Nowhere'")]
    public async Task EscalateToAStage_MovesOnlyWhenTheNameIsClear(string stage, string? target, string? problem)
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        await using var database = await TestDatabase.CreateAsync();
        var mediator = new FakeMediator();
        var master = new FakeMaster(StepFields, StepEntry("Support", Step(1, "Hours", "Escalate", "Stage", stage: stage)));
        var service = NewService(database, Json(MasterSla()), mediator, master);

        await service.RunAsync();
        await DueNowAsync(database);
        await service.RunAsync();

        var timer = Assert.Single(await ReadTimersAsync(database));
        Assert.Equal(1, timer.Status);
        if (target != null)
            Assert.Equal(target, Assert.Single(mediator.Sent).TargetActivityId);
        else
        {
            Assert.Empty(mediator.Sent);
            Assert.Contains(problem!, timer.Outcome);
        }
    }

    [Fact]
    public async Task EscalateToAGroup_SendsTheTransactionToItsMembers()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        await using var database = await TestDatabase.CreateAsync();
        var mediator = new FakeMediator();
        var master = new FakeMaster(StepFields, StepEntry("Support", Step(1, "Hours", "Escalate", "Group", group: "sales team")));
        var service = NewService(database, Json(MasterSla()), mediator, master);

        await service.RunAsync();
        await DueNowAsync(database);
        await service.RunAsync();

        Assert.Equal(MemberA, Assert.Single(mediator.Sent).ActivityUserId);
        var rows = await database.ListAsync("SELECT group_ids FROM workflow.transaction_72c7ac44 WHERE id = 2;", r => r.GetString(0));
        Assert.Equal(GroupId.ToString("D"), Assert.Single(rows));
        Assert.Equal(2, (await ReadOutboxAsync(database)).Count);
    }

    private sealed record TimerRow(string Scope, string RuleId, short Status, string? Outcome);

    private sealed record OutboxRow(string RuleId, string Address);

    [Fact]
    public async Task AdvancedRows_EachFireAtTheirOwnTime_WithWhatTheyAreSetToDo()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        var json = Json(new
        {
            mode = "advanced",
            slaMasterId = "master",
            rules = Array.Empty<object>(),
            notifications = new { email = true, sms = false },
            masterFieldId = ColumnsForName,
            masterEntries = new object[]
            {
                new { id = "row-a", entryId = "A", notify = true, escalate = false },
                new { id = "row-b", entryId = "B", notify = false, escalate = true },
                new { id = "row-c", entryId = "C", notify = true, escalate = true },
            },
        });

        await using var database = await TestDatabase.CreateAsync();
        var mediator = new FakeMediator();
        var service = NewService(database, json, mediator, new FakeMaster(Entry("A", 1), Entry("B", 30), Entry("C", 60)));

        await service.RunAsync();

        var timers = await ReadTimersAsync(database);
        Assert.Equal(3, timers.Count);
        // Waiting in the status an older API version on the same database never claims or deletes.
        Assert.All(timers, t => Assert.Equal(4, t.Status));
        Assert.Equal(0L, await database.ScalarAsync<long>(CommittedClaimSql));
        var dueInMinutes = await database.ListAsync(
            "SELECT round(extract(epoch FROM due_at_utc - now()) / 60)::int FROM workflow.sla_timers ORDER BY due_at_utc;",
            r => r.GetInt32(0));
        Assert.Equal([1, 30, 60], dueInMinutes);

        // Everything falls due: the three rows fire with their own actions.
        await database.ExecuteAsync("UPDATE workflow.sla_timers SET due_at_utc = now() - interval '1 minute';");
        await service.RunAsync();

        timers = await ReadTimersAsync(database);
        Assert.All(timers, t => Assert.Equal(1, t.Status));
        var sent = await ReadOutboxAsync(database);
        Assert.Equal(["raja@example.com"], sent.Where(s => s.RuleId.Contains("row-a")).Select(s => s.Address));
        Assert.Equal(["lead@example.com"], sent.Where(s => s.RuleId.Contains("row-b")).Select(s => s.Address));
        Assert.Equal(
            ["lead@example.com", "raja@example.com"],
            sent.Where(s => s.RuleId.Contains("row-c")).Select(s => s.Address).Order());

        // Escalate rows reassign through move-next Forward to the entry's Escalate user; the notify row does not.
        Assert.Equal(2, mediator.Sent.Count);
        Assert.All(mediator.Sent, c =>
        {
            Assert.Equal("Forward", c.Review);
            Assert.Equal(Lead, c.ActivityUserId);
            Assert.Equal(TargetActivity, c.ActivityId);
        });

        // A second pass does nothing again.
        await service.RunAsync();
        Assert.Equal(sent.Count, (await ReadOutboxAsync(database)).Count);
        Assert.Equal(2, mediator.Sent.Count);
    }

    [Fact]
    public async Task SingleEntrySavedEarlier_StillNotifiesAndEscalates()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        var json = Json(new
        {
            mode = "advanced",
            slaMasterId = "master",
            rules = Array.Empty<object>(),
            notifications = new { email = true, sms = false },
            masterFieldId = ColumnsForName,
            entryId = "A",
        });

        await using var database = await TestDatabase.CreateAsync();
        var mediator = new FakeMediator();
        var service = NewService(database, json, mediator, new FakeMaster(Entry("A", 1)));

        await service.RunAsync();
        Assert.Equal("master|A|due", Assert.Single(await ReadTimersAsync(database)).RuleId);

        await database.ExecuteAsync("UPDATE workflow.sla_timers SET due_at_utc = now() - interval '1 minute';");
        await service.RunAsync();

        Assert.Equal(
            ["lead@example.com", "raja@example.com"],
            (await ReadOutboxAsync(database)).Select(s => s.Address).Order());
        Assert.Equal(Lead, Assert.Single(mediator.Sent).ActivityUserId);
    }

    [Fact]
    public async Task DeletedEntry_GivesNoTimer_AndDoesNotFail()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        var json = Json(new
        {
            mode = "advanced",
            slaMasterId = "master",
            rules = Array.Empty<object>(),
            masterFieldId = ColumnsForName,
            entryId = "gone",
        });

        await using var database = await TestDatabase.CreateAsync();
        await NewService(database, json, new FakeMediator(), new FakeMaster()).RunAsync();
        Assert.Empty(await ReadTimersAsync(database));
    }

    [Fact]
    public async Task StandardRule_EscalatingToAGroup_SendsTheTransactionToItsMembers()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        var json = Json(new
        {
            mode = "standard",
            notifications = new { email = true, sms = false },
            rules = new object[]
            {
                new
                {
                    id = "rule-1",
                    name = "To the team",
                    duration = 1,
                    durationUnit = "minutes",
                    notifyUserIds = Array.Empty<string>(),
                    channels = new { email = true, sms = false },
                    escalateTo = new { type = "group", groupId = GroupId.ToString("D") },
                },
            },
        });

        await using var database = await TestDatabase.CreateAsync();
        var mediator = new FakeMediator();
        var security = new FakeSecurity();
        var service = NewService(database, json, mediator, new FakeMaster(), security);

        await service.RunAsync();
        await database.ExecuteAsync("UPDATE workflow.sla_timers SET due_at_utc = now() - interval '1 minute';");
        await service.RunAsync();

        var timer = Assert.Single(await ReadTimersAsync(database));
        Assert.Equal(1, timer.Status);
        Assert.Contains("2 member(s)", timer.Outcome);

        var (groupIds, userIds) = (await database.ListAsync(
            "SELECT group_ids, user_ids FROM workflow.transaction_72c7ac44 WHERE id = 2;",
            r => (r.GetString(0), r.GetString(1)))).Single();
        Assert.Equal(GroupId.ToString("D"), groupIds);
        Assert.Equal($"{MemberA:D},{MemberB:D}", userIds);

        var forward = Assert.Single(mediator.Sent);
        Assert.Equal(("Forward", (Guid?)MemberA), (forward.Review, forward.ActivityUserId));
        Assert.Equal(
            ["member.a@example.com", "member.b@example.com"],
            (await ReadOutboxAsync(database)).Select(s => s.Address).Order());
        Assert.Equal([MemberA, MemberB], security.Granted.Order());
    }

    [Fact]
    public async Task GroupEscalation_RefusedForward_LeavesTheTransactionAsItWas()
    {
        if (string.IsNullOrWhiteSpace(Server))
            return;

        var json = Json(new
        {
            mode = "standard",
            rules = new object[]
            {
                new
                {
                    id = "rule-1",
                    name = "To the team",
                    duration = 1,
                    durationUnit = "minutes",
                    escalateTo = new { type = "group", groupId = GroupId.ToString("D") },
                },
            },
        });

        await using var database = await TestDatabase.CreateAsync();
        var service = NewService(database, json, new FakeMediator { Refuse = true }, new FakeMaster());

        await service.RunAsync();
        await database.ExecuteAsync("UPDATE workflow.sla_timers SET due_at_utc = now() - interval '1 minute';");
        await service.RunAsync();

        Assert.Contains("escalation failed", Assert.Single(await ReadTimersAsync(database)).Outcome);
        var rows = await database.ListAsync(
            "SELECT group_ids IS NULL AND user_ids IS NULL FROM workflow.transaction_72c7ac44 WHERE id = 2;",
            r => r.GetBoolean(0));
        Assert.True(Assert.Single(rows));
    }

    // The claim of the API version that does not know Advanced (git: before this change). Must find nothing.
    private const string CommittedClaimSql = """
        SELECT count(*) FROM workflow.sla_timers
        WHERE status = 0 AND (locked_until IS NULL OR locked_until < now());
        """;

    private static WorkflowSlaTimerService NewService(
        TestDatabase database,
        string workflowJson,
        FakeMediator mediator,
        FakeMaster master,
        FakeSecurity? security = null) =>
        new(
            new FakeTenant(database.ConnectionString),
            new FakeJson(workflowJson),
            mediator,
            Microsoft.Extensions.Options.Options.Create(new WorkflowSlaOptions()),
            NullLogger<WorkflowSlaTimerService>.Instance,
            new FakeMailbox(),
            null!,
            master,
            security ?? new FakeSecurity());

    private static Task<List<TimerRow>> ReadTimersAsync(TestDatabase database) =>
        database.ListAsync(
            "SELECT scope, rule_id, status, outcome FROM workflow.sla_timers ORDER BY id;",
            r => new TimerRow(r.GetString(0), r.GetString(1), r.GetInt16(2), r.IsDBNull(3) ? null : r.GetString(3)));

    private static Task<List<OutboxRow>> ReadOutboxAsync(TestDatabase database) =>
        database.ListAsync(
            """
            SELECT t.rule_id, o.address FROM workflow.sla_notification_outbox o
            JOIN workflow.sla_timers t ON t.id = o.timer_id ORDER BY o.id;
            """,
            r => new OutboxRow(r.GetString(0), r.GetString(1)));

    /// <summary>A throwaway database with the tables the timers read: one ticket waiting at the stage.</summary>
    private sealed class TestDatabase : IAsyncDisposable
    {
        private readonly string _name;

        private TestDatabase(string name, string connectionString)
        {
            _name = name;
            ConnectionString = connectionString;
        }

        public string ConnectionString { get; }

        public static async Task<TestDatabase> CreateAsync()
        {
            var name = $"sla_e2e_{Guid.NewGuid():N}";
            await using (var admin = new NpgsqlConnection(Server))
            {
                await admin.OpenAsync();
                await using var create = new NpgsqlCommand($"CREATE DATABASE {name};", admin);
                await create.ExecuteNonQueryAsync();
            }

            var builder = new NpgsqlConnectionStringBuilder(Server) { Database = name, Pooling = false };
            var database = new TestDatabase(name, builder.ConnectionString);
            await database.ExecuteAsync($"""
                CREATE SCHEMA workflow;
                CREATE SCHEMA users;
                CREATE TABLE workflow."Workflows" ("Id" uuid PRIMARY KEY, "Name" text NOT NULL, "ModifiedAtUtc" timestamptz, "IsDeleted" boolean NOT NULL, "Status" int NOT NULL);
                INSERT INTO workflow."Workflows" VALUES ('{WorkflowId}', 'E2E', now() - interval '1 hour', false, 1);

                CREATE TABLE workflow.workflow_instances_72c7ac44 (
                    id uuid PRIMARY KEY, status int NOT NULL, is_archived boolean NOT NULL DEFAULT false, completed_at_utc timestamptz,
                    created_at_utc timestamptz NOT NULL, started_by uuid NOT NULL, reference_number text);
                INSERT INTO workflow.workflow_instances_72c7ac44 (id, status, created_at_utc, started_by, reference_number)
                VALUES ('{InstanceId}', 1, now(), '{Starter}', 'REQ-1');

                CREATE TABLE workflow.transaction_72c7ac44 (
                    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, workflow_instance_id uuid NOT NULL, activity_id text, stage_type text,
                    stage_name text, review text, action_status int NOT NULL DEFAULT 0, activity_user_id uuid, user_ids text, group_ids text,
                    created_at timestamptz NOT NULL DEFAULT now(), is_deleted boolean NOT NULL DEFAULT false);
                INSERT INTO workflow.transaction_72c7ac44 (workflow_instance_id, activity_id, stage_type, review, action_status, activity_user_id)
                VALUES ('{InstanceId}', 'stage-1', 'START', 'Submit', 1, '{Starter}');
                INSERT INTO workflow.transaction_72c7ac44 (workflow_instance_id, activity_id, stage_type, stage_name, activity_user_id)
                VALUES ('{InstanceId}', '{TargetActivity}', 'INTERNAL_ACTOR', 'Reviewer', '{Assignee}');

                CREATE TABLE users."Users" ("Id" uuid PRIMARY KEY, "Email" text, "DisplayName" text, "PhoneNo" text, "CountryCode" text, "IsDeleted" boolean NOT NULL DEFAULT false);
                INSERT INTO users."Users" ("Id", "Email", "DisplayName") VALUES
                    ('{Starter}', 'starter@example.com', 'Starter'), ('{Assignee}', 'assignee@example.com', 'Assignee'),
                    ('{Raja}', 'raja@example.com', 'Raja'), ('{Lead}', 'lead@example.com', 'Lead'),
                    ('{MemberA}', 'member.a@example.com', 'Member A'), ('{MemberB}', 'member.b@example.com', 'Member B');
                CREATE TABLE users."Groups" ("Id" uuid PRIMARY KEY, "Name" text NOT NULL, "CreatedAtUtc" timestamptz NOT NULL DEFAULT now(), "IsDeleted" boolean NOT NULL DEFAULT false);
                INSERT INTO users."Groups" ("Id", "Name") VALUES ('{GroupId}', 'Sales Team');
                CREATE TABLE users."UserGroups" ("GroupId" uuid NOT NULL, "UserId" uuid NOT NULL, "TenantId" uuid);
                INSERT INTO users."UserGroups" ("GroupId", "UserId") VALUES ('{GroupId}', '{MemberA}'), ('{GroupId}', '{MemberB}');
                """);
            return database;
        }

        public async Task ExecuteAsync(string sql)
        {
            await using var connection = new NpgsqlConnection(ConnectionString);
            await connection.OpenAsync();
            await using var cmd = new NpgsqlCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<T> ScalarAsync<T>(string sql)
        {
            await using var connection = new NpgsqlConnection(ConnectionString);
            await connection.OpenAsync();
            await using var cmd = new NpgsqlCommand(sql, connection);
            return (T)(await cmd.ExecuteScalarAsync())!;
        }

        public async Task<List<T>> ListAsync<T>(string sql, Func<NpgsqlDataReader, T> read)
        {
            await using var connection = new NpgsqlConnection(ConnectionString);
            await connection.OpenAsync();
            await using var cmd = new NpgsqlCommand(sql, connection);
            await using var reader = await cmd.ExecuteReaderAsync();
            var rows = new List<T>();
            while (await reader.ReadAsync())
                rows.Add(read(reader));
            return rows;
        }

        public async ValueTask DisposeAsync()
        {
            NpgsqlConnection.ClearAllPools();
            await using var admin = new NpgsqlConnection(Server);
            await admin.OpenAsync();
            await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS {_name} WITH (FORCE);", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private sealed class FakeTenant(string connectionString) : ITenantContext
    {
        public Guid? TenantId => Guid.Empty;
        public string? ConnectionString => connectionString;
    }

    private sealed class FakeJson(string json) : IWorkflowJsonStorageService
    {
        public Task SaveWorkflowJsonAsync(Guid workflowId, string value, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<string?> GetWorkflowJsonAsync(Guid workflowId, CancellationToken cancellationToken = default) =>
            Task.FromResult<string?>(json);
        public Task DeleteWorkflowJsonAsync(Guid workflowId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeMediator : IMediator
    {
        public bool Refuse { get; init; }
        public List<MoveToNextStepCommand> Sent { get; } = [];

        public Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default)
        {
            if (Refuse)
                throw new InvalidOperationException("Move-next refused.");
            Sent.Add((MoveToNextStepCommand)(object)request);
            return Task.FromResult(default(TResponse)!);
        }

        public Task Send<TRequest>(TRequest request, CancellationToken cancellationToken = default) where TRequest : IRequest =>
            throw new NotImplementedException();
        public Task<object?> Send(object request, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public IAsyncEnumerable<TResponse> CreateStream<TResponse>(IStreamRequest<TResponse> request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public IAsyncEnumerable<object?> CreateStream(object request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task Publish(object notification, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task Publish<TNotification>(TNotification notification, CancellationToken cancellationToken = default) where TNotification : INotification =>
            throw new NotImplementedException();
    }

    private sealed class FakeSecurity : IWorkflowSecurityService
    {
        public List<Guid> Granted { get; } = [];

        public Task EnsureUserWorkflowAccessAsync(Guid workflowId, Guid userId, Guid grantedByUserId, CancellationToken cancellationToken = default)
        {
            Granted.Add(userId);
            return Task.CompletedTask;
        }

        public Task EnsureDefaultWorkflowSecurityAsync(Guid workflowId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<bool> UserSeesAllWorkflowsAsync(Guid userId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<bool> CanAccessWorkflowAsync(Guid workflowId, Guid userId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task SetWorkflowSecurityAsync(Guid workflowId, string[]? coordinators, string[]? superusers, List<SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow.WorkflowBlockDto> blocks, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task SetWorkflowUsersByDomainAsync(Guid workflowId, string[] domains, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<IReadOnlySet<Guid>> GetAccessibleWorkflowIdsAsync(Guid userId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeMailbox : IWorkflowLegacyMailboxSyncService
    {
        public Task SyncTransactionRowAsync(Guid workflowId, int transactionRowId, CancellationToken cancellationToken = default, int? inboxAction = null, MailboxOwnerCopyKind ownerMailboxCopy = MailboxOwnerCopyKind.Inbox) =>
            Task.CompletedTask;
        public Task EnsureConfiguredAssigneesAsync(Guid workflowId, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SyncInstanceEndTransactionsAsync(Guid workflowId, Guid workflowInstanceId, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task PropagateInstanceFormDataAsync(Guid workflowId, Guid workflowInstanceId, MailboxFormSnapshot form, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<(string? FormId, Guid? FormEntryId)?> TryGetProcessFormIdentityAsync(Guid workflowId, Guid workflowInstanceId, CancellationToken cancellationToken = default) =>
            Task.FromResult<(string? FormId, Guid? FormEntryId)?>(null);
    }

    private sealed class FakeMaster : IFormEntryService
    {
        private readonly IReadOnlyList<FormFieldLabel> _fields;
        private Dictionary<string, object?>[] _rows;

        public FakeMaster(params Dictionary<string, object?>[] rows)
            : this(Fields, rows)
        {
        }

        public FakeMaster(IReadOnlyList<FormFieldLabel> fields, params Dictionary<string, object?>[] rows)
        {
            _fields = fields;
            _rows = rows;
        }

        public void Replace(params Dictionary<string, object?>[] rows) => _rows = rows;

        public Task<FormEntryGetResult> GetEntriesAsync(string formId, string entryIds, CancellationToken cancellationToken = default)
        {
            var found = _rows.Where(r => string.Equals(r["item_id"]?.ToString(), entryIds, StringComparison.Ordinal)).ToList();
            return Task.FromResult(found.Count == 0
                ? new FormEntryGetResult(FormEntryGetStatus.NotFound, null)
                : new FormEntryGetResult(FormEntryGetStatus.Found, found));
        }

        public Task<IReadOnlyList<FormFieldLabel>> GetFieldLabelsAsync(string formId, CancellationToken cancellationToken = default) =>
            Task.FromResult(_fields);

        public Task<FormEntryResult> UpsertEntryAsync(string formId, Guid entryId, FormEntryUpsertRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryResult> UpsertEntryAsync(string formId, Guid entryId, JsonElement body, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryDeleteResult> DeleteEntryAsync(string formId, Guid entryId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryRestoreResult> RestoreEntryAsync(string formId, Guid entryId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryPermanentDeleteResult> PermanentlyDeleteEntryAsync(string formId, Guid entryId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryAllResult> ListEntriesAsync(string formId, FormEntryAllRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormControlDistinctValuesResult> GetDistinctControlValuesAsync(string wFormId, string wFormControlName, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryByColumnResult> GetEntriesByColumnAsync(string formId, string? columnName, string? columnValue = null,
            IReadOnlyList<FormEntryColumnFilter>? filters = null, string? columnId = null, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryByColumnResult> UpsertEntryByColumnsAsync(string formId, FormEntryUpsertByColumnsRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
        public Task<FormEntryByColumnResult> UpdateEntriesByColumnAsync(string formId, string columnName, string columnValue,
            FormEntryUpsertRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
    }
}

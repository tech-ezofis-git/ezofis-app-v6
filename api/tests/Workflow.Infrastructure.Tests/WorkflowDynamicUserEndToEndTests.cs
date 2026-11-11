using System.Reflection;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Domain.Entities;
using SaaSApp.Workflow.Domain.Enums;
using SaaSApp.Workflow.Infrastructure.Options;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

/// <summary>
/// Against a real Postgres, given in SLA_E2E_POSTGRES (a login that may create a throwaway database). Each test makes
/// its own database and drops it. Without the variable they return at once, so CI and normal runs are unaffected.
/// </summary>
public class WorkflowDynamicUserEndToEndTests
{
    private const string Suffix = "d1c2d3e4";
    private const string FieldId = "field-contact";
    private const string SecondFieldId = "field-second";
    private const string FormId = "aaaaaaaa-0000-0000-0000-000000000001";

    private static readonly Guid WorkflowId = Guid.Parse("d1c2d3e4-0000-0000-0000-000000000001");
    private static readonly Guid TenantId = Guid.Parse("a0000000-0000-0000-0000-000000000001");
    private static readonly Guid OtherTenantId = Guid.Parse("a0000000-0000-0000-0000-000000000002");
    private static readonly Guid Starter = Guid.Parse("b0000000-0000-0000-0000-000000000001");
    private static readonly Guid Muthu = Guid.Parse("b0000000-0000-0000-0000-000000000002");
    private static readonly Guid Raja = Guid.Parse("b0000000-0000-0000-0000-000000000003");
    private static readonly Guid StaticUser = Guid.Parse("b0000000-0000-0000-0000-000000000004");
    private static readonly Guid StaticUser2 = Guid.Parse("b0000000-0000-0000-0000-000000000005");

    private const string MuthuEmail = "muthu.perumal@example.com";
    private const string RajaEmail = "raja@example.com";

    private static List<WorkflowStep> Steps(string? staticApproversJson = null) =>
    [
        WorkflowStep.Create(WorkflowId, "Raise", StepType.Approval, 1, activityId: "start", stageType: "START"),
        WorkflowStep.Create(WorkflowId, "Review", StepType.Approval, 2, activityId: "review", stageType: "INTERNAL_ACTOR", approversJson: staticApproversJson),
        WorkflowStep.Create(WorkflowId, "Second", StepType.Approval, 3, activityId: "second", stageType: "INTERNAL_ACTOR"),
        WorkflowStep.Create(WorkflowId, "Done", StepType.Approval, 4, activityId: "end", stageType: "END"),
    ];

    private static string FormData(object value, string fieldId = FieldId) =>
        JsonSerializer.Serialize(new Dictionary<string, object> { [fieldId] = value });

    private static string DefaultJson(
        bool reviewDynamic = true,
        bool reviewStatic = false,
        string? reviewField = FieldId,
        bool secondDynamic = false) =>
        JsonSerializer.Serialize(new
        {
            blocks = new object[]
            {
                new { id = "start", settings = new { } },
                new { id = "review", settings = new { isDynamicUserEnabled = reviewDynamic, dynamicUserField = reviewField, isUserEnabled = reviewStatic } },
                new { id = "second", settings = new { isDynamicUserEnabled = secondDynamic, dynamicUserField = SecondFieldId, isUserEnabled = false } },
                new { id = "end", settings = new { } },
            },
        });

    [Fact]
    public Task Single_email_goes_to_the_existing_user_with_nothing_created() =>
        Run(async h =>
        {
            var result = await h.Submit(FormData(MuthuEmail));

            Assert.Equal(Muthu, result.NextActivityUserId);
            Assert.Equal([Muthu], await h.InboxUsers());
            Assert.Empty(h.Provisioned);
            Assert.Contains(Muthu, h.AccessGranted);
        });

    [Fact]
    public Task Multiple_emails_reach_every_inbox_and_the_one_who_acts_moves_to_sent() =>
        Run(async h =>
        {
            var form = JsonSerializer.Serialize(new Dictionary<string, object>
            {
                [FieldId] = new[] { MuthuEmail, RajaEmail },
                [SecondFieldId] = "static1@example.com",
            });

            await h.Submit(form);
            Assert.Equal([Muthu, Raja], await h.InboxUsers());

            // Raja is not the row's first user. They still act as themselves, not as the row owner.
            await h.Move(h.Steps[1], "Approve", Raja, form);

            Assert.Equal(1, await h.Count("""SELECT COUNT(*) FROM workflow.sent_d1c2d3e4 WHERE user_id = @Raja AND activity_id = 'review'"""));
            Assert.Equal(1, await h.Count("""SELECT COUNT(*) FROM workflow.transaction_d1c2d3e4 WHERE activity_id = 'review' AND activity_user_id::text = @Raja"""));

            // Muthu's copy is gone and only the next stage's person holds the request now.
            Assert.Equal([StaticUser], await h.InboxUsers());
            Assert.Equal(1, await h.Count("""SELECT COUNT(*) FROM workflow.transaction_d1c2d3e4 WHERE activity_id = 'second' AND action_status = 0"""));
        },
        workflowJson: DefaultJson(secondDynamic: true));

    [Fact]
    public Task Duplicates_differing_only_by_case_are_one_assignment() =>
        Run(async h =>
        {
            await h.Submit(FormData(new[] { MuthuEmail, "MUTHU.PERUMAL@EXAMPLE.COM" }));

            Assert.Equal([Muthu], await h.InboxUsers());
        });

    [Fact]
    public Task Each_request_uses_its_own_value() =>
        Run(async h =>
        {
            await h.Submit(FormData(MuthuEmail));
            var other = await h.NewInstance();
            await h.Submit(FormData(RajaEmail), other);

            Assert.Equal([Muthu], await h.InboxUsers());
            Assert.Equal([Raja], await h.InboxUsers(other));
        });

    [Theory]
    [InlineData("invalid-email", "invalid-email")]
    [InlineData("", "Contact Email")]
    public Task Bad_value_leaves_the_request_where_it_is_and_can_be_corrected(string value, string expectedInMessage) =>
        Run(async h =>
        {
            var ex = await Assert.ThrowsAsync<WorkflowDynamicAssignmentException>(() => h.Submit(FormData(value)));
            Assert.Contains(expectedInMessage, ex.Message);

            Assert.Equal(1, await h.Count("""SELECT COUNT(*) FROM workflow.transaction_d1c2d3e4 WHERE activity_id = 'start' AND action_status = 0 AND COALESCE(review, '') = ''"""));
            Assert.Equal(0, await h.Count("""SELECT COUNT(*) FROM workflow.transaction_d1c2d3e4 WHERE activity_id = 'review'"""));
            Assert.Empty(h.Provisioned);

            // Correcting the value and acting again works: the step was never closed.
            await h.Submit(FormData(MuthuEmail));
            Assert.Equal([Muthu], await h.InboxUsers());
        });

    [Fact]
    public Task One_invalid_email_among_valid_ones_refuses_the_whole_list() =>
        Run(async h =>
        {
            var ex = await Assert.ThrowsAsync<WorkflowDynamicAssignmentException>(
                () => h.Submit(FormData(new[] { MuthuEmail, "invalid-email" })));

            Assert.Contains("invalid-email", ex.Message);
            Assert.Empty(await h.InboxUsers());
        });

    [Fact]
    public Task No_field_selected_is_a_clear_error() =>
        Run(async h =>
        {
            var ex = await Assert.ThrowsAsync<WorkflowDynamicAssignmentException>(() => h.Submit(FormData(MuthuEmail)));
            Assert.Contains("no email field selected", ex.Message);
        }, workflowJson: DefaultJson(reviewField: null));

    [Fact]
    public Task New_email_is_refused_while_the_tenant_does_not_allow_account_creation() =>
        Run(async h =>
        {
            var ex = await Assert.ThrowsAsync<WorkflowDynamicAssignmentException>(
                () => h.Submit(FormData("new.user@example.com")));

            Assert.Contains("does not have an account", ex.Message);
            Assert.Empty(h.Provisioned);
        });

    [Fact]
    public Task New_email_gets_one_account_when_allowed_even_when_retried_and_concurrent() =>
        Run(async h =>
        {
            const string email = "new.user@example.com";
            var other = await h.NewInstance();

            // Two requests naming the same new person at once.
            await Task.WhenAll(h.Submit(FormData(email)), h.Submit(FormData(email), other));

            Assert.Single(h.Provisioned);
            Assert.Equal(1, await h.Count($"""SELECT COUNT(*) FROM users."Users" WHERE LOWER("Email") = '{email}'"""));
            var created = await h.Scalar($"""SELECT "Id"::text FROM users."Users" WHERE LOWER("Email") = '{email}'""");
            Assert.Equal([Guid.Parse(created!)], await h.InboxUsers());
            Assert.Equal([Guid.Parse(created!)], await h.InboxUsers(other));

            // A second pass over the same step does not create a duplicate task.
            await h.Move(h.Steps[0], "Submit", Starter, FormData(email));
            Assert.Equal(1, await h.Count("""SELECT COUNT(*) FROM workflow.transaction_d1c2d3e4 WHERE activity_id = 'review' AND action_status = 0 AND workflow_instance_id = @Instance"""));
        }, allowProvisioning: true);

    [Fact]
    public Task A_user_in_another_tenant_is_never_assigned() =>
        Run(async h =>
        {
            const string email = "elsewhere@example.com";
            await h.Exec($"""INSERT INTO users."Users" ("Id", "TenantId", "Email") VALUES ('{Guid.NewGuid()}', '{OtherTenantId}', '{email}');""");

            await Assert.ThrowsAsync<WorkflowDynamicAssignmentException>(() => h.Submit(FormData(email)));
            Assert.Empty(await h.InboxUsers());
        });

    [Fact]
    public Task A_soft_deleted_user_is_not_reused() =>
        Run(async h =>
        {
            const string email = "gone@example.com";
            await h.Exec($"""INSERT INTO users."Users" ("Id", "TenantId", "Email", "IsDeleted") VALUES ('{Guid.NewGuid()}', '{TenantId}', '{email}', true);""");

            await Assert.ThrowsAsync<WorkflowDynamicAssignmentException>(() => h.Submit(FormData(email)));
        });

    [Fact]
    public Task Value_is_read_from_the_saved_entry_when_the_submit_did_not_carry_it() =>
        Run(async h =>
        {
            var entryId = Guid.NewGuid();
            var table = $"ezfb_{FormIdNaming.GetEzfbTableSuffix(FormId)}_items";
            await h.Exec($"""
                CREATE TABLE dbo."{table}" (item_id uuid, is_deleted boolean DEFAULT false, "Contact_Email" text);
                INSERT INTO dbo."{table}" (item_id, "Contact_Email") VALUES ('{entryId}', '["{MuthuEmail}","{RajaEmail}"]');
                """);

            await h.Move(h.Steps[0], "Submit", Starter, FormData("x", "some-other-field"), entryId);

            Assert.Equal([Muthu, Raja], await h.InboxUsers());
        });

    [Fact]
    public Task Listing_the_inbox_does_not_replace_the_people_on_a_dynamic_row() =>
        Run(async h =>
        {
            await h.Submit(FormData(MuthuEmail));

            await h.Mailbox.EnsureConfiguredAssigneesAsync(WorkflowId);

            Assert.Equal([Muthu], await h.InboxUsers());
        },
        workflowJson: DefaultJson(reviewStatic: false),
        staticApproversJson: JsonSerializer.Serialize(new[] { StaticUser.ToString(), StaticUser2.ToString() }));

    [Fact]
    public Task Static_stage_is_unchanged() =>
        Run(async h =>
        {
            var result = await h.Submit(null);

            Assert.Equal(StaticUser, result.NextActivityUserId);
            Assert.Equal([StaticUser, StaticUser2], await h.InboxUsers());
            Assert.Equal(0, await h.Count("""SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'workflow' AND table_name = 'transaction_d1c2d3e4' AND column_name = 'dynamic_user_ids'"""));
        },
        workflowJson: DefaultJson(reviewDynamic: false, reviewStatic: true),
        staticApproversJson: JsonSerializer.Serialize(new[] { StaticUser.ToString(), StaticUser2.ToString() }));

    [Fact]
    public Task Enabled_static_users_are_the_fallback_for_an_empty_field_and_join_a_filled_one() =>
        Run(async h =>
        {
            await h.Submit(FormData(""));
            Assert.Equal([StaticUser, StaticUser2], await h.InboxUsers());

            var other = await h.NewInstance();
            await h.Submit(FormData(MuthuEmail), other);
            Assert.Equal([Muthu, StaticUser, StaticUser2], await h.InboxUsers(other));
        },
        workflowJson: DefaultJson(reviewStatic: true),
        staticApproversJson: JsonSerializer.Serialize(new[] { StaticUser.ToString(), StaticUser2.ToString() }));

    [Fact]
    public Task Next_stage_user_gets_nothing_until_their_stage_opens_and_history_survives_a_repeat_assignment() =>
        Run(async h =>
        {
            var form = JsonSerializer.Serialize(new Dictionary<string, object>
            {
                [FieldId] = MuthuEmail,
                [SecondFieldId] = MuthuEmail,
            });

            await h.Submit(form);
            Assert.Equal([Muthu], await h.InboxUsers());

            // The same person is assigned the next stage too: one active task, earlier step kept.
            await h.Move(h.Steps[1], "Approve", Muthu, form);
            Assert.Equal([Muthu], await h.InboxUsers());
            Assert.Equal(1, await h.Count("""SELECT COUNT(*) FROM workflow.inbox_d1c2d3e4 WHERE activity_id = 'second'"""));
            Assert.Equal(1, await h.Count("""SELECT COUNT(*) FROM workflow.transaction_d1c2d3e4 WHERE activity_id = 'review' AND review = 'Approve'"""));

            // Finishing completes the workflow normally.
            var finished = await h.Move(h.Steps[2], "Approve", Muthu, form);
            Assert.True(finished.WorkflowCompleted);
            Assert.Empty(await h.InboxUsers());
            Assert.True(await h.Count("""SELECT COUNT(*) FROM workflow.completed_d1c2d3e4""") >= 1);
        },
        workflowJson: DefaultJson(secondDynamic: true));

    [Fact]
    public Task Forward_hands_the_forwarders_place_to_the_recipient() =>
        Run(async h =>
        {
            await h.Submit(FormData(new[] { MuthuEmail, RajaEmail }));

            await h.Sync.SyncTransactionByActivityIdAsync(
                WorkflowId, h.Instance, null, h.Steps[1], h.Steps, "review", Muthu, StaticUser, "Forward");

            var people = await h.Scalar("""SELECT dynamic_user_ids FROM workflow.transaction_d1c2d3e4 WHERE activity_id = 'review' AND action_status = 0""");
            Assert.Contains(StaticUser.ToString(), people);
            Assert.Contains(Raja.ToString(), people);
            Assert.DoesNotContain(Muthu.ToString(), people);
            Assert.Contains(StaticUser, await h.InboxUsers());
            Assert.Contains(Raja, await h.InboxUsers());
        });

    [Fact]
    public Task Start_check_refuses_bad_values_and_creates_nothing() =>
        Run(async h =>
        {
            await Assert.ThrowsAsync<WorkflowDynamicAssignmentException>(() => h.Dynamic.ValidateStartAsync(
                WorkflowId, h.Steps, new Dictionary<string, string> { [FieldId] = "invalid-email" }));
            await Assert.ThrowsAsync<WorkflowDynamicAssignmentException>(() => h.Dynamic.ValidateStartAsync(
                WorkflowId, h.Steps, new Dictionary<string, string>()));
            await Assert.ThrowsAsync<WorkflowDynamicAssignmentException>(() => h.Dynamic.ValidateStartAsync(
                WorkflowId, h.Steps, new Dictionary<string, string> { [FieldId] = "new.user@example.com" }));

            await h.Dynamic.ValidateStartAsync(
                WorkflowId, h.Steps, new Dictionary<string, string> { [FieldId] = $"""["{MuthuEmail}","{RajaEmail}"]""" });
            Assert.Empty(h.Provisioned);
        });

    [Fact]
    public Task Start_check_ignores_a_static_next_stage() =>
        Run(h => h.Dynamic.ValidateStartAsync(WorkflowId, h.Steps, null),
            workflowJson: DefaultJson(reviewDynamic: false, reviewStatic: true));

    private static async Task Run(
        Func<Harness, Task> test,
        string? workflowJson = null,
        string? staticApproversJson = null,
        bool allowProvisioning = false)
    {
        var server = Environment.GetEnvironmentVariable("SLA_E2E_POSTGRES");
        if (string.IsNullOrWhiteSpace(server))
            return;

        var name = $"dynuser_e2e_{Guid.NewGuid():N}";
        await using (var admin = new NpgsqlConnection(server))
        {
            await admin.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE {name};", admin);
            await create.ExecuteNonQueryAsync();
        }

        var connectionString = new NpgsqlConnectionStringBuilder(server) { Database = name, Pooling = false }.ConnectionString;
        try
        {
            var harness = await Harness.CreateAsync(
                connectionString, workflowJson ?? DefaultJson(), Steps(staticApproversJson), allowProvisioning);
            await test(harness);
        }
        finally
        {
            await using var admin = new NpgsqlConnection(server);
            await admin.OpenAsync();
            await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS {name} WITH (FORCE);", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private sealed class Harness
    {
        private readonly string _connectionString;

        private Harness(string connectionString) => _connectionString = connectionString;

        public List<WorkflowStep> Steps { get; private set; } = null!;
        public Guid Instance { get; private set; }
        public WorkflowLegacyMailboxSyncService Mailbox { get; private set; } = null!;
        public WorkflowLegacyTransactionSyncService Sync { get; private set; } = null!;
        public WorkflowDynamicAssigneeService Dynamic { get; private set; } = null!;
        public System.Collections.Concurrent.ConcurrentBag<string> Provisioned { get; } = [];
        public System.Collections.Concurrent.ConcurrentBag<Guid> AccessGranted { get; } = [];

        public static async Task<Harness> CreateAsync(
            string connectionString,
            string workflowJson,
            List<WorkflowStep> steps,
            bool allowProvisioning)
        {
            var h = new Harness(connectionString) { Steps = steps };
            await h.Exec($"""
                CREATE SCHEMA workflow;
                CREATE SCHEMA users;
                CREATE SCHEMA IF NOT EXISTS dbo;
                CREATE TABLE users."Users" ("Id" uuid PRIMARY KEY, "TenantId" uuid, "Email" text, "DisplayName" text, "IsDeleted" boolean NOT NULL DEFAULT false, "CreatedAtUtc" timestamptz NOT NULL DEFAULT now());
                CREATE TABLE workflow."Workflows" ("Id" uuid PRIMARY KEY, "Name" text, "FormId" text, "RepositoryId" text, "IsDeleted" boolean NOT NULL DEFAULT false);
                CREATE TABLE workflow."WorkflowSteps" ("Id" uuid PRIMARY KEY, "WorkflowId" uuid, "ActivityId" text, "ApproversJson" text, "AssignedToUserId" uuid, "IsDeleted" boolean NOT NULL DEFAULT false);
                CREATE TABLE dbo."wFormControl" ("wFormId" text, "jsonId" text, name text, "isDeleted" boolean NOT NULL DEFAULT false);
                INSERT INTO dbo."wFormControl" ("wFormId", "jsonId", name) VALUES ('{FormId}', '{FieldId}', 'Contact Email'), ('{FormId}', '{SecondFieldId}', 'Second Approver');
                INSERT INTO workflow."Workflows" ("Id", "Name", "FormId") VALUES ('{WorkflowId}', 'E2E', '{FormId}');
                INSERT INTO users."Users" ("Id", "TenantId", "Email") VALUES
                    ('{Starter}', '{TenantId}', 'starter@example.com'),
                    ('{Muthu}', '{TenantId}', '{MuthuEmail}'),
                    ('{Raja}', '{TenantId}', 'Raja@Example.com'),
                    ('{StaticUser}', '{TenantId}', 'static1@example.com'),
                    ('{StaticUser2}', '{TenantId}', 'static2@example.com');
                """);

            foreach (var step in steps)
            {
                await h.Exec(
                    $"""INSERT INTO workflow."WorkflowSteps" ("Id", "WorkflowId", "ActivityId", "ApproversJson") VALUES ('{step.Id}', '{WorkflowId}', '{step.ActivityId}', {(step.ApproversJson == null ? "NULL" : $"'{step.ApproversJson}'")});""");
            }

            // The creator remembers per process which workflow tables it has made; each test has a new database.
            foreach (var field in typeof(WorkflowTableCreator).GetFields(BindingFlags.NonPublic | BindingFlags.Static))
            {
                if (field.GetValue(null) is System.Collections.Concurrent.ConcurrentDictionary<string, byte> ensured)
                    ensured.TryRemove(Suffix, out _);
            }

            var tenant = new FakeTenant(connectionString);
            var creator = new WorkflowTableCreator();
            await creator.EnsureWorkflowTablesForStartAsync(WorkflowId, connectionString);

            h.Mailbox = new WorkflowLegacyMailboxSyncService(tenant, creator, NullLogger<WorkflowLegacyMailboxSyncService>.Instance);
            h.Dynamic = new WorkflowDynamicAssigneeService(
                tenant,
                Stub<IWorkflowJsonStorageService>((method, _) => method.Name == nameof(IWorkflowJsonStorageService.GetWorkflowJsonAsync)
                    ? Task.FromResult<string?>(workflowJson)
                    : null),
                h.Mailbox,
                Stub<IShareGuestUserProvisioningService>((method, args) => method.Name == nameof(IShareGuestUserProvisioningService.EnsureGuestUserAsync)
                    ? h.ProvisionAsync((Guid)args![0]!, (string)args[1]!)
                    : null),
                Stub<IWorkflowSecurityService>((method, args) =>
                {
                    if (method.Name == nameof(IWorkflowSecurityService.EnsureUserWorkflowAccessAsync))
                        h.AccessGranted.Add((Guid)args![1]!);
                    return null;
                }),
                Microsoft.Extensions.Options.Options.Create(new WorkflowDynamicUserOptions
                {
                    AutoProvisionTenantIds = allowProvisioning ? [TenantId.ToString()] : [],
                }),
                NullLogger<WorkflowDynamicAssigneeService>.Instance);

            var mail = new WorkflowDelegationMailService(
                tenant,
                Stub<IUserEmailLookup>(),
                null!,
                new ConfigurationBuilder().Build(),
                NullLogger<WorkflowDelegationMailService>.Instance);
            h.Sync = new WorkflowLegacyTransactionSyncService(
                tenant,
                creator,
                h.Mailbox,
                Stub<IRepositoryItemShareService>(),
                Stub<IWorkflowDelegationService>(),
                mail,
                NullLogger<WorkflowLegacyTransactionSyncService>.Instance,
                h.Dynamic);

            h.Instance = await h.NewInstance();
            return h;
        }

        /// <summary>Slow on purpose, so concurrent requests would both create the user if they were not taking turns.</summary>
        private async Task<ProvisionedGuestUser> ProvisionAsync(Guid tenantId, string email)
        {
            await Task.Delay(100);
            var id = Guid.NewGuid();
            await Exec($"""INSERT INTO users."Users" ("Id", "TenantId", "Email") VALUES ('{id}', '{tenantId}', '{email}');""");
            Provisioned.Add(email);
            return new ProvisionedGuestUser(id, "TenantUser");
        }

        public async Task<Guid> NewInstance()
        {
            var id = Guid.NewGuid();
            await Exec($"""
                INSERT INTO workflow.workflow_instances_{Suffix}
                    (id, tenant_id, workflow_id, workflow_name, workflow_version, status, started_by)
                VALUES ('{id}', '{TenantId}', '{WorkflowId}', 'E2E', 1, {(int)WorkflowInstanceStatus.Running}, '{Starter}');
                """);
            return id;
        }

        public Task<WorkflowLegacyTransactionSyncResult> Submit(string? formJson, Guid? instance = null) =>
            MoveOn(instance ?? Instance, Steps[0], "Submit", Starter, formJson, null);

        public Task<WorkflowLegacyTransactionSyncResult> Move(
            WorkflowStep step, string review, Guid actor, string? formJson, Guid? entryId = null) =>
            MoveOn(Instance, step, review, actor, formJson, entryId);

        private Task<WorkflowLegacyTransactionSyncResult> MoveOn(
            Guid instance, WorkflowStep step, string review, Guid actor, string? formJson, Guid? entryId) =>
            Sync.SyncTransactionByActivityIdAsync(
                WorkflowId,
                instance,
                null,
                step,
                Steps,
                step.ActivityId!,
                actor,
                null,
                review,
                formJson == null ? null : new MailboxFormSnapshot(FormId, entryId, formJson));

        public async Task<List<Guid>> InboxUsers(Guid? instance = null)
        {
            await using var connection = await OpenAsync();
            await using var cmd = new NpgsqlCommand(
                $"SELECT user_id FROM workflow.inbox_{Suffix} WHERE workflow_instance_id = @Instance",
                connection);
            cmd.Parameters.AddWithValue("@Instance", (instance ?? Instance).ToString("D"));
            await using var reader = await cmd.ExecuteReaderAsync();
            var users = new List<Guid>();
            while (await reader.ReadAsync())
                users.Add(Guid.Parse(reader.GetString(0)));
            users.Sort();
            return users;
        }

        public async Task<int> Count(string sql) => Convert.ToInt32(await ScalarObject(sql));

        public async Task<string?> Scalar(string sql) => (await ScalarObject(sql))?.ToString();

        private async Task<object?> ScalarObject(string sql)
        {
            await using var connection = await OpenAsync();
            await using var cmd = new NpgsqlCommand(sql, connection);
            if (sql.Contains("@Raja", StringComparison.Ordinal))
                cmd.Parameters.AddWithValue("@Raja", Raja.ToString("D"));
            if (sql.Contains("@Muthu", StringComparison.Ordinal))
                cmd.Parameters.AddWithValue("@Muthu", Muthu.ToString("D"));
            if (sql.Contains("@Instance", StringComparison.Ordinal))
                cmd.Parameters.AddWithValue("@Instance", Instance);
            return await cmd.ExecuteScalarAsync();
        }

        public async Task Exec(string sql)
        {
            await using var connection = await OpenAsync();
            await using var cmd = new NpgsqlCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync();
        }

        private async Task<NpgsqlConnection> OpenAsync()
        {
            var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            return connection;
        }
    }

    private sealed class FakeTenant(string connectionString) : ITenantContext
    {
        public Guid? TenantId => WorkflowDynamicUserEndToEndTests.TenantId;
        public string? ConnectionString => connectionString;
    }

    private static T Stub<T>(Func<MethodInfo, object?[]?, object?>? handler = null) where T : class
    {
        var proxy = DispatchProxy.Create<T, StubProxy>();
        ((StubProxy)(object)proxy).Handler = handler;
        return proxy;
    }

    /// <summary>Answers with the handler's result, otherwise with an empty one.</summary>
    private class StubProxy : DispatchProxy
    {
        public Func<MethodInfo, object?[]?, object?>? Handler { get; set; }

        protected override object? Invoke(MethodInfo? method, object?[]? args)
        {
            var handled = Handler?.Invoke(method!, args);
            if (handled != null)
                return handled;

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

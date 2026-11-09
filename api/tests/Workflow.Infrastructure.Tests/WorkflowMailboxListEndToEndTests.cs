using System.Reflection;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

/// <summary>
/// Inbox / Sent / Completed lists and tab counts against a real database (skipped unless
/// SLA_E2E_POSTGRES is set, like the other end-to-end tests). Checks the single-pass total,
/// one row per ticket, paging, the batched form data and that the inbox no longer ALTERs the
/// transaction table on every call.
/// </summary>
public sealed class WorkflowMailboxListEndToEndTests
{
    private const string Suffix = "e1f2a3b4";
    private const string FormId = "cccccccc-0000-0000-0000-000000000001";
    private const string FieldId = "field-subject";

    private static readonly Guid WorkflowId = Guid.Parse("e1f2a3b4-0000-0000-0000-000000000001");
    private static readonly Guid TenantId = Guid.Parse("a0000000-0000-0000-0000-000000000009");
    private static readonly Guid Me = Guid.Parse("b0000000-0000-0000-0000-000000000011");
    private static readonly Guid Other = Guid.Parse("b0000000-0000-0000-0000-000000000012");

    [Fact]
    public Task Completed_pages_one_row_per_ticket_newest_first_with_the_total() => Run(async h =>
    {
        // 5 finished tickets for me (ticket 3 has a second, newest completed row), 1 for someone
        // else, 1 of mine whose END step was re-initiated (not finished).
        for (var t = 1; t <= 5; t++)
            await h.AddTicket(t, finished: true, mailbox: "completed", user: Me);
        await h.AddMailboxRow("completed", ticket: 3, user: Me, minutesAfter: 300);
        await h.AddTicket(6, finished: true, mailbox: "completed", user: Other);
        await h.AddTicket(7, finished: false, mailbox: "completed", user: Me, review: "Re-initiate");

        var page1 = await h.List(LegacyMailboxTableKind.Completed, page: 1, pageSize: 2);
        Assert.Equal(5, page1.TotalCount);
        Assert.Equal([Ticket(3), Ticket(5)], page1.Items.Select(i => i.WorkflowInstanceId));

        var page3 = await h.List(LegacyMailboxTableKind.Completed, page: 3, pageSize: 2);
        Assert.Equal(5, page3.TotalCount);
        Assert.Equal([Ticket(1)], page3.Items.Select(i => i.WorkflowInstanceId));

        // Past the end: no rows, the total still comes from the count query.
        var past = await h.List(LegacyMailboxTableKind.Completed, page: 9, pageSize: 2);
        Assert.Empty(past.Items);
        Assert.Equal(5, past.TotalCount);

        var counts = await h.Query.GetInstanceCountsAsync(new LegacyMailboxInstanceCountRequest(WorkflowId, Me));
        Assert.Equal(5, counts.CompletedCount);
    });

    [Fact]
    public Task Migrated_rows_without_form_data_read_it_from_the_form_table() => Run(async h =>
    {
        for (var t = 1; t <= 3; t++)
            await h.AddTicket(t, finished: true, mailbox: "completed", user: Me);

        var page = await h.List(LegacyMailboxTableKind.Completed, page: 1, pageSize: 10);
        Assert.Equal(3, page.Items.Count);
        foreach (var item in page.Items)
        {
            using var doc = JsonDocument.Parse(item.FormData!);
            var ticket = int.Parse(item.WorkflowInstanceId![^12..]);
            Assert.Equal($"Subject {ticket}", doc.RootElement.GetProperty(FieldId).GetString());
        }
    });

    [Fact]
    public Task Inbox_lists_open_tickets_without_altering_the_transaction_table() => Run(async h =>
    {
        await h.AddTicket(1, finished: false, mailbox: "inbox", user: Me);
        await h.AddTicket(2, finished: false, mailbox: "inbox", user: Me);
        await h.AddTicket(3, finished: true, mailbox: "inbox", user: Me); // no open step any more

        // The first call adds the missing assignee column once (new tables lack dynamic_user_ids).
        await h.List(LegacyMailboxTableKind.Inbox, page: 1, pageSize: 20);

        // After that, a session holding a lock on the transaction table (a long Completed query does)
        // must not block the inbox: the old per-call ALTER TABLE waited for it.
        await using var blocker = await h.OpenAsync();
        await using var tx = await blocker.BeginTransactionAsync();
        await using (var lockCmd = new NpgsqlCommand($"LOCK TABLE workflow.transaction_{Suffix} IN ACCESS SHARE MODE;", blocker, tx))
            await lockCmd.ExecuteNonQueryAsync();

        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        var inbox = await h.List(LegacyMailboxTableKind.Inbox, page: 1, pageSize: 20, timeout.Token);
        Assert.Equal(2, inbox.TotalCount);
        Assert.Equal([Ticket(2), Ticket(1)], inbox.Items.Select(i => i.WorkflowInstanceId));
        await tx.RollbackAsync();
    });

    private static string Ticket(int n) => $"f0000000-0000-0000-0000-{n:D12}";

    private static async Task Run(Func<Harness, Task> test)
    {
        var server = Environment.GetEnvironmentVariable("SLA_E2E_POSTGRES");
        if (string.IsNullOrWhiteSpace(server))
            return;

        var name = $"mailbox_e2e_{Guid.NewGuid():N}";
        await using (var admin = new NpgsqlConnection(server))
        {
            await admin.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE {name};", admin);
            await create.ExecuteNonQueryAsync();
        }

        var connectionString = new NpgsqlConnectionStringBuilder(server) { Database = name, Pooling = false }.ConnectionString;
        try
        {
            await test(await Harness.CreateAsync(connectionString));
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
        private readonly DateTime _start = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        private Harness(string connectionString) => _connectionString = connectionString;

        public WorkflowLegacyMailboxQueryService Query { get; private set; } = null!;

        public static async Task<Harness> CreateAsync(string connectionString)
        {
            var h = new Harness(connectionString);
            await h.Exec($"""
                CREATE SCHEMA workflow;
                CREATE SCHEMA users;
                CREATE SCHEMA IF NOT EXISTS dbo;
                CREATE TABLE users."Users" ("Id" uuid PRIMARY KEY, "Email" text, "IsDeleted" boolean NOT NULL DEFAULT false);
                CREATE TABLE workflow."groupUser" ("GroupId" integer, "UserId" uuid, "IsDeleted" boolean NOT NULL DEFAULT false);
                CREATE TABLE workflow."WorkflowSteps" ("Id" uuid PRIMARY KEY, "WorkflowId" uuid, "ActivityId" text, "ApproversJson" text, "AssignedToUserId" uuid, "IsDeleted" boolean NOT NULL DEFAULT false);
                CREATE TABLE dbo."wFormControl" (id serial PRIMARY KEY, "parentId" integer, "wFormId" text, "jsonId" text, name text, type text, "isDeleted" boolean NOT NULL DEFAULT false);
                INSERT INTO dbo."wFormControl" ("wFormId", "jsonId", name, type) VALUES ('{FormId}', '{FieldId}', 'Subject', 'SHORT_TEXT');
                CREATE TABLE dbo.ezfb_cccccccc_items (item_id uuid PRIMARY KEY, "{FieldId}" text, is_deleted boolean NOT NULL DEFAULT false);
                INSERT INTO users."Users" ("Id", "Email") VALUES ('{Me}', 'me@example.com'), ('{Other}', 'other@example.com');
                """);

            // The creator remembers per process which workflow tables it has made; each test has a new database.
            foreach (var field in typeof(WorkflowTableCreator).GetFields(BindingFlags.NonPublic | BindingFlags.Static))
            {
                if (field.GetValue(null) is System.Collections.Concurrent.ConcurrentDictionary<string, byte> ensured)
                    ensured.TryRemove(Suffix, out _);
            }

            var tenant = new FakeTenant(connectionString);
            var creator = new WorkflowTableCreator();
            await creator.EnsureWorkflowTablesForStartAsync(WorkflowId, connectionString);
            var sync = new WorkflowLegacyMailboxSyncService(tenant, creator, NullLogger<WorkflowLegacyMailboxSyncService>.Instance);
            h.Query = new WorkflowLegacyMailboxQueryService(
                tenant,
                new WorkflowEzfbFormDataLoader(tenant),
                DispatchProxy.Create<IRepositoryItemQueryService, EmptyProxy>(),
                sync,
                DispatchProxy.Create<IWorkflowInsightService, EmptyProxy>());
            return h;
        }

        /// <summary>A ticket: its transactions (open or finished) and one mailbox row, created in ticket order.</summary>
        public async Task AddTicket(int ticket, bool finished, string mailbox, Guid user, string? review = null)
        {
            var instance = Ticket(ticket);
            await Exec($"""
                INSERT INTO workflow.transaction_{Suffix} (workflow_instance_id, stage_name, stage_type, action_status, activity_user_id, created_by)
                VALUES ('{instance}', 'Review', 'NORMAL', {(finished ? 1 : 0)}, '{user}', '{user}');
                INSERT INTO dbo.ezfb_cccccccc_items (item_id, "{FieldId}") VALUES ('{FormEntry(ticket)}', 'Subject {ticket}');
                """);
            if (finished || review != null)
            {
                await Exec($"""
                    INSERT INTO workflow.transaction_{Suffix} (workflow_instance_id, stage_name, stage_type, action_status, review, created_by)
                    VALUES ('{instance}', 'End', 'END', 1, {(review == null ? "NULL" : $"'{review}'")}, '{user}');
                    """);
            }

            await AddMailboxRow(mailbox, ticket, user, minutesAfter: 0);
        }

        public Task AddMailboxRow(string mailbox, int ticket, Guid user, int minutesAfter) => Exec($"""
            INSERT INTO workflow.{mailbox}_{Suffix}
                (user_id, workflow_id, name, workflow_instance_id, transaction_created_at, transaction_created_by, form_id, form_entry_id, stage, stage_type)
            VALUES ('{user}', '{WorkflowId}', 'Ticket {ticket}', '{Ticket(ticket)}',
                '{_start.AddHours(ticket).AddMinutes(minutesAfter):O}', '{user}', '{FormId}', '{FormEntry(ticket)}', 'Review', 'NORMAL');
            """);

        public Task<LegacyMailboxListResult> List(
            LegacyMailboxTableKind kind, int page, int pageSize, CancellationToken cancellationToken = default) =>
            Query.ListAsync(new LegacyMailboxListRequest(kind, WorkflowId, null, null, Me, page, pageSize), cancellationToken);

        private static string FormEntry(int ticket) => $"d0000000-0000-0000-0000-{ticket:D12}";

        public async Task Exec(string sql)
        {
            await using var connection = await OpenAsync();
            await using var cmd = new NpgsqlCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<NpgsqlConnection> OpenAsync()
        {
            var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            return connection;
        }
    }

    private sealed class FakeTenant(string connectionString) : ITenantContext
    {
        public Guid? TenantId => WorkflowMailboxListEndToEndTests.TenantId;
        public string? ConnectionString => connectionString;
    }

    /// <summary>Answers every call with an empty result (completed task, null).</summary>
    public class EmptyProxy : DispatchProxy
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

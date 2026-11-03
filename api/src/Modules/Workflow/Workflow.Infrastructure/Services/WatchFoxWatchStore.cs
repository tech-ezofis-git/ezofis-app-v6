using System.Collections.Concurrent;
using System.Data.Common;
using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// <c>dbo."WatchFoxWatch"</c> in the tenant database. Takes the connection string, because the
/// webhook and the sign-in return are anonymous and only know the tenant id.
/// </summary>
public sealed class WatchFoxWatchStore
{
    private const string Columns = """
        "Id", "WorkflowId", "Provider", "ConnectionId", "WatchId", "MailboxEmail", "Types"::text,
        "WebhookUrl", "Status", "LastError", "CreatedBy", "CreatedAtUtc", "ModifiedAtUtc"
        """;

    // Same SQL as scripts/postgres/Create-WatchFox-Tables.sql.
    private const string EnsureSql = """
        CREATE SCHEMA IF NOT EXISTS dbo;

        CREATE TABLE IF NOT EXISTS dbo."WatchFoxWatch" (
            "Id" uuid NOT NULL CONSTRAINT "PK_WatchFoxWatch" PRIMARY KEY,
            "WorkflowId" uuid NOT NULL,
            "Provider" varchar(16) NOT NULL,
            "ConnectionId" varchar(64) NULL,
            "WatchId" varchar(64) NULL,
            "MailboxEmail" varchar(320) NULL,
            "Types" jsonb NOT NULL DEFAULT '[]'::jsonb,
            "WebhookUrl" varchar(512) NULL,
            "Status" varchar(32) NOT NULL DEFAULT 'pending',
            "LastError" varchar(2000) NULL,
            "CreatedBy" uuid NULL,
            "CreatedAtUtc" timestamptz NOT NULL DEFAULT now(),
            "ModifiedBy" uuid NULL,
            "ModifiedAtUtc" timestamptz NULL,
            "IsDeleted" boolean NOT NULL DEFAULT false
        );
        CREATE INDEX IF NOT EXISTS "IX_WatchFoxWatch_Workflow" ON dbo."WatchFoxWatch" ("WorkflowId") WHERE "IsDeleted" = false;
        CREATE INDEX IF NOT EXISTS "IX_WatchFoxWatch_Connection" ON dbo."WatchFoxWatch" ("ConnectionId") WHERE "IsDeleted" = false;
        """;

    private static readonly ConcurrentDictionary<string, bool> Ensured = new(StringComparer.Ordinal);

    public async Task<WatchFoxWatchRecord> InsertPendingAsync(
        string connectionString,
        Guid workflowId,
        string provider,
        IReadOnlyList<string> types,
        string webhookUrl,
        Guid? createdBy,
        CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand($"""
            INSERT INTO dbo."WatchFoxWatch" ("Id", "WorkflowId", "Provider", "Types", "WebhookUrl", "Status", "CreatedBy")
            VALUES (@Id, @WorkflowId, @Provider, @Types, @WebhookUrl, @Status, @CreatedBy)
            RETURNING {Columns}
            """, connection);
        cmd.Parameters.AddWithValue("@Id", Guid.NewGuid());
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        cmd.Parameters.AddWithValue("@Provider", provider);
        AddTypes(cmd, types);
        cmd.Parameters.AddWithValue("@WebhookUrl", webhookUrl);
        cmd.Parameters.AddWithValue("@Status", WatchFoxWatchRules.StatusPending);
        cmd.Parameters.AddWithValue("@CreatedBy", (object?)createdBy ?? DBNull.Value);
        return await ReadOneAsync(cmd, cancellationToken)
            ?? throw new InvalidOperationException("The WatchFox watch was not saved.");
    }

    public async Task<WatchFoxWatchRecord?> GetAsync(string connectionString, Guid id, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand($"""
            SELECT {Columns} FROM dbo."WatchFoxWatch" WHERE "Id" = @Id AND "IsDeleted" = false
            """, connection);
        cmd.Parameters.AddWithValue("@Id", id);
        return await ReadOneAsync(cmd, cancellationToken);
    }

    public async Task<IReadOnlyList<WatchFoxWatchRecord>> ListByWorkflowAsync(
        string connectionString,
        Guid workflowId,
        CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand($"""
            SELECT {Columns} FROM dbo."WatchFoxWatch"
            WHERE "WorkflowId" = @WorkflowId AND "IsDeleted" = false AND "WatchId" IS NOT NULL
            ORDER BY "CreatedAtUtc"
            """, connection);
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        return await ReadManyAsync(cmd, cancellationToken);
    }

    /// <summary>Other saved watches of the same mailbox on the same workflow (replaced on a new connect).</summary>
    public async Task<IReadOnlyList<WatchFoxWatchRecord>> ListSameMailboxAsync(
        string connectionString,
        Guid workflowId,
        string connectionId,
        Guid exceptId,
        CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand($"""
            SELECT {Columns} FROM dbo."WatchFoxWatch"
            WHERE "WorkflowId" = @WorkflowId AND "ConnectionId" = @ConnectionId
              AND "Id" <> @ExceptId AND "IsDeleted" = false
            """, connection);
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        cmd.Parameters.AddWithValue("@ConnectionId", connectionId);
        cmd.Parameters.AddWithValue("@ExceptId", exceptId);
        return await ReadManyAsync(cmd, cancellationToken);
    }

    public async Task<WatchFoxWatchRecord> MarkConnectedAsync(
        string connectionString,
        Guid id,
        string connectionId,
        string watchId,
        string? mailboxEmail,
        CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand($"""
            UPDATE dbo."WatchFoxWatch"
            SET "ConnectionId" = @ConnectionId, "WatchId" = @WatchId,
                "MailboxEmail" = COALESCE(@MailboxEmail, "MailboxEmail"),
                "Status" = @Status, "LastError" = NULL, "ModifiedAtUtc" = now()
            WHERE "Id" = @Id AND "IsDeleted" = false
            RETURNING {Columns}
            """, connection);
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ConnectionId", connectionId);
        cmd.Parameters.AddWithValue("@WatchId", watchId);
        cmd.Parameters.AddWithValue("@MailboxEmail", (object?)Trim(mailboxEmail, 320) ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Status", WatchFoxWatchRules.StatusActive);
        return await ReadOneAsync(cmd, cancellationToken)
            ?? throw new InvalidOperationException("The WatchFox watch was not found.");
    }

    public async Task<WatchFoxWatchRecord> UpdateTypesAsync(
        string connectionString,
        Guid id,
        IReadOnlyList<string> types,
        Guid? modifiedBy,
        CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand($"""
            UPDATE dbo."WatchFoxWatch"
            SET "Types" = @Types, "ModifiedBy" = @ModifiedBy, "ModifiedAtUtc" = now()
            WHERE "Id" = @Id AND "IsDeleted" = false
            RETURNING {Columns}
            """, connection);
        cmd.Parameters.AddWithValue("@Id", id);
        AddTypes(cmd, types);
        cmd.Parameters.AddWithValue("@ModifiedBy", (object?)modifiedBy ?? DBNull.Value);
        return await ReadOneAsync(cmd, cancellationToken)
            ?? throw new InvalidOperationException("The WatchFox watch was not found.");
    }

    public async Task<WatchFoxWatchRecord> SetStatusAsync(
        string connectionString,
        Guid id,
        string status,
        string? lastError,
        Guid? modifiedBy,
        CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand($"""
            UPDATE dbo."WatchFoxWatch"
            SET "Status" = @Status, "LastError" = @LastError,
                "ModifiedBy" = COALESCE(@ModifiedBy, "ModifiedBy"), "ModifiedAtUtc" = now()
            WHERE "Id" = @Id AND "IsDeleted" = false
            RETURNING {Columns}
            """, connection);
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@Status", status);
        cmd.Parameters.AddWithValue("@LastError", (object?)Trim(lastError, 2000) ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@ModifiedBy", (object?)modifiedBy ?? DBNull.Value);
        return await ReadOneAsync(cmd, cancellationToken)
            ?? throw new InvalidOperationException("The WatchFox watch was not found.");
    }

    /// <summary><c>connection.needs_attention</c>: every saved watch of that mailbox.</summary>
    public async Task<int> SetStatusByConnectionAsync(
        string connectionString,
        string connectionId,
        string status,
        string? lastError,
        CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand("""
            UPDATE dbo."WatchFoxWatch"
            SET "Status" = @Status, "LastError" = @LastError, "ModifiedAtUtc" = now()
            WHERE "ConnectionId" = @ConnectionId AND "IsDeleted" = false AND "Status" <> @Paused
            """, connection);
        cmd.Parameters.AddWithValue("@ConnectionId", connectionId);
        cmd.Parameters.AddWithValue("@Status", status);
        cmd.Parameters.AddWithValue("@LastError", (object?)Trim(lastError, 2000) ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Paused", WatchFoxWatchRules.StatusPaused);
        return await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task SoftDeleteAsync(string connectionString, Guid id, Guid? modifiedBy, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand("""
            UPDATE dbo."WatchFoxWatch"
            SET "IsDeleted" = true, "ModifiedBy" = COALESCE(@ModifiedBy, "ModifiedBy"), "ModifiedAtUtc" = now()
            WHERE "Id" = @Id AND "IsDeleted" = false
            """, connection);
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ModifiedBy", (object?)modifiedBy ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<NpgsqlConnection> OpenAsync(string connectionString, CancellationToken cancellationToken)
    {
        var connection = new NpgsqlConnection(connectionString);
        try
        {
            await connection.OpenAsync(cancellationToken);
            if (!Ensured.ContainsKey(connectionString))
            {
                await using var ensure = new NpgsqlCommand(EnsureSql, connection);
                await ensure.ExecuteNonQueryAsync(cancellationToken);
                Ensured[connectionString] = true;
            }

            return connection;
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }
    }

    private static void AddTypes(NpgsqlCommand cmd, IReadOnlyList<string> types) =>
        cmd.Parameters.Add(new NpgsqlParameter("@Types", NpgsqlDbType.Jsonb) { Value = JsonSerializer.Serialize(types) });

    private static async Task<WatchFoxWatchRecord?> ReadOneAsync(NpgsqlCommand cmd, CancellationToken cancellationToken)
    {
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    private static async Task<IReadOnlyList<WatchFoxWatchRecord>> ReadManyAsync(NpgsqlCommand cmd, CancellationToken cancellationToken)
    {
        var list = new List<WatchFoxWatchRecord>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            list.Add(Map(reader));
        return list;
    }

    private static WatchFoxWatchRecord Map(DbDataReader r) => new(
        Id: r.GetGuid(0),
        WorkflowId: r.GetGuid(1),
        Provider: r.GetString(2),
        ConnectionId: r.IsDBNull(3) ? null : r.GetString(3),
        WatchId: r.IsDBNull(4) ? null : r.GetString(4),
        MailboxEmail: r.IsDBNull(5) ? null : r.GetString(5),
        Types: ParseTypes(r.IsDBNull(6) ? null : r.GetString(6)),
        WebhookUrl: r.IsDBNull(7) ? null : r.GetString(7),
        Status: r.GetString(8),
        LastError: r.IsDBNull(9) ? null : r.GetString(9),
        CreatedBy: r.IsDBNull(10) ? null : r.GetGuid(10),
        CreatedAtUtc: r.GetDateTime(11),
        ModifiedAtUtc: r.IsDBNull(12) ? null : r.GetDateTime(12));

    private static IReadOnlyList<string> ParseTypes(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string? Trim(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var trimmed = value.Trim();
        return trimmed.Length <= max ? trimmed : trimmed[..max];
    }
}

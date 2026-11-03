using System.Collections.Concurrent;
using Npgsql;

namespace SaaSApp.Workflow.Infrastructure.Services;

public sealed record WorkflowEmailWebhookRow(
    Guid Id,
    Guid WorkflowId,
    string KeyHash,
    string KeyPrefix,
    bool IsEnabled,
    DateTime? LastUsedAtUtc,
    Guid? CreatedBy,
    DateTime CreatedAtUtc);

/// <summary>
/// <c>dbo."WorkflowEmailWebhook"</c> in the tenant database: one key per workflow.
/// Takes the connection string, because the webhook itself is anonymous.
/// </summary>
public sealed class WorkflowEmailWebhookStore
{
    private const string Columns = """
        "Id", "WorkflowId", "KeyHash", "KeyPrefix", "IsEnabled", "LastUsedAtUtc", "CreatedBy", "CreatedAtUtc"
        """;

    // Same SQL as scripts/postgres/Create-WorkflowEmailWebhook-Table.sql.
    private const string EnsureSql = """
        CREATE SCHEMA IF NOT EXISTS dbo;

        CREATE TABLE IF NOT EXISTS dbo."WorkflowEmailWebhook" (
            "Id" uuid NOT NULL CONSTRAINT "PK_WorkflowEmailWebhook" PRIMARY KEY,
            "WorkflowId" uuid NOT NULL,
            "KeyHash" varchar(64) NOT NULL,
            "KeyPrefix" varchar(16) NOT NULL,
            "IsEnabled" boolean NOT NULL DEFAULT true,
            "LastUsedAtUtc" timestamptz NULL,
            "CreatedBy" uuid NULL,
            "CreatedAtUtc" timestamptz NOT NULL DEFAULT now(),
            "ModifiedBy" uuid NULL,
            "ModifiedAtUtc" timestamptz NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_WorkflowEmailWebhook_Workflow" ON dbo."WorkflowEmailWebhook" ("WorkflowId");
        """;

    private static readonly ConcurrentDictionary<string, bool> Ensured = new(StringComparer.Ordinal);

    public async Task<WorkflowEmailWebhookRow?> GetAsync(string connectionString, Guid workflowId, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand($"""
            SELECT {Columns} FROM dbo."WorkflowEmailWebhook" WHERE "WorkflowId" = @WorkflowId
            """, connection);
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        return await ReadOneAsync(cmd, cancellationToken);
    }

    /// <summary>New key for the workflow. Replaces the old one, so only the newest key works.</summary>
    public async Task<WorkflowEmailWebhookRow> SetKeyAsync(
        string connectionString,
        Guid workflowId,
        string keyHash,
        string keyPrefix,
        Guid? userId,
        CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand($"""
            INSERT INTO dbo."WorkflowEmailWebhook" ("Id", "WorkflowId", "KeyHash", "KeyPrefix", "IsEnabled", "CreatedBy")
            VALUES (@Id, @WorkflowId, @KeyHash, @KeyPrefix, true, @UserId)
            ON CONFLICT ("WorkflowId") DO UPDATE
            SET "KeyHash" = EXCLUDED."KeyHash", "KeyPrefix" = EXCLUDED."KeyPrefix", "IsEnabled" = true,
                "LastUsedAtUtc" = NULL, "CreatedBy" = EXCLUDED."CreatedBy", "CreatedAtUtc" = now(),
                "ModifiedBy" = EXCLUDED."CreatedBy", "ModifiedAtUtc" = now()
            RETURNING {Columns}
            """, connection);
        cmd.Parameters.AddWithValue("@Id", Guid.NewGuid());
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        cmd.Parameters.AddWithValue("@KeyHash", keyHash);
        cmd.Parameters.AddWithValue("@KeyPrefix", keyPrefix);
        cmd.Parameters.AddWithValue("@UserId", (object?)userId ?? DBNull.Value);
        return await ReadOneAsync(cmd, cancellationToken)
            ?? throw new InvalidOperationException("The webhook key was not saved.");
    }

    public async Task DisableAsync(string connectionString, Guid workflowId, Guid? userId, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand("""
            UPDATE dbo."WorkflowEmailWebhook"
            SET "IsEnabled" = false, "ModifiedBy" = @UserId, "ModifiedAtUtc" = now()
            WHERE "WorkflowId" = @WorkflowId
            """, connection);
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        cmd.Parameters.AddWithValue("@UserId", (object?)userId ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task TouchAsync(string connectionString, Guid id, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var cmd = new NpgsqlCommand("""
            UPDATE dbo."WorkflowEmailWebhook" SET "LastUsedAtUtc" = now() WHERE "Id" = @Id
            """, connection);
        cmd.Parameters.AddWithValue("@Id", id);
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

    private static async Task<WorkflowEmailWebhookRow?> ReadOneAsync(NpgsqlCommand cmd, CancellationToken cancellationToken)
    {
        await using var r = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await r.ReadAsync(cancellationToken))
            return null;
        return new WorkflowEmailWebhookRow(
            Id: r.GetGuid(0),
            WorkflowId: r.GetGuid(1),
            KeyHash: r.GetString(2),
            KeyPrefix: r.GetString(3),
            IsEnabled: r.GetBoolean(4),
            LastUsedAtUtc: r.IsDBNull(5) ? null : r.GetDateTime(5),
            CreatedBy: r.IsDBNull(6) ? null : r.GetGuid(6),
            CreatedAtUtc: r.GetDateTime(7));
    }
}

using Npgsql;
using SaaSApp.Repository.Application.Contracts;

namespace SaaSApp.Repository.Infrastructure;

/// <summary>
/// Old/new values for each repository item metadata edit (repository."ItemMetadataHistory").
/// One row per changed field; rows saved together share a <c>ChangeId</c>.
/// </summary>
internal static class RepositoryItemMetadataHistoryStore
{
    public sealed record HistoryRow(
        Guid ChangeId,
        string FieldName,
        string ColumnName,
        string? OldValue,
        string? NewValue,
        Guid? ChangedBy,
        DateTime ChangedAtUtc);

    public static async Task EnsureTableAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction? transaction,
        CancellationToken cancellationToken)
    {
        const string sql = """
            CREATE SCHEMA IF NOT EXISTS repository;
            CREATE TABLE IF NOT EXISTS repository."ItemMetadataHistory" (
                "Id" uuid NOT NULL DEFAULT gen_random_uuid() CONSTRAINT "PK_ItemMetadataHistory" PRIMARY KEY,
                "TenantId" uuid NOT NULL,
                "RepositoryId" uuid NOT NULL,
                "ItemId" uuid NOT NULL,
                "ChangeId" uuid NOT NULL,
                "FieldName" varchar(256) NOT NULL,
                "ColumnName" varchar(256) NOT NULL,
                "OldValue" text NULL,
                "NewValue" text NULL,
                "ChangedBy" uuid NULL,
                "ChangedAtUtc" timestamptz NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS "IX_ItemMetadataHistory_Item"
                ON repository."ItemMetadataHistory" ("TenantId", "RepositoryId", "ItemId", "ChangedAtUtc");
            """;
        await using var cmd = new NpgsqlCommand(sql, connection, transaction);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    public static async Task InsertAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid tenantId,
        Guid repositoryId,
        Guid itemId,
        Guid changeId,
        IReadOnlyList<RepositoryItemMetadataChangeDto> changes,
        Guid? changedBy,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO repository."ItemMetadataHistory"
                ("TenantId", "RepositoryId", "ItemId", "ChangeId", "FieldName", "ColumnName",
                 "OldValue", "NewValue", "ChangedBy", "ChangedAtUtc")
            VALUES
                (@TenantId, @RepositoryId, @ItemId, @ChangeId, @FieldName, @ColumnName,
                 @OldValue, @NewValue, @ChangedBy, @ChangedAtUtc);
            """;
        var now = DateTime.UtcNow;
        foreach (var change in changes)
        {
            await using var cmd = new NpgsqlCommand(sql, connection, transaction);
            cmd.Parameters.AddWithValue("@TenantId", tenantId);
            cmd.Parameters.AddWithValue("@RepositoryId", repositoryId);
            cmd.Parameters.AddWithValue("@ItemId", itemId);
            cmd.Parameters.AddWithValue("@ChangeId", changeId);
            cmd.Parameters.AddWithValue("@FieldName", change.Field);
            cmd.Parameters.AddWithValue("@ColumnName", change.Column);
            cmd.Parameters.AddWithValue("@OldValue", (object?)change.OldValue ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@NewValue", (object?)change.NewValue ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ChangedBy", (object?)changedBy ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ChangedAtUtc", now);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    /// <summary>All history rows for an item, oldest first. Empty when the table does not exist yet.</summary>
    public static async Task<List<HistoryRow>> ListAsync(
        NpgsqlConnection connection,
        Guid tenantId,
        Guid repositoryId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var rows = new List<HistoryRow>();
        await using (var exists = new NpgsqlCommand(
            "SELECT to_regclass('repository.\"ItemMetadataHistory\"') IS NOT NULL;", connection))
        {
            if (await exists.ExecuteScalarAsync(cancellationToken) is not true)
                return rows;
        }

        const string sql = """
            SELECT "ChangeId", "FieldName", "ColumnName", "OldValue", "NewValue", "ChangedBy", "ChangedAtUtc"
            FROM repository."ItemMetadataHistory"
            WHERE "TenantId" = @TenantId AND "RepositoryId" = @RepositoryId AND "ItemId" = @ItemId
            ORDER BY "ChangedAtUtc" ASC, "FieldName" ASC;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        cmd.Parameters.AddWithValue("@RepositoryId", repositoryId);
        cmd.Parameters.AddWithValue("@ItemId", itemId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new HistoryRow(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetGuid(5),
                reader.GetDateTime(6)));
        }

        return rows;
    }
}

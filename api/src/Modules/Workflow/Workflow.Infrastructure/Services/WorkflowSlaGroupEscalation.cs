using Npgsql;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>Data access for SLA "Escalate to Group": a tenant group's members and the shared open transaction.</summary>
internal static class WorkflowSlaGroupEscalation
{
    /// <summary>A tenant group by its id or name (as an SLA Steps table stores it); null when there is none.</summary>
    public static async Task<Guid?> FindGroupAsync(
        NpgsqlConnection connection,
        string? idOrName,
        CancellationToken cancellationToken)
    {
        var value = idOrName?.Trim();
        if (string.IsNullOrEmpty(value))
            return null;

        const string sql = """
            SELECT "Id" FROM users."Groups"
            WHERE "IsDeleted" = false AND ("Id"::text = lower(@Value) OR lower("Name") = lower(@Value))
            ORDER BY "CreatedAtUtc"
            LIMIT 1;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Value", value);
        return await cmd.ExecuteScalarAsync(cancellationToken) is Guid id ? id : null;
    }

    /// <summary>Active members of a tenant group (<c>users."UserGroups"</c>), in a stable order.</summary>
    public static async Task<IReadOnlyList<Guid>> ListMembersAsync(
        NpgsqlConnection connection,
        Guid groupId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT ug."UserId"
            FROM users."UserGroups" ug
            JOIN users."Users" u ON u."Id" = ug."UserId" AND u."IsDeleted" = false
            WHERE ug."GroupId" = @GroupId
            ORDER BY u."DisplayName", ug."UserId";
            """;
        var members = new List<Guid>();
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@GroupId", groupId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            members.Add(reader.GetGuid(0));
        return members;
    }

    /// <summary>
    /// Records the group and its members on the open transaction (only while it is still open). Returns
    /// what was there, for <see cref="RestoreAsync"/> when the Forward that follows is refused.
    /// </summary>
    public static async Task<(string? GroupIds, string? UserIds)> AssignAsync(
        NpgsqlConnection connection,
        string suffix,
        int transactionId,
        string groupId,
        IReadOnlyList<Guid> members,
        CancellationToken cancellationToken)
    {
        await using (var alter = new NpgsqlCommand(
            $"""
            ALTER TABLE workflow.transaction_{suffix} ADD COLUMN IF NOT EXISTS user_ids text NULL;
            ALTER TABLE workflow.transaction_{suffix} ADD COLUMN IF NOT EXISTS group_ids text NULL;
            """,
            connection))
        {
            await alter.ExecuteNonQueryAsync(cancellationToken);
        }

        (string? GroupIds, string? UserIds) previous = (null, null);
        await using (var read = new NpgsqlCommand(
            $"SELECT group_ids, user_ids FROM workflow.transaction_{suffix} WHERE id = @Id;", connection))
        {
            read.Parameters.AddWithValue("@Id", transactionId);
            await using var reader = await read.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
                previous = (reader.IsDBNull(0) ? null : reader.GetString(0), reader.IsDBNull(1) ? null : reader.GetString(1));
        }

        await WriteAsync(
            connection, suffix, transactionId, groupId.Trim(),
            string.Join(',', members.Select(id => id.ToString("D"))), cancellationToken);
        return previous;
    }

    public static Task RestoreAsync(
        NpgsqlConnection connection,
        string suffix,
        int transactionId,
        (string? GroupIds, string? UserIds) previous,
        CancellationToken cancellationToken) =>
        WriteAsync(connection, suffix, transactionId, previous.GroupIds, previous.UserIds, cancellationToken);

    private static async Task WriteAsync(
        NpgsqlConnection connection,
        string suffix,
        int transactionId,
        string? groupIds,
        string? userIds,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            $"""
            UPDATE workflow.transaction_{suffix}
            SET group_ids = @GroupIds, user_ids = @UserIds
            WHERE id = @Id AND action_status = 0 AND is_deleted = false;
            """,
            connection);
        cmd.Parameters.AddWithValue("@GroupIds", (object?)groupIds ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@UserIds", (object?)userIds ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Id", transactionId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}

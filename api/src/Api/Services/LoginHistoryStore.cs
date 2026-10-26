using Npgsql;
using SaaSApp.MultiTenancy;

namespace SaaSApp.Api.Services;

public sealed class LoginHistoryInsertRequest
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid UserId { get; init; }
    public string? Email { get; init; }
    /// <summary>Client-supplied login channel, e.g. WEB or MOBILE. Free text, not validated.</summary>
    public string? LoggedFrom { get; init; }
    public string? IpAddress { get; init; }
    public string? UserAgent { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}

/// <summary>
/// Records a row per successful login (and completed 2FA) in the tenant DB, capturing which
/// channel (WEB/MOBILE/etc.) the login came from. Creates auth."LoginHistory" on first use.
/// </summary>
public sealed class LoginHistoryStore
{
    private readonly ITenantConnectionProvider _connectionProvider;

    public LoginHistoryStore(ITenantConnectionProvider connectionProvider)
    {
        _connectionProvider = connectionProvider;
    }

    public async Task InsertAsync(LoginHistoryInsertRequest entry, CancellationToken cancellationToken)
    {
        var connectionString = _connectionProvider.ConnectionString;
        if (string.IsNullOrEmpty(connectionString))
            return;

        try
        {
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await EnsureTableAsync(connection, cancellationToken);

            const string sql = """
                INSERT INTO auth."LoginHistory" (
                    "Id", "TenantId", "UserId", "Email", "LoggedFrom", "IpAddress", "UserAgent", "CreatedAtUtc")
                VALUES (
                    @Id, @TenantId, @UserId, @Email, @LoggedFrom, @IpAddress, @UserAgent, @CreatedAtUtc);
                """;

            await using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("@Id", entry.Id);
            command.Parameters.AddWithValue("@TenantId", entry.TenantId);
            command.Parameters.AddWithValue("@UserId", entry.UserId);
            command.Parameters.AddWithValue("@Email", (object?)entry.Email ?? DBNull.Value);
            command.Parameters.AddWithValue("@LoggedFrom", (object?)NormalizeLoggedFrom(entry.LoggedFrom) ?? DBNull.Value);
            command.Parameters.AddWithValue("@IpAddress", (object?)entry.IpAddress ?? DBNull.Value);
            command.Parameters.AddWithValue("@UserAgent", (object?)Truncate(entry.UserAgent, 512) ?? DBNull.Value);
            command.Parameters.AddWithValue("@CreatedAtUtc", entry.CreatedAtUtc);

            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch
        {
            // Login must never fail because the history write failed.
        }
    }

    private static string? NormalizeLoggedFrom(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "WEB" : value.Trim().ToUpperInvariant();

    private static string? Truncate(string? value, int maxLength) =>
        string.IsNullOrEmpty(value) ? value : value.Length <= maxLength ? value : value[..maxLength];

    private static async Task EnsureTableAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            CREATE SCHEMA IF NOT EXISTS auth;

            CREATE TABLE IF NOT EXISTS auth."LoginHistory" (
                "Id"            uuid NOT NULL CONSTRAINT "PK_LoginHistory" PRIMARY KEY,
                "TenantId"      uuid NOT NULL,
                "UserId"        uuid NOT NULL,
                "Email"         varchar(256) NULL,
                "LoggedFrom"    varchar(32) NULL,
                "IpAddress"     varchar(64) NULL,
                "UserAgent"     varchar(512) NULL,
                "CreatedAtUtc"  timestamptz NOT NULL
            );

            CREATE INDEX IF NOT EXISTS "IX_LoginHistory_User_CreatedAtUtc"
                ON auth."LoginHistory" ("TenantId", "UserId", "CreatedAtUtc" DESC);
            """;

        try
        {
            await using var command = new NpgsqlCommand(sql, connection) { CommandTimeout = 60 };
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (PostgresException ex) when (ex.SqlState is
            PostgresErrorCodes.DuplicateTable or
            PostgresErrorCodes.DuplicateObject or
            PostgresErrorCodes.DuplicateSchema or
            PostgresErrorCodes.UniqueViolation)
        {
            // Race: another request created the table/index — safe to continue.
        }
    }
}

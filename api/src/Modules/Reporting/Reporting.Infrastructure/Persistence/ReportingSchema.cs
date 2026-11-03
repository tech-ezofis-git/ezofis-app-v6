using Npgsql;

namespace SaaSApp.Reporting.Infrastructure.Persistence;

/// <summary>Creates the reporting tables in a tenant database (idempotent). Used at tenant sign-up.</summary>
public static class ReportingSchema
{
    public static async Task EnsureAsync(string tenantConnectionString, CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(tenantConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(ReportSchemaSql.Ensure, connection) { CommandTimeout = 120 };
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}

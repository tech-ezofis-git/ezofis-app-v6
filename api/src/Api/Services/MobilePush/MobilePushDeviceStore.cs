using Microsoft.EntityFrameworkCore;
using Npgsql;
using SaaSApp.Catalog.Persistence;

namespace SaaSApp.Api.Services.MobilePush;

public sealed record MobilePushDevice(string Token, Guid UserId, Guid TenantId, string Platform);

/// <summary>
/// Phone push tokens (one row per phone and sign-in) and, per user and tenant, the inbox requests already announced.
/// Kept in the catalog database so the recurring check can see every tenant. Creates its tables on first use.
/// </summary>
public sealed class MobilePushDeviceStore
{
    private readonly IDbContextFactory<CatalogDbContext> _catalogFactory;

    public MobilePushDeviceStore(IDbContextFactory<CatalogDbContext> catalogFactory) =>
        _catalogFactory = catalogFactory;

    public async Task UpsertAsync(string token, Guid userId, Guid tenantId, string platform, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(cancellationToken);
        // A phone that signs in as someone else moves its token to the new user and tenant.
        const string sql = """
            INSERT INTO public.mobile_push_devices (token, user_id, tenant_id, platform, created_at_utc, updated_at_utc)
            VALUES (@Token, @UserId, @TenantId, @Platform, now(), now())
            ON CONFLICT (token) DO UPDATE
            SET user_id = EXCLUDED.user_id, tenant_id = EXCLUDED.tenant_id, platform = EXCLUDED.platform, updated_at_utc = now();
            """;
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Token", token);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@TenantId", tenantId);
        command.Parameters.AddWithValue("@Platform", platform);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task RemoveAsync(string token, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand("DELETE FROM public.mobile_push_devices WHERE token = @Token;", connection);
        command.Parameters.AddWithValue("@Token", token);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MobilePushDevice>> ListAsync(CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            "SELECT token, user_id, tenant_id, platform FROM public.mobile_push_devices;", connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var list = new List<MobilePushDevice>();
        while (await reader.ReadAsync(cancellationToken))
            list.Add(new MobilePushDevice(reader.GetString(0), reader.GetGuid(1), reader.GetGuid(2), reader.GetString(3)));
        return list;
    }

    /// <summary>Requests already announced to this user in this tenant; null before the first check.</summary>
    public async Task<HashSet<string>?> GetSeenAsync(Guid userId, Guid tenantId, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(
            "SELECT seen_keys FROM public.mobile_push_seen WHERE user_id = @UserId AND tenant_id = @TenantId;", connection);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@TenantId", tenantId);
        var value = await command.ExecuteScalarAsync(cancellationToken);
        if (value is not string text)
            return null;
        return new HashSet<string>(text.Split('\n', StringSplitOptions.RemoveEmptyEntries), StringComparer.Ordinal);
    }

    public async Task SetSeenAsync(Guid userId, Guid tenantId, IEnumerable<string> keys, CancellationToken cancellationToken)
    {
        await using var connection = await OpenAsync(cancellationToken);
        const string sql = """
            INSERT INTO public.mobile_push_seen (user_id, tenant_id, seen_keys, updated_at_utc)
            VALUES (@UserId, @TenantId, @Keys, now())
            ON CONFLICT (user_id, tenant_id) DO UPDATE SET seen_keys = EXCLUDED.seen_keys, updated_at_utc = now();
            """;
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@TenantId", tenantId);
        command.Parameters.AddWithValue("@Keys", string.Join('\n', keys.Take(500)));
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task<NpgsqlConnection> OpenAsync(CancellationToken cancellationToken)
    {
        await using var context = await _catalogFactory.CreateDbContextAsync(cancellationToken);
        var connectionString = context.Database.GetConnectionString()
            ?? throw new InvalidOperationException("Catalog connection string is not configured.");
        var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureTablesAsync(connection, cancellationToken);
        return connection;
    }

    private static async Task EnsureTablesAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS public.mobile_push_devices (
                token text PRIMARY KEY,
                user_id uuid NOT NULL,
                tenant_id uuid NOT NULL,
                platform text NOT NULL,
                created_at_utc timestamptz NOT NULL,
                updated_at_utc timestamptz NOT NULL);
            CREATE INDEX IF NOT EXISTS ix_mobile_push_devices_user ON public.mobile_push_devices (tenant_id, user_id);
            CREATE TABLE IF NOT EXISTS public.mobile_push_seen (
                user_id uuid NOT NULL,
                tenant_id uuid NOT NULL,
                seen_keys text NOT NULL,
                updated_at_utc timestamptz NOT NULL,
                PRIMARY KEY (user_id, tenant_id));
            """;
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}

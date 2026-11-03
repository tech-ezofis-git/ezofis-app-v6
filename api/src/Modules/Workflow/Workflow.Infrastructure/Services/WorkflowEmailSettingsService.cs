using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using SaaSApp.MultiTenancy;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// <c>dbo."WorkflowEmailSettings"</c> in the tenant database, one row per workflow.
/// Takes the tenant id, because the webhook that reads it is anonymous.
/// </summary>
public sealed class WorkflowEmailSettingsService : IWorkflowEmailSettingsService
{
    // Same SQL as scripts/postgres/Create-WorkflowEmailSettings-Table.sql.
    private const string EnsureSql = """
        CREATE SCHEMA IF NOT EXISTS dbo;

        CREATE TABLE IF NOT EXISTS dbo."WorkflowEmailSettings" (
            "WorkflowId" uuid NOT NULL CONSTRAINT "PK_WorkflowEmailSettings" PRIMARY KEY,
            "TicketMode" varchar(16) NOT NULL,
            "NoAttachmentAction" varchar(16) NOT NULL,
            "AttachEmail" boolean NOT NULL DEFAULT false,
            "AttachmentTypes" jsonb NOT NULL DEFAULT '[]'::jsonb,
            "ModifiedBy" uuid NULL,
            "ModifiedAtUtc" timestamptz NOT NULL DEFAULT now()
        );
        """;

    private static readonly ConcurrentDictionary<string, bool> Ensured = new(StringComparer.Ordinal);

    private readonly ITenantConnectionStringResolver _connectionStrings;
    private readonly ILogger<WorkflowEmailSettingsService> _logger;

    public WorkflowEmailSettingsService(
        ITenantConnectionStringResolver connectionStrings,
        ILogger<WorkflowEmailSettingsService> logger)
    {
        _connectionStrings = connectionStrings;
        _logger = logger;
    }

    public async Task<WorkflowEmailSettings> GetAsync(
        Guid tenantId,
        Guid workflowId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenAsync(tenantId, workflowId, cancellationToken);
        await using var cmd = new NpgsqlCommand("""
            SELECT "TicketMode", "NoAttachmentAction", "AttachEmail", "AttachmentTypes"::text, "ModifiedAtUtc"
            FROM dbo."WorkflowEmailSettings" WHERE "WorkflowId" = @WorkflowId
            """, connection);
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        await using var r = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await r.ReadAsync(cancellationToken))
            return WorkflowEmailTicketRules.Defaults(MjbUsAgent.IsThisWorkflow(workflowId, tenantId));

        return new WorkflowEmailSettings(
            r.GetString(0),
            r.GetString(1),
            r.GetBoolean(2),
            ParseTypes(r.GetString(3)),
            false,
            r.GetDateTime(4));
    }

    public async Task<WorkflowEmailSettings> SaveAsync(
        Guid tenantId,
        Guid workflowId,
        WorkflowEmailSettingsInput input,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        var current = await GetAsync(tenantId, workflowId, cancellationToken);
        var next = WorkflowEmailTicketRules.Normalize(input, current);

        await using var connection = await OpenAsync(tenantId, workflowId, cancellationToken);
        await using var cmd = new NpgsqlCommand("""
            INSERT INTO dbo."WorkflowEmailSettings"
                ("WorkflowId", "TicketMode", "NoAttachmentAction", "AttachEmail", "AttachmentTypes", "ModifiedBy", "ModifiedAtUtc")
            VALUES (@WorkflowId, @TicketMode, @NoAttachmentAction, @AttachEmail, @AttachmentTypes, @UserId, now())
            ON CONFLICT ("WorkflowId") DO UPDATE
            SET "TicketMode" = EXCLUDED."TicketMode", "NoAttachmentAction" = EXCLUDED."NoAttachmentAction",
                "AttachEmail" = EXCLUDED."AttachEmail", "AttachmentTypes" = EXCLUDED."AttachmentTypes",
                "ModifiedBy" = EXCLUDED."ModifiedBy", "ModifiedAtUtc" = now()
            RETURNING "ModifiedAtUtc"
            """, connection);
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        cmd.Parameters.AddWithValue("@TicketMode", next.TicketMode);
        cmd.Parameters.AddWithValue("@NoAttachmentAction", next.NoAttachmentAction);
        cmd.Parameters.AddWithValue("@AttachEmail", next.AttachEmail);
        cmd.Parameters.Add(new NpgsqlParameter("@AttachmentTypes", NpgsqlDbType.Jsonb)
        {
            Value = JsonSerializer.Serialize(next.AttachmentTypes)
        });
        cmd.Parameters.AddWithValue("@UserId", (object?)userId ?? DBNull.Value);
        var modified = (DateTime)(await cmd.ExecuteScalarAsync(cancellationToken))!;

        _logger.LogInformation(
            "Email ticket settings for workflow {WorkflowId}: {TicketMode}, no attachment {NoAttachmentAction}, attach email {AttachEmail}, types {Types}.",
            workflowId,
            next.TicketMode,
            next.NoAttachmentAction,
            next.AttachEmail,
            string.Join(",", next.AttachmentTypes));
        return next with { ModifiedAtUtc = modified };
    }

    private async Task<NpgsqlConnection> OpenAsync(Guid tenantId, Guid workflowId, CancellationToken cancellationToken)
    {
        if (tenantId == Guid.Empty || workflowId == Guid.Empty)
            throw new InvalidOperationException("tenantId and workflowId are required.");
        var connectionString = await _connectionStrings.GetConnectionStringAsync(tenantId, cancellationToken)
            ?? throw new InvalidOperationException($"Tenant connection string not found for {tenantId:D}.");

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

    private static IReadOnlyList<string> ParseTypes(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}

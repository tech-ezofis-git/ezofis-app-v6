using Npgsql;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Domain.Enums;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Stores parent→child request links in workflow.sub_process_links. Links are one level deep: a
/// child has one parent and can't have children of its own, so links can't form a loop. Requests
/// live in per-workflow tables, so each row's details are read from its own workflow's tables.
/// </summary>
public sealed class WorkflowSubProcessService : IWorkflowSubProcessService
{
    private readonly ITenantContext _tenantContext;
    private readonly IWorkflowSecurityService _workflowSecurity;

    public WorkflowSubProcessService(ITenantContext tenantContext, IWorkflowSecurityService workflowSecurity)
    {
        _tenantContext = tenantContext;
        _workflowSecurity = workflowSecurity;
    }

    public async Task<WorkflowSubProcessLinkDto> LinkAsync(
        Guid tenantId, Guid userId, WorkflowSubProcessLinkDto link, CancellationToken cancellationToken = default)
    {
        WorkflowSubProcessRules.Validate(link);

        if (!await _workflowSecurity.CanAccessWorkflowAsync(link.MainWorkflowId, userId, cancellationToken)
            || !await _workflowSecurity.CanAccessWorkflowAsync(link.SubWorkflowId, userId, cancellationToken))
            throw new UnauthorizedAccessException("You don't have access to this workflow.");

        await using var connection = new NpgsqlConnection(RequireConnection());
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        if (await LoadRequestAsync(connection, tenantId, link.MainWorkflowId, link.MainProcessId, cancellationToken) is null
            || await LoadRequestAsync(connection, tenantId, link.SubWorkflowId, link.SubProcessId, cancellationToken) is null)
            throw new KeyNotFoundException("Request not found.");

        await EnsureOneLevelAsync(connection, tenantId, link, cancellationToken);

        const string insertSql = """
            INSERT INTO workflow.sub_process_links
                (id, tenant_id, main_workflow_id, main_process_id, sub_workflow_id, sub_process_id, created_by)
            VALUES
                (@Id, @TenantId, @MainWorkflowId, @MainProcessId, @SubWorkflowId, @SubProcessId, @CreatedBy)
            ON CONFLICT (tenant_id, sub_process_id) DO NOTHING;
            """;
        await using (var cmd = new NpgsqlCommand(insertSql, connection))
        {
            cmd.Parameters.AddWithValue("@Id", Guid.NewGuid());
            cmd.Parameters.AddWithValue("@TenantId", tenantId);
            cmd.Parameters.AddWithValue("@MainWorkflowId", link.MainWorkflowId);
            cmd.Parameters.AddWithValue("@MainProcessId", link.MainProcessId);
            cmd.Parameters.AddWithValue("@SubWorkflowId", link.SubWorkflowId);
            cmd.Parameters.AddWithValue("@SubProcessId", link.SubProcessId);
            cmd.Parameters.AddWithValue("@CreatedBy", userId);
            if (await cmd.ExecuteNonQueryAsync(cancellationToken) > 0)
                return link;
        }

        // Nothing inserted: the child already has a parent, which is fine only if it's this one.
        var existingParent = await FindParentLinkAsync(connection, tenantId, link.SubWorkflowId, link.SubProcessId, cancellationToken);
        if (existingParent?.ProcessId == link.MainProcessId)
            return link;
        throw new InvalidOperationException("This request is already a sub-process of another request.");
    }

    public async Task<IReadOnlyList<WorkflowSubProcessRowDto>> GetChildrenAsync(
        Guid tenantId, Guid userId, Guid workflowId, Guid processId, CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(RequireConnection());
        await connection.OpenAsync(cancellationToken);
        if (!await LinksTableExistsAsync(connection, cancellationToken))
            return [];

        var children = new List<(Guid WorkflowId, Guid ProcessId)>();
        const string sql = """
            SELECT sub_workflow_id, sub_process_id
            FROM workflow.sub_process_links
            WHERE tenant_id = @TenantId AND main_workflow_id = @WorkflowId AND main_process_id = @ProcessId
            ORDER BY created_at_utc;
            """;
        await using (var cmd = new NpgsqlCommand(sql, connection))
        {
            cmd.Parameters.AddWithValue("@TenantId", tenantId);
            cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
            cmd.Parameters.AddWithValue("@ProcessId", processId);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                children.Add((reader.GetGuid(0), reader.GetGuid(1)));
        }

        var access = new Dictionary<Guid, bool>();
        var now = DateTime.UtcNow;
        var rows = new List<WorkflowSubProcessRowDto>(children.Count);
        foreach (var child in children)
        {
            if (!await CanAccessAsync(access, child.WorkflowId, userId, cancellationToken))
                continue;

            var request = await LoadRequestAsync(connection, tenantId, child.WorkflowId, child.ProcessId, cancellationToken);
            if (request is null)
                continue;

            rows.Add(new WorkflowSubProcessRowDto(
                child.ProcessId,
                child.WorkflowId,
                request.WorkflowName,
                request.RequestNo,
                WorkflowSubProcessRules.ToFlowStatus(request.Status),
                request.Stage,
                request.LastAction,
                request.RaisedAtUtc,
                WorkflowSubProcessRules.ToDurationSeconds(request.LastActivityAtUtc, now)));
        }

        return rows;
    }

    public async Task<IReadOnlyList<WorkflowMainProcessDto>> GetParentAsync(
        Guid tenantId, Guid userId, Guid workflowId, Guid processId, CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(RequireConnection());
        await connection.OpenAsync(cancellationToken);
        if (!await LinksTableExistsAsync(connection, cancellationToken))
            return [];

        var parent = await FindParentLinkAsync(connection, tenantId, workflowId, processId, cancellationToken);
        if (parent is null || !await _workflowSecurity.CanAccessWorkflowAsync(parent.Value.WorkflowId, userId, cancellationToken))
            return [];

        var request = await LoadRequestAsync(connection, tenantId, parent.Value.WorkflowId, parent.Value.ProcessId, cancellationToken);
        if (request is null)
            return [];

        return
        [
            new WorkflowMainProcessDto(
                parent.Value.ProcessId,
                parent.Value.WorkflowId,
                request.WorkflowName,
                request.RequestNo,
                WorkflowSubProcessRules.ToFlowStatus(request.Status)),
        ];
    }

    private async Task<bool> CanAccessAsync(
        Dictionary<Guid, bool> cache, Guid workflowId, Guid userId, CancellationToken cancellationToken)
    {
        if (!cache.TryGetValue(workflowId, out var allowed))
        {
            allowed = await _workflowSecurity.CanAccessWorkflowAsync(workflowId, userId, cancellationToken);
            cache[workflowId] = allowed;
        }

        return allowed;
    }

    private static async Task EnsureOneLevelAsync(
        NpgsqlConnection connection, Guid tenantId, WorkflowSubProcessLinkDto link, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                EXISTS (SELECT 1 FROM workflow.sub_process_links
                        WHERE tenant_id = @TenantId AND sub_process_id = @MainProcessId),
                EXISTS (SELECT 1 FROM workflow.sub_process_links
                        WHERE tenant_id = @TenantId AND main_process_id = @SubProcessId);
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        cmd.Parameters.AddWithValue("@MainProcessId", link.MainProcessId);
        cmd.Parameters.AddWithValue("@SubProcessId", link.SubProcessId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        if (reader.GetBoolean(0) || reader.GetBoolean(1))
            throw new InvalidOperationException("Sub-processes can only be one level deep.");
    }

    private static async Task<(Guid WorkflowId, Guid ProcessId)?> FindParentLinkAsync(
        NpgsqlConnection connection, Guid tenantId, Guid workflowId, Guid processId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT main_workflow_id, main_process_id
            FROM workflow.sub_process_links
            WHERE tenant_id = @TenantId AND sub_workflow_id = @WorkflowId AND sub_process_id = @ProcessId;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        cmd.Parameters.AddWithValue("@ProcessId", processId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? (reader.GetGuid(0), reader.GetGuid(1)) : null;
    }

    /// <summary>Reads a request from its workflow's tables; null when it (or those tables) doesn't exist.</summary>
    private static async Task<LinkedRequest?> LoadRequestAsync(
        NpgsqlConnection connection, Guid tenantId, Guid workflowId, Guid processId, CancellationToken cancellationToken)
    {
        var suffix = workflowId.ToString("N")[..8];
        var instancesTable = $"workflow.workflow_instances_{suffix}";
        var transactionTable = $"workflow.transaction_{suffix}";

        await using (var exists = new NpgsqlCommand(
            $"SELECT to_regclass('{instancesTable}') IS NOT NULL AND to_regclass('{transactionTable}') IS NOT NULL;", connection))
        {
            if (await exists.ExecuteScalarAsync(cancellationToken) is not true)
                return null;
        }

        var sql = $"""
            SELECT i.workflow_name, i.reference_number, i.status, i.created_at_utc,
                   latest.stage_name, latest.created_at, action.review
            FROM {instancesTable} i
            LEFT JOIN LATERAL (
                SELECT t.stage_name, t.created_at
                FROM {transactionTable} t
                WHERE t.workflow_instance_id = i.id AND t.is_deleted = false
                ORDER BY t.id DESC
                LIMIT 1
            ) latest ON true
            LEFT JOIN LATERAL (
                SELECT t.review
                FROM {transactionTable} t
                WHERE t.workflow_instance_id = i.id AND t.is_deleted = false AND COALESCE(t.review, '') <> ''
                ORDER BY t.id DESC
                LIMIT 1
            ) action ON true
            WHERE i.id = @ProcessId AND i.tenant_id = @TenantId;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@ProcessId", processId);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return new LinkedRequest(
            reader.GetString(0),
            reader.IsDBNull(1) ? $"#{processId}" : reader.GetString(1),
            (WorkflowInstanceStatus)reader.GetInt32(2),
            reader.GetDateTime(3),
            reader.IsDBNull(4) ? null : reader.GetString(4),
            reader.IsDBNull(5) ? null : reader.GetDateTime(5),
            reader.IsDBNull(6) ? null : reader.GetString(6));
    }

    private string RequireConnection() =>
        _tenantContext.ConnectionString ?? throw new InvalidOperationException("Tenant connection string not resolved.");

    // Reads run on every request open, so they check for the table instead of running DDL:
    // no table just means nothing has been linked yet.
    private static async Task<bool> LinksTableExistsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand("SELECT to_regclass('workflow.sub_process_links') IS NOT NULL;", connection);
        return await cmd.ExecuteScalarAsync(cancellationToken) is true;
    }

    private static async Task EnsureSchemaAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        if (await LinksTableExistsAsync(connection, cancellationToken))
            return;

        // Same DDL as scripts/postgres/Create_WorkflowSubProcessLinks.sql, so existing tenants get it on first link.
        const string sql = """
            CREATE SCHEMA IF NOT EXISTS workflow;

            CREATE TABLE IF NOT EXISTS workflow.sub_process_links (
                id uuid NOT NULL CONSTRAINT pk_sub_process_links PRIMARY KEY,
                tenant_id uuid NOT NULL,
                main_workflow_id uuid NOT NULL,
                main_process_id uuid NOT NULL,
                sub_workflow_id uuid NOT NULL,
                sub_process_id uuid NOT NULL,
                created_at_utc timestamptz NOT NULL DEFAULT now(),
                created_by uuid NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ux_sub_process_links_tenant_child
                ON workflow.sub_process_links (tenant_id, sub_process_id);
            CREATE INDEX IF NOT EXISTS ix_sub_process_links_tenant_parent
                ON workflow.sub_process_links (tenant_id, main_process_id);
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private sealed record LinkedRequest(
        string WorkflowName,
        string RequestNo,
        WorkflowInstanceStatus Status,
        DateTime RaisedAtUtc,
        string? Stage,
        DateTime? LastActivityAtUtc,
        string? LastAction);
}

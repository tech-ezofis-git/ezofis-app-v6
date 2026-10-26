using Npgsql;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Backup-user delegation: lets an assignee hand workflow approvals to another user for a date
/// range, scoped per workflow+stage. Storage is per-tenant (workflow.delegations /
/// workflow.delegation_rows); <see cref="ResolveDelegateAsync"/> is the runtime lookup move-next
/// uses to redirect a step's assignee to the active delegate.
/// </summary>
public sealed class WorkflowDelegationService : IWorkflowDelegationService
{
    private readonly ITenantContext _tenantContext;

    public WorkflowDelegationService(ITenantContext tenantContext)
    {
        _tenantContext = tenantContext;
    }

    public async Task<WorkflowDelegationDto> CreateAsync(
        Guid tenantId, Guid userId, WorkflowDelegationUpsertDto request, CancellationToken cancellationToken = default)
    {
        Validate(request);

        await using var connection = new NpgsqlConnection(RequireConnection());
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;

        await using (var cmd = new NpgsqlCommand(InsertDelegationSql, connection))
        {
            BindDelegation(cmd, id, tenantId, request, now, now, userId);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await InsertRowsAsync(connection, id, request.Delegations, cancellationToken);

        return (await GetAsync(tenantId, id, cancellationToken))!;
    }

    public async Task<WorkflowDelegationDto?> UpdateAsync(
        Guid tenantId, Guid id, Guid userId, WorkflowDelegationUpsertDto request, CancellationToken cancellationToken = default)
    {
        Validate(request);

        await using var connection = new NpgsqlConnection(RequireConnection());
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        var exists = await ExistsAsync(connection, tenantId, id, cancellationToken);
        if (!exists)
            return null;

        var now = DateTime.UtcNow;
        const string updateSql = """
            UPDATE workflow.delegations
            SET assignee_user_id = @AssigneeUserId,
                from_date = @FromDate,
                to_date = @ToDate,
                is_draft = @IsDraft,
                on_period_end = @OnPeriodEnd,
                notify_delegates = @NotifyDelegates,
                redirect_new_requests = @RedirectNewRequests,
                transfer_current_requests = @TransferCurrentRequests,
                modified_at_utc = @ModifiedAtUtc,
                modified_by = @ModifiedBy
            WHERE id = @Id AND tenant_id = @TenantId AND is_deleted = false;
            """;
        await using (var cmd = new NpgsqlCommand(updateSql, connection))
        {
            cmd.Parameters.AddWithValue("@Id", id);
            cmd.Parameters.AddWithValue("@TenantId", tenantId);
            cmd.Parameters.AddWithValue("@AssigneeUserId", request.AssigneeUserId);
            cmd.Parameters.AddWithValue("@FromDate", (object?)ParseDate(request.FromDate) ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ToDate", (object?)ParseDate(request.ToDate) ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@IsDraft", request.IsDraft);
            cmd.Parameters.AddWithValue("@OnPeriodEnd", NormalizeOnPeriodEnd(request.OnPeriodEnd));
            cmd.Parameters.AddWithValue("@NotifyDelegates", request.Actions.NotifyDelegates);
            cmd.Parameters.AddWithValue("@RedirectNewRequests", request.Actions.RedirectNewRequests);
            cmd.Parameters.AddWithValue("@TransferCurrentRequests", request.Actions.TransferCurrentRequests);
            cmd.Parameters.AddWithValue("@ModifiedAtUtc", now);
            cmd.Parameters.AddWithValue("@ModifiedBy", userId);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await using (var delRows = new NpgsqlCommand(
            "DELETE FROM workflow.delegation_rows WHERE delegation_id = @Id;", connection))
        {
            delRows.Parameters.AddWithValue("@Id", id);
            await delRows.ExecuteNonQueryAsync(cancellationToken);
        }
        await InsertRowsAsync(connection, id, request.Delegations, cancellationToken);

        return await GetAsync(tenantId, id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(RequireConnection());
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        const string sql = """
            UPDATE workflow.delegations
            SET is_deleted = true, modified_at_utc = now()
            WHERE id = @Id AND tenant_id = @TenantId AND is_deleted = false;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        return await cmd.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    public async Task<WorkflowDelegationDto?> EndNowAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(RequireConnection());
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        const string sql = """
            UPDATE workflow.delegations
            SET is_ended = true,
                to_date = LEAST(COALESCE(to_date, CURRENT_DATE), CURRENT_DATE),
                modified_at_utc = now()
            WHERE id = @Id AND tenant_id = @TenantId AND is_deleted = false;
            """;
        await using (var cmd = new NpgsqlCommand(sql, connection))
        {
            cmd.Parameters.AddWithValue("@Id", id);
            cmd.Parameters.AddWithValue("@TenantId", tenantId);
            if (await cmd.ExecuteNonQueryAsync(cancellationToken) == 0)
                return null;
        }

        return await GetAsync(tenantId, id, cancellationToken);
    }

    public async Task<WorkflowDelegationDto?> GetAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(RequireConnection());
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        var header = await LoadHeaderAsync(connection, tenantId, id, cancellationToken);
        if (header == null)
            return null;

        var rows = await LoadRowsAsync(connection, id, cancellationToken);
        return ToDto(header, rows);
    }

    public async Task<IReadOnlyList<WorkflowDelegationDto>> ListAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(RequireConnection());
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        const string sql = """
            SELECT id, tenant_id, assignee_user_id, from_date, to_date, is_draft, is_ended,
                   on_period_end, notify_delegates, redirect_new_requests, transfer_current_requests,
                   created_at_utc, modified_at_utc
            FROM workflow.delegations
            WHERE tenant_id = @TenantId AND is_deleted = false
            ORDER BY modified_at_utc DESC;
            """;

        var headers = new List<DelegationHeader>();
        await using (var cmd = new NpgsqlCommand(sql, connection))
        {
            cmd.Parameters.AddWithValue("@TenantId", tenantId);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                headers.Add(ReadHeader(reader));
        }

        var result = new List<WorkflowDelegationDto>(headers.Count);
        foreach (var header in headers)
        {
            var rows = await LoadRowsAsync(connection, header.Id, cancellationToken);
            result.Add(ToDto(header, rows));
        }
        return result;
    }

    public async Task<Guid?> ResolveDelegateAsync(
        Guid tenantId,
        Guid workflowId,
        string? activityId,
        Guid assigneeUserId,
        DateOnly asOf,
        CancellationToken cancellationToken = default)
    {
        if (tenantId == Guid.Empty || workflowId == Guid.Empty || assigneeUserId == Guid.Empty)
            return null;

        var connectionString = _tenantContext.ConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString))
            return null;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        const string sql = """
            SELECT r.delegate_user_id
            FROM workflow.delegations d
            INNER JOIN workflow.delegation_rows r ON r.delegation_id = d.id
            WHERE d.tenant_id = @TenantId
              AND d.is_deleted = false
              AND d.is_draft = false
              AND d.is_ended = false
              AND d.redirect_new_requests = true
              AND d.assignee_user_id = @AssigneeUserId
              AND d.from_date IS NOT NULL AND d.to_date IS NOT NULL
              AND d.from_date <= @AsOf AND d.to_date >= @AsOf
              AND r.workflow_id = @WorkflowId
              AND (r.stage_id IS NULL OR r.stage_id = '' OR r.stage_id = @ActivityId)
            ORDER BY (r.stage_id IS NOT NULL AND r.stage_id <> '') DESC, d.modified_at_utc DESC
            LIMIT 1;
            """;

        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        cmd.Parameters.AddWithValue("@AssigneeUserId", assigneeUserId);
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        cmd.Parameters.AddWithValue("@ActivityId", (object?)activityId ?? string.Empty);
        cmd.Parameters.AddWithValue("@AsOf", asOf.ToDateTime(TimeOnly.MinValue));

        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return result is Guid delegateId ? delegateId : null;
    }

    // ---------- helpers ----------

    private static void Validate(WorkflowDelegationUpsertDto request)
    {
        if (request.AssigneeUserId == Guid.Empty)
            throw new ArgumentException("assigneeUserId is required.");
        if (!request.IsDraft)
        {
            var from = ParseDate(request.FromDate);
            var to = ParseDate(request.ToDate);
            if (from == null || to == null)
                throw new ArgumentException("fromDate and toDate are required unless the delegation is a draft.");
            if (to < from)
                throw new ArgumentException("toDate must be on or after fromDate.");
            if (request.Delegations.Count == 0)
                throw new ArgumentException("At least one workflow delegation row is required unless the delegation is a draft.");
        }
        foreach (var row in request.Delegations)
        {
            if (row.WorkflowId == Guid.Empty)
                throw new ArgumentException("Each delegation row requires a workflowId.");
            if (row.DelegateUserId == Guid.Empty)
                throw new ArgumentException("Each delegation row requires a delegateUserId.");
            if (row.DelegateUserId == request.AssigneeUserId)
                throw new ArgumentException("A delegate cannot be the same user as the assignee.");
        }
    }

    private static string NormalizeOnPeriodEnd(string? value) =>
        string.Equals(value, WorkflowDelegationPeriodEnd.KeepWithDelegate, StringComparison.OrdinalIgnoreCase)
            ? WorkflowDelegationPeriodEnd.KeepWithDelegate
            : WorkflowDelegationPeriodEnd.ReturnToAssignee;

    private static DateOnly? ParseDate(string? value) =>
        !string.IsNullOrWhiteSpace(value) && DateOnly.TryParse(value, out var d) ? d : null;

    private const string InsertDelegationSql = """
        INSERT INTO workflow.delegations
            (id, tenant_id, assignee_user_id, from_date, to_date, is_draft, is_ended, on_period_end,
             notify_delegates, redirect_new_requests, transfer_current_requests,
             created_at_utc, modified_at_utc, created_by)
        VALUES
            (@Id, @TenantId, @AssigneeUserId, @FromDate, @ToDate, @IsDraft, false, @OnPeriodEnd,
             @NotifyDelegates, @RedirectNewRequests, @TransferCurrentRequests,
             @CreatedAtUtc, @ModifiedAtUtc, @CreatedBy);
        """;

    private static void BindDelegation(
        NpgsqlCommand cmd, Guid id, Guid tenantId, WorkflowDelegationUpsertDto request,
        DateTime createdAtUtc, DateTime modifiedAtUtc, Guid createdBy)
    {
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        cmd.Parameters.AddWithValue("@AssigneeUserId", request.AssigneeUserId);
        cmd.Parameters.AddWithValue("@FromDate", (object?)ParseDate(request.FromDate) ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@ToDate", (object?)ParseDate(request.ToDate) ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@IsDraft", request.IsDraft);
        cmd.Parameters.AddWithValue("@OnPeriodEnd", NormalizeOnPeriodEnd(request.OnPeriodEnd));
        cmd.Parameters.AddWithValue("@NotifyDelegates", request.Actions.NotifyDelegates);
        cmd.Parameters.AddWithValue("@RedirectNewRequests", request.Actions.RedirectNewRequests);
        cmd.Parameters.AddWithValue("@TransferCurrentRequests", request.Actions.TransferCurrentRequests);
        cmd.Parameters.AddWithValue("@CreatedAtUtc", createdAtUtc);
        cmd.Parameters.AddWithValue("@ModifiedAtUtc", modifiedAtUtc);
        cmd.Parameters.AddWithValue("@CreatedBy", createdBy);
    }

    private static async Task InsertRowsAsync(
        NpgsqlConnection connection, Guid delegationId, IReadOnlyList<WorkflowDelegationRowDto> rows, CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO workflow.delegation_rows (id, delegation_id, workflow_id, stage_id, delegate_user_id, reason)
            VALUES (@Id, @DelegationId, @WorkflowId, @StageId, @DelegateUserId, @Reason);
            """;
        foreach (var row in rows)
        {
            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@Id", Guid.NewGuid());
            cmd.Parameters.AddWithValue("@DelegationId", delegationId);
            cmd.Parameters.AddWithValue("@WorkflowId", row.WorkflowId);
            cmd.Parameters.AddWithValue("@StageId", (object?)row.StageId ?? string.Empty);
            cmd.Parameters.AddWithValue("@DelegateUserId", row.DelegateUserId);
            cmd.Parameters.AddWithValue("@Reason", (object?)row.Reason ?? DBNull.Value);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static async Task<bool> ExistsAsync(NpgsqlConnection connection, Guid tenantId, Guid id, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT 1 FROM workflow.delegations WHERE id = @Id AND tenant_id = @TenantId AND is_deleted = false LIMIT 1;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        return await cmd.ExecuteScalarAsync(cancellationToken) != null;
    }

    private sealed record DelegationHeader(
        Guid Id, Guid TenantId, Guid AssigneeUserId, DateOnly? FromDate, DateOnly? ToDate,
        bool IsDraft, bool IsEnded, string OnPeriodEnd, bool NotifyDelegates, bool RedirectNewRequests,
        bool TransferCurrentRequests, DateTime CreatedAtUtc, DateTime ModifiedAtUtc);

    private static async Task<DelegationHeader?> LoadHeaderAsync(
        NpgsqlConnection connection, Guid tenantId, Guid id, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id, tenant_id, assignee_user_id, from_date, to_date, is_draft, is_ended,
                   on_period_end, notify_delegates, redirect_new_requests, transfer_current_requests,
                   created_at_utc, modified_at_utc
            FROM workflow.delegations
            WHERE id = @Id AND tenant_id = @TenantId AND is_deleted = false
            LIMIT 1;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadHeader(reader) : null;
    }

    private static DelegationHeader ReadHeader(NpgsqlDataReader reader) => new(
        reader.GetGuid(0),
        reader.GetGuid(1),
        reader.GetGuid(2),
        reader.IsDBNull(3) ? null : DateOnly.FromDateTime(reader.GetDateTime(3)),
        reader.IsDBNull(4) ? null : DateOnly.FromDateTime(reader.GetDateTime(4)),
        reader.GetBoolean(5),
        reader.GetBoolean(6),
        reader.GetString(7),
        reader.GetBoolean(8),
        reader.GetBoolean(9),
        reader.GetBoolean(10),
        reader.GetDateTime(11),
        reader.GetDateTime(12));

    private static async Task<List<WorkflowDelegationRowDto>> LoadRowsAsync(
        NpgsqlConnection connection, Guid delegationId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT workflow_id, stage_id, delegate_user_id, reason
            FROM workflow.delegation_rows
            WHERE delegation_id = @DelegationId
            ORDER BY workflow_id;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@DelegationId", delegationId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var rows = new List<WorkflowDelegationRowDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new WorkflowDelegationRowDto(
                reader.GetGuid(0),
                reader.IsDBNull(1) || reader.GetString(1).Length == 0 ? null : reader.GetString(1),
                reader.GetGuid(2),
                reader.IsDBNull(3) ? null : reader.GetString(3)));
        }
        return rows;
    }

    private static WorkflowDelegationDto ToDto(DelegationHeader h, IReadOnlyList<WorkflowDelegationRowDto> rows) =>
        new(
            h.Id,
            h.TenantId,
            h.AssigneeUserId,
            rows,
            h.FromDate?.ToString("yyyy-MM-dd"),
            h.ToDate?.ToString("yyyy-MM-dd"),
            h.IsDraft,
            h.IsEnded,
            ComputeStatus(h),
            h.OnPeriodEnd,
            new WorkflowDelegationActionsDto(h.NotifyDelegates, h.RedirectNewRequests, h.TransferCurrentRequests),
            h.CreatedAtUtc,
            h.ModifiedAtUtc);

    private static string ComputeStatus(DelegationHeader h)
    {
        if (h.IsDraft)
            return WorkflowDelegationStatus.Draft;
        if (h.IsEnded)
            return WorkflowDelegationStatus.Ended;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (h.FromDate == null || h.ToDate == null)
            return WorkflowDelegationStatus.Draft;
        if (today < h.FromDate)
            return WorkflowDelegationStatus.Scheduled;
        if (today > h.ToDate)
            return WorkflowDelegationStatus.Completed;
        return WorkflowDelegationStatus.Active;
    }

    private string RequireConnection() =>
        _tenantContext.ConnectionString ?? throw new InvalidOperationException("Tenant connection string not resolved.");

    private static async Task EnsureSchemaAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            CREATE SCHEMA IF NOT EXISTS workflow;

            CREATE TABLE IF NOT EXISTS workflow.delegations (
                id uuid NOT NULL CONSTRAINT pk_delegations PRIMARY KEY,
                tenant_id uuid NOT NULL,
                assignee_user_id uuid NOT NULL,
                from_date date NULL,
                to_date date NULL,
                is_draft boolean NOT NULL DEFAULT false,
                is_ended boolean NOT NULL DEFAULT false,
                on_period_end varchar(32) NOT NULL DEFAULT 'RETURN_TO_ASSIGNEE',
                notify_delegates boolean NOT NULL DEFAULT true,
                redirect_new_requests boolean NOT NULL DEFAULT true,
                transfer_current_requests boolean NOT NULL DEFAULT false,
                created_at_utc timestamptz NOT NULL DEFAULT now(),
                modified_at_utc timestamptz NOT NULL DEFAULT now(),
                created_by uuid NULL,
                modified_by uuid NULL,
                is_deleted boolean NOT NULL DEFAULT false
            );
            CREATE INDEX IF NOT EXISTS ix_delegations_tenant_assignee
                ON workflow.delegations (tenant_id, assignee_user_id, is_deleted);

            CREATE TABLE IF NOT EXISTS workflow.delegation_rows (
                id uuid NOT NULL CONSTRAINT pk_delegation_rows PRIMARY KEY,
                delegation_id uuid NOT NULL REFERENCES workflow.delegations(id) ON DELETE CASCADE,
                workflow_id uuid NOT NULL,
                stage_id varchar(200) NOT NULL DEFAULT '',
                delegate_user_id uuid NOT NULL,
                reason text NULL
            );
            CREATE INDEX IF NOT EXISTS ix_delegation_rows_lookup
                ON workflow.delegation_rows (workflow_id, stage_id, delegate_user_id);
            CREATE INDEX IF NOT EXISTS ix_delegation_rows_delegation
                ON workflow.delegation_rows (delegation_id);
            """;
        await using var cmd = new NpgsqlCommand(sql, connection) { CommandTimeout = 60 };
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}

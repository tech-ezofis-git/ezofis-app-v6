using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Infrastructure.Options;

namespace SaaSApp.Workflow.Infrastructure.Services;

public sealed class WorkflowMoveNotificationService : IWorkflowMoveNotificationService
{
    private const string TicketReceived = "Ticket Received";
    private const string TicketRequested = "Ticket Requested";
    private const string TicketCompleted = "Ticket Completed";
    private const string SeverityInfo = "Info";
    private const string DetailsTab = "Details";

    private readonly ITenantContext _tenantContext;
    private readonly WorkflowMoveNotificationOptions _options;
    private readonly ILogger<WorkflowMoveNotificationService> _logger;

    public WorkflowMoveNotificationService(
        ITenantContext tenantContext,
        IOptions<WorkflowMoveNotificationOptions> options,
        ILogger<WorkflowMoveNotificationService> logger)
    {
        _tenantContext = tenantContext;
        _options = options.Value;
        _logger = logger;
    }

    public async Task TryInsertMoveNotificationsAsync(
        WorkflowMoveNotificationContext context,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
            return;

        try
        {
            var connectionString = _tenantContext.ConnectionString;
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                _logger.LogWarning(
                    "Skip move-next notifications for instance {InstanceId}: tenant connection string not resolved.",
                    context.InstanceId);
                return;
            }

            var category = string.IsNullOrWhiteSpace(_options.Category) ? "workflow" : _options.Category.Trim();
            var review = context.Review?.Trim() ?? string.Empty;
            var suffix = context.WorkflowId.ToString("N")[..8];
            var transactionTable = $"workflow.transaction_{suffix}";

            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await FormMasterFileNotificationStore.EnsureTableAsync(connection, cancellationToken);

            var submittedTxn = await LoadTransactionAsync(
                connection,
                transactionTable,
                context.CurrentTransactionId,
                context.InstanceId,
                openOnly: false,
                cancellationToken);

            var submittedActor = submittedTxn?.ActivityUserId is Guid submittedActorId && submittedActorId != Guid.Empty
                ? submittedActorId
                : context.SubmittedModifiedByUserId;
            var initiator = context.InitiatorUserId is Guid initiatorId && initiatorId != Guid.Empty
                ? initiatorId
                : (Guid?)null;
            var currentStageType = FirstNonEmpty(context.CurrentStageType, submittedTxn?.StageType);
            var currentStageName = FirstNonEmpty(submittedTxn?.StageName, context.CurrentStageName) ?? string.Empty;

            // 1. Requested: the start step was just submitted -> tell the person who raised it.
            var requester = initiator ?? submittedActor;
            if (IsStartStage(currentStageType) && requester != Guid.Empty)
            {
                var text = WorkflowNotificationMessageMapper.RequestedMessage(
                    context.WorkflowName, context.RequestNo, context.InstanceId);
                await InsertAsync(connection, TicketRequested, text, context, currentStageName,
                    currentStageType ?? string.Empty, review, submittedTxn, requester, submittedTxn?.ModifiedAt, category,
                    cancellationToken);
            }

            if (context.WorkflowCompleted)
            {
                // 2. Completed: tell the person who raised the ticket (no "received" for the END stage).
                if (requester != Guid.Empty)
                {
                    var text = WorkflowNotificationMessageMapper.CompletedMessage(
                        context.WorkflowName, context.RequestNo, context.InstanceId);
                    await InsertAsync(connection, TicketCompleted, text, context, currentStageName,
                        currentStageType ?? string.Empty, review, submittedTxn, requester, null, category,
                        cancellationToken);
                }
            }
            else
            {
                // 3. Received: only when a different step is now open for someone.
                var receivedTxn = context.NextTransactionId is int nextId
                    ? await LoadTransactionByIdAsync(connection, transactionTable, nextId, cancellationToken)
                    : await LoadOpenTransactionAsync(connection, transactionTable, context.InstanceId, cancellationToken);

                if (receivedTxn != null && receivedTxn.Id != submittedTxn?.Id)
                {
                    var receivedActor = receivedTxn.ActivityUserId is Guid receivedActorId && receivedActorId != Guid.Empty
                        ? receivedActorId
                        : context.ReceivedCreatedByUserId is Guid receivedFallback && receivedFallback != Guid.Empty
                            ? receivedFallback
                            : submittedActor;
                    var receivedStageName = FirstNonEmpty(receivedTxn.StageName, context.NextStageName) ?? string.Empty;
                    var receivedStageType = FirstNonEmpty(receivedTxn.StageType, context.NextStageType) ?? string.Empty;
                    var text = WorkflowNotificationMessageMapper.ReceivedMessage(
                        context.WorkflowName, context.RequestNo, context.InstanceId, receivedStageName);
                    await InsertAsync(connection, TicketReceived, text, context, receivedStageName,
                        receivedStageType, review, receivedTxn, receivedActor, receivedTxn.CreatedAt, category,
                        cancellationToken);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to insert move-next notifications for instance {InstanceId}; move-next was not affected.",
                context.InstanceId);
        }
    }

    private async Task InsertAsync(
        NpgsqlConnection connection,
        string status,
        string text,
        WorkflowMoveNotificationContext context,
        string stageName,
        string stageType,
        string review,
        TransactionNotifyRow? txn,
        Guid recipient,
        DateTime? createdAtUtc,
        string category,
        CancellationToken cancellationToken)
    {
        var legacyId = await FormMasterFileNotificationStore.TryResolveLegacyUserIdAsync(
            connection, recipient, cancellationToken);

        await FormMasterFileNotificationStore.InsertMoveNotificationAsync(
            connection,
            title: text,
            status: status,
            message: text,
            data: BuildData(context, stageName, stageType, review, txn),
            severity: SeverityInfo,
            createdAtUtc: createdAtUtc,
            createdByGuid: recipient,
            createdByLegacyId: legacyId,
            category: category,
            cancellationToken);

        _logger.LogInformation(
            "Inserted {Status} notification for instance {InstanceId} (user {UserId}).",
            status,
            context.InstanceId,
            recipient);
    }

    private static bool IsStartStage(string? stageType) =>
        string.Equals(stageType?.Trim(), "START", StringComparison.OrdinalIgnoreCase);

    private static object BuildData(
        WorkflowMoveNotificationContext context,
        string stageName,
        string stageType,
        string review,
        TransactionNotifyRow? txn) =>
        new
        {
            instanceId = context.InstanceId.ToString("D"),
            stageName,
            stageType,
            review,
            tab = DetailsTab,
            transactionId = txn?.TransactionGuid is Guid guid && guid != Guid.Empty
                ? guid.ToString("D")
                : txn?.Id.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
            workflowId = context.WorkflowId.ToString("D"),
            workflowName = context.WorkflowName?.Trim() ?? string.Empty
        };

    private static async Task<TransactionNotifyRow?> LoadTransactionAsync(
        NpgsqlConnection connection,
        string transactionTable,
        int? transactionId,
        Guid instanceId,
        bool openOnly,
        CancellationToken cancellationToken)
    {
        if (transactionId is int id)
        {
            var byId = await LoadTransactionByIdAsync(connection, transactionTable, id, cancellationToken);
            if (byId != null)
                return byId;
        }

        return openOnly
            ? await LoadOpenTransactionAsync(connection, transactionTable, instanceId, cancellationToken)
            : await LoadLatestTransactionAsync(connection, transactionTable, instanceId, cancellationToken);
    }

    private static Task<TransactionNotifyRow?> LoadTransactionByIdAsync(
        NpgsqlConnection connection,
        string transactionTable,
        int transactionId,
        CancellationToken cancellationToken) =>
        LoadSingleTransactionAsync(
            connection,
            $"""
            SELECT id, transaction_guid, activity_user_id, created_at, modified_at, stage_name, stage_type, review
            FROM {transactionTable}
            WHERE id = @Id AND is_deleted = false
            LIMIT 1
            """,
            cmd => cmd.Parameters.AddWithValue("@Id", transactionId),
            cancellationToken);

    private static Task<TransactionNotifyRow?> LoadOpenTransactionAsync(
        NpgsqlConnection connection,
        string transactionTable,
        Guid instanceId,
        CancellationToken cancellationToken) =>
        LoadSingleTransactionAsync(
            connection,
            $"""
            SELECT id, transaction_guid, activity_user_id, created_at, modified_at, stage_name, stage_type, review
            FROM {transactionTable}
            WHERE workflow_instance_id = @InstanceId AND is_deleted = false AND action_status = 0
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            cmd => cmd.Parameters.AddWithValue("@InstanceId", instanceId),
            cancellationToken);

    private static Task<TransactionNotifyRow?> LoadLatestTransactionAsync(
        NpgsqlConnection connection,
        string transactionTable,
        Guid instanceId,
        CancellationToken cancellationToken) =>
        LoadSingleTransactionAsync(
            connection,
            $"""
            SELECT id, transaction_guid, activity_user_id, created_at, modified_at, stage_name, stage_type, review
            FROM {transactionTable}
            WHERE workflow_instance_id = @InstanceId AND is_deleted = false
            ORDER BY COALESCE(modified_at, created_at) DESC, id DESC
            LIMIT 1
            """,
            cmd => cmd.Parameters.AddWithValue("@InstanceId", instanceId),
            cancellationToken);

    private static async Task<TransactionNotifyRow?> LoadSingleTransactionAsync(
        NpgsqlConnection connection,
        string sql,
        Action<NpgsqlCommand> bind,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var cmd = new NpgsqlCommand(sql, connection) { CommandTimeout = 15 };
            bind(cmd);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return null;

            return new TransactionNotifyRow(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetGuid(1),
                reader.IsDBNull(2) ? null : reader.GetGuid(2),
                reader.GetDateTime(3),
                reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                reader.IsDBNull(7) ? null : reader.GetString(7));
        }
        catch (PostgresException)
        {
            return null;
        }
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
                return value.Trim();
        }

        return null;
    }

    private sealed record TransactionNotifyRow(
        int Id,
        Guid? TransactionGuid,
        Guid? ActivityUserId,
        DateTime CreatedAt,
        DateTime? ModifiedAt,
        string? StageName,
        string? StageType,
        string? Review);
}

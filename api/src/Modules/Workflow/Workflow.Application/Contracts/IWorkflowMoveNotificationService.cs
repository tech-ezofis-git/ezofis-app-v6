namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>
/// Inserts dbo.notification rows for a ticket move: "Ticket Requested" (to the initiator, when the
/// start step is submitted), "Ticket Received" (to the next assignee), "Ticket Completed" (to the
/// initiator, when the workflow ends).
/// </summary>
public interface IWorkflowMoveNotificationService
{
    Task TryInsertMoveNotificationsAsync(
        WorkflowMoveNotificationContext context,
        CancellationToken cancellationToken = default);
}

public sealed record WorkflowMoveNotificationContext(
    Guid WorkflowId,
    Guid InstanceId,
    string WorkflowName,
    string? Review,
    string CurrentStageName,
    string? CurrentStageType,
    string? NextStageName,
    string? NextStageType,
    /// <summary>Current transaction ModifiedBy; used only if the received actor cannot be resolved.</summary>
    Guid SubmittedModifiedByUserId,
    /// <summary>Next transaction CreatedBy for Ticket Received; falls back to ModifiedBy when null.</summary>
    Guid? ReceivedCreatedByUserId,
    string? RequestNo = null,
    int? CurrentTransactionId = null,
    int? NextTransactionId = null,
    /// <summary>True when this move ended the workflow: send "Ticket Completed" instead of "Ticket Received".</summary>
    bool WorkflowCompleted = false,
    /// <summary>User who raised the ticket (instance StartedBy): receives Requested / Completed.</summary>
    Guid? InitiatorUserId = null);

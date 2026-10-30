namespace SaaSApp.Workflow.Infrastructure.Services;

internal static class WorkflowNotificationMessageMapper
{
    public static string SubmittedMessage(string? stageName)
    {
        var stage = stageName?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(stage))
            return "The ticket has been submitted.";

        if (IsStart(stage))
            return "The ticket has been initiated";

        if (IsApprove(stage))
            return "The ticket has been submitted for approve";

        return $"The ticket has been submitted for {stage}";
    }

    /// <summary>e.g. "Ticket EXP-2026-103 received for Expense Reimbursement (Approver)".</summary>
    public static string ReceivedMessage(string? workflowName, string? requestNo, Guid instanceId, string? stageName)
    {
        var stage = stageName?.Trim();
        var stagePart = string.IsNullOrWhiteSpace(stage) || IsStart(stage) ? string.Empty : $" ({stage})";
        return $"Ticket {TicketLabel(requestNo, instanceId)} received{ForWorkflow(workflowName)}{stagePart}";
    }

    /// <summary>e.g. "Ticket EXP-2026-103 requested for Expense Reimbursement".</summary>
    public static string RequestedMessage(string? workflowName, string? requestNo, Guid instanceId) =>
        $"Ticket {TicketLabel(requestNo, instanceId)} requested{ForWorkflow(workflowName)}";

    /// <summary>e.g. "Ticket EXP-2026-103 for Expense Reimbursement has been completed".</summary>
    public static string CompletedMessage(string? workflowName, string? requestNo, Guid instanceId) =>
        $"Ticket {TicketLabel(requestNo, instanceId)}{ForWorkflow(workflowName)} has been completed";

    /// <summary>The ticket's reference number; the short instance id only when there is none.</summary>
    private static string TicketLabel(string? requestNo, Guid instanceId) =>
        string.IsNullOrWhiteSpace(requestNo) ? instanceId.ToString("N")[..8] : requestNo.Trim();

    private static string ForWorkflow(string? workflowName) =>
        string.IsNullOrWhiteSpace(workflowName) ? string.Empty : $" for {workflowName.Trim()}";

    private static bool IsStart(string stage) =>
        string.Equals(stage, "Start", StringComparison.OrdinalIgnoreCase)
        || string.Equals(stage, "START", StringComparison.OrdinalIgnoreCase);

    private static bool IsApprove(string stage) =>
        string.Equals(stage, "approve", StringComparison.OrdinalIgnoreCase)
        || string.Equals(stage, "approver", StringComparison.OrdinalIgnoreCase);
}

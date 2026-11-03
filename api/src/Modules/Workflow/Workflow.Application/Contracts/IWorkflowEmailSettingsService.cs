namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>
/// How an email that reaches a workflow's email webhook turns into tickets. Applies to
/// WatchFox mailboxes and webhook-only calls alike. Edited in the builder (Email watch card).
/// </summary>
public interface IWorkflowEmailSettingsService
{
    /// <summary>Saved settings, or the default for this workflow when none are saved.</summary>
    Task<WorkflowEmailSettings> GetAsync(Guid tenantId, Guid workflowId, CancellationToken cancellationToken = default);

    Task<WorkflowEmailSettings> SaveAsync(
        Guid tenantId,
        Guid workflowId,
        WorkflowEmailSettingsInput input,
        Guid? userId,
        CancellationToken cancellationToken = default);
}

/// <param name="TicketMode"><c>email</c>: one ticket per email (.eml). <c>attachment</c>: one ticket per attachment.</param>
/// <param name="NoAttachmentAction">
/// Attachment mode, when no attachment matches: <c>email</c> creates one ticket with the .eml, <c>skip</c> creates none.
/// </param>
/// <param name="AttachEmail">Attachment mode: also add the original .eml to each ticket.</param>
/// <param name="AttachmentTypes">File extensions that count as attachments, such as <c>.pdf</c>.</param>
/// <param name="IsDefault">True when nothing is saved yet and these are the workflow's defaults.</param>
public sealed record WorkflowEmailSettings(
    string TicketMode,
    string NoAttachmentAction,
    bool AttachEmail,
    IReadOnlyList<string> AttachmentTypes,
    bool IsDefault,
    DateTime? ModifiedAtUtc);

public sealed record WorkflowEmailSettingsInput(
    string? TicketMode,
    string? NoAttachmentAction,
    bool? AttachEmail,
    IReadOnlyList<string>? AttachmentTypes);

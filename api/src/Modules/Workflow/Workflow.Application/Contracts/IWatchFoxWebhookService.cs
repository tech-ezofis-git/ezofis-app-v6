namespace SaaSApp.Workflow.Application.Contracts;

public interface IWatchFoxWebhookService
{
    /// <summary>
    /// Verifies the WatchFox signature. An invoice match queues an MJB ticket.
    /// An Enquiries match queues the FTL workflow start with the email .eml.
    /// Returns before the file is downloaded.
    /// </summary>
    Task AcceptAsync(string rawBody, string? signatureHeader, CancellationToken cancellationToken = default);

    /// <summary>
    /// Per-workflow webhook <c>/api/email-ingest/webhook/{tenantId}/{workflowId}</c> (WatchFox-signed calls).
    /// The tenant and workflow come from the URL. A match starts that workflow with the email.
    /// <c>connection.needs_attention</c> marks the saved watch so the builder can offer a reconnect.
    /// </summary>
    Task AcceptForWorkflowAsync(
        string rawBody,
        string? signatureHeader,
        Guid tenantId,
        Guid workflowId,
        CancellationToken cancellationToken = default);

    /// <summary>Built-in WatchFox types plus the account's custom types, for the type picker.</summary>
    Task<IReadOnlyList<WatchFoxTypeOption>> GetTypesAsync(CancellationToken cancellationToken = default);

    /// <summary>The webhook URL for this workflow and the mailboxes saved for it.</summary>
    Task<WatchFoxWorkflowWatches> ListWorkflowWatchesAsync(
        Guid tenantId,
        Guid workflowId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves a pending watch and returns the WatchFox sign-in URL for Outlook (<c>m365</c>) or Gmail.
    /// After sign-in, <see cref="CompleteConnectAsync"/> creates the watch with the chosen types.
    /// </summary>
    Task<WatchFoxConnectLinkResult> CreateConnectLinkAsync(
        WatchFoxConnectRequestArgs request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Browser return from WatchFox (Outlook or Gmail, first connect or reconnect).
    /// Returns the UI address to open.
    /// </summary>
    Task<string> CompleteConnectAsync(
        string? status,
        string? connectionId,
        string? email,
        string? state,
        string? returnUrl,
        CancellationToken cancellationToken = default);

    /// <summary>Changes the types a saved watch catches. No new sign-in is needed.</summary>
    Task<WatchFoxWatchRecord> UpdateWatchTypesAsync(
        Guid tenantId,
        Guid id,
        IReadOnlyList<string>? types,
        Guid? userId,
        CancellationToken cancellationToken = default);

    Task<WatchFoxWatchRecord> PauseWatchAsync(Guid tenantId, Guid id, Guid? userId, CancellationToken cancellationToken = default);

    /// <summary><paramref name="catchUp"/> also checks mail that arrived while paused (uses WatchFox runs).</summary>
    Task<WatchFoxWatchRecord> ResumeWatchAsync(
        Guid tenantId,
        Guid id,
        bool catchUp,
        Guid? userId,
        CancellationToken cancellationToken = default);

    /// <summary>Sign-in link for a mailbox that needs attention. The watch and its history stay.</summary>
    Task<WatchFoxConnectLinkResult> CreateReconnectLinkAsync(
        Guid tenantId,
        Guid id,
        string? redirectUrl,
        CancellationToken cancellationToken = default);

    /// <summary>Removes the WatchFox watch and soft-deletes the saved row. The mailbox stays connected.</summary>
    Task DeleteWatchAsync(Guid tenantId, Guid id, Guid? userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Enquiries webhook when WatchFox posts the .eml as multipart form-data.
    /// Queues the same FTL workflow start as <see cref="AcceptAsync"/>.
    /// </summary>
    Task AcceptEnquiryFileAsync(
        byte[] eml,
        string fileName,
        string? contentType,
        string? signatureHeader,
        string? signedPayload,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// One UI call. Returns the Microsoft sign-in URL. After sign-in this API creates the
    /// enquiry watch and sends the browser to <paramref name="redirectUrl"/> with
    /// <c>connectionId</c> and <c>watchId</c>.
    /// </summary>
    Task<WatchFoxConnectLinkResult> CreateMicrosoftConnectLinkAsync(
        Guid tenantId,
        Guid workflowId,
        string? redirectUrl,
        CancellationToken cancellationToken = default,
        WatchFoxConnectBranding? branding = null);

    /// <summary>
    /// Browser return from WatchFox. Creates the enquiry watch, then returns the UI address to open.
    /// </summary>
    Task<string> CompleteMicrosoftConnectAsync(
        string? status,
        string? connectionId,
        string? state,
        string? returnUrl,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// After Microsoft sign-in, start an Enquiries watch for that mailbox.
    /// Uses <c>WatchFox:ApiKey</c> and <c>WatchFox:WebhookSecret</c> from the host.
    /// </summary>
    Task<WatchFoxEnquiryWatchResult> CreateEnquiryWatchAsync(
        string connectionId,
        Guid tenantId,
        Guid workflowId,
        CancellationToken cancellationToken = default);
}

public sealed record WatchFoxConnectLinkResult(string Url, int ExpiresIn);

/// <summary>Optional overrides for the WatchFox hosted connect page. Null fields keep the host WatchFox settings.</summary>
public sealed record WatchFoxConnectBranding(
    string? AppName = null,
    string? LogoUrl = null,
    string? AccentColor = null,
    string? SupportEmail = null,
    bool? HidePoweredBy = null);

/// <summary>One choice for "what to catch". <c>Custom</c> is a type made in the WatchFox account.</summary>
public sealed record WatchFoxTypeOption(string Id, string Label, bool Custom);

public sealed record WatchFoxConnectRequestArgs(
    Guid TenantId,
    Guid WorkflowId,
    string? Provider,
    IReadOnlyList<string>? Types,
    string? RedirectUrl,
    Guid? UserId,
    WatchFoxConnectBranding? Branding = null);

/// <summary>A row of <c>dbo."WatchFoxWatch"</c>: which mailbox watches which workflow, and how.</summary>
public sealed record WatchFoxWatchRecord(
    Guid Id,
    Guid WorkflowId,
    string Provider,
    string? ConnectionId,
    string? WatchId,
    string? MailboxEmail,
    IReadOnlyList<string> Types,
    string? WebhookUrl,
    string Status,
    string? LastError,
    Guid? CreatedBy,
    DateTime CreatedAtUtc,
    DateTime? ModifiedAtUtc);

public sealed record WatchFoxWorkflowWatches(string WebhookUrl, IReadOnlyList<WatchFoxWatchRecord> Watches);

public sealed record WatchFoxEnquiryWatchResult(
    string WatchId,
    string ConnectionId,
    Guid TenantId,
    Guid WorkflowId);

/// <summary>One invoice attachment from a WatchFox <c>email.matched</c> event.</summary>
public sealed record WatchFoxInvoiceJobArgs(
    string EventKey,
    Guid TenantId,
    Guid WorkflowId,
    string FileName,
    string? ContentType,
    string? DownloadUrl,
    string? FromEmail,
    string? Subject,
    long? ReceivedUnix,
    string? MessageId,
    /// <summary>The file itself, when it came inside a webhook-only .eml rather than as a WatchFox link.</summary>
    byte[]? Content = null);

/// <summary>One Enquiries .eml from a WatchFox <c>email.matched</c> event.</summary>
public sealed record WatchFoxEnquiryJobArgs(
    string EventKey,
    Guid TenantId,
    Guid WorkflowId,
    string FileName,
    string? ContentType,
    string? DownloadUrl,
    byte[]? Content,
    string? FromEmail,
    string? Subject,
    string? MessageId,
    Guid? ActorUserId = null,
    /// <summary><c>watchfox</c> or <c>webhook</c>, written to the ticket's mail context.</summary>
    string? Source = null,
    /// <summary>The original .eml to add next to the main file (attachment tickets with "attach email" on).</summary>
    byte[]? ReferenceEml = null,
    string? ReferenceEmlUrl = null);

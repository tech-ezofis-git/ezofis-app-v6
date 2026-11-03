namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>
/// Per-workflow email webhook for clients that use their own tool instead of WatchFox.
/// The tool posts the email to <c>/api/email-ingest/webhook/{tenantId}/{workflowId}</c> with the
/// workflow's key in <c>X-Webhook-Key</c>, and the workflow starts with that .eml.
/// </summary>
public interface IWorkflowEmailWebhookService
{
    /// <summary>The URL and key status. The key itself is never returned here.</summary>
    Task<WorkflowEmailWebhookInfo> GetAsync(Guid tenantId, Guid workflowId, CancellationToken cancellationToken = default);

    /// <summary>Creates or replaces the key. The old key stops working at once. Returns the new key once.</summary>
    Task<WorkflowEmailWebhookKeyResult> CreateKeyAsync(
        Guid tenantId,
        Guid workflowId,
        Guid? userId,
        CancellationToken cancellationToken = default);

    /// <summary>Turns the key off. Calls with it are refused until a new key is made.</summary>
    Task<WorkflowEmailWebhookInfo> DisableAsync(
        Guid tenantId,
        Guid workflowId,
        Guid? userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks the key, then queues the workflow start. <paramref name="file"/> is the .eml (multipart
    /// or <c>message/rfc822</c> body); otherwise <paramref name="json"/> carries <c>eml_base64</c>.
    /// Throws <see cref="UnauthorizedAccessException"/> for a wrong or missing key.
    /// </summary>
    Task AcceptAsync(
        Guid tenantId,
        Guid workflowId,
        string? key,
        string? json,
        byte[]? file,
        string? fileName,
        CancellationToken cancellationToken = default);
}

public sealed record WorkflowEmailWebhookInfo(
    string WebhookUrl,
    bool Enabled,
    string? KeyPrefix,
    DateTime? CreatedAtUtc,
    DateTime? LastUsedAtUtc);

public sealed record WorkflowEmailWebhookKeyResult(string Key, WorkflowEmailWebhookInfo Webhook);

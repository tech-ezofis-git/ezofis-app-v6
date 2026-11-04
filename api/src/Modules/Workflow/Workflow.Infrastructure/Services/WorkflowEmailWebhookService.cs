using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SaaSApp.MultiTenancy;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Infrastructure.Options;

namespace SaaSApp.Workflow.Infrastructure.Services;

public sealed class WorkflowEmailWebhookService : IWorkflowEmailWebhookService
{
    private readonly IOptions<EmailIngestOptions> _options;
    private readonly ITenantConnectionStringResolver _connectionStrings;
    private readonly WorkflowEmailWebhookStore _store;
    private readonly WorkflowEmailDispatcher _dispatcher;
    private readonly ILogger<WorkflowEmailWebhookService> _logger;

    public WorkflowEmailWebhookService(
        IOptions<EmailIngestOptions> options,
        ITenantConnectionStringResolver connectionStrings,
        WorkflowEmailWebhookStore store,
        WorkflowEmailDispatcher dispatcher,
        ILogger<WorkflowEmailWebhookService> logger)
    {
        _options = options;
        _connectionStrings = connectionStrings;
        _store = store;
        _dispatcher = dispatcher;
        _logger = logger;
    }

    public async Task<WorkflowEmailWebhookInfo> GetAsync(
        Guid tenantId,
        Guid workflowId,
        CancellationToken cancellationToken = default)
    {
        var cs = await RequireConnectionAsync(tenantId, workflowId);
        return ToInfo(tenantId, workflowId, await _store.GetAsync(cs, workflowId, cancellationToken));
    }

    public async Task<WorkflowEmailWebhookKeyResult> CreateKeyAsync(
        Guid tenantId,
        Guid workflowId,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        var cs = await RequireConnectionAsync(tenantId, workflowId);
        var key = WorkflowEmailWebhookRules.GenerateKey();
        var row = await _store.SetKeyAsync(
            cs,
            workflowId,
            WorkflowEmailWebhookRules.HashKey(key),
            WorkflowEmailWebhookRules.KeyPrefix(key),
            userId,
            cancellationToken);

        _logger.LogInformation("Email webhook key {KeyPrefix} created for workflow {WorkflowId}.", row.KeyPrefix, workflowId);
        return new WorkflowEmailWebhookKeyResult(key, ToInfo(tenantId, workflowId, row));
    }

    public async Task<WorkflowEmailWebhookInfo> DisableAsync(
        Guid tenantId,
        Guid workflowId,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        var cs = await RequireConnectionAsync(tenantId, workflowId);
        await _store.DisableAsync(cs, workflowId, userId, cancellationToken);
        _logger.LogInformation("Email webhook key turned off for workflow {WorkflowId}.", workflowId);
        return ToInfo(tenantId, workflowId, await _store.GetAsync(cs, workflowId, cancellationToken));
    }

    public async Task AcceptAsync(
        Guid tenantId,
        Guid workflowId,
        string? key,
        string? json,
        byte[]? file,
        string? fileName,
        CancellationToken cancellationToken = default)
    {
        // Same answer for an unknown tenant, workflow or key, so the URL reveals nothing.
        if (string.IsNullOrWhiteSpace(key) || tenantId == Guid.Empty || workflowId == Guid.Empty)
            throw new UnauthorizedAccessException("Webhook key is missing.");
        var cs = await _connectionStrings.GetConnectionStringAsync(tenantId)
            ?? throw new UnauthorizedAccessException("Webhook key is invalid.");
        var row = await _store.GetAsync(cs, workflowId, cancellationToken);
        if (row is not { IsEnabled: true } || !WorkflowEmailWebhookRules.KeyMatches(key, row.KeyHash))
            throw new UnauthorizedAccessException("Webhook key is invalid.");

        var email = ReadEmail(json, file);
        if (email.Eml.Length > WorkflowEmailWebhookRules.MaxEmlBytes)
            throw new InvalidOperationException("The email is larger than 25 MB.");

        var headers = WorkflowEmailDispatcher.ReadHeaders(email.Eml);
        var messageId = email.MessageId ?? WorkflowEmailWebhookRules.ReadHeader(email.Eml, "Message-ID");
        var safeName = string.IsNullOrWhiteSpace(fileName) ? "message.eml" : Path.GetFileName(fileName.Trim());

        // The workflow's email settings decide: one ticket with the .eml, or one per attachment.
        var queued = await _dispatcher.DispatchAsync(
            new IncomingEmail(
                TenantId: tenantId,
                WorkflowId: workflowId,
                Source: "webhook",
                EventKey: WorkflowEmailWebhookRules.EventKey(workflowId, messageId, email.Eml),
                Eml: email.Eml,
                EmlUrl: null,
                EmlFileName: safeName,
                From: WorkflowEmailDispatcher.CleanAddress(email.From) ?? headers.From,
                Subject: email.Subject ?? headers.Subject,
                MessageId: messageId,
                ReceivedUnix: null,
                ActorUserId: row.CreatedBy,
                Attachments: WorkflowEmailDispatcher.ReadAttachments(email.Eml)),
            cancellationToken);

        await _store.TouchAsync(cs, row.Id, cancellationToken);
        _logger.LogInformation(
            "Email webhook {KeyPrefix} for workflow {WorkflowId} queued {Count} ticket start(s) from {FileName}.",
            row.KeyPrefix,
            workflowId,
            queued,
            safeName);
    }

    private static WorkflowWebhookEmail ReadEmail(string? json, byte[]? file)
    {
        if (file is { Length: > 0 })
            return new WorkflowWebhookEmail(file, null, null, null);

        if (string.IsNullOrWhiteSpace(json))
            throw new InvalidOperationException("Send the email as a .eml file or as JSON with eml_base64.");

        try
        {
            using var doc = JsonDocument.Parse(json);
            return WorkflowEmailWebhookRules.ReadJsonEmail(doc.RootElement)
                ?? throw new InvalidOperationException("The JSON body has no eml_base64.");
        }
        catch (JsonException)
        {
            throw new InvalidOperationException("The body is not valid JSON.");
        }
    }

    private async Task<string> RequireConnectionAsync(Guid tenantId, Guid workflowId)
    {
        if (tenantId == Guid.Empty || workflowId == Guid.Empty)
            throw new InvalidOperationException("tenantId and workflowId are required.");
        return await _connectionStrings.GetConnectionStringAsync(tenantId)
            ?? throw new InvalidOperationException($"Tenant connection string not found for {tenantId:D}.");
    }

    private WorkflowEmailWebhookInfo ToInfo(Guid tenantId, Guid workflowId, WorkflowEmailWebhookRow? row) => new(
        WorkflowEmailWebhookRules.BuildWebhookUrl(_options.Value.WorkflowWebhookUrl, tenantId, workflowId),
        row?.IsEnabled == true,
        row?.IsEnabled == true ? row.KeyPrefix : null,
        row?.IsEnabled == true ? row.CreatedAtUtc : null,
        row?.IsEnabled == true ? row.LastUsedAtUtc : null);
}

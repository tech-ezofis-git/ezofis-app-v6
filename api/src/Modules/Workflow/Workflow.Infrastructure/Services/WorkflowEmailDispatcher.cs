using Hangfire;
using Microsoft.Extensions.Logging;
using MimeKit;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Infrastructure.Jobs;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>One attachment with its bytes (webhook-only .eml) or a WatchFox download link.</summary>
public sealed record IncomingEmailAttachment(EmailAttachmentInfo Info, byte[]? Content, string? DownloadUrl);

/// <summary>An email that reached a workflow's email webhook, from WatchFox or a client's own tool.</summary>
public sealed record IncomingEmail(
    Guid TenantId,
    Guid WorkflowId,
    string Source,
    string EventKey,
    byte[]? Eml,
    string? EmlUrl,
    string EmlFileName,
    string? From,
    string? Subject,
    string? MessageId,
    long? ReceivedUnix,
    Guid? ActorUserId,
    IReadOnlyList<IncomingEmailAttachment> Attachments);

/// <summary>
/// Turns one incoming email into tickets using the workflow's email settings: one ticket with the
/// .eml, or one ticket per attachment (MJB keeps its own invoice job). Only queues jobs.
/// The old single WatchFox URL does not come through here.
/// </summary>
public sealed class WorkflowEmailDispatcher
{
    private readonly IWorkflowEmailSettingsService _settings;
    private readonly ILogger<WorkflowEmailDispatcher> _logger;

    public WorkflowEmailDispatcher(IWorkflowEmailSettingsService settings, ILogger<WorkflowEmailDispatcher> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    /// <returns>How many ticket starts were queued.</returns>
    public async Task<int> DispatchAsync(IncomingEmail email, CancellationToken cancellationToken = default)
    {
        var settings = await _settings.GetAsync(email.TenantId, email.WorkflowId, cancellationToken);
        var plan = WorkflowEmailTicketRules.Plan(settings, email.Attachments.Select(a => a.Info).ToList());

        if (plan.StartEmailTicket)
            QueueEmailTicket(email);

        var isMjb = MjbUsAgent.IsThisWorkflow(email.WorkflowId, email.TenantId);
        for (var i = 0; i < plan.AttachmentTickets.Count; i++)
        {
            var info = plan.AttachmentTickets[i];
            var attachment = email.Attachments.First(a => a.Info.Id == info.Id);
            if (isMjb)
                QueueMjbAttachmentTicket(email, attachment, i);
            else
                QueueAttachmentTicket(email, attachment, i, settings.AttachEmail);
        }

        var queued = (plan.StartEmailTicket ? 1 : 0) + plan.AttachmentTickets.Count;
        _logger.LogInformation(
            "Email {EventKey} for workflow {WorkflowId} ({Source}): {Reason}; {Count} ticket start(s) queued.",
            email.EventKey,
            email.WorkflowId,
            email.Source,
            plan.Reason,
            queued);
        return queued;
    }

    /// <summary>Attachments of a raw .eml, using the same parts the .eml extraction looks at.</summary>
    public static IReadOnlyList<IncomingEmailAttachment> ReadAttachments(byte[] eml)
    {
        MimeMessage message;
        try
        {
            using var stream = new MemoryStream(eml);
            message = MimeMessage.Load(stream);
        }
        catch (FormatException)
        {
            return [];
        }

        var list = new List<IncomingEmailAttachment>();
        foreach (var entity in message.BodyParts)
        {
            if (entity is not MimePart part || part.Content == null)
                continue;
            var named = part.IsAttachment || !string.IsNullOrWhiteSpace(part.FileName);
            var mime = part.ContentType?.MimeType;
            if (!named && mime is not ("application/pdf" or "image/png" or "image/jpeg" or "image/jpg" or "image/tiff"))
                continue;

            using var content = new MemoryStream();
            part.Content.DecodeTo(content);
            var bytes = content.ToArray();
            var disposition = part.ContentDisposition?.Disposition;
            var inline = string.Equals(disposition, ContentDisposition.Inline, StringComparison.OrdinalIgnoreCase)
                || (string.IsNullOrWhiteSpace(disposition) && !string.IsNullOrWhiteSpace(part.ContentId));

            list.Add(new IncomingEmailAttachment(
                new EmailAttachmentInfo(list.Count.ToString(), part.FileName, mime, bytes.Length, inline),
                bytes,
                null));
        }

        return list;
    }

    /// <summary>The sender's address from the .eml (<c>Buyer &lt;buyer@example.com&gt;</c> → <c>buyer@example.com</c>).</summary>
    public static (string? From, string? Subject, string? MessageId) ReadHeaders(byte[] eml)
    {
        try
        {
            using var stream = new MemoryStream(eml);
            var headers = HeaderList.Load(stream);
            return (CleanAddress(headers[HeaderId.From]), headers[HeaderId.Subject], headers[HeaderId.MessageId]);
        }
        catch (FormatException)
        {
            return (null, null, null);
        }
    }

    /// <summary><c>Buyer &lt;buyer@example.com&gt;</c> → <c>buyer@example.com</c>; null when it is not an address.</summary>
    public static string? CleanAddress(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        return InternetAddressList.TryParse(value.Trim(), out var list)
            ? list.Mailboxes.FirstOrDefault()?.Address
            : null;
    }

    private void QueueEmailTicket(IncomingEmail email)
    {
        var args = new WatchFoxEnquiryJobArgs(
            EventKey: email.EventKey,
            TenantId: email.TenantId,
            WorkflowId: email.WorkflowId,
            FileName: email.EmlFileName,
            ContentType: "message/rfc822",
            DownloadUrl: email.EmlUrl,
            Content: email.Eml,
            FromEmail: email.From,
            Subject: email.Subject,
            MessageId: email.MessageId,
            ActorUserId: email.ActorUserId,
            Source: email.Source);
        if (args.Content is not { Length: > 0 } && string.IsNullOrWhiteSpace(args.DownloadUrl))
        {
            _logger.LogInformation("Email {EventKey} has no .eml. No ticket started.", email.EventKey);
            return;
        }

        BackgroundJob.Enqueue<RunWatchFoxEnquiryJob>(job => job.Execute(args, null));
    }

    private static void QueueAttachmentTicket(IncomingEmail email, IncomingEmailAttachment attachment, int index, bool attachEmail)
    {
        var args = new WatchFoxEnquiryJobArgs(
            EventKey: AttachmentEventKey(email.EventKey, attachment.Info.Id),
            TenantId: email.TenantId,
            WorkflowId: email.WorkflowId,
            FileName: WorkflowEmailTicketRules.FileNameFor(attachment.Info, index),
            ContentType: attachment.Info.ContentType,
            DownloadUrl: attachment.DownloadUrl,
            Content: attachment.Content,
            FromEmail: email.From,
            Subject: email.Subject,
            MessageId: email.MessageId,
            ActorUserId: email.ActorUserId,
            Source: email.Source,
            ReferenceEml: attachEmail ? email.Eml : null,
            ReferenceEmlUrl: attachEmail && email.Eml is not { Length: > 0 } ? email.EmlUrl : null);
        BackgroundJob.Enqueue<RunWatchFoxEnquiryJob>(job => job.Execute(args, null));
    }

    /// <summary>The MJB invoice job, the same job the old WatchFox URL uses for invoice attachments.</summary>
    private static void QueueMjbAttachmentTicket(IncomingEmail email, IncomingEmailAttachment attachment, int index)
    {
        var args = new WatchFoxInvoiceJobArgs(
            EventKey: AttachmentEventKey(email.EventKey, attachment.Info.Id),
            TenantId: email.TenantId,
            WorkflowId: email.WorkflowId,
            FileName: WorkflowEmailTicketRules.FileNameFor(attachment.Info, index),
            ContentType: attachment.Info.ContentType,
            DownloadUrl: attachment.DownloadUrl,
            FromEmail: email.From,
            Subject: email.Subject,
            ReceivedUnix: email.ReceivedUnix,
            MessageId: email.MessageId,
            Content: attachment.Content);
        BackgroundJob.Enqueue<RunWatchFoxInvoiceJob>(job => job.Execute(args, null));
    }

    /// <summary>One key per attachment. The email part is cut first, so the attachment id always survives.</summary>
    public static string AttachmentEventKey(string eventKey, string attachmentId)
    {
        var suffix = $":a{attachmentId}";
        var room = 160 - suffix.Length;
        return (eventKey.Length <= room ? eventKey : eventKey[..room]) + suffix;
    }
}

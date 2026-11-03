using System.Text.RegularExpressions;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>One attachment of an incoming email, as far as the ticket rules need to know.</summary>
public sealed record EmailAttachmentInfo(
    string Id,
    string? FileName,
    string? ContentType,
    long? Size,
    bool Inline);

/// <summary>What to start for one email: per-email ticket, or one ticket per listed attachment, or nothing.</summary>
public sealed record EmailTicketPlan(
    bool StartEmailTicket,
    IReadOnlyList<EmailAttachmentInfo> AttachmentTickets,
    string Reason);

/// <summary>
/// Rules that turn an email into tickets for a workflow, with no I/O, kept apart so they can be
/// tested. The settings decide; the defaults keep what runs today (MJB: a ticket per attachment,
/// everything else such as FTL: a ticket per email).
/// </summary>
public static class WorkflowEmailTicketRules
{
    public const string ModeEmail = "email";
    public const string ModeAttachment = "attachment";
    public const string NoAttachmentEmail = "email";
    public const string NoAttachmentSkip = "skip";

    /// <summary>Inline images smaller than this are treated as signature or logo chrome.</summary>
    public const long MinInlineImageBytes = 150 * 1024;

    /// <summary>The types offered in the builder, in display order.</summary>
    public static readonly IReadOnlyList<string> AllowedTypes =
    [
        ".pdf", ".tif", ".tiff", ".png", ".jpg", ".jpeg",
        ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
    ];

    /// <summary>Same list as the mailbox setting (<c>EmailIngestMailbox.AttachmentExtensions</c>).</summary>
    public static readonly IReadOnlyList<string> DefaultTypes = [".pdf", ".tif", ".tiff", ".png", ".jpg", ".jpeg"];

    /// <summary>What the MJB invoice job accepts today.</summary>
    public static readonly IReadOnlyList<string> MjbDefaultTypes = [".pdf", ".tif", ".tiff"];

    private static readonly Regex SignatureName = new(
        @"^(image|img|logo|signature|sig|banner|badge|icon|cid_|untitled|company[_-]?logo|email[_-]?logo)\d*$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    /// <summary>Used when the workflow has no saved settings.</summary>
    public static WorkflowEmailSettings Defaults(bool isMjbWorkflow) => isMjbWorkflow
        ? new WorkflowEmailSettings(ModeAttachment, NoAttachmentEmail, false, MjbDefaultTypes, true, null)
        : new WorkflowEmailSettings(ModeEmail, NoAttachmentEmail, true, DefaultTypes, true, null);

    /// <summary>Fills gaps from <paramref name="fallback"/> and rejects unknown values.</summary>
    public static WorkflowEmailSettings Normalize(WorkflowEmailSettingsInput input, WorkflowEmailSettings fallback)
    {
        var mode = input.TicketMode?.Trim().ToLowerInvariant() ?? fallback.TicketMode;
        if (mode is not (ModeEmail or ModeAttachment))
            throw new InvalidOperationException("ticketMode must be email or attachment.");

        var noAttachment = input.NoAttachmentAction?.Trim().ToLowerInvariant() ?? fallback.NoAttachmentAction;
        if (noAttachment is not (NoAttachmentEmail or NoAttachmentSkip))
            throw new InvalidOperationException("noAttachmentAction must be email or skip.");

        var types = input.AttachmentTypes == null ? fallback.AttachmentTypes : NormalizeTypes(input.AttachmentTypes);
        if (mode == ModeAttachment && types.Count == 0)
            throw new InvalidOperationException("Choose at least one attachment type.");

        return new WorkflowEmailSettings(mode, noAttachment, input.AttachEmail ?? fallback.AttachEmail, types, false, null);
    }

    /// <summary>Lower-case <c>.ext</c> values from <see cref="AllowedTypes"/>, in that order.</summary>
    public static IReadOnlyList<string> NormalizeTypes(IEnumerable<string?> types)
    {
        var wanted = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in types)
        {
            var value = raw?.Trim();
            if (string.IsNullOrEmpty(value))
                continue;
            if (!value.StartsWith('.'))
                value = "." + value;
            if (!AllowedTypes.Contains(value, StringComparer.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Attachment type '{raw}' is not supported.");
            wanted.Add(value);
        }

        return AllowedTypes.Where(wanted.Contains).ToList();
    }

    /// <summary>
    /// Email mode: one ticket with the .eml. Attachment mode: one ticket per matching attachment;
    /// with none, the no-attachment setting decides between one .eml ticket and nothing.
    /// </summary>
    public static EmailTicketPlan Plan(WorkflowEmailSettings settings, IReadOnlyList<EmailAttachmentInfo> attachments)
    {
        if (settings.TicketMode != ModeAttachment)
            return new EmailTicketPlan(true, [], "one ticket per email");

        var matching = attachments.Where(a => Counts(a, settings.AttachmentTypes)).ToList();
        if (matching.Count > 0)
            return new EmailTicketPlan(false, matching, $"one ticket per attachment ({matching.Count})");

        return settings.NoAttachmentAction == NoAttachmentEmail
            ? new EmailTicketPlan(true, [], "no matching attachment: one ticket with the email")
            : new EmailTicketPlan(false, [], "no matching attachment: skipped");
    }

    /// <summary>The attachment's type is chosen and it is not a signature or logo image.</summary>
    public static bool Counts(EmailAttachmentInfo attachment, IReadOnlyList<string> types)
    {
        var extension = ExtensionOf(attachment);
        if (extension == null || !types.Contains(extension, StringComparer.OrdinalIgnoreCase))
            return false;
        return !IsSignatureImage(attachment, extension);
    }

    /// <summary>The file name's extension, or one from the content type when there is no name.</summary>
    public static string? ExtensionOf(EmailAttachmentInfo attachment)
    {
        var fromName = Path.GetExtension(attachment.FileName ?? string.Empty);
        if (!string.IsNullOrWhiteSpace(fromName))
            return fromName.ToLowerInvariant();

        return attachment.ContentType?.Split(';')[0].Trim().ToLowerInvariant() switch
        {
            "application/pdf" => ".pdf",
            "image/tiff" => ".tiff",
            "image/png" => ".png",
            "image/jpeg" or "image/jpg" => ".jpg",
            "application/msword" => ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => ".docx",
            "application/vnd.ms-excel" => ".xls",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => ".xlsx",
            "text/csv" => ".csv",
            "text/plain" => ".txt",
            _ => null,
        };
    }

    /// <summary>Logo-like file names, or small inline images (same rule as the .eml extraction).</summary>
    public static bool IsSignatureImage(EmailAttachmentInfo attachment, string extension)
    {
        if (extension is not (".png" or ".jpg" or ".jpeg"))
            return false;

        var name = Path.GetFileNameWithoutExtension(attachment.FileName ?? string.Empty).Trim();
        if (name.Length > 0 && SignatureName.IsMatch(name))
            return true;

        return attachment.Inline && attachment.Size is { } size && size < MinInlineImageBytes;
    }

    /// <summary>A file name to store: the original, or <c>attachment-{n}{ext}</c>.</summary>
    public static string FileNameFor(EmailAttachmentInfo attachment, int index)
    {
        var name = Path.GetFileName(attachment.FileName?.Trim() ?? string.Empty);
        return string.IsNullOrWhiteSpace(name)
            ? $"attachment-{index + 1}{ExtensionOf(attachment) ?? ".bin"}"
            : name;
    }
}

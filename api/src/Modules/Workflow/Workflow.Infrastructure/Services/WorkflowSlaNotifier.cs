using System.Net;
using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;
using SaaSApp.Catalog;
using SaaSApp.Catalog.Entities;
using SaaSApp.Catalog.Persistence;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// SLA mail building blocks: recipient lookup, message text, and SMTP sending through the tenant mail
/// settings (same account and SMTP path as the repository share / delegation mails).
/// </summary>
public sealed class WorkflowSlaNotifier
{
    private readonly IDbContextFactory<CatalogDbContext> _catalogFactory;
    private readonly IConfiguration _configuration;

    public WorkflowSlaNotifier(IDbContextFactory<CatalogDbContext> catalogFactory, IConfiguration configuration)
    {
        _catalogFactory = catalogFactory;
        _configuration = configuration;
    }

    public sealed record Recipient(Guid UserId, string? Email, string DisplayName, string? Phone);

    public sealed record Message(string Subject, string Heading, string BodyHtml, string SmsText);

    /// <summary>Active users from <c>users."Users"</c> (the designer's /Users picker ids).</summary>
    public static async Task<IReadOnlyList<Recipient>> LoadRecipientsAsync(
        NpgsqlConnection connection,
        IEnumerable<Guid> userIds,
        CancellationToken cancellationToken)
    {
        var ids = userIds.Where(id => id != Guid.Empty).Distinct().ToArray();
        if (ids.Length == 0)
            return [];

        const string sql = """
            SELECT "Id", "Email", "DisplayName", "PhoneNo", "CountryCode"
            FROM users."Users"
            WHERE "IsDeleted" = false AND "Id" = ANY(@Ids);
            """;
        var list = new List<Recipient>();
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Ids", ids);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var email = reader.IsDBNull(1) ? null : reader.GetString(1);
            var name = reader.IsDBNull(2) ? email ?? "there" : reader.GetString(2);
            var phone = ComposePhone(
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4));
            list.Add(new Recipient(reader.GetGuid(0), email, name, phone));
        }

        return list;
    }

    /// <summary>
    /// Users store the number and its country code separately (PhoneNo "9597707876", CountryCode "+91");
    /// SMS needs one international number ("+919597707876"). A number that already has a '+' / '00'
    /// prefix is kept; without a usable country code the number is returned as-is (the SMS sender then
    /// applies <c>Sms:Twilio:DefaultCountryCode</c>).
    /// </summary>
    internal static string? ComposePhone(string? phoneNo, string? countryCode)
    {
        var phone = phoneNo?.Trim();
        if (string.IsNullOrEmpty(phone))
            return null;
        if (phone.StartsWith('+') || phone.StartsWith("00", StringComparison.Ordinal))
            return phone;

        var code = new string((countryCode ?? string.Empty).Where(char.IsDigit).ToArray());
        if (code.Length == 0)
            return phone;

        var digits = new string(phone.Where(char.IsDigit).ToArray()).TrimStart('0');
        return digits.Length == 0 ? null : $"+{code}{digits}";
    }

    /// <summary>The tenant's outgoing mail account, or null when it is not usable.</summary>
    public async Task<MailSetting?> LoadMailSettingsAsync(CancellationToken cancellationToken)
    {
        await using var catalog = await _catalogFactory.CreateDbContextAsync(cancellationToken);
        var settings = await catalog.MailSettings
            .AsNoTracking()
            .Where(x => x.Preference == 1 && !x.Isdeleted)
            .OrderByDescending(x => x.SettingId)
            .FirstOrDefaultAsync(cancellationToken);
        return settings == null
               || string.IsNullOrWhiteSpace(settings.EmailId)
               || string.IsNullOrWhiteSpace(settings.Password)
               || string.IsNullOrWhiteSpace(settings.OutgoingServer)
               || settings.OutgoingPort <= 0
            ? null
            : settings;
    }

    /// <summary>One client for a whole outbox batch.</summary>
    public static SmtpClient CreateSmtpClient(MailSetting settings) =>
        new(settings.OutgoingServer, settings.OutgoingPort)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(settings.EmailId, settings.Password)
        };

    public async Task SendEmailAsync(
        SmtpClient smtp,
        MailSetting settings,
        string toAddress,
        string? displayName,
        string subject,
        string heading,
        string bodyHtml,
        CancellationToken cancellationToken)
    {
        using var mail = new MailMessage
        {
            From = EzofisMailAddress.System(settings.EmailId),
            Subject = subject,
            Body = BuildEmailHtml(displayName ?? toAddress, heading, bodyHtml, ResolveAppUrl()),
            IsBodyHtml = true
        };
        mail.To.Add(toAddress);
        await smtp.SendMailAsync(mail, cancellationToken);
    }

    internal static string BuildEmailHtml(string recipientName, string heading, string bodyHtml, string appUrl) => $"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#222222;">
          <div style="max-width:560px;margin:0 auto;padding:28px 20px;">
            <div style="margin-bottom:28px;">
              <img src="{EzofisOtpMail.LogoUrl}" alt="ezofis" width="160" style="display:block;border:0;height:auto;" />
            </div>
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1a1a1a;line-height:1.3;">{Encode(heading)}</h1>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#333;">Hi {Encode(recipientName)},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#333;">{bodyHtml}</p>
            <p style="margin:0 0 24px;">
              <a href="{WebUtility.HtmlEncode(appUrl)}" style="display:inline-block;padding:12px 22px;background:#111111;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;">Open EZOFIS</a>
            </p>
            <p style="margin:0;font-size:13px;line-height:1.5;color:#555;">You are receiving this because a workflow SLA lists you for notifications.</p>
          </div>
        </body>
        </html>
        """;

    private string ResolveAppUrl()
    {
        var url = _configuration["RepositoryShare:FrontendBaseUrl"]?.Trim().TrimEnd('/');
        return string.IsNullOrEmpty(url) ? "https://cloud.ezofis.com" : url;
    }

    internal static string Encode(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);
}

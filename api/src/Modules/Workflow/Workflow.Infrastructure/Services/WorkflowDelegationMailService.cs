using System.Net;
using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using SaaSApp.Catalog;
using SaaSApp.Catalog.Persistence;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Keeps the original assignee informed while a delegate handles their tickets. Each step redirected
/// by a delegation is recorded in <c>workflow.delegation_redirects</c>; the original assignee is then
/// emailed when the ticket arrives (and goes to the delegate), when the delegate acts on it, and when
/// the ticket completes. Mail failures are logged and never affect the workflow move.
/// </summary>
public sealed class WorkflowDelegationMailService
{
    private readonly ITenantContext _tenantContext;
    private readonly IUserEmailLookup _users;
    private readonly IDbContextFactory<CatalogDbContext> _catalogFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WorkflowDelegationMailService> _logger;

    public WorkflowDelegationMailService(
        ITenantContext tenantContext,
        IUserEmailLookup users,
        IDbContextFactory<CatalogDbContext> catalogFactory,
        IConfiguration configuration,
        ILogger<WorkflowDelegationMailService> logger)
    {
        _tenantContext = tenantContext;
        _users = users;
        _catalogFactory = catalogFactory;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>Ticket step assigned to <paramref name="assigneeUserId"/> was routed to their delegate.</summary>
    public async Task RecordRedirectAndNotifyAsync(
        NpgsqlConnection connection,
        Guid workflowId,
        Guid workflowInstanceId,
        int transactionId,
        string? stageName,
        Guid assigneeUserId,
        Guid delegateUserId,
        CancellationToken cancellationToken)
    {
        try
        {
            await EnsureTableAsync(connection, cancellationToken);
            const string sql = """
                INSERT INTO workflow.delegation_redirects
                    (id, workflow_id, workflow_instance_id, transaction_id, stage_name,
                     assignee_user_id, delegate_user_id, created_at_utc)
                VALUES
                    (@Id, @WorkflowId, @InstanceId, @TransactionId, @StageName,
                     @AssigneeUserId, @DelegateUserId, now());
                """;
            await using (var cmd = new NpgsqlCommand(sql, connection))
            {
                cmd.Parameters.AddWithValue("@Id", Guid.NewGuid());
                cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
                cmd.Parameters.AddWithValue("@InstanceId", workflowInstanceId);
                cmd.Parameters.AddWithValue("@TransactionId", transactionId);
                cmd.Parameters.AddWithValue("@StageName", (object?)stageName ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@AssigneeUserId", assigneeUserId);
                cmd.Parameters.AddWithValue("@DelegateUserId", delegateUserId);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
            }

            var ticket = await LoadTicketAsync(connection, workflowId, workflowInstanceId, cancellationToken);
            var profiles = await _users.GetProfilesAsync([assigneeUserId, delegateUserId], cancellationToken);
            var delegateName = NameOf(profiles, delegateUserId);
            await SendAsync(
                profiles,
                assigneeUserId,
                $"Ticket {ticket.Reference} received — sent to your delegate {delegateName}",
                "A ticket came to you while you are away",
                $"Ticket <strong>{Encode(ticket.Reference)}</strong> ({Encode(ticket.WorkflowName)}) reached the "
                    + $"<strong>{Encode(stageName ?? "next")}</strong> step assigned to you. Because your delegation is active, "
                    + $"it was sent to your delegate <strong>{Encode(delegateName)}</strong>.",
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Delegation redirect mail failed for instance {InstanceId} transaction {TransactionId}.",
                workflowInstanceId, transactionId);
        }
    }

    /// <summary>Someone acted (Approve, Reject, …) on a step that had been redirected to a delegate.</summary>
    public async Task NotifyActionAsync(
        NpgsqlConnection connection,
        Guid workflowId,
        Guid workflowInstanceId,
        int transactionId,
        string review,
        Guid actedByUserId,
        CancellationToken cancellationToken)
    {
        try
        {
            var redirect = await FindRedirectAsync(connection, transactionId, workflowInstanceId, cancellationToken);
            if (redirect is not { } r)
                return;

            var ticket = await LoadTicketAsync(connection, workflowId, workflowInstanceId, cancellationToken);
            var profiles = await _users.GetProfilesAsync([r.AssigneeUserId, actedByUserId], cancellationToken);
            var actorName = NameOf(profiles, actedByUserId);
            await SendAsync(
                profiles,
                r.AssigneeUserId,
                $"Ticket {ticket.Reference} — {review} by {actorName}",
                $"Your delegate acted on ticket {ticket.Reference}",
                $"<strong>{Encode(actorName)}</strong> chose <strong>{Encode(review)}</strong> on ticket "
                    + $"<strong>{Encode(ticket.Reference)}</strong> ({Encode(ticket.WorkflowName)}), "
                    + $"step <strong>{Encode(r.StageName ?? "-")}</strong>, on your behalf.",
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Delegation action mail failed for instance {InstanceId} transaction {TransactionId}.",
                workflowInstanceId, transactionId);
        }
    }

    /// <summary>Ticket completed: tell every original assignee who had a step of it redirected.</summary>
    public async Task NotifyCompletedAsync(
        NpgsqlConnection connection,
        Guid workflowId,
        Guid workflowInstanceId,
        CancellationToken cancellationToken)
    {
        try
        {
            if (!await TableExistsAsync(connection, cancellationToken))
                return;

            var assignees = new List<Guid>();
            await using (var cmd = new NpgsqlCommand(
                "SELECT DISTINCT assignee_user_id FROM workflow.delegation_redirects WHERE workflow_instance_id = @InstanceId;",
                connection))
            {
                cmd.Parameters.AddWithValue("@InstanceId", workflowInstanceId);
                await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                    assignees.Add(reader.GetGuid(0));
            }

            if (assignees.Count == 0)
                return;

            var ticket = await LoadTicketAsync(connection, workflowId, workflowInstanceId, cancellationToken);
            var profiles = await _users.GetProfilesAsync(assignees, cancellationToken);
            foreach (var assignee in assignees)
            {
                await SendAsync(
                    profiles,
                    assignee,
                    $"Ticket {ticket.Reference} completed",
                    $"Ticket {ticket.Reference} is completed",
                    $"Ticket <strong>{Encode(ticket.Reference)}</strong> ({Encode(ticket.WorkflowName)}), "
                        + "which your delegate handled while you were away, has been completed.",
                    cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Delegation completed mail failed for instance {InstanceId}.", workflowInstanceId);
        }
    }

    private async Task SendAsync(
        IReadOnlyDictionary<Guid, UserProfileLookupDto> profiles,
        Guid recipientUserId,
        string subject,
        string heading,
        string messageHtml,
        CancellationToken cancellationToken)
    {
        if (!profiles.TryGetValue(recipientUserId, out var recipient) || string.IsNullOrWhiteSpace(recipient.Email))
        {
            _logger.LogWarning("Delegation mail skipped: no email for user {UserId}.", recipientUserId);
            return;
        }

        await using var catalog = await _catalogFactory.CreateDbContextAsync(cancellationToken);
        var settings = await catalog.MailSettings
            .AsNoTracking()
            .Where(x => x.Preference == 1 && !x.Isdeleted)
            .OrderByDescending(x => x.SettingId)
            .FirstOrDefaultAsync(cancellationToken);
        if (settings == null
            || string.IsNullOrWhiteSpace(settings.EmailId)
            || string.IsNullOrWhiteSpace(settings.Password)
            || string.IsNullOrWhiteSpace(settings.OutgoingServer)
            || settings.OutgoingPort <= 0)
        {
            _logger.LogWarning("Delegation mail not sent: mailsettings not configured.");
            return;
        }

        var appUrl = WebUtility.HtmlEncode(ResolveAppUrl());
        var greeting = Encode(string.IsNullOrWhiteSpace(recipient.DisplayName) ? recipient.Email : recipient.DisplayName);
        var body = $"""
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#222222;">
              <div style="max-width:560px;margin:0 auto;padding:28px 20px;">
                <div style="margin-bottom:28px;">
                  <img src="{EzofisOtpMail.LogoUrl}" alt="ezofis" width="160" style="display:block;border:0;height:auto;" />
                </div>
                <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1a1a1a;line-height:1.3;">{Encode(heading)}</h1>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#333;">Hi {greeting},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#333;">{messageHtml}</p>
                <p style="margin:0 0 24px;">
                  <a href="{appUrl}" style="display:inline-block;padding:12px 22px;background:#111111;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;">Open EZOFIS</a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#555;">You are receiving this because you have an active workflow delegation.</p>
              </div>
            </body>
            </html>
            """;

        using var mail = new MailMessage
        {
            From = EzofisMailAddress.System(settings.EmailId),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        mail.To.Add(recipient.Email);

        using var smtp = new SmtpClient(settings.OutgoingServer, settings.OutgoingPort)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(settings.EmailId, settings.Password)
        };
        await smtp.SendMailAsync(mail, cancellationToken);
        _logger.LogInformation("Delegation mail '{Subject}' sent to user {UserId}.", subject, recipientUserId);
    }

    private string ResolveAppUrl()
    {
        var url = _configuration["RepositoryShare:FrontendBaseUrl"]?.Trim().TrimEnd('/');
        return string.IsNullOrEmpty(url) ? "https://cloud.ezofis.com" : url;
    }

    private sealed record TicketInfo(string Reference, string WorkflowName);

    private static async Task<TicketInfo> LoadTicketAsync(
        NpgsqlConnection connection,
        Guid workflowId,
        Guid workflowInstanceId,
        CancellationToken cancellationToken)
    {
        var suffix = workflowId.ToString("N")[..8];
        string? reference = null;
        string? workflowName = null;
        try
        {
            var sql = $"""
                SELECT i.reference_number,
                       (SELECT w."Name" FROM workflow."Workflows" w WHERE w."Id" = @WorkflowId LIMIT 1)
                FROM workflow.workflow_instances_{suffix} i
                WHERE i.id = @InstanceId
                LIMIT 1;
                """;
            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@InstanceId", workflowInstanceId);
            cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                reference = reader.IsDBNull(0) ? null : reader.GetString(0);
                workflowName = reader.IsDBNull(1) ? null : reader.GetString(1);
            }
        }
        catch (PostgresException)
        {
            // Fall back to ids below.
        }

        return new TicketInfo(
            string.IsNullOrWhiteSpace(reference) ? workflowInstanceId.ToString("D")[..8] : reference.Trim(),
            string.IsNullOrWhiteSpace(workflowName) ? "Workflow" : workflowName.Trim());
    }

    private sealed record RedirectRow(Guid AssigneeUserId, string? StageName);

    private static async Task<RedirectRow?> FindRedirectAsync(
        NpgsqlConnection connection,
        int transactionId,
        Guid workflowInstanceId,
        CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(connection, cancellationToken))
            return null;

        const string sql = """
            SELECT assignee_user_id, stage_name
            FROM workflow.delegation_redirects
            WHERE transaction_id = @TransactionId AND workflow_instance_id = @InstanceId
            ORDER BY created_at_utc DESC
            LIMIT 1;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@TransactionId", transactionId);
        cmd.Parameters.AddWithValue("@InstanceId", workflowInstanceId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? new RedirectRow(reader.GetGuid(0), reader.IsDBNull(1) ? null : reader.GetString(1))
            : null;
    }

    private static async Task<bool> TableExistsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            "SELECT to_regclass('workflow.delegation_redirects') IS NOT NULL;", connection);
        return await cmd.ExecuteScalarAsync(cancellationToken) is true;
    }

    private static async Task EnsureTableAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            CREATE SCHEMA IF NOT EXISTS workflow;
            CREATE TABLE IF NOT EXISTS workflow.delegation_redirects (
                id uuid NOT NULL CONSTRAINT pk_delegation_redirects PRIMARY KEY,
                workflow_id uuid NOT NULL,
                workflow_instance_id uuid NOT NULL,
                transaction_id integer NOT NULL,
                stage_name varchar(500) NULL,
                assignee_user_id uuid NOT NULL,
                delegate_user_id uuid NOT NULL,
                created_at_utc timestamptz NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_delegation_redirects_instance
                ON workflow.delegation_redirects (workflow_instance_id, transaction_id);
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string NameOf(IReadOnlyDictionary<Guid, UserProfileLookupDto> profiles, Guid userId) =>
        profiles.TryGetValue(userId, out var p)
            ? (string.IsNullOrWhiteSpace(p.DisplayName) ? p.Email : p.DisplayName)
            : "your delegate";

    private static string Encode(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);
}

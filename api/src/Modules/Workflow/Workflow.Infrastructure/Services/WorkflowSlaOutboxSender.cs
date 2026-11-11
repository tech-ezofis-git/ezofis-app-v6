using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Infrastructure.Options;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Sends queued SLA emails/SMS from <c>workflow.sla_notification_outbox</c> for one tenant: claims a batch
/// with <c>FOR UPDATE SKIP LOCKED</c>, sends emails through one SMTP client (tenant mail settings), and
/// retries failures with backoff before marking them failed.
/// </summary>
public sealed class WorkflowSlaOutboxSender
{
    private readonly ITenantContext _tenantContext;
    private readonly WorkflowSlaNotifier _notifier;
    private readonly ISmsSender _sms;
    private readonly WorkflowSlaOptions _options;
    private readonly ILogger<WorkflowSlaOutboxSender> _logger;

    public WorkflowSlaOutboxSender(
        ITenantContext tenantContext,
        WorkflowSlaNotifier notifier,
        ISmsSender sms,
        IOptions<WorkflowSlaOptions> options,
        ILogger<WorkflowSlaOutboxSender> logger)
    {
        _tenantContext = tenantContext;
        _notifier = notifier;
        _sms = sms;
        _options = options.Value;
        _logger = logger;
    }

    private sealed record OutboxRow(
        long Id, string Channel, string Address, string? DisplayName, string Subject, string Heading,
        string BodyHtml, string SmsText, int Attempts);

    /// <summary>Returns the number of messages sent.</summary>
    public async Task<int> RunAsync(CancellationToken cancellationToken = default)
    {
        var connectionString = _tenantContext.ConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString))
            return 0;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        if (!await WorkflowSlaStore.TablesExistAsync(connection, cancellationToken))
            return 0;

        var rows = await ClaimAsync(connection, cancellationToken);
        if (rows.Count == 0)
            return 0;

        var sent = 0;
        var emails = rows.Where(r => r.Channel == "email").ToList();
        if (emails.Count > 0)
        {
            var settings = await _notifier.LoadMailSettingsAsync(cancellationToken);
            if (settings == null)
            {
                foreach (var row in emails)
                    await RetryAsync(connection, row, "mail settings are not configured", cancellationToken);
            }
            else
            {
                using var smtp = WorkflowSlaNotifier.CreateSmtpClient(settings);
                foreach (var row in emails)
                {
                    try
                    {
                        await _notifier.SendEmailAsync(
                            smtp, settings, row.Address, row.DisplayName, row.Subject, row.Heading, row.BodyHtml, cancellationToken);
                        await MarkSentAsync(connection, row.Id, cancellationToken);
                        sent++;
                        _logger.LogInformation("SLA email '{Subject}' sent to {Email}.", row.Subject, row.Address);
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        // Same handling as the repository share mail: one recipient never stops the batch.
                        _logger.LogWarning(ex, "SLA email {OutboxId} to {Email} failed.", row.Id, row.Address);
                        await RetryAsync(connection, row, ex.Message, cancellationToken);
                    }
                }
            }
        }

        foreach (var row in rows.Where(r => r.Channel == "sms"))
        {
            if (!_sms.IsConfigured)
            {
                // A local run limited to test tenants leaves SMS to the server that has Twilio.
                if (_options.TenantIds.Count > 0)
                {
                    await ReleaseAsync(connection, row.Id, cancellationToken);
                    continue;
                }

                await FailAsync(connection, row.Id, "SMS is not configured (Sms:Twilio)", cancellationToken);
                continue;
            }

            if (await _sms.SendAsync(row.Address, row.SmsText, cancellationToken))
            {
                await MarkSentAsync(connection, row.Id, cancellationToken);
                sent++;
            }
            else
            {
                await RetryAsync(connection, row, "SMS provider did not accept the message", cancellationToken);
            }
        }

        return sent;
    }

    private async Task<List<OutboxRow>> ClaimAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE workflow.sla_notification_outbox SET locked_until = now() + interval '5 minutes'
            WHERE id IN (
                SELECT id FROM workflow.sla_notification_outbox
                WHERE status = 0 AND next_attempt_at <= now() AND (locked_until IS NULL OR locked_until < now())
                ORDER BY id
                LIMIT @Batch
                FOR UPDATE SKIP LOCKED)
            RETURNING id, channel, address, display_name, subject, heading, body_html, sms_text, attempts;
            """;
        var rows = new List<OutboxRow>();
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Batch", Math.Max(1, _options.OutboxBatchSize));
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new OutboxRow(
                reader.GetInt64(0), reader.GetString(1), reader.GetString(2), reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.GetString(4), reader.GetString(5), reader.GetString(6), reader.GetString(7), reader.GetInt32(8)));
        }

        return rows.OrderBy(r => r.Id).ToList();
    }

    private static async Task MarkSentAsync(NpgsqlConnection connection, long id, CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            "UPDATE workflow.sla_notification_outbox SET status = 1, sent_at_utc = now(), locked_until = NULL, last_error = NULL WHERE id = @Id;",
            connection);
        cmd.Parameters.AddWithValue("@Id", id);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task ReleaseAsync(NpgsqlConnection connection, long id, CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            "UPDATE workflow.sla_notification_outbox SET locked_until = NULL WHERE id = @Id;",
            connection);
        cmd.Parameters.AddWithValue("@Id", id);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task FailAsync(NpgsqlConnection connection, long id, string error, CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            "UPDATE workflow.sla_notification_outbox SET status = 2, locked_until = NULL, last_error = @Error WHERE id = @Id;",
            connection);
        cmd.Parameters.AddWithValue("@Error", error);
        cmd.Parameters.AddWithValue("@Id", id);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task RetryAsync(NpgsqlConnection connection, OutboxRow row, string error, CancellationToken cancellationToken)
    {
        var attempts = row.Attempts + 1;
        if (attempts >= Math.Max(1, _options.MaxSendAttempts))
        {
            await using var fail = new NpgsqlCommand(
                "UPDATE workflow.sla_notification_outbox SET status = 2, attempts = @Attempts, locked_until = NULL, last_error = @Error WHERE id = @Id;",
                connection);
            fail.Parameters.AddWithValue("@Attempts", attempts);
            fail.Parameters.AddWithValue("@Error", error);
            fail.Parameters.AddWithValue("@Id", row.Id);
            await fail.ExecuteNonQueryAsync(cancellationToken);
            return;
        }

        await using var cmd = new NpgsqlCommand(
            """
            UPDATE workflow.sla_notification_outbox
            SET attempts = @Attempts, next_attempt_at = now() + @Delay, locked_until = NULL, last_error = @Error
            WHERE id = @Id;
            """,
            connection);
        cmd.Parameters.AddWithValue("@Attempts", attempts);
        cmd.Parameters.AddWithValue("@Delay", WorkflowSlaSchedule.RetryDelay(attempts));
        cmd.Parameters.AddWithValue("@Error", error);
        cmd.Parameters.AddWithValue("@Id", row.Id);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}

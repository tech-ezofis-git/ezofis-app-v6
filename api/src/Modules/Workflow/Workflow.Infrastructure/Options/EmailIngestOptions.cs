namespace SaaSApp.Workflow.Infrastructure.Options;

public sealed class EmailIngestOptions
{
    public const string SectionName = "EmailIngest";

    /// <summary>When false, Hangfire email-ingest recurring job is not registered.</summary>
    public bool HangfireEnabled { get; set; } = true;

    /// <summary>
    /// Hangfire cron for the scheduler (6-field with seconds). Default every 30 seconds.
    /// Only tenants with an enabled mailbox are polled.
    /// </summary>
    public string HangfireCron { get; set; } = "*/30 * * * * *";

    /// <summary>
    /// Minimum seconds between mailbox polls when <c>pollIntervalMinutes</c> is 0 on the mailbox.
    /// Also used as the floor when Hangfire runs more often than the mailbox interval.
    /// </summary>
    public int MinimumPollIntervalSeconds { get; set; } = 30;

    /// <summary>How often Hangfire may scan all tenants to discover new mailboxes (minutes).</summary>
    public int TenantDiscoveryMinutes { get; set; } = 30;

    /// <summary>
    /// Base of the per-workflow email webhook. Each workflow gets <c>{base}/{tenantId}/{workflowId}</c>.
    /// WatchFox posts there, and so can a client's own tool with the workflow's webhook key.
    /// </summary>
    public string WorkflowWebhookUrl { get; set; } = "https://cloud.ezofis.com/api/email-ingest/webhook";
}

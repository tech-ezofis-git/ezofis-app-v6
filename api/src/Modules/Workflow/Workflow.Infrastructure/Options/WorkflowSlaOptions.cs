namespace SaaSApp.Workflow.Infrastructure.Options;

public sealed class WorkflowSlaOptions
{
    public const string SectionName = "WorkflowSla";

    /// <summary>Runs the SLA mail process (<c>WorkflowSlaBackgroundService</c>) in this API process.</summary>
    public bool Enabled { get; set; }

    /// <summary>Seconds between passes (minimum 15).</summary>
    public int IntervalSeconds { get; set; } = 60;

    /// <summary>Due SLA timers fired per tenant per pass; the rest wait for the next pass.</summary>
    public int TimerBatchSize { get; set; } = 200;

    /// <summary>
    /// Queued emails/SMS sent per tenant per pass. Tenants are handled one after another and SMTP takes
    /// about 1–2 s per mail, so keep this small enough that one tenant's backlog does not hold the pass.
    /// </summary>
    public int OutboxBatchSize { get; set; } = 30;

    /// <summary>Send attempts before an outbox message is marked failed.</summary>
    public int MaxSendAttempts { get; set; } = 5;

    /// <summary>
    /// Timers more than this many minutes past due are skipped (no email, SMS or escalation), so switching
    /// SLA on, or a long outage, does not notify about old tickets. 0 sends them however late.
    /// </summary>
    public int MaxLateMinutes { get; set; } = 60;

    /// <summary>
    /// When set, only these tenants are processed (for a local run against the shared database). Empty = all
    /// active tenants. With a list and no SMS configured, queued SMS are left for the server to send.
    /// </summary>
    public List<Guid> TenantIds { get; set; } = new();
}

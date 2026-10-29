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
}

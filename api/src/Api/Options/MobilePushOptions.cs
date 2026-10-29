namespace SaaSApp.Api.Options;

/// <summary>
/// Phone push notifications for new inbox requests (EZOFIS mobile app, Firebase Cloud Messaging HTTP v1).
/// Off until <see cref="Enabled"/> is true and a Firebase service account is configured.
/// </summary>
public sealed class MobilePushOptions
{
    public const string SectionName = "MobilePush";

    /// <summary>Runs the recurring inbox check that sends the pushes.</summary>
    public bool Enabled { get; set; }

    /// <summary>Hangfire cron for the check. Default: every minute.</summary>
    public string Cron { get; set; } = "* * * * *";

    /// <summary>
    /// Firebase service account key (the JSON downloaded from Firebase → Project settings → Service accounts),
    /// either inline or as a file path. Keep it in server secrets, never in source control.
    /// </summary>
    public string? ServiceAccountJson { get; set; }

    public string? ServiceAccountPath { get; set; }

    /// <summary>Inbox rows read per workflow when looking for new requests (same as the app's check).</summary>
    public int ItemsPerWorkflow { get; set; } = 10;
}

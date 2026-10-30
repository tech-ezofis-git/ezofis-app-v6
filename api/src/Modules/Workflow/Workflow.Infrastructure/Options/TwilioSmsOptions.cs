namespace SaaSApp.Workflow.Infrastructure.Options;

public sealed class TwilioSmsOptions
{
    public const string SectionName = "Sms:Twilio";

    public bool Enabled { get; set; }

    public string? AccountSid { get; set; }

    public string? AuthToken { get; set; }

    /// <summary>Sender number in E.164 (e.g. +15005550006). Ignored when <see cref="MessagingServiceSid"/> is set.</summary>
    public string? FromNumber { get; set; }

    /// <summary>Optional Twilio Messaging Service SID (MG...) used instead of <see cref="FromNumber"/>.</summary>
    public string? MessagingServiceSid { get; set; }

    /// <summary>Prefix for stored numbers without a leading '+', e.g. "+91".</summary>
    public string? DefaultCountryCode { get; set; }
}

namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>Sends plain-text SMS (Twilio by default, see <c>Sms:Twilio</c> configuration).</summary>
public interface ISmsSender
{
    /// <summary>False when no provider credentials are configured; callers skip SMS and log.</summary>
    bool IsConfigured { get; }

    /// <summary>Returns true when the provider accepted the message. Never throws for provider errors.</summary>
    Task<bool> SendAsync(string toPhoneNumber, string message, CancellationToken cancellationToken = default);
}

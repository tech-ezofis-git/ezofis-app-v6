using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Infrastructure.Options;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>Twilio Programmable Messaging over REST (no SDK dependency).</summary>
public sealed class TwilioSmsSender : ISmsSender
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly TwilioSmsOptions _options;
    private readonly ILogger<TwilioSmsSender> _logger;

    public TwilioSmsSender(
        IHttpClientFactory httpClientFactory,
        IOptions<TwilioSmsOptions> options,
        ILogger<TwilioSmsSender> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured =>
        _options.Enabled
        && !string.IsNullOrWhiteSpace(_options.AccountSid)
        && !string.IsNullOrWhiteSpace(_options.AuthToken)
        && (!string.IsNullOrWhiteSpace(_options.FromNumber) || !string.IsNullOrWhiteSpace(_options.MessagingServiceSid));

    public async Task<bool> SendAsync(string toPhoneNumber, string message, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("SMS not sent: Sms:Twilio is not configured or disabled.");
            return false;
        }

        var to = NormalizeNumber(toPhoneNumber, _options.DefaultCountryCode);
        if (to == null)
        {
            _logger.LogWarning("SMS not sent: phone number '{Phone}' is not usable.", toPhoneNumber);
            return false;
        }

        var form = new List<KeyValuePair<string, string>>
        {
            new("To", to),
            new("Body", message.Length > 1500 ? message[..1500] : message)
        };
        if (!string.IsNullOrWhiteSpace(_options.MessagingServiceSid))
            form.Add(new("MessagingServiceSid", _options.MessagingServiceSid.Trim()));
        else
            form.Add(new("From", _options.FromNumber!.Trim()));

        var sid = _options.AccountSid!.Trim();
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"https://api.twilio.com/2010-04-01/Accounts/{Uri.EscapeDataString(sid)}/Messages.json")
        {
            Content = new FormUrlEncodedContent(form)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.ASCII.GetBytes($"{sid}:{_options.AuthToken!.Trim()}")));

        try
        {
            var client = _httpClientFactory.CreateClient(nameof(TwilioSmsSender));
            using var response = await client.SendAsync(request, cancellationToken);
            if (response.IsSuccessStatusCode)
                return true;

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning(
                "Twilio rejected SMS to {To}: {Status} {Body}",
                to, (int)response.StatusCode, body.Length > 500 ? body[..500] : body);
            return false;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "Twilio SMS to {To} failed.", to);
            return false;
        }
    }

    /// <summary>E.164-ish: keeps digits and a leading '+'; prefixes <paramref name="defaultCountryCode"/> when missing.</summary>
    internal static string? NormalizeNumber(string? raw, string? defaultCountryCode)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        var trimmed = raw.Trim();
        var digits = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digits.Length < 6)
            return null;

        if (trimmed.StartsWith('+'))
            return "+" + digits;
        if (trimmed.StartsWith("00", StringComparison.Ordinal))
            return "+" + digits[2..];

        var code = new string((defaultCountryCode ?? string.Empty).Where(char.IsDigit).ToArray());
        return string.IsNullOrEmpty(code) ? "+" + digits : $"+{code}{digits.TrimStart('0')}";
    }
}

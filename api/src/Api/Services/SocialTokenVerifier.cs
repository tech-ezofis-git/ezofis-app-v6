using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

namespace SaaSApp.Api.Services;

/// <summary>What the browser or app received from Google / Microsoft when the person signed in there.</summary>
public sealed record SocialProof(string? IdToken, string? AccessToken);

/// <summary>
/// Social sign-in must prove the email really belongs to the person: the server checks the Google or Microsoft
/// token itself, never just an email sent by the caller. Optional config
/// <c>SocialLogin:GoogleClientIds</c> / <c>SocialLogin:MicrosoftClientIds</c> (arrays) restrict tokens to this
/// app's own client ids; when empty, only the token's validity and email are checked.
/// </summary>
public interface ISocialTokenVerifier
{
    /// <summary>Throws <see cref="UnauthorizedAccessException"/> unless the token proves <paramref name="email"/>.</summary>
    Task VerifyAsync(string provider, string email, SocialProof? proof, CancellationToken cancellationToken = default);
}

public sealed class SocialTokenVerifier : ISocialTokenVerifier
{
    private const string Failed = "We couldn't verify your sign-in with the provider. Please try again.";
    private static readonly TimeSpan KeyCacheTime = TimeSpan.FromHours(6);

    private readonly HttpClient _http;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SocialTokenVerifier> _logger;
    private static JsonWebKeySet? _msKeys;
    private static DateTime _msKeysLoadedUtc;

    public SocialTokenVerifier(HttpClient http, IConfiguration configuration, ILogger<SocialTokenVerifier> logger)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(10);
        _configuration = configuration;
        _logger = logger;
    }

    public async Task VerifyAsync(string provider, string email, SocialProof? proof, CancellationToken cancellationToken = default)
    {
        var idToken = proof?.IdToken?.Trim();
        var accessToken = proof?.AccessToken?.Trim();
        if (string.IsNullOrEmpty(idToken) && string.IsNullOrEmpty(accessToken))
            throw new UnauthorizedAccessException(Failed);

        var google = provider.Trim().Equals("google", StringComparison.OrdinalIgnoreCase);
        var verified = new List<string>();
        try
        {
            if (google)
                verified = await GoogleEmailsAsync(idToken, accessToken, cancellationToken);
            else
                verified = await MicrosoftEmailsAsync(idToken, accessToken, cancellationToken);
        }
        catch (UnauthorizedAccessException)
        {
            throw;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException
                                       or SecurityTokenException or ArgumentException)
        {
            _logger.LogWarning(ex, "Social token verification failed for provider {Provider}.", provider);
            throw new UnauthorizedAccessException(Failed);
        }

        if (!verified.Any(v => string.Equals(v, email.Trim(), StringComparison.OrdinalIgnoreCase)))
            throw new UnauthorizedAccessException(Failed);
    }

    // ---------------------------------------------------------------- Google

    private async Task<List<string>> GoogleEmailsAsync(string? idToken, string? accessToken, CancellationToken ct)
    {
        // Google's own endpoint checks the signature, expiry and audience of either kind of token.
        var url = !string.IsNullOrEmpty(idToken)
            ? "https://oauth2.googleapis.com/tokeninfo?id_token=" + Uri.EscapeDataString(idToken)
            : "https://oauth2.googleapis.com/tokeninfo?access_token=" + Uri.EscapeDataString(accessToken!);

        using var response = await _http.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
            throw new UnauthorizedAccessException(Failed);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var root = doc.RootElement;

        var emailVerified = Read(root, "email_verified");
        if (!emailVerified.Equals("true", StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException(Failed);

        var allowed = ClientIds("SocialLogin:GoogleClientIds");
        if (allowed.Count > 0)
        {
            var audience = Read(root, "aud");
            var authorizedParty = Read(root, "azp");
            if (!allowed.Contains(audience) && !allowed.Contains(authorizedParty))
                throw new UnauthorizedAccessException(Failed);
        }

        var email = Read(root, "email");
        return email.Length == 0 ? new List<string>() : new List<string> { email };
    }

    // ---------------------------------------------------------------- Microsoft

    private async Task<List<string>> MicrosoftEmailsAsync(string? idToken, string? accessToken, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(idToken))
            return await MicrosoftIdTokenEmailsAsync(idToken, ct);

        // Access token for Microsoft Graph: Microsoft itself answers who it belongs to.
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,otherMails");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            throw new UnauthorizedAccessException(Failed);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var root = doc.RootElement;
        var emails = new List<string> { Read(root, "mail"), Read(root, "userPrincipalName") };
        if (root.TryGetProperty("otherMails", out var other) && other.ValueKind == JsonValueKind.Array)
            emails.AddRange(other.EnumerateArray().Select(x => x.GetString() ?? string.Empty));
        return emails.Where(x => x.Length > 0).ToList();
    }

    private async Task<List<string>> MicrosoftIdTokenEmailsAsync(string idToken, CancellationToken ct)
    {
        var keys = await GetMicrosoftKeysAsync(ct);
        var allowed = ClientIds("SocialLogin:MicrosoftClientIds");
        var parameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = keys.GetSigningKeys(),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
            ValidateAudience = allowed.Count > 0,
            ValidAudiences = allowed,
            // Work, school and personal accounts sign in from different tenants, so the issuer is checked by shape.
            ValidateIssuer = true,
            IssuerValidator = (issuer, _, _) =>
                issuer.StartsWith("https://login.microsoftonline.com/", StringComparison.OrdinalIgnoreCase)
                && issuer.EndsWith("/v2.0", StringComparison.OrdinalIgnoreCase)
                    ? issuer
                    : throw new SecurityTokenInvalidIssuerException("Unexpected issuer.")
        };

        new JwtSecurityTokenHandler().ValidateToken(idToken, parameters, out var validated);
        var jwt = (JwtSecurityToken)validated;
        return new[] { "preferred_username", "email", "upn" }
            .Select(name => jwt.Claims.FirstOrDefault(c => c.Type == name)?.Value ?? string.Empty)
            .Where(x => x.Length > 0)
            .ToList();
    }

    private async Task<JsonWebKeySet> GetMicrosoftKeysAsync(CancellationToken ct)
    {
        if (_msKeys != null && DateTime.UtcNow - _msKeysLoadedUtc < KeyCacheTime)
            return _msKeys;

        var json = await _http.GetStringAsync("https://login.microsoftonline.com/common/discovery/v2.0/keys", ct);
        _msKeys = new JsonWebKeySet(json);
        _msKeysLoadedUtc = DateTime.UtcNow;
        return _msKeys;
    }

    // ---------------------------------------------------------------- helpers

    private HashSet<string> ClientIds(string key) =>
        (_configuration.GetSection(key).Get<string[]>() ?? Array.Empty<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    private static string Read(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value)
            ? value.ValueKind switch
            {
                JsonValueKind.String => value.GetString() ?? string.Empty,
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => value.ToString()
            }
            : string.Empty;
}

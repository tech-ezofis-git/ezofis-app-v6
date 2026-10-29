using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SaaSApp.Api.Options;

namespace SaaSApp.Api.Services.MobilePush;

public enum FcmSendResult { Sent, TokenGone, Failed }

/// <summary>
/// Sends phone notifications through Firebase Cloud Messaging HTTP v1. Signs the Google OAuth assertion with the
/// service account's RSA key (no Google SDK needed) and caches the access token until shortly before it expires.
/// Messages are high priority so Android delivers them while the phone is locked (Doze).
/// </summary>
public sealed class FcmSender
{
    private const string Scope = "https://www.googleapis.com/auth/firebase.messaging";
    private const string TokenUrl = "https://oauth2.googleapis.com/token";

    private readonly HttpClient _http;
    private readonly MobilePushOptions _options;
    private readonly ILogger<FcmSender> _logger;
    private static readonly SemaphoreSlim TokenLock = new(1, 1);
    private static string? _accessToken;
    private static DateTimeOffset _accessTokenExpires;

    public FcmSender(HttpClient http, IOptions<MobilePushOptions> options, ILogger<FcmSender> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    private sealed record ServiceAccount(string ProjectId, string ClientEmail, string PrivateKey);

    public bool IsConfigured => LoadServiceAccount() is not null;

    public async Task<FcmSendResult> SendAsync(
        string deviceToken, string title, string body, IReadOnlyDictionary<string, string> data, CancellationToken cancellationToken)
    {
        var account = LoadServiceAccount();
        if (account is null)
            return FcmSendResult.Failed;

        var accessToken = await GetAccessTokenAsync(account, cancellationToken);
        var payload = new
        {
            message = new
            {
                token = deviceToken,
                notification = new { title, body },
                data,
                android = new
                {
                    priority = "high",
                    notification = new { channel_id = "ezofis-requests", tag = "ezofis-inbox" }
                }
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"https://fcm.googleapis.com/v1/projects/{account.ProjectId}/messages:send")
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await _http.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
            return FcmSendResult.Sent;

        var text = await response.Content.ReadAsStringAsync(cancellationToken);
        // UNREGISTERED / NOT_FOUND: the app was removed or the token rotated, so the token can be dropped.
        if (response.StatusCode == HttpStatusCode.NotFound || text.Contains("UNREGISTERED", StringComparison.Ordinal))
            return FcmSendResult.TokenGone;

        _logger.LogWarning("FCM send failed with {Status}: {Body}", (int)response.StatusCode, text.Length > 300 ? text[..300] : text);
        return FcmSendResult.Failed;
    }

    private ServiceAccount? LoadServiceAccount()
    {
        var json = _options.ServiceAccountJson;
        if (string.IsNullOrWhiteSpace(json) && !string.IsNullOrWhiteSpace(_options.ServiceAccountPath) && File.Exists(_options.ServiceAccountPath))
            json = File.ReadAllText(_options.ServiceAccountPath);
        if (string.IsNullOrWhiteSpace(json))
            return null;

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        string Read(string name) => root.TryGetProperty(name, out var v) ? v.GetString() ?? string.Empty : string.Empty;
        var account = new ServiceAccount(Read("project_id"), Read("client_email"), Read("private_key"));
        return string.IsNullOrEmpty(account.ProjectId) || string.IsNullOrEmpty(account.ClientEmail) || string.IsNullOrEmpty(account.PrivateKey)
            ? null
            : account;
    }

    private async Task<string> GetAccessTokenAsync(ServiceAccount account, CancellationToken cancellationToken)
    {
        if (_accessToken is not null && DateTimeOffset.UtcNow < _accessTokenExpires)
            return _accessToken;

        await TokenLock.WaitAsync(cancellationToken);
        try
        {
            if (_accessToken is not null && DateTimeOffset.UtcNow < _accessTokenExpires)
                return _accessToken;

            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var header = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new { alg = "RS256", typ = "JWT" }));
            var claims = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new
            {
                iss = account.ClientEmail,
                scope = Scope,
                aud = TokenUrl,
                iat = now,
                exp = now + 3600
            }));
            using var rsa = RSA.Create();
            rsa.ImportFromPem(account.PrivateKey);
            var signature = rsa.SignData(Encoding.ASCII.GetBytes($"{header}.{claims}"), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            var assertion = $"{header}.{claims}.{Base64Url(signature)}";

            using var response = await _http.PostAsync(TokenUrl, new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                ["assertion"] = assertion
            }), cancellationToken);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            _accessToken = doc.RootElement.GetProperty("access_token").GetString();
            var lifetime = doc.RootElement.TryGetProperty("expires_in", out var e) ? e.GetInt32() : 3600;
            _accessTokenExpires = DateTimeOffset.UtcNow.AddSeconds(Math.Max(60, lifetime - 300));
            return _accessToken ?? throw new InvalidOperationException("Google OAuth returned no access token.");
        }
        finally
        {
            TokenLock.Release();
        }
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

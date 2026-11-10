using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SaaSApp.Catalog.Persistence;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Forms;

namespace SaaSApp.Api.Services;

/// <summary>
/// Portal "Master Login": the visitor is checked on the server against the master form the portal is
/// configured with (username + password, or username + emailed one-time code), then receives an API token
/// as an ExternalUser. The master form, username field and password field come from the saved portal
/// configuration, never from the request, so a caller cannot point the login at another form.
/// </summary>
public interface IPortalMasterLoginService
{
    Task<PortalMasterLoginResult> LoginWithPasswordAsync(
        Guid tenantId, Guid portalOwnerId, int portalId, string username, string password,
        CancellationToken cancellationToken = default);

    Task SendOtpAsync(
        Guid tenantId, Guid portalOwnerId, int portalId, string username,
        CancellationToken cancellationToken = default);

    Task<PortalMasterLoginResult> VerifyOtpAsync(
        Guid tenantId, Guid portalOwnerId, int portalId, string username, string otp,
        CancellationToken cancellationToken = default);
}

public sealed record PortalMasterLoginResult(
    Guid UserId,
    string AccessToken,
    string TokenType,
    int ExpiresIn,
    string DisplayName,
    string Username,
    string? Email,
    long? ItemId,
    IReadOnlyDictionary<string, object?> Entry);

/// <summary>Too many wrong attempts for one username on one portal; try again later.</summary>
public sealed class PortalLoginLockedException : Exception
{
    public PortalLoginLockedException() : base("Too many attempts. Try again in a few minutes.") { }
}

public sealed class PortalMasterLoginService : IPortalMasterLoginService
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockWindow = TimeSpan.FromMinutes(10);
    private const string InvalidCredentials = "Invalid username or password.";
    private const string LoginOtpStatus = "login_shared";

    private static readonly HashSet<string> InactiveStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "inactive", "disabled", "blocked", "suspended", "deleted", "terminated", "locked", "expired"
    };

    private static readonly HashSet<string> EmailKeyNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "email", "emailaddress", "email_address", "email address", "e-mail", "e_mail", "mail", "emailid", "email_id"
    };

    private readonly IPortalJsonService _portalJson;
    private readonly IFormEntryService _formEntries;
    private readonly IEzofisAuthService _authService;
    private readonly ILoginEmailOtpService _loginEmailOtp;
    private readonly IDbContextFactory<CatalogDbContext> _catalogFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PortalMasterLoginService> _logger;

    public PortalMasterLoginService(
        IPortalJsonService portalJson,
        IFormEntryService formEntries,
        IEzofisAuthService authService,
        ILoginEmailOtpService loginEmailOtp,
        IDbContextFactory<CatalogDbContext> catalogFactory,
        IMemoryCache cache,
        ILogger<PortalMasterLoginService> logger)
    {
        _portalJson = portalJson;
        _formEntries = formEntries;
        _authService = authService;
        _loginEmailOtp = loginEmailOtp;
        _catalogFactory = catalogFactory;
        _cache = cache;
        _logger = logger;
    }

    public async Task<PortalMasterLoginResult> LoginWithPasswordAsync(
        Guid tenantId, Guid portalOwnerId, int portalId, string username, string password,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Username is required.");
        if (string.IsNullOrEmpty(password))
            throw new ArgumentException("Password is required.");

        var config = await LoadConfigAsync(tenantId, portalOwnerId, portalId, usesPassword: true, cancellationToken);
        var throttleKey = ThrottleKey(tenantId, portalId, username);
        EnsureNotLocked(throttleKey);

        var entry = await FindEntryAsync(config, username, cancellationToken);
        if (entry == null || !IsActive(entry) || !PasswordMatches(entry, config, password))
        {
            RegisterFailure(throttleKey);
            throw new UnauthorizedAccessException(InvalidCredentials);
        }

        _cache.Remove(throttleKey);
        return await IssueAsync(tenantId, config, username, entry, cancellationToken);
    }

    public async Task SendOtpAsync(
        Guid tenantId, Guid portalOwnerId, int portalId, string username,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Username is required.");

        var config = await LoadConfigAsync(tenantId, portalOwnerId, portalId, usesPassword: false, cancellationToken);
        var throttleKey = ThrottleKey(tenantId, portalId, username) + ":send";
        // Sending is limited too, so the endpoint cannot be used to flood a mailbox.
        EnsureNotLocked(throttleKey);
        RegisterFailure(throttleKey);

        var entry = await FindEntryAsync(config, username, cancellationToken);
        if (entry == null || !IsActive(entry))
            return; // same answer as for a known user, so usernames cannot be probed

        var email = ResolveEmail(username, entry);
        if (email == null)
        {
            _logger.LogWarning("Portal master login OTP: the master record has no email address.");
            return;
        }

        await _loginEmailOtp.SendLoginOtpAsync(email, ResolveDisplayName(entry, config, username), cancellationToken);
    }

    public async Task<PortalMasterLoginResult> VerifyOtpAsync(
        Guid tenantId, Guid portalOwnerId, int portalId, string username, string otp,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Username is required.");
        if (string.IsNullOrWhiteSpace(otp))
            throw new ArgumentException("OTP is required.");

        var config = await LoadConfigAsync(tenantId, portalOwnerId, portalId, usesPassword: false, cancellationToken);
        var throttleKey = ThrottleKey(tenantId, portalId, username);
        EnsureNotLocked(throttleKey);

        var entry = await FindEntryAsync(config, username, cancellationToken);
        var email = entry != null && IsActive(entry) ? ResolveEmail(username, entry) : null;
        if (entry == null || email == null || !await ConsumeOtpAsync(email, otp.Trim(), cancellationToken))
        {
            RegisterFailure(throttleKey);
            throw new UnauthorizedAccessException("Invalid or expired code.");
        }

        _cache.Remove(throttleKey);
        return await IssueAsync(tenantId, config, username, entry, cancellationToken);
    }

    // ---------------------------------------------------------------- portal configuration

    private sealed record MasterConfig(
        string FormId,
        string UsernameField,
        string PasswordField,
        string FirstnameField);

    private async Task<MasterConfig> LoadConfigAsync(
        Guid tenantId, Guid portalOwnerId, int portalId, bool usesPassword, CancellationToken cancellationToken)
    {
        if (tenantId == Guid.Empty || portalOwnerId == Guid.Empty)
            throw new ArgumentException("Tenant and portal owner are required.");

        var snapshot = await _portalJson.GetForUserAsync(tenantId, portalOwnerId, cancellationToken)
            ?? throw new ArgumentException("Portal not found.");

        try
        {
            using var doc = JsonDocument.Parse(snapshot.PortalJson);
            foreach (var record in EnumerateRecords(doc.RootElement))
            {
                if (!TryGetInt(record, "id", out var id) || id != portalId)
                    continue;
                if (record.TryGetProperty("isDeleted", out var deleted) && deleted.ValueKind == JsonValueKind.True)
                    break;

                var settings = ParseEmbeddedJson(record, "settingsJson");
                if (settings.ValueKind != JsonValueKind.Object
                    || !settings.TryGetProperty("authentication", out var auth)
                    || auth.ValueKind != JsonValueKind.Object)
                    break;

                var loginType = ReadString(auth, "loginType");
                var settingsLoginType = ReadString(settings, "loginType");
                var isMaster = loginType.Equals("MASTER_LOGIN", StringComparison.OrdinalIgnoreCase)
                               || settingsLoginType.Equals("masterLogin", StringComparison.OrdinalIgnoreCase);
                if (!isMaster)
                    throw new ArgumentException("This portal does not use Master Login.");

                var passwordType = ReadString(auth, "passwordTypes");
                if (usesPassword != passwordType.Equals("PASSWORD", StringComparison.OrdinalIgnoreCase))
                    throw new ArgumentException("This portal uses a different Master Login method.");

                var formId = ReadString(auth, "formId");
                var usernameField = auth.TryGetProperty("usernameField", out var uf) && uf.ValueKind == JsonValueKind.Array
                    ? uf.EnumerateArray().Select(x => x.GetString() ?? string.Empty).FirstOrDefault(x => x.Length > 0) ?? string.Empty
                    : ReadString(auth, "usernameField");
                var passwordField = ReadString(auth, "passwordField");

                if (string.IsNullOrWhiteSpace(formId) || formId == "0" || string.IsNullOrWhiteSpace(usernameField))
                    throw new ArgumentException("This portal is missing a master form or username field.");
                if (usesPassword && string.IsNullOrWhiteSpace(passwordField))
                    throw new ArgumentException("This portal is missing a password field.");

                return new MasterConfig(formId, usernameField, passwordField, ReadString(auth, "firstnameField"));
            }
        }
        catch (JsonException)
        {
            // fall through to "not found"
        }

        throw new ArgumentException("Portal not found.");
    }

    private static IEnumerable<JsonElement> EnumerateRecords(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in root.EnumerateArray())
                if (item.ValueKind == JsonValueKind.Object)
                    yield return item;
            yield break;
        }

        if (root.ValueKind == JsonValueKind.Object)
        {
            foreach (var name in new[] { "portals", "records", "items", "data" })
            {
                if (root.TryGetProperty(name, out var list) && list.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in list.EnumerateArray())
                        if (item.ValueKind == JsonValueKind.Object)
                            yield return item;
                    yield break;
                }
            }
        }
    }

    private static JsonElement ParseEmbeddedJson(JsonElement record, string name)
    {
        if (!record.TryGetProperty(name, out var value))
            return default;
        if (value.ValueKind == JsonValueKind.Object)
            return value.Clone();
        if (value.ValueKind != JsonValueKind.String)
            return default;
        try
        {
            using var inner = JsonDocument.Parse(value.GetString() ?? "{}");
            return inner.RootElement.Clone();
        }
        catch (JsonException)
        {
            return default;
        }
    }

    private static bool TryGetInt(JsonElement element, string name, out int value)
    {
        value = 0;
        if (!element.TryGetProperty(name, out var raw))
            return false;
        if (raw.ValueKind == JsonValueKind.Number)
            return raw.TryGetInt32(out value);
        return raw.ValueKind == JsonValueKind.String && int.TryParse(raw.GetString(), out value);
    }

    private static string ReadString(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var raw)
            ? raw.ValueKind switch
            {
                JsonValueKind.String => raw.GetString() ?? string.Empty,
                JsonValueKind.Number => raw.GetRawText(),
                _ => string.Empty
            }
            : string.Empty;

    // ---------------------------------------------------------------- master form lookup

    private async Task<Dictionary<string, object?>?> FindEntryAsync(
        MasterConfig config, string username, CancellationToken cancellationToken)
    {
        var result = await _formEntries.GetEntriesByColumnAsync(
            config.FormId,
            columnName: null,
            columnValue: username.Trim(),
            filters: null,
            columnId: config.UsernameField,
            cancellationToken: cancellationToken);

        if (result.Status != FormEntryByColumnStatus.Found || result.Entries == null)
            return null;

        // The value must match exactly one record; an ambiguous username never signs anyone in.
        var matches = result.Entries
            .Where(e => ReadEntryValue(e, config.UsernameField)
                .Equals(username.Trim(), StringComparison.OrdinalIgnoreCase))
            .Take(2)
            .ToList();
        return matches.Count == 1 ? matches[0] : null;
    }

    private static string ReadEntryValue(IReadOnlyDictionary<string, object?> entry, string key)
    {
        if (string.IsNullOrEmpty(key))
            return string.Empty;
        foreach (var pair in entry)
        {
            if (pair.Key.Equals(key, StringComparison.OrdinalIgnoreCase))
                return pair.Value?.ToString()?.Trim() ?? string.Empty;
        }
        return string.Empty;
    }

    private static bool IsActive(IReadOnlyDictionary<string, object?> entry)
    {
        foreach (var pair in entry)
        {
            if (pair.Key.Trim().Equals("status", StringComparison.OrdinalIgnoreCase)
                && InactiveStatuses.Contains(pair.Value?.ToString()?.Trim() ?? string.Empty))
                return false;
        }
        return true;
    }

    private static bool PasswordMatches(
        IReadOnlyDictionary<string, object?> entry, MasterConfig config, string password)
    {
        var stored = ReadEntryValue(entry, config.PasswordField);
        if (stored.Length == 0 || password.Length == 0)
            return false;

        if (stored.StartsWith("$2", StringComparison.Ordinal))
        {
            try { return BCrypt.Net.BCrypt.Verify(password, stored); }
            catch (BCrypt.Net.SaltParseException) { return false; }
        }

        // Master forms keep this value as typed; compare hashes in constant time.
        var a = SHA256.HashData(Encoding.UTF8.GetBytes(stored));
        var b = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return CryptographicOperations.FixedTimeEquals(a, b);
    }

    private static string? ResolveEmail(string username, IReadOnlyDictionary<string, object?> entry)
    {
        if (LooksLikeEmail(username))
            return username.Trim();
        foreach (var pair in entry)
        {
            if (EmailKeyNames.Contains(pair.Key.Trim()) && LooksLikeEmail(pair.Value?.ToString() ?? string.Empty))
                return pair.Value!.ToString()!.Trim();
        }
        return null;
    }

    private static bool LooksLikeEmail(string value)
    {
        value = value.Trim();
        var at = value.IndexOf('@');
        return at > 0 && at < value.Length - 3 && value.IndexOf('.', at) > at && !value.Contains(' ');
    }

    private static string ResolveDisplayName(
        IReadOnlyDictionary<string, object?> entry, MasterConfig config, string username)
    {
        var name = ReadEntryValue(entry, config.FirstnameField);
        return name.Length > 0 ? name : username.Trim();
    }

    // ---------------------------------------------------------------- one-time codes

    private async Task<bool> ConsumeOtpAsync(string email, string otp, CancellationToken cancellationToken)
    {
        var normalized = email.Trim().ToLowerInvariant();
        await using var catalog = await _catalogFactory.CreateDbContextAsync(cancellationToken);
        var row = await catalog.OtpVerifications
            .Where(x => x.Email == normalized && x.OTP == otp && x.Status == LoginOtpStatus && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (row == null || DateTime.UtcNow > row.ValidateAt)
            return false;

        // One use only.
        row.Status = "verified";
        row.ModifiedAt = DateTime.UtcNow;
        await catalog.SaveChangesAsync(cancellationToken);
        return true;
    }

    // ---------------------------------------------------------------- token + throttling

    private async Task<PortalMasterLoginResult> IssueAsync(
        Guid tenantId,
        MasterConfig config,
        string username,
        Dictionary<string, object?> entry,
        CancellationToken cancellationToken)
    {
        var email = ResolveEmail(username, entry)
                    ?? throw new UnauthorizedAccessException(
                        "This account has no email address on its master record, so it cannot sign in to the portal.");

        var issued = await _authService.IssuePortalAccessTokenAsync(tenantId, email, cancellationToken);
        if (issued is not LoginSuccess success)
            throw new UnauthorizedAccessException(InvalidCredentials);

        return new PortalMasterLoginResult(
            success.UserId,
            success.AccessToken,
            success.TokenType,
            success.ExpiresIn,
            ResolveDisplayName(entry, config, username),
            username.Trim(),
            email,
            ReadItemId(entry),
            SanitizeEntry(entry, config));
    }

    private static long? ReadItemId(IReadOnlyDictionary<string, object?> entry)
    {
        foreach (var key in new[] { "item_id", "itemId" })
        {
            foreach (var pair in entry)
            {
                if (pair.Key.Equals(key, StringComparison.OrdinalIgnoreCase)
                    && long.TryParse(pair.Value?.ToString(), out var id))
                    return id;
            }
        }
        return null;
    }

    /// <summary>The master record as the portal needs it, without any password value.</summary>
    private static Dictionary<string, object?> SanitizeEntry(
        IReadOnlyDictionary<string, object?> entry, MasterConfig config)
    {
        var clean = new Dictionary<string, object?>(StringComparer.Ordinal);
        foreach (var pair in entry)
        {
            var key = pair.Key;
            if (key.Equals(config.PasswordField, StringComparison.OrdinalIgnoreCase)
                || key.Contains("password", StringComparison.OrdinalIgnoreCase)
                || key.Contains("pwd", StringComparison.OrdinalIgnoreCase))
                continue;
            clean[key] = pair.Value;
        }
        return clean;
    }

    private static string ThrottleKey(Guid tenantId, int portalId, string username) =>
        $"portal-master-login:{tenantId:N}:{portalId}:{username.Trim().ToLowerInvariant()}";

    private void EnsureNotLocked(string key)
    {
        if (_cache.TryGetValue(key, out int failures) && failures >= MaxFailedAttempts)
            throw new PortalLoginLockedException();
    }

    private void RegisterFailure(string key)
    {
        var failures = _cache.TryGetValue(key, out int current) ? current + 1 : 1;
        _cache.Set(key, failures, LockWindow);
    }
}

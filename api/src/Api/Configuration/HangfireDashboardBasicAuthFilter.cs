using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using Hangfire.Dashboard;

namespace SaaSApp.Api.Configuration;

/// <summary>
/// Protects the Hangfire dashboard with HTTP Basic auth. The browser shows a login prompt;
/// credentials come from configuration (Hangfire:DashboardUser / Hangfire:DashboardPassword),
/// never from source control.
/// </summary>
public sealed class HangfireDashboardBasicAuthFilter : IDashboardAuthorizationFilter
{
    public const int MinimumPasswordLength = 12;

    private readonly byte[] _userHash;
    private readonly byte[] _passwordHash;

    public HangfireDashboardBasicAuthFilter(string user, string password)
    {
        if (string.IsNullOrWhiteSpace(user))
            throw new ArgumentException("Dashboard user is required.", nameof(user));
        if (string.IsNullOrEmpty(password) || password.Length < MinimumPasswordLength)
            throw new ArgumentException(
                $"Dashboard password must be at least {MinimumPasswordLength} characters.", nameof(password));

        _userHash = Hash(user);
        _passwordHash = Hash(password);
    }

    /// <summary>
    /// Returns a filter when both settings are present and the password is long enough;
    /// otherwise null, which means the dashboard must not be mapped.
    /// </summary>
    public static HangfireDashboardBasicAuthFilter? TryCreate(string? user, string? password)
    {
        if (string.IsNullOrWhiteSpace(user) || string.IsNullOrEmpty(password) || password.Length < MinimumPasswordLength)
            return null;
        return new HangfireDashboardBasicAuthFilter(user, password);
    }

    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        if (IsAuthorized(httpContext.Request.Headers.Authorization.ToString()))
            return true;

        // Hangfire sets 401; this header makes the browser show its login prompt.
        httpContext.Response.Headers.WWWAuthenticate = "Basic realm=\"Hangfire\", charset=\"UTF-8\"";
        return false;
    }

    /// <summary>Checks an Authorization header value ("Basic base64(user:password)").</summary>
    public bool IsAuthorized(string? authorizationHeader)
    {
        if (!AuthenticationHeaderValue.TryParse(authorizationHeader, out var header)
            || !string.Equals(header.Scheme, "Basic", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrEmpty(header.Parameter))
            return false;

        string decoded;
        try
        {
            decoded = Encoding.UTF8.GetString(Convert.FromBase64String(header.Parameter));
        }
        catch (FormatException)
        {
            // Not valid base64: treat as a failed login, not a server error.
            return false;
        }

        var separator = decoded.IndexOf(':');
        if (separator <= 0)
            return false;

        // Compare both parts in constant time so timing does not reveal which part was wrong.
        var userOk = CryptographicOperations.FixedTimeEquals(Hash(decoded[..separator]), _userHash);
        var passwordOk = CryptographicOperations.FixedTimeEquals(Hash(decoded[(separator + 1)..]), _passwordHash);
        return userOk & passwordOk;
    }

    private static byte[] Hash(string value) => SHA256.HashData(Encoding.UTF8.GetBytes(value));
}

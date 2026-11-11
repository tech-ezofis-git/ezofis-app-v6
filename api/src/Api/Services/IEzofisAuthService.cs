namespace SaaSApp.Api.Services;

/// <summary>Ezofis email/password authentication with optional 2FA.</summary>
public interface IEzofisAuthService
{
    /// <summary>Login with email and password. Returns JWT or LoginRequiresTwoFactor if 2FA enabled.</summary>
    /// <param name="loggedFrom">Client-supplied login channel, e.g. WEB or MOBILE. Recorded against the login history row.</param>
    Task<LoginResult> LoginAsync(
        string email,
        string password,
        Guid tenantId,
        string? loggedFrom = null,
        string? ipAddress = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default);

    /// <summary>Complete login after 2FA. Verifies authenticator TOTP or email OTP and returns JWT.</summary>
    Task<LoginResult> CompleteTwoFactorAsync(string tempToken, string code, CancellationToken cancellationToken = default);

    /// <summary>Social login (Google / Microsoft). The email must be proven by the provider's token in <paramref name="proof"/>.</summary>
    Task<LoginResult> SocialLoginAsync(string email, string provider, Guid tenantId, SocialProof? proof, CancellationToken cancellationToken = default);

    /// <summary>
    /// First-time password for a workflow/repository guest share invite (EZOFIS users only).
    /// Validates shareToken + email, sets password, returns JWT.
    /// </summary>
    Task<LoginResult> SetShareInvitePasswordAsync(
        string shareToken,
        string email,
        string password,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Social login for a share invite (Google / Microsoft). Validates shareToken + email + provider.
    /// No X-Tenant-Id required — tenant is resolved from the share token.
    /// </summary>
    Task<LoginResult> SetShareInviteSocialLoginAsync(
        string shareToken,
        string email,
        string provider,
        SocialProof? proof,
        CancellationToken cancellationToken = default);

    /// <summary>First-time password for a repository sign-request invite. Tenant resolved from invite token.</summary>
    Task<LoginResult> SetSignInvitePasswordAsync(
        string inviteToken,
        string email,
        string password,
        CancellationToken cancellationToken = default);

    /// <summary>Social login for a repository sign-request invite. Tenant resolved from invite token.</summary>
    Task<LoginResult> SetSignInviteSocialLoginAsync(
        string inviteToken,
        string email,
        string provider,
        SocialProof? proof,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Issues an API access token for a portal visitor who was already verified against the portal's master form.
    /// The visitor becomes (or stays) an ExternalUser of the tenant. An email that belongs to a real tenant user
    /// (any role other than ExternalUser) is refused, so a master record can never sign in as staff or an admin.
    /// </summary>
    Task<LoginResult> IssuePortalAccessTokenAsync(
        Guid tenantId,
        string email,
        CancellationToken cancellationToken = default);

    /// <summary>After a correct sign-invite OTP, issue the same API access token as share login.</summary>
    Task<LoginResult> CompleteSignInviteOtpAsync(
        string inviteToken,
        string email,
        string otp,
        CancellationToken cancellationToken = default);

    /// <summary>After a correct document-share OTP, issue the same API access token as share login.</summary>
    Task<LoginResult> CompleteShareInviteOtpAsync(
        string shareToken,
        string email,
        string otp,
        CancellationToken cancellationToken = default);
}

/// <summary>Result of Ezofis login: success, 2FA required, or first-time password setup.</summary>
public abstract record LoginResult;

/// <summary>Login succeeded. Use AccessToken in Authorization: Bearer header.</summary>
public sealed record LoginSuccess(Guid UserId, string AccessToken, string TokenType, int ExpiresIn) : LoginResult;

/// <summary>2FA required. Call POST /api/auth/2fa/complete with TempToken and code. Send X-Tenant-Id: TenantId.</summary>
/// <param name="Method">Email OTP or Authenticator OTP.</param>
/// <param name="Message">Human-readable hint (e.g. OTP sent to email).</param>
public sealed record LoginRequiresTwoFactor(
    string TempToken,
    Guid TenantId,
    Guid UserId,
    int ExpiresInSeconds,
    string Method = "Authenticator OTP",
    string? Message = null) : LoginResult;

/// <summary>Guest-invited user must set password first. Call POST /api/auth/share/set-password.</summary>
public sealed record LoginRequiresPasswordSetup(Guid TenantId, Guid UserId, string Email, string? ShareToken) : LoginResult;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSApp.Api.Services;
using SaaSApp.MultiTenancy;

namespace SaaSApp.Api.Controllers;

/// <summary>
/// Sign-in for portal visitors who are not EZOFIS users (portal "Master Login"). The username and password
/// (or emailed code) are checked on the server against the portal's master form, and the visitor gets an
/// ExternalUser access token. Send X-Tenant-Id; the portal owner id is the <c>userId</c> in the portal link.
/// </summary>
[ApiController]
[Route("api/portal-auth")]
[AllowAnonymous]
public sealed class PortalAuthController : ControllerBase
{
    private readonly IPortalMasterLoginService _masterLogin;
    private readonly ITenantProvider _tenantProvider;
    private readonly ILogger<PortalAuthController> _logger;

    public PortalAuthController(
        IPortalMasterLoginService masterLogin,
        ITenantProvider tenantProvider,
        ILogger<PortalAuthController> logger)
    {
        _masterLogin = masterLogin;
        _tenantProvider = tenantProvider;
        _logger = logger;
    }

    /// <summary>Master Login with username and password.</summary>
    [HttpPost("master-login")]
    [ProducesResponseType(typeof(PortalMasterLoginResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public Task<IActionResult> MasterLogin([FromBody] PortalMasterPasswordRequest request, CancellationToken cancellationToken) =>
        RunAsync(async tenantId => Ok(await _masterLogin.LoginWithPasswordAsync(
            tenantId, request.PortalOwnerId, request.PortalId, request.Username, request.Password, cancellationToken)));

    /// <summary>Master Login by one-time code, step 1: email a code to the master record's address.</summary>
    [HttpPost("master-login/otp/send")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public Task<IActionResult> SendOtp([FromBody] PortalMasterOtpSendRequest request, CancellationToken cancellationToken) =>
        RunAsync(async tenantId =>
        {
            await _masterLogin.SendOtpAsync(tenantId, request.PortalOwnerId, request.PortalId, request.Username, cancellationToken);
            return NoContent();
        });

    /// <summary>Master Login by one-time code, step 2: check the code and sign in.</summary>
    [HttpPost("master-login/otp/verify")]
    [ProducesResponseType(typeof(PortalMasterLoginResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public Task<IActionResult> VerifyOtp([FromBody] PortalMasterOtpVerifyRequest request, CancellationToken cancellationToken) =>
        RunAsync(async tenantId => Ok(await _masterLogin.VerifyOtpAsync(
            tenantId, request.PortalOwnerId, request.PortalId, request.Username, request.Otp, cancellationToken)));

    private async Task<IActionResult> RunAsync(Func<Guid, Task<IActionResult>> action)
    {
        var tenantId = _tenantProvider.GetTenantId();
        if (tenantId == null)
            return BadRequest(new { error = "X-Tenant-Id header is required." });

        try
        {
            return await action(tenantId.Value);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (PortalLoginLockedException ex)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Portal master login failed.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Sign-in is not available right now." });
        }
    }
}

public sealed record PortalMasterPasswordRequest(Guid PortalOwnerId, int PortalId, string Username, string Password);

public sealed record PortalMasterOtpSendRequest(Guid PortalOwnerId, int PortalId, string Username);

public sealed record PortalMasterOtpVerifyRequest(Guid PortalOwnerId, int PortalId, string Username, string Otp);

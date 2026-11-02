using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SaaSApp.Api.Options;
using SaaSApp.Api.Services.MobilePush;

namespace SaaSApp.Api.Controllers;

/// <summary>
/// Phone push registration for the EZOFIS mobile app. The app registers its Firebase token after sign-in and removes
/// it on sign-out; the recurring push check then notifies the signed-in user of new inbox requests.
/// </summary>
[ApiController]
[Route("api/me/push-devices")]
[Authorize]
public sealed class MePushDevicesController : ControllerBase
{
    private readonly MobilePushDeviceStore _store;
    private readonly FcmSender _fcm;
    private readonly IOptions<MobilePushOptions> _options;

    public MePushDevicesController(MobilePushDeviceStore store, FcmSender fcm, IOptions<MobilePushOptions> options)
    {
        _store = store;
        _fcm = fcm;
        _options = options;
    }

    /// <summary>pushEnabled: the server is sending pushes (Firebase configured and the check running), so the app can
    /// stop its own background polling; false means keep polling.</summary>
    public sealed record PushDeviceResponse(bool PushEnabled);

    public sealed record PushDeviceRequest(string? Token, string? Platform);

    /// <summary>Registers (or moves) this phone's push token for the current user and tenant.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(PushDeviceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Register([FromBody] PushDeviceRequest request, CancellationToken cancellationToken)
    {
        var token = request.Token?.Trim();
        if (string.IsNullOrEmpty(token) || token.Length > 4096)
            return BadRequest(new { message = "A push token is required." });
        if (!TryGetUser(out var userId, out var tenantId))
            return Unauthorized();

        var platform = string.Equals(request.Platform, "ios", StringComparison.OrdinalIgnoreCase) ? "ios" : "android";
        await _store.UpsertAsync(token, userId, tenantId, platform, cancellationToken);
        return Ok(new PushDeviceResponse(_options.Value.Enabled && _fcm.IsConfigured));
    }

    /// <summary>Removes this phone's push token (sign-out, or phone notifications turned off).</summary>
    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remove([FromBody] PushDeviceRequest request, CancellationToken cancellationToken)
    {
        var token = request.Token?.Trim();
        if (!string.IsNullOrEmpty(token))
            await _store.RemoveAsync(token, cancellationToken);
        return NoContent();
    }

    // The user and tenant come from the EZOFIS access token (sub, tid), so a token can only be registered for yourself.
    private bool TryGetUser(out Guid userId, out Guid tenantId)
    {
        tenantId = Guid.Empty;
        var sub = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        var tid = User.FindFirst("tid")?.Value ?? Request.Headers["X-Tenant-Id"].FirstOrDefault();
        return Guid.TryParse(sub, out userId) && Guid.TryParse(tid, out tenantId);
    }
}

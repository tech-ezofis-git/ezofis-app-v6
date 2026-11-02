using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSApp.MultiTenancy;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.Security;

namespace SaaSApp.Api.Controllers;

/// <summary>
/// Read-only PII data that document viewers need (any user who can view the folder). Editing the
/// configuration stays admin-only in <see cref="RepositoryPiiController"/>.
/// </summary>
[ApiController]
[Authorize(Policy = AuthorizationPolicies.TenantUser)]
public sealed class RepositoryPiiRedactionController : ControllerBase
{
    private readonly ITenantProvider _tenantProvider;
    private readonly IRepositoryPiiFieldService _piiFields;
    private readonly IRepositorySecurityService _security;

    public RepositoryPiiRedactionController(
        ITenantProvider tenantProvider,
        IRepositoryPiiFieldService piiFields,
        IRepositorySecurityService security)
    {
        _tenantProvider = tenantProvider;
        _piiFields = piiFields;
        _security = security;
    }

    /// <summary>
    /// Extra sensitive labels for this folder (e.g. "Opening Balance"). The viewer masks the values
    /// next to / under them. Empty when PII redaction is off.
    /// </summary>
    [HttpGet("/api/repositories/{id:guid}/pii/redaction-labels")]
    public async Task<IActionResult> GetRedactionLabels(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = _tenantProvider.GetTenantId()
            ?? throw new InvalidOperationException("Tenant context is required (X-Tenant-Id).");

        if (!IsAdmin())
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? User.FindFirstValue("oid");
            if (!Guid.TryParse(raw, out var userId))
                return Unauthorized(new { error = "User id is required." });
            var allowed = await _security.CanAccessRepositoryAsync(
                id, tenantId, userId, isAdmin: false, RepositorySecurityPermissions.View, cancellationToken);
            if (!allowed)
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "You do not have access to this repository." });
        }

        var labels = await _piiFields.GetRedactionLabelsAsync(id, tenantId, cancellationToken);
        return labels == null ? NotFound() : Ok(labels);
    }

    private bool IsAdmin() =>
        User.Claims.Any(c =>
            (c.Type == ClaimTypes.Role || c.Type == "role") &&
            (string.Equals(c.Value, "Admin", StringComparison.OrdinalIgnoreCase) ||
             string.Equals(c.Value, "Administrator", StringComparison.OrdinalIgnoreCase)));
}

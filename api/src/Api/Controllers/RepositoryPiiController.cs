using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSApp.MultiTenancy;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.Security;

namespace SaaSApp.Api.Controllers;

/// <summary>
/// Folder PII configuration: AI suggestions for sensitive field types, and the folder's extra
/// PII field definitions. Admin only, like the folder update endpoint. Enabling redaction and the
/// folder-field selection stay on <c>PUT /api/repositories/{id}</c>.
/// </summary>
[ApiController]
[Authorize(Policy = AuthorizationPolicies.Admin)]
public sealed class RepositoryPiiController : ControllerBase
{
    private readonly ITenantProvider _tenantProvider;
    private readonly IRepositoryPiiFieldService _piiFields;

    public RepositoryPiiController(ITenantProvider tenantProvider, IRepositoryPiiFieldService piiFields)
    {
        _tenantProvider = tenantProvider;
        _piiFields = piiFields;
    }

    /// <summary>
    /// Suggest sensitive field types from the folder's own name, description and fields (loaded
    /// server-side). Predictions, not detections. Cached per folder definition unless regenerate=true.
    /// </summary>
    [HttpPost("/api/repositories/{id:guid}/pii/recommendations")]
    public async Task<IActionResult> Recommend(
        Guid id,
        [FromBody] PiiFieldRecommendationRequest? request,
        CancellationToken cancellationToken)
    {
        var tenantId = RequireTenantId();
        try
        {
            var result = await _piiFields.RecommendAsync(
                id, tenantId, GetUserId(), request ?? new PiiFieldRecommendationRequest(), cancellationToken);
            return result == null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Suggestions while a folder is still being created (no id yet), from the wizard's draft name
    /// and fields. Nothing is cached or stored; save the folder to use the folder-based endpoint.
    /// </summary>
    [HttpPost("/api/repositories/pii/recommendations")]
    public async Task<IActionResult> RecommendForDraft(
        [FromBody] PiiFieldDraftRecommendationRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = RequireTenantId();
        try
        {
            return Ok(await _piiFields.RecommendForDraftAsync(tenantId, GetUserId(), request, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = ex.Message });
        }
    }

    [HttpGet("/api/repositories/{id:guid}/pii/configuration")]
    public async Task<IActionResult> GetConfiguration(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = RequireTenantId();
        var result = await _piiFields.GetConfigurationAsync(id, tenantId, cancellationToken);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>Save the extra PII field definitions. Send the configurationVersion you loaded; 409 if it changed.</summary>
    [HttpPut("/api/repositories/{id:guid}/pii/configuration")]
    public async Task<IActionResult> SaveConfiguration(
        Guid id,
        [FromBody] SaveRepositoryPiiConfigurationRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = RequireTenantId();
        try
        {
            var result = await _piiFields.SaveConfigurationAsync(id, tenantId, GetUserId(), request, cancellationToken);
            return result == null ? NotFound() : Ok(result);
        }
        catch (PiiConfigurationConflictException ex)
        {
            return Conflict(new { error = ex.Message, currentVersion = ex.CurrentVersion });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private Guid RequireTenantId() =>
        _tenantProvider.GetTenantId() ?? throw new InvalidOperationException("Tenant context is required (X-Tenant-Id).");

    private Guid? GetUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? User.FindFirstValue("oid");
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

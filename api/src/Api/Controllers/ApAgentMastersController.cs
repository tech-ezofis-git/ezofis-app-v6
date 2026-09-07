using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSApp.Security;
using SaaSApp.Workflow.Application.Connectors;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Api.Controllers;

/// <summary>Master lookups used by AP agents (GET /api/masters/po and /vendor).</summary>
[ApiController]
[Route("api/masters")]
[Authorize(Policy = AuthorizationPolicies.TenantUser)]
public sealed class ApAgentMastersController : ControllerBase
{
    private readonly IApAgentMasterLookupService _lookup;

    public ApAgentMastersController(IApAgentMasterLookupService lookup)
    {
        _lookup = lookup;
    }

    [HttpGet("po")]
    [ProducesResponseType(typeof(ApAgentPoMasterDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> LookupPo(
        [FromQuery(Name = "po_number")] string? poNumber,
        [FromQuery(Name = "form_id")] string? formId,
        [FromQuery] string? table,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(poNumber))
            return BadRequest(new { error = "po_number is required." });

        var result = await _lookup.LookupPoAsync(poNumber, formId, table, cancellationToken);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpGet("vendor")]
    [ProducesResponseType(typeof(ApAgentVendorMasterDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> LookupVendor(
        [FromQuery] string? name,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "name is required." });

        var result = await _lookup.LookupVendorAsync(name, cancellationToken);
        return result == null ? NotFound() : Ok(result);
    }
}

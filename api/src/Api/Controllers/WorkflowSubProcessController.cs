using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSApp.MultiTenancy;
using SaaSApp.Security;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Api.Controllers;

/// <summary>
/// Sub-workflow links between requests. Routes keep the V5 paths the web app already calls;
/// ids are V6 GUIDs (a process id is the workflow instance id).
/// </summary>
[ApiController]
[Route("api/workflow")]
[Authorize(Policy = AuthorizationPolicies.TenantUser)]
public sealed class WorkflowSubProcessController : ControllerBase
{
    private readonly IWorkflowSubProcessService _subProcesses;
    private readonly ITenantProvider _tenantProvider;

    public WorkflowSubProcessController(IWorkflowSubProcessService subProcesses, ITenantProvider tenantProvider)
    {
        _subProcesses = subProcesses;
        _tenantProvider = tenantProvider;
    }

    /// <summary>Children of a request.</summary>
    [HttpGet("subWorkflow/{workflowId:guid}/{processId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<WorkflowSubProcessRowDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetChildren(Guid workflowId, Guid processId, CancellationToken cancellationToken)
    {
        var rows = await _subProcesses.GetChildrenAsync(RequireTenantId(), RequireUserId(), workflowId, processId, cancellationToken);
        return Ok(rows);
    }

    /// <summary>Parent of a request: a list of zero or one, as in V5.</summary>
    [HttpGet("getDetailsforMainworkflow/{workflowId:guid}/{processId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<WorkflowMainProcessDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetParent(Guid workflowId, Guid processId, CancellationToken cancellationToken)
    {
        var rows = await _subProcesses.GetParentAsync(RequireTenantId(), RequireUserId(), workflowId, processId, cancellationToken);
        return Ok(rows);
    }

    /// <summary>Links a child request to its parent.</summary>
    [HttpPost("postSubWorkflow")]
    [ProducesResponseType(typeof(WorkflowSubProcessLinkDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Link([FromBody] WorkflowSubProcessLinkDto? body, CancellationToken cancellationToken)
    {
        if (body is null)
            return BadRequest(new { error = "Request body is required." });

        try
        {
            var link = await _subProcesses.LinkAsync(RequireTenantId(), RequireUserId(), body, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, link);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    private Guid RequireTenantId() =>
        _tenantProvider.GetTenantId() ?? throw new InvalidOperationException("X-Tenant-Id header is required.");

    private Guid RequireUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("userId");
        return Guid.TryParse(raw, out var id) ? id : throw new InvalidOperationException("User id is required.");
    }
}

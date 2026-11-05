using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSApp.Security;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Api.Controllers;

/// <summary>
/// Designer SLA helpers: preview Advanced SLA rules from the workflow settings before saving, and read
/// a ticket's SLA timers and history. Saving the SLA itself goes through the workflow save (validated by
/// <c>WorkflowSlaSettingsValidator</c>).
/// </summary>
[ApiController]
[Route("api/workflow-sla")]
[Authorize(Policy = AuthorizationPolicies.TenantUser)]
public sealed class WorkflowSlaController : ControllerBase
{
    private readonly IWorkflowSlaInsightService _insight;

    public WorkflowSlaController(IWorkflowSlaInsightService insight)
    {
        _insight = insight;
    }

    /// <summary>Which rule and SLA Master entry a request with these form values gets, and its deadlines.</summary>
    [HttpPost("preview")]
    [ProducesResponseType(typeof(WorkflowSlaPreviewResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Preview([FromBody] WorkflowSlaPreviewRequest? body, CancellationToken cancellationToken)
    {
        if (body is null)
            return BadRequest(new { error = "Request body is required." });

        try
        {
            return Ok(await _insight.PreviewAsync(body, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>A ticket's SLA timers (with what each did) and its Advanced SLA evaluation.</summary>
    [HttpGet("{workflowId:guid}/instances/{instanceId:guid}/history")]
    [ProducesResponseType(typeof(WorkflowSlaHistoryResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> History(Guid workflowId, Guid instanceId, CancellationToken cancellationToken) =>
        Ok(await _insight.GetHistoryAsync(workflowId, instanceId, cancellationToken));
}

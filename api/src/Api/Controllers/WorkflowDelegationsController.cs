using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSApp.MultiTenancy;
using SaaSApp.Security;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Api.Controllers;

/// <summary>
/// Workflow delegation: temporarily hand an assignee's approvals to a backup user for a date
/// range, per workflow (and optionally per stage). Checked on every move-next so new requests
/// route to the active delegate instead of the original assignee.
/// </summary>
[ApiController]
[Route("api/workflow-delegations")]
[Authorize(Policy = AuthorizationPolicies.TenantUser)]
public sealed class WorkflowDelegationsController : ControllerBase
{
    private readonly IWorkflowDelegationService _delegations;
    private readonly ITenantProvider _tenantProvider;

    public WorkflowDelegationsController(IWorkflowDelegationService delegations, ITenantProvider tenantProvider)
    {
        _delegations = delegations;
        _tenantProvider = tenantProvider;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WorkflowDelegationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _delegations.ListAsync(RequireTenantId(), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WorkflowDelegationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await _delegations.GetAsync(RequireTenantId(), id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(WorkflowDelegationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] WorkflowDelegationRequest? body, CancellationToken cancellationToken)
    {
        if (body is null)
            return BadRequest(new { error = "Request body is required." });

        try
        {
            var result = await _delegations.CreateAsync(RequireTenantId(), RequireUserId(), body.ToDto(), cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(WorkflowDelegationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(Guid id, [FromBody] WorkflowDelegationRequest? body, CancellationToken cancellationToken)
    {
        if (body is null)
            return BadRequest(new { error = "Request body is required." });

        try
        {
            var result = await _delegations.UpdateAsync(RequireTenantId(), id, RequireUserId(), body.ToDto(), cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Ends an active delegation immediately: unfinished requests follow onPeriodEnd from this point on.</summary>
    [HttpPost("{id:guid}/end")]
    [ProducesResponseType(typeof(WorkflowDelegationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> EndNow(Guid id, CancellationToken cancellationToken)
    {
        var result = await _delegations.EndNowAsync(RequireTenantId(), id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await _delegations.DeleteAsync(RequireTenantId(), id, cancellationToken);
        return ok ? NoContent() : NotFound();
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

/// <summary>Body shape matches the designer UI's save payload exactly (camelCase).</summary>
public sealed record WorkflowDelegationRowRequest(
    string WorkflowId,
    string? StageId,
    string DelegateUserId,
    string? Reason)
{
    public WorkflowDelegationRowDto ToDto() => new(
        Guid.Parse(WorkflowId),
        string.IsNullOrWhiteSpace(StageId) ? null : StageId,
        Guid.Parse(DelegateUserId),
        Reason);
}

public sealed record WorkflowDelegationActionsRequest(
    bool NotifyDelegates = true,
    bool RedirectNewRequests = true,
    bool TransferCurrentRequests = false)
{
    public WorkflowDelegationActionsDto ToDto() => new(NotifyDelegates, RedirectNewRequests, TransferCurrentRequests);
}

public sealed record WorkflowDelegationRequest(
    string AssigneeUserId,
    List<WorkflowDelegationRowRequest>? Delegations,
    string? FromDate,
    string? ToDate,
    bool IsDraft,
    string? OnPeriodEnd,
    WorkflowDelegationActionsRequest? Actions)
{
    public WorkflowDelegationUpsertDto ToDto() => new(
        Guid.TryParse(AssigneeUserId, out var assigneeId) ? assigneeId : Guid.Empty,
        (Delegations ?? []).Select(r => r.ToDto()).ToList(),
        FromDate,
        ToDate,
        IsDraft,
        OnPeriodEnd ?? WorkflowDelegationPeriodEnd.ReturnToAssignee,
        (Actions ?? new WorkflowDelegationActionsRequest()).ToDto());
}

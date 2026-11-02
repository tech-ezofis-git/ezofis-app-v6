using MediatR;
using SaaSApp.Billing.Application.Contracts;
using SaaSApp.Billing.Application.Credits.Commands.UpdateCredit;
using SaaSApp.Repository.Application.Contracts;

namespace SaaSApp.Api.Services;

/// <summary>
/// Charges through the same ledger as <c>POST /api/billing/credits/update</c>. Failures are logged
/// and reported as <c>false</c>, never thrown, so the action that earned the charge still succeeds.
/// </summary>
public sealed class ActivityCreditCharger : IActivityCreditCharger
{
    private readonly IMediator _mediator;
    private readonly ILogger<ActivityCreditCharger> _logger;

    public ActivityCreditCharger(IMediator mediator, ILogger<ActivityCreditCharger> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    public async Task<bool> TryConsumeAsync(
        Guid tenantId,
        Guid? userId,
        string activityType,
        string subActivity,
        string remarks,
        int credit = 1,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _mediator.Send(
                new UpdateCreditCommand(
                    tenantId,
                    userId,
                    new CreditUpdateRequest(activityType, subActivity, "repository.items", 0, remarks, credit)),
                cancellationToken);
            if (result.Status != CreditUpdateStatus.Success)
            {
                _logger.LogWarning(
                    "{ActivityType} credit not consumed for tenant {TenantId}: {Status} {Message}",
                    activityType,
                    tenantId,
                    result.Status,
                    result.Message);
            }

            return result.Status == CreditUpdateStatus.Success;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "{ActivityType} credit could not be consumed for tenant {TenantId}", activityType, tenantId);
            return false;
        }
    }
}

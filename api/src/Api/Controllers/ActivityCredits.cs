using MediatR;
using SaaSApp.Billing.Application.Contracts;
using SaaSApp.Billing.Application.Credits.Commands.UpdateCredit;

namespace SaaSApp.Api.Controllers;

/// <summary>
/// Consumes billing credits for an AI action that already succeeded (same ledger as
/// <c>POST /api/billing/credits/update</c>). A failed charge is logged, never fails the action.
/// </summary>
internal static class ActivityCredits
{
    public const int OcrCredit = 1;
    public const int IntelligentUploadCredit = 1;

    public static async Task<bool> TryConsumeAsync(
        IMediator mediator,
        ILogger logger,
        Guid tenantId,
        Guid? userId,
        string activityType,
        string subActivity,
        string remarks,
        int credit,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await mediator.Send(
                new UpdateCreditCommand(
                    tenantId,
                    userId,
                    new CreditUpdateRequest(activityType, subActivity, "repository.items", 0, remarks, credit)),
                cancellationToken);
            if (result.Status != CreditUpdateStatus.Success)
            {
                logger.LogWarning(
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
            logger.LogWarning(ex, "{ActivityType} credit could not be consumed for tenant {TenantId}", activityType, tenantId);
            return false;
        }
    }
}

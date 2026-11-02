namespace SaaSApp.Repository.Application.Contracts;

/// <summary>
/// Consumes billing credits for an AI action that already succeeded (OCR, intelligent upload, ...).
/// Implemented in the API host over the Billing module; a failed charge never fails the action.
/// </summary>
public interface IActivityCreditCharger
{
    Task<bool> TryConsumeAsync(
        Guid tenantId,
        Guid? userId,
        string activityType,
        string subActivity,
        string remarks,
        int credit = 1,
        CancellationToken cancellationToken = default);
}

public static class ActivityCreditTypes
{
    public const string OcrActivity = "OCR Agent";
    public const string OcrSubActivity = "AI OCR";
    public const string IntelligentUploadActivity = "Intelligent Upload";
    public const string IntelligentUploadSubActivity = "DocumentClassification";
    public const int OcrCredit = 1;
    public const int IntelligentUploadCredit = 1;
}

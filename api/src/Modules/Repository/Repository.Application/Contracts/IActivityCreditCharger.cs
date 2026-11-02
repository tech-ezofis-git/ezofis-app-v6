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
        string? identify = null,
        CancellationToken cancellationToken = default);
}

public static class ActivityCreditTypes
{
    /// <summary>
    /// Ledger <c>identifyTable</c> for a repository file: <c>repository.items/{repositoryId}[/{itemId}]</c>,
    /// so usage reports can name and open the file.
    /// </summary>
    public static string RepositoryItem(Guid? repositoryId, Guid? itemId = null) =>
        repositoryId is null ? "repository.items"
        : itemId is null ? $"repository.items/{repositoryId:D}"
        : $"repository.items/{repositoryId:D}/{itemId:D}";

    public const string OcrActivity = "OCR Agent";
    public const string OcrSubActivity = "AI OCR";
    public const string IntelligentUploadActivity = "Intelligent Upload";
    public const string IntelligentUploadSubActivity = "DocumentClassification";
    public const int OcrCredit = 1;
    public const int IntelligentUploadCredit = 1;
}

namespace SaaSApp.Reporting.Application.Contracts;

public interface IReportAiDefinitionService
{
    Task<ReportAiDefinitionRecord> SaveAsync(
        ReportAiDefinitionRecord record,
        CancellationToken cancellationToken = default);

    Task<ReportAiDefinitionRecord?> GetAsync(
        Guid tenantId,
        Guid reportId,
        CancellationToken cancellationToken = default);

    /// <summary>Private (owner + shared only) / Public / Selected Users / Selected Groups visibility check for one record.</summary>
    Task<bool> CanSeeAsync(
        Guid tenantId,
        Guid userId,
        bool isAdmin,
        ReportAiDefinitionRecord record,
        CancellationToken cancellationToken = default);

    /// <summary>Returns only the records <paramref name="userId"/> is allowed to see, per Visibility/SharedUsers/SharedGroups.</summary>
    Task<IReadOnlyList<ReportAiDefinitionRecord>> ListAsync(
        Guid tenantId,
        Guid userId,
        bool isAdmin,
        CancellationToken cancellationToken = default);

    Task<ReportAiDefinitionRecord?> UpdateAsync(
        Guid tenantId,
        Guid reportId,
        ReportAiUpdateRequest patch,
        CancellationToken cancellationToken = default);

    Task IncrementRunsAsync(
        Guid tenantId,
        Guid reportId,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid tenantId,
        Guid userId,
        bool isAdmin,
        Guid reportId,
        CancellationToken cancellationToken = default);
}

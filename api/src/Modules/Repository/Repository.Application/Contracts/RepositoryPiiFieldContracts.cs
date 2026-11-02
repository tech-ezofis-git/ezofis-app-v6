namespace SaaSApp.Repository.Application.Contracts;

/// <summary>
/// AI suggestions for which sensitive field types a folder's documents may contain, and the
/// folder-level list of extra sensitive field definitions (types that are not folder fields).
/// The existing <c>PiiRedactionEnabled</c> / <c>PiiRedactionFieldIds</c> columns stay owned by the
/// folder update endpoint; this feature only reads them.
/// </summary>
public interface IRepositoryPiiFieldService
{
    /// <summary>Null when the repository does not exist for this tenant.</summary>
    Task<PiiFieldRecommendationsResult?> RecommendAsync(
        Guid repositoryId,
        Guid tenantId,
        Guid? userId,
        PiiFieldRecommendationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Suggestions for a folder still being created (no id yet), from the wizard's draft name and
    /// fields. Nothing is cached or stored.
    /// </summary>
    /// <exception cref="ArgumentException">Folder name is missing.</exception>
    Task<PiiFieldRecommendationsResult> RecommendForDraftAsync(
        Guid tenantId,
        Guid? userId,
        PiiFieldDraftRecommendationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Enabled extra sensitive values (names only) for document viewers, who mask the values next
    /// to / under these labels. Null when the repository does not exist for this tenant.
    /// </summary>
    Task<IReadOnlyList<PiiRedactionLabelDto>?> GetRedactionLabelsAsync(
        Guid repositoryId,
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<RepositoryPiiConfigurationDto?> GetConfigurationAsync(
        Guid repositoryId,
        Guid tenantId,
        CancellationToken cancellationToken = default);

    /// <exception cref="PiiConfigurationConflictException">Version is stale.</exception>
    /// <exception cref="ArgumentException">A field definition is invalid.</exception>
    Task<RepositoryPiiConfigurationDto?> SaveConfigurationAsync(
        Guid repositoryId,
        Guid tenantId,
        Guid? userId,
        SaveRepositoryPiiConfigurationRequest request,
        CancellationToken cancellationToken = default);
}

/// <summary>Client options only. Folder name and fields are always loaded server-side.</summary>
public sealed record PiiFieldRecommendationRequest(
    bool IncludeContextualRecommendations = true,
    IReadOnlyList<string>? DocumentCategories = null,
    /// <summary>Skip the cached answer for the current folder definition.</summary>
    bool Regenerate = false,
    /// <summary>Optional agents model or preset id; the agents' default when empty.</summary>
    string? Model = null);

public sealed record PiiDraftFieldDto(string FieldName, string? DataType = null);

/// <summary>A folder that is not saved yet: the wizard's current name and fields.</summary>
public sealed record PiiFieldDraftRecommendationRequest(
    string FolderName,
    string? FolderDescription = null,
    IReadOnlyList<PiiDraftFieldDto>? Fields = null,
    bool IncludeContextualRecommendations = true,
    IReadOnlyList<string>? DocumentCategories = null,
    string? Model = null);

public sealed record PiiFieldRecommendationDto(
    string FieldKey,
    string DisplayName,
    string Category,
    /// <summary><c>existing_metadata</c> or <c>ai_inferred</c>.</summary>
    string Source,
    Guid? ExistingFieldId,
    /// <summary>How likely documents in this folder contain the type. Not a detection result.</summary>
    double Confidence,
    bool Recommended,
    string DetectionType,
    string Reason,
    bool AlreadySelected,
    /// <summary>The folder field's own name when <c>Source</c> is <c>existing_metadata</c>.</summary>
    string? ExistingFieldName = null);

public sealed record PiiFieldRecommendationsResult(
    Guid FolderId,
    IReadOnlyList<PiiFieldRecommendationDto> Recommendations,
    string ModelVersion,
    /// <summary><c>ai</c>, or <c>fallback</c> when the built-in catalog answered.</summary>
    string Mode,
    IReadOnlyList<string> Warnings,
    DateTime GeneratedAtUtc,
    bool FromCache);

/// <summary>A sensitive field type to redact that is not one of the folder's own fields.</summary>
public sealed record PiiFieldDefinitionDto(
    string FieldKey,
    string DisplayName,
    string Category,
    string DetectionType,
    /// <summary><c>ai_inferred</c> or <c>custom</c>.</summary>
    string Source = "custom",
    bool Enabled = true,
    /// <summary>Optional custom regex (validated; linear-time engine only).</summary>
    string? Pattern = null,
    string? Description = null);

public sealed record PiiRedactionLabelDto(string DisplayName, string DetectionType);

public sealed record RepositoryPiiConfigurationDto(
    Guid RepositoryId,
    /// <summary>From the existing <c>PiiRedactionEnabled</c> column.</summary>
    bool Enabled,
    /// <summary>From the existing <c>PiiRedactionFieldIds</c> column.</summary>
    IReadOnlyList<Guid> SelectedFieldIds,
    IReadOnlyList<string> SelectedFieldNames,
    IReadOnlyList<PiiFieldDefinitionDto> AdditionalFields,
    /// <summary>0 until the first save. Send it back on save; a stale value gets 409.</summary>
    int ConfigurationVersion,
    DateTime? UpdatedAtUtc,
    Guid? UpdatedBy,
    DateTime? LastRecommendationAtUtc,
    string? LastRecommendationModel);

public sealed record SaveRepositoryPiiConfigurationRequest(
    IReadOnlyList<PiiFieldDefinitionDto>? AdditionalFields,
    int ConfigurationVersion);

public sealed class PiiConfigurationConflictException : Exception
{
    public PiiConfigurationConflictException(int currentVersion)
        : base("The PII configuration was changed by someone else. Reload it and try again.")
    {
        CurrentVersion = currentVersion;
    }

    public int CurrentVersion { get; }
}

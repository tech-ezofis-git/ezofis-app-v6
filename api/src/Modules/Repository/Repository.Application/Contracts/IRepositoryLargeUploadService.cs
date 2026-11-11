namespace SaaSApp.Repository.Application.Contracts;

/// <summary>
/// Chunked, resumable upload of large files (1–10 GB) into a repository's stage (Draft Files).
/// Flow: <see cref="InitAsync"/> → send every chunk to <see cref="UploadChunkAsync"/> → <see cref="CompleteAsync"/>.
/// The browser only talks to the API; the API alone writes to storage. The stage row is hidden from
/// Draft Files until the upload completes.
/// </summary>
public interface IRepositoryLargeUploadService
{
    Task<LargeUploadSession> InitAsync(
        LargeUploadInitRequest request,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken = default);

    /// <summary>Which chunks are already stored, so an interrupted upload can resume.</summary>
    Task<LargeUploadStatus?> GetStatusAsync(
        Guid fileId,
        Guid repositoryId,
        long fileSize,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken = default);

    /// <summary>Stores one chunk. Returns false when the upload is not found.</summary>
    Task<bool> UploadChunkAsync(
        Guid fileId,
        Guid repositoryId,
        int chunkIndex,
        long fileSize,
        Stream content,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Assembles the chunks, saves OCR metadata from the browser's preview OCR, and shows the file in
    /// Draft Files. Throws <see cref="LargeUploadIncompleteException"/> when chunks are missing.
    /// </summary>
    Task<UploadWithOcrResult?> CompleteAsync(
        Guid fileId,
        LargeUploadCompleteRequest request,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken = default);
}

public sealed record LargeUploadInitRequest(
    Guid RepositoryId,
    string FileName,
    string? ContentType,
    long FileSize);

public sealed record LargeUploadSession(
    string FileId,
    Guid RepositoryId,
    string FileName,
    int ChunkSize,
    int TotalChunks,
    int MaxConcurrency,
    long MaxFileSize);

public sealed record LargeUploadStatus(
    string FileId,
    string StageStatus,
    bool Completed,
    int ChunkSize,
    int TotalChunks,
    int MaxConcurrency,
    IReadOnlyList<int> UploadedChunks);

/// <param name="Metadata">Same JSON as <c>uploadWithOcr</c>'s <c>metadata</c> (field values from OCR).</param>
/// <param name="OcrJson">Raw OCR JSON from <c>uploadForOcr</c> on the first pages.</param>
public sealed record LargeUploadCompleteRequest(
    Guid RepositoryId,
    long FileSize,
    int ChunkSize,
    int? TotalPages,
    string? Metadata,
    string? OcrJson,
    string? OcrText);

/// <summary>Thrown when completing an upload whose chunks are not all in storage yet.</summary>
public sealed class LargeUploadIncompleteException : InvalidOperationException
{
    public LargeUploadIncompleteException(IReadOnlyList<int> missingChunks)
        : base($"Upload is incomplete: {missingChunks.Count} chunk(s) missing or the wrong size.")
    {
        MissingChunks = missingChunks;
    }

    public IReadOnlyList<int> MissingChunks { get; }
}

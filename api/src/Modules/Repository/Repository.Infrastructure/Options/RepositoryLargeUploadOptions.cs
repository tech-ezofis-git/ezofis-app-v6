namespace SaaSApp.Repository.Infrastructure.Options;

/// <summary>
/// Large-file (1–10 GB) upload settings. The browser sends the file to the API in chunks and only the
/// API writes to storage (Azure Blob blocks, or a local file in dev). Section: <c>Repository:LargeUpload</c>.
/// </summary>
public sealed class RepositoryLargeUploadOptions
{
    public const string SectionName = "Repository:LargeUpload";

    /// <summary>Largest file accepted (default 10 GiB).</summary>
    public long MaxFileSizeBytes { get; set; } = 10L * 1024 * 1024 * 1024;

    /// <summary>
    /// Size of each chunk the browser sends. Must stay below the nginx <c>client_max_body_size</c>
    /// (25 MB) in the app container. Default 8 MiB.
    /// </summary>
    public int ChunkSizeBytes { get; set; } = 8 * 1024 * 1024;

    /// <summary>
    /// Chunks one upload may send at once. The API forwards each to Azure over the same uplink, so a
    /// few in parallel is enough to keep it busy.
    /// </summary>
    public int MaxConcurrency { get; set; } = 3;

    /// <summary>Unfinished uploads older than this are removed when the same user starts a new one.</summary>
    public int StaleUploadDays { get; set; } = 7;
}

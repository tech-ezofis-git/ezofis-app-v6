using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using SaaSApp.MultiTenancy;
using SaaSApp.Repository.Application;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.Repository.Infrastructure.Options;
using SaaSApp.Repository.Infrastructure.Storage;

namespace SaaSApp.Repository.Infrastructure.Services;

/// <summary>
/// Large-file uploads into a repository stage. The browser sends the file to the API in fixed-size
/// chunks (<see cref="UploadChunkAsync"/>); only the API writes to storage. <see cref="CompleteAsync"/>
/// then commits the chunks and stores the OCR metadata the browser extracted from the first pages.
/// </summary>
internal sealed class RepositoryLargeUploadService : IRepositoryLargeUploadService
{
    private readonly ITenantConnectionProvider _connectionProvider;
    private readonly IStaticRepositoryProvisioner _provisioner;
    private readonly IRepositoryStorageSeedService _storageSeed;
    private readonly IRepositoryUploadIndexService _uploadIndex;
    private readonly LargeUploadStorage _storage;
    private readonly RepositoryLargeUploadOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<RepositoryLargeUploadService> _logger;

    public RepositoryLargeUploadService(
        ITenantConnectionProvider connectionProvider,
        IStaticRepositoryProvisioner provisioner,
        IRepositoryStorageSeedService storageSeed,
        IRepositoryUploadIndexService uploadIndex,
        LargeUploadStorage storage,
        IOptions<RepositoryLargeUploadOptions> options,
        IMemoryCache cache,
        ILogger<RepositoryLargeUploadService> logger)
    {
        _connectionProvider = connectionProvider;
        _provisioner = provisioner;
        _storageSeed = storageSeed;
        _uploadIndex = uploadIndex;
        _storage = storage;
        _options = options.Value;
        _cache = cache;
        _logger = logger;
    }

    public async Task<LargeUploadSession> InitAsync(
        LargeUploadInitRequest request,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        if (request.RepositoryId == Guid.Empty)
            throw new ArgumentException("repositoryId is required.");
        if (string.IsNullOrWhiteSpace(request.FileName))
            throw new ArgumentException("fileName is required.");
        ValidateFileSize(request.FileSize);

        var repo = await _provisioner.GetRepositoryAsync(request.RepositoryId, tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Repository not found.");
        await _provisioner.EnsureRepositoryTablesAsync(request.RepositoryId, tenantId, cancellationToken);

        var fileName = RepositoryFilePathHelper.EnsureFileNameHasExtension(
            Path.GetFileName(request.FileName.Trim()),
            request.ContentType);
        var contentType = RepositoryOcrFileSupport.ResolveContentType(fileName, request.ContentType);

        var storageProviderId = await _storageSeed.ResolveStorageProviderIdAsync(
            tenantId, repo.StorageProviderId, null, cancellationToken);
        var providerCode = await ResolveProviderCodeAsync(tenantId, storageProviderId, cancellationToken);

        var relativePath = RepositoryFilePathHelper.BuildMonitorRelativePath(request.RepositoryId, fileName);
        var mode = _storage.ResolveMode(providerCode);

        Guid stageId;
        await using (var connection = await OpenConnectionAsync(cancellationToken))
        {
            if (userId is Guid owner)
                await DiscardStaleUploadsAsync(connection, repo.StageTableName, tenantId, request.RepositoryId, owner, mode, cancellationToken);

            stageId = await RepositoryStageStore.InsertAsync(
                connection,
                repo,
                tenantId,
                request.RepositoryId,
                storageProviderId,
                relativePath,
                fileName,
                contentType,
                ToIntFileSize(request.FileSize),
                fieldValues: null,
                userId,
                cancellationToken,
                stageStatus: RepositoryStageStore.UploadingStageStatus,
                status: RepositoryStageStore.UploadingStageStatus);
        }

        CacheChunkTarget(tenantId, request.RepositoryId, stageId, relativePath, mode, userId);

        _logger.LogInformation(
            "Large upload {StageId} started: {FileName} ({FileSize} bytes, {Mode}) in repository {RepositoryId}",
            stageId,
            fileName,
            request.FileSize,
            mode,
            request.RepositoryId);

        var chunkSize = _storage.ChunkSize;
        return new LargeUploadSession(
            stageId.ToString("D"),
            request.RepositoryId,
            fileName,
            chunkSize,
            LargeUploadStorage.TotalChunks(request.FileSize, chunkSize),
            _storage.MaxConcurrencyFor(mode),
            _options.MaxFileSizeBytes);
    }

    public async Task<LargeUploadStatus?> GetStatusAsync(
        Guid fileId,
        Guid repositoryId,
        long fileSize,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        ValidateFileSize(fileSize);
        var upload = await LoadAsync(fileId, repositoryId, tenantId, userId, cancellationToken);
        if (upload == null)
            return null;

        var chunkSize = _storage.ChunkSize;
        var totalChunks = LargeUploadStorage.TotalChunks(fileSize, chunkSize);
        var uploading = IsUploading(upload.Row);

        IReadOnlyList<int> uploaded;
        if (uploading)
        {
            // A resumed upload sends chunks next: register it so they skip the database.
            CacheChunkTarget(tenantId, repositoryId, fileId, upload.Row.FilePath!, upload.Mode, upload.Row.CreatedBy);
            uploaded = await _storage.ListUploadedChunksAsync(upload.Mode, tenantId, upload.Row.FilePath!, chunkSize, fileSize, cancellationToken);
        }
        else
        {
            uploaded = Enumerable.Range(0, totalChunks).ToList();
        }

        return new LargeUploadStatus(
            fileId.ToString("D"),
            upload.Row.StageStatus,
            Completed: !uploading,
            chunkSize,
            totalChunks,
            _storage.MaxConcurrencyFor(upload.Mode),
            uploaded);
    }

    public async Task<bool> UploadChunkAsync(
        Guid fileId,
        Guid repositoryId,
        int chunkIndex,
        long fileSize,
        Stream content,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        ValidateFileSize(fileSize);

        // Chunks arrive in parallel, hundreds per file: after the first lookup they touch storage only,
        // never the database (see ChunkTarget).
        var target = await GetChunkTargetAsync(fileId, repositoryId, tenantId, userId, cancellationToken);
        if (target == null)
            return false;

        var chunkSize = _storage.ChunkSize;
        var totalChunks = LargeUploadStorage.TotalChunks(fileSize, chunkSize);
        if (chunkIndex < 0 || chunkIndex >= totalChunks)
            throw new ArgumentException($"chunkIndex must be between 0 and {totalChunks - 1}.");

        await _storage.StageChunkAsync(target.Mode, tenantId, target.FilePath, chunkIndex, chunkSize, content, cancellationToken);
        return true;
    }

    public async Task<UploadWithOcrResult?> CompleteAsync(
        Guid fileId,
        LargeUploadCompleteRequest request,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        ValidateFileSize(request.FileSize);
        var upload = await LoadAsync(fileId, request.RepositoryId, tenantId, userId, cancellationToken);
        if (upload == null)
            return null;

        var row = upload.Row;
        var fileName = row.FileName!;

        // Safe to call twice (e.g. the browser retries after a dropped response).
        if (!IsUploading(row))
        {
            return new UploadWithOcrResult(
                fileId.ToString("D"),
                request.RepositoryId,
                fileName,
                row.FilePath ?? string.Empty,
                row.OcrJson ?? string.Empty,
                null);
        }

        var chunkSize = _storage.ChunkSize;
        if (request.ChunkSize != chunkSize)
            throw new ArgumentException($"chunkSize must be {chunkSize} for this upload.");

        _cache.Remove(ChunkTargetKey(tenantId, request.RepositoryId, fileId));
        var committedSize = await _storage.CommitAsync(
            upload.Mode,
            tenantId,
            row.FilePath!,
            chunkSize,
            request.FileSize,
            row.FileType,
            cancellationToken);

        if (committedSize != request.FileSize || committedSize > _options.MaxFileSizeBytes)
        {
            await _storage.DiscardAsync(upload.Mode, tenantId, row.FilePath!, cancellationToken);
            throw new InvalidOperationException("Uploaded file size does not match the expected size.");
        }

        await using (var connection = await OpenConnectionAsync(cancellationToken))
        {
            await RepositoryStageStore.UpdateFileAsync(
                connection,
                upload.StageTableName,
                tenantId,
                fileId,
                row.FilePath!,
                fileName,
                row.FileType ?? "application/octet-stream",
                ToIntFileSize(committedSize),
                request.TotalPages is > 0 ? request.TotalPages : null,
                cancellationToken);

            // The file exists now: make the row a normal draft even if the metadata step below fails.
            await RepositoryStageStore.SetStatusAsync(
                connection,
                upload.StageTableName,
                tenantId,
                fileId,
                status: "Pending",
                stageStatus: "Uploaded",
                cancellationToken);
        }

        _logger.LogInformation(
            "Large upload {StageId} completed: {FileName} ({FileSize} bytes)",
            fileId,
            fileName,
            committedSize);

        return await _uploadIndex.ApplyStagedUploadMetadataAsync(
            request.RepositoryId,
            tenantId,
            fileId,
            fileName,
            row.FileType,
            request.Metadata,
            request.OcrJson,
            request.OcrText,
            userId,
            cancellationToken);
    }

    private async Task<ChunkTarget?> GetChunkTargetAsync(
        Guid fileId,
        Guid repositoryId,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken)
    {
        var key = ChunkTargetKey(tenantId, repositoryId, fileId);
        if (!_cache.TryGetValue(key, out ChunkTarget? target) || target == null)
        {
            var upload = await LoadUploadingAsync(fileId, repositoryId, tenantId, userId, cancellationToken);
            if (upload == null)
                return null;
            target = CacheChunkTarget(tenantId, repositoryId, fileId, upload.Row.FilePath!, upload.Mode, upload.Row.CreatedBy);
        }

        // Only the person who started an upload may add to it.
        if (target.CreatedBy is Guid createdBy && userId is Guid caller && createdBy != caller)
            return null;

        return target;
    }

    private ChunkTarget CacheChunkTarget(
        Guid tenantId,
        Guid repositoryId,
        Guid fileId,
        string filePath,
        LargeUploadMode mode,
        Guid? createdBy)
    {
        var target = new ChunkTarget(filePath, mode, createdBy);
        _cache.Set(
            ChunkTargetKey(tenantId, repositoryId, fileId),
            target,
            new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromMinutes(30) });
        return target;
    }

    private static string ChunkTargetKey(Guid tenantId, Guid repositoryId, Guid fileId) =>
        $"large-upload:{tenantId:N}:{repositoryId:N}:{fileId:N}";

    private async Task<LoadedUpload?> LoadUploadingAsync(
        Guid fileId,
        Guid repositoryId,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken)
    {
        var upload = await LoadAsync(fileId, repositoryId, tenantId, userId, cancellationToken);
        if (upload == null)
            return null;
        if (!IsUploading(upload.Row))
            throw new InvalidOperationException("This upload is already complete.");
        return upload;
    }

    private async Task<LoadedUpload?> LoadAsync(
        Guid fileId,
        Guid repositoryId,
        Guid tenantId,
        Guid? userId,
        CancellationToken cancellationToken)
    {
        if (fileId == Guid.Empty || repositoryId == Guid.Empty)
            return null;

        var repo = await _provisioner.GetRepositoryAsync(repositoryId, tenantId, cancellationToken);
        if (repo == null)
            return null;

        // Release the connection before any other lookup: tenant pools are small (5), and holding
        // one while opening another starves parallel requests.
        RepositoryStageRow? row;
        await using (var connection = await OpenConnectionAsync(cancellationToken))
        {
            row = await RepositoryStageStore.GetAsync(connection, repo, tenantId, fileId, cancellationToken);
        }

        if (row == null || string.IsNullOrWhiteSpace(row.FilePath) || string.IsNullOrWhiteSpace(row.FileName))
            return null;

        // Only the person who started an upload may add to or finish it.
        if (row.CreatedBy is Guid createdBy && userId is Guid caller && createdBy != caller)
            return null;

        var providerCode = await ResolveProviderCodeAsync(tenantId, row.StorageProviderId, cancellationToken);
        return new LoadedUpload(row, repo.StageTableName, _storage.ResolveMode(providerCode));
    }

    private async Task DiscardStaleUploadsAsync(
        NpgsqlConnection connection,
        string stageTableName,
        Guid tenantId,
        Guid repositoryId,
        Guid userId,
        LargeUploadMode mode,
        CancellationToken cancellationToken)
    {
        try
        {
            var cutoff = DateTime.UtcNow.AddDays(-Math.Max(1, _options.StaleUploadDays));
            var paths = await RepositoryStageStore.AbandonStaleUploadsAsync(
                connection, stageTableName, tenantId, repositoryId, userId, cutoff, cancellationToken);
            foreach (var path in paths)
                await _storage.DiscardAsync(mode, tenantId, path, cancellationToken);
        }
        catch (PostgresException ex)
        {
            // Cleanup must never block a new upload.
            _logger.LogWarning(ex, "Could not clean up stale large uploads in repository {RepositoryId}", repositoryId);
        }
    }

    private async Task<string> ResolveProviderCodeAsync(Guid tenantId, Guid storageProviderId, CancellationToken cancellationToken)
    {
        var providers = await _storageSeed.ListProvidersAsync(tenantId, cancellationToken);
        return providers.First(p => p.Id == storageProviderId).Code;
    }

    private async Task<NpgsqlConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connectionString = _connectionProvider.ConnectionString
            ?? throw new InvalidOperationException("Tenant connection string not resolved.");
        var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    private void ValidateFileSize(long fileSize)
    {
        if (fileSize <= 0)
            throw new ArgumentException("fileSize must be greater than 0.");
        if (fileSize > _options.MaxFileSizeBytes)
            throw new ArgumentException($"File is too large. The maximum is {_options.MaxFileSizeBytes / (1024 * 1024 * 1024.0):0.#} GB.");
    }

    private static bool IsUploading(RepositoryStageRow row) =>
        string.Equals(row.StageStatus, RepositoryStageStore.UploadingStageStatus, StringComparison.OrdinalIgnoreCase);

    /// <summary>file_size is a 32-bit column: files over 2 GB keep it empty.</summary>
    private static int? ToIntFileSize(long size) => size is > 0 and <= int.MaxValue ? (int)size : null;

    private sealed record LoadedUpload(RepositoryStageRow Row, string StageTableName, LargeUploadMode Mode);

    /// <summary>Where an in-progress upload's chunks go; cached so chunk requests skip the database.</summary>
    private sealed record ChunkTarget(string FilePath, LargeUploadMode Mode, Guid? CreatedBy);
}

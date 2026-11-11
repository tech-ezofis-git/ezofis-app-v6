using System.Text;
using Azure;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs.Specialized;
using Microsoft.Extensions.Options;
using SaaSApp.BlobStorage;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.Repository.Infrastructure.Options;

namespace SaaSApp.Repository.Infrastructure.Storage;

/// <summary>
/// Where the API puts the chunks of a large upload. The browser always sends chunks to the API; only
/// the API writes to storage (the browser never talks to Azure Storage directly).
/// </summary>
internal enum LargeUploadMode
{
    /// <summary>The API stages each chunk as an Azure block of the target blob.</summary>
    ApiBlob,

    /// <summary>The API writes each chunk into a local file (dev without blob storage).</summary>
    ApiLocal
}

/// <summary>
/// Chunk storage for large uploads. Azure: each chunk is a block of a block blob, committed in order
/// at the end (blocks can arrive in any order and in parallel). Local disk: chunks are written at
/// their offset into a <c>.part</c> file that is renamed when complete.
/// </summary>
internal sealed class LargeUploadStorage
{
    private const string PartSuffix = ".part";

    private readonly IEzofisBlobStorageService _blobStorage;
    private readonly LocalRepositoryFileStorage _localFiles;
    private readonly RepositoryLargeUploadOptions _options;

    public LargeUploadStorage(
        IEzofisBlobStorageService blobStorage,
        LocalRepositoryFileStorage localFiles,
        IOptions<RepositoryLargeUploadOptions> options)
    {
        _blobStorage = blobStorage;
        _localFiles = localFiles;
        _options = options.Value;
    }

    /// <summary>Azure block id for chunk <paramref name="index"/>; every id of a blob must have the same length.</summary>
    public static string BlockId(int index) =>
        Convert.ToBase64String(Encoding.ASCII.GetBytes($"blk-{index:D6}"));

    public static bool TryParseBlockIndex(string blockId, out int index)
    {
        index = -1;
        try
        {
            var raw = Encoding.ASCII.GetString(Convert.FromBase64String(blockId));
            return raw.StartsWith("blk-", StringComparison.Ordinal)
                && int.TryParse(raw.AsSpan(4), out index)
                && index >= 0;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public LargeUploadMode ResolveMode(string storageProviderCode)
    {
        if (!string.Equals(storageProviderCode, "EZOFIS", StringComparison.OrdinalIgnoreCase))
            throw new NotSupportedException($"Large uploads are not supported for storage provider '{storageProviderCode}'.");

        return _blobStorage.IsConfigured ? LargeUploadMode.ApiBlob : LargeUploadMode.ApiLocal;
    }

    public int ChunkSize => _options.ChunkSizeBytes;

    public int MaxConcurrencyFor(LargeUploadMode mode) =>
        // Local chunks are written by offset into one file; resume relies on contiguous chunks.
        mode == LargeUploadMode.ApiBlob ? Math.Max(1, _options.MaxConcurrency) : 1;

    public async Task StageChunkAsync(
        LargeUploadMode mode,
        Guid tenantId,
        string relativePath,
        int index,
        int chunkSize,
        Stream content,
        CancellationToken cancellationToken)
    {
        if (mode == LargeUploadMode.ApiLocal)
        {
            var partPath = _localFiles.GetFullPath(tenantId, relativePath) + PartSuffix;
            Directory.CreateDirectory(Path.GetDirectoryName(partPath)!);
            await using var file = new FileStream(partPath, FileMode.OpenOrCreate, FileAccess.Write, FileShare.ReadWrite, 1024 * 1024, useAsync: true);
            file.Seek((long)index * chunkSize, SeekOrigin.Begin);
            await content.CopyToAsync(file, 1024 * 1024, cancellationToken);
            return;
        }

        // The SDK retries with a seekable body; a chunk is ChunkSizeBytes (8 MiB by default) and the
        // controller caps the body at 64 MiB.
        await using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, cancellationToken);
        buffer.Position = 0;
        await GetBlockBlob(tenantId, relativePath).StageBlockAsync(BlockId(index), buffer, cancellationToken: cancellationToken);
    }

    /// <summary>Chunks already in storage (so an interrupted upload can resume).</summary>
    public async Task<IReadOnlyList<int>> ListUploadedChunksAsync(
        LargeUploadMode mode,
        Guid tenantId,
        string relativePath,
        int chunkSize,
        long fileSize,
        CancellationToken cancellationToken)
    {
        var totalChunks = TotalChunks(fileSize, chunkSize);

        if (mode == LargeUploadMode.ApiLocal)
        {
            var partPath = _localFiles.GetFullPath(tenantId, relativePath) + PartSuffix;
            if (!File.Exists(partPath))
                return Array.Empty<int>();
            var length = new FileInfo(partPath).Length;
            var complete = length >= fileSize ? totalChunks : (int)(length / chunkSize);
            return Enumerable.Range(0, Math.Min(complete, totalChunks)).ToList();
        }

        var blocks = await GetUncommittedBlocksAsync(tenantId, relativePath, cancellationToken);
        var uploaded = new List<int>();
        for (var i = 0; i < totalChunks; i++)
        {
            if (blocks.TryGetValue(i, out var size) && size == ExpectedChunkSize(i, totalChunks, chunkSize, fileSize))
                uploaded.Add(i);
        }

        return uploaded;
    }

    /// <summary>Checks every chunk is present with the right size, then assembles the final file.</summary>
    public async Task<long> CommitAsync(
        LargeUploadMode mode,
        Guid tenantId,
        string relativePath,
        int chunkSize,
        long fileSize,
        string? contentType,
        CancellationToken cancellationToken)
    {
        var totalChunks = TotalChunks(fileSize, chunkSize);

        if (mode == LargeUploadMode.ApiLocal)
        {
            var fullPath = _localFiles.GetFullPath(tenantId, relativePath);
            var partPath = fullPath + PartSuffix;
            var length = File.Exists(partPath) ? new FileInfo(partPath).Length : 0;
            if (length != fileSize)
            {
                var have = (int)Math.Min(totalChunks, length / chunkSize);
                throw new LargeUploadIncompleteException(Enumerable.Range(have, totalChunks - have).ToList());
            }

            File.Move(partPath, fullPath, overwrite: true);
            return length;
        }

        var blockBlob = GetBlockBlob(tenantId, relativePath);
        var blocks = await GetUncommittedBlocksAsync(tenantId, relativePath, cancellationToken);
        var missing = new List<int>();
        var ids = new List<string>(totalChunks);
        for (var i = 0; i < totalChunks; i++)
        {
            if (!blocks.TryGetValue(i, out var size) || size != ExpectedChunkSize(i, totalChunks, chunkSize, fileSize))
                missing.Add(i);
            ids.Add(BlockId(i));
        }

        if (missing.Count > 0)
            throw new LargeUploadIncompleteException(missing);

        await blockBlob.CommitBlockListAsync(
            ids,
            new CommitBlockListOptions
            {
                HttpHeaders = new BlobHttpHeaders { ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType }
            },
            cancellationToken);

        var properties = await blockBlob.GetPropertiesAsync(cancellationToken: cancellationToken);
        return properties.Value.ContentLength;
    }

    /// <summary>Best-effort removal of an unfinished upload's leftovers.</summary>
    public async Task DiscardAsync(LargeUploadMode mode, Guid tenantId, string relativePath, CancellationToken cancellationToken)
    {
        try
        {
            if (mode == LargeUploadMode.ApiLocal)
            {
                var partPath = _localFiles.GetFullPath(tenantId, relativePath) + PartSuffix;
                if (File.Exists(partPath))
                    File.Delete(partPath);
                return;
            }

            // A blob with only uncommitted blocks cannot be deleted; Azure drops those blocks after 7 days.
            await GetBlockBlob(tenantId, relativePath).DeleteIfExistsAsync(cancellationToken: cancellationToken);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or RequestFailedException)
        {
            // ignore: cleanup is best-effort
        }
    }

    public static int TotalChunks(long fileSize, int chunkSize) =>
        (int)((fileSize + chunkSize - 1) / chunkSize);

    private static long ExpectedChunkSize(int index, int totalChunks, int chunkSize, long fileSize) =>
        index < totalChunks - 1 ? chunkSize : fileSize - (long)chunkSize * (totalChunks - 1);

    private BlockBlobClient GetBlockBlob(Guid tenantId, string relativePath)
    {
        var container = _blobStorage.GetTenantContainer(tenantId, createIfNotExists: false);
        return container.GetBlockBlobClient(relativePath.Replace('\\', '/').TrimStart('/'));
    }

    private async Task<Dictionary<int, long>> GetUncommittedBlocksAsync(
        Guid tenantId,
        string relativePath,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<int, long>();
        try
        {
            var list = await GetBlockBlob(tenantId, relativePath)
                .GetBlockListAsync(BlockListTypes.Uncommitted, cancellationToken: cancellationToken);
            foreach (var block in list.Value.UncommittedBlocks)
            {
                if (TryParseBlockIndex(block.Name, out var index))
                    result[index] = block.SizeLong;
            }
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            // No block uploaded yet.
        }

        return result;
    }
}

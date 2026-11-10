using Azure;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using SaaSApp.BlobStorage;
using SaaSApp.Repository.Application.Contracts;

namespace SaaSApp.Repository.Infrastructure.Storage;

/// <summary>Repository files on Azure Blob (EZOFIS provider) — one container per tenant (ezts + tenantId).</summary>
internal sealed class EzofisBlobRepositoryFileStorage : IRepositoryFileStorage
{
    /// <summary>Read-ahead buffer for the seekable blob stream. The PDF viewer asks for 512 KB ranges;
    /// a bigger buffer would pull several unused MB from Azure per request (slow on poor links).</summary>
    private const int ReadBufferSize = 1024 * 1024;

    private readonly IEzofisBlobStorageService _blobStorage;

    public EzofisBlobRepositoryFileStorage(IEzofisBlobStorageService blobStorage) =>
        _blobStorage = blobStorage;

    public async Task<string> SaveAsync(
        Guid tenantId,
        Guid repositoryId,
        Guid itemId,
        string fileName,
        Stream content,
        string storageProviderCode,
        string? storageRelativePath = null,
        CancellationToken cancellationToken = default)
    {
        EnsureEzofis(storageProviderCode);
        if (!_blobStorage.IsConfigured)
            throw new InvalidOperationException("EzofisBlobStorage is not configured.");

        var blobPath = storageRelativePath
            ?? RepositoryFilePathHelper.BuildFlatRelativePath(repositoryId, itemId, fileName);
        var client = _blobStorage.GetBlobClient(tenantId, blobPath);
        await client.UploadAsync(content, overwrite: true, cancellationToken);
        return blobPath;
    }

    public async Task<Stream> OpenReadAsync(
        Guid tenantId,
        string relativePath,
        string storageProviderCode,
        CancellationToken cancellationToken = default)
    {
        EnsureEzofis(storageProviderCode);
        if (!_blobStorage.IsConfigured)
            throw new InvalidOperationException("EzofisBlobStorage is not configured.");

        var client = _blobStorage.GetBlobClient(tenantId, relativePath, createContainerIfNotExists: false);

        // Seekable stream with a known Length: FileStreamResult(EnableRangeProcessing) can then answer
        // HTTP Range requests by seeking, so the PDF viewer loads only the pages it shows instead of
        // the whole file. (DownloadStreamingAsync returned a forward-only stream, which made every
        // range request download the full blob.) OpenReadAsync reads the blob's properties itself, so
        // no separate ExistsAsync round trip: the viewer makes many small requests.
        try
        {
            return await client.OpenReadAsync(
                new BlobOpenReadOptions(allowModifications: false) { BufferSize = ReadBufferSize },
                cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            throw new FileNotFoundException("Repository file not found in blob storage.", relativePath);
        }
    }

    public async Task<string> CopyAsync(
        Guid tenantId,
        string sourceRelativePath,
        string destinationRelativePath,
        string storageProviderCode,
        CancellationToken cancellationToken = default)
    {
        EnsureEzofis(storageProviderCode);
        if (!_blobStorage.IsConfigured)
            throw new InvalidOperationException("EzofisBlobStorage is not configured.");

        var source = _blobStorage.GetBlobClient(tenantId, sourceRelativePath, createContainerIfNotExists: false);
        if (!await source.ExistsAsync(cancellationToken))
            throw new FileNotFoundException("Repository file not found in blob storage.", sourceRelativePath);

        var destination = _blobStorage.GetBlobClient(tenantId, destinationRelativePath);

        // Server-side copy inside the storage account: no bytes pass through the API, so a 10 GB
        // export does not hit request timeouts. A short read SAS authorises the source explicitly.
        var sourceUri = source.CanGenerateSasUri
            ? source.GenerateSasUri(BlobSasPermissions.Read, DateTimeOffset.UtcNow.AddHours(2))
            : source.Uri;

        var operation = await destination.StartCopyFromUriAsync(sourceUri, cancellationToken: cancellationToken);
        await operation.WaitForCompletionAsync(cancellationToken);
        return destinationRelativePath.Replace('\\', '/').TrimStart('/');
    }

    public async Task DeleteAsync(
        Guid tenantId,
        string relativePath,
        string storageProviderCode,
        CancellationToken cancellationToken = default)
    {
        EnsureEzofis(storageProviderCode);
        if (!_blobStorage.IsConfigured)
            throw new InvalidOperationException("EzofisBlobStorage is not configured.");

        if (string.IsNullOrWhiteSpace(relativePath))
            return;

        var client = _blobStorage.GetBlobClient(tenantId, relativePath.Trim().Replace('\\', '/'), createContainerIfNotExists: false);
        await client.DeleteIfExistsAsync(cancellationToken: cancellationToken);
    }

    public bool CanRead(string storageProviderCode) =>
        IsEzofis(storageProviderCode) && _blobStorage.IsConfigured;

    private static void EnsureEzofis(string code)
    {
        if (!IsEzofis(code))
            throw new NotSupportedException($"Blob storage only supports EZOFIS provider, not '{code}'.");
    }

    private static bool IsEzofis(string code) =>
        string.Equals(code, "EZOFIS", StringComparison.OrdinalIgnoreCase);

    // Intentionally not using original file name in blob path:
    // path is stable and UI/file name is stored in DB.
}

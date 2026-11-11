namespace SaaSApp.Repository.Application.Contracts;

public interface IRepositoryFileStorage
{
    Task<string> SaveAsync(
        Guid tenantId,
        Guid repositoryId,
        Guid itemId,
        string fileName,
        Stream content,
        string storageProviderCode,
        string? storageRelativePath = null,
        CancellationToken cancellationToken = default);

    Task<Stream> OpenReadAsync(
        Guid tenantId,
        string relativePath,
        string storageProviderCode,
        CancellationToken cancellationToken = default);

    /// <summary>Deletes a blob/file at <paramref name="relativePath"/> if it exists (best-effort for monitor cleanup).</summary>
    Task DeleteAsync(
        Guid tenantId,
        string relativePath,
        string storageProviderCode,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Copies a stored file to <paramref name="destinationRelativePath"/> inside the same storage,
    /// without streaming the bytes through the API (server-side blob copy / local file copy).
    /// Used when exporting large staged files. Returns the destination relative path.
    /// </summary>
    Task<string> CopyAsync(
        Guid tenantId,
        string sourceRelativePath,
        string destinationRelativePath,
        string storageProviderCode,
        CancellationToken cancellationToken = default);

    bool CanRead(string storageProviderCode);

    /// <summary>
    /// Reads <paramref name="length"/> bytes from <paramref name="offset"/> (fewer at the end of the file).
    /// Blob storage reads just that range in one request, for the page-by-page PDF viewer.
    /// </summary>
    async Task<byte[]> ReadRangeAsync(
        Guid tenantId,
        string relativePath,
        string storageProviderCode,
        long offset,
        int length,
        CancellationToken cancellationToken = default)
    {
        await using var stream = await OpenReadAsync(tenantId, relativePath, storageProviderCode, cancellationToken);
        stream.Seek(offset, SeekOrigin.Begin);
        var buffer = new byte[length];
        var read = 0;
        while (read < length)
        {
            var n = await stream.ReadAsync(buffer.AsMemory(read, length - read), cancellationToken);
            if (n == 0) break;
            read += n;
        }
        return read == length ? buffer : buffer[..read];
    }
}

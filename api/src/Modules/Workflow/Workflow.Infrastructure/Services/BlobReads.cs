using System.Collections.Concurrent;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Shared helpers for reading form / workflow JSON from blob storage. The storage account is far
/// from the API (each call is a ~250 ms round trip), so reads make one call, not three.
/// </summary>
internal static class BlobReads
{
    private static readonly ConcurrentDictionary<string, BlobServiceClient> Clients = new();

    /// <summary>
    /// How long a loaded form / workflow JSON stays in memory. Saves and deletes in this API update
    /// the cache at once; the expiry only bounds writes made outside it (scripts, migrations).
    /// </summary>
    public static readonly TimeSpan JsonCacheDuration = TimeSpan.FromMinutes(5);

    /// <summary>A cached load: <see cref="Json"/> is null when nothing is stored (also cached).</summary>
    public sealed record CachedJson(string? Json);

    /// <summary>One client per connection string, reused across requests.</summary>
    public static BlobServiceClient ServiceClient(string connectionString) =>
        Clients.GetOrAdd(connectionString, cs => new BlobServiceClient(cs));

    /// <summary>Downloads a blob in one call; null when the blob or its container does not exist.</summary>
    public static async Task<BlobDownloadResult?> TryDownloadAsync(BlobClient blob, CancellationToken cancellationToken)
    {
        try
        {
            return (await blob.DownloadContentAsync(cancellationToken)).Value;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }
}

using Azure.Storage.Blobs;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using SaaSApp.Workflow.Application.Contracts;
using System.IO;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>Stores workflow JSON definitions in blob storage or file system.</summary>
public sealed class WorkflowJsonStorageService : IWorkflowJsonStorageService
{
    private readonly ITenantContext _tenantContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WorkflowJsonStorageService> _logger;
    private readonly IMemoryCache _cache;

    public WorkflowJsonStorageService(
        ITenantContext tenantContext,
        IConfiguration configuration,
        ILogger<WorkflowJsonStorageService> logger,
        IMemoryCache cache)
    {
        _tenantContext = tenantContext;
        _configuration = configuration;
        _logger = logger;
        _cache = cache;
    }

    public async Task SaveWorkflowJsonAsync(Guid workflowId, string json, CancellationToken cancellationToken = default)
    {
        var filePath = GetLocalFilePath(workflowId);

        if (await TrySaveToBlobAsync(workflowId, json, cancellationToken))
        {
            // Drop stale local copy so GET never returns an older file when blob is configured.
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                _logger.LogInformation(
                    "Removed stale local workflow JSON for workflow {WorkflowId} after blob save",
                    workflowId);
            }
        }
        else
        {
            // Fallback for local/dev when blob config is not provided.
            var folderPath = Path.GetDirectoryName(filePath)!;
            Directory.CreateDirectory(folderPath);
            await File.WriteAllTextAsync(filePath, json, cancellationToken);

            _logger.LogInformation("Workflow JSON saved for workflow {WorkflowId} at {FilePath}", workflowId, filePath);
        }

        _cache.Set(CacheKey(workflowId), new BlobReads.CachedJson(json), BlobReads.JsonCacheDuration);
    }

    public async Task<string?> GetWorkflowJsonAsync(Guid workflowId, CancellationToken cancellationToken = default)
    {
        var key = CacheKey(workflowId);
        if (_cache.TryGetValue(key, out BlobReads.CachedJson? cached) && cached != null)
            return cached.Json;

        // "Not stored" is cached too: most screens ask again for the same workflow.
        var json = await LoadWorkflowJsonAsync(workflowId, cancellationToken);
        _cache.Set(key, new BlobReads.CachedJson(json), BlobReads.JsonCacheDuration);
        return json;
    }

    private string CacheKey(Guid workflowId) =>
        $"workflow-json:{_tenantContext.TenantId:N}:{workflowId:N}";

    private async Task<string?> LoadWorkflowJsonAsync(Guid workflowId, CancellationToken cancellationToken)
    {
        var filePath = GetLocalFilePath(workflowId);
        var fileExists = File.Exists(filePath);
        // Read-only: no container create, and one download instead of exists + properties + download
        // (each blob call is a ~250 ms round trip). The download carries LastModified too.
        var blobClient = GetBlobClient(workflowId, createContainer: false);

        var download = blobClient == null ? null : await BlobReads.TryDownloadAsync(blobClient, cancellationToken);
        if (download != null)
        {
            if (fileExists)
            {
                var blobModified = download.Details.LastModified.UtcDateTime;
                var fileModified = File.GetLastWriteTimeUtc(filePath);

                if (fileModified > blobModified)
                {
                    _logger.LogWarning(
                        "Local workflow JSON is newer than blob for workflow {WorkflowId}; returning local file",
                        workflowId);
                    return await File.ReadAllTextAsync(filePath, cancellationToken);
                }
            }

            _logger.LogInformation(
                "Workflow JSON loaded from blob for workflow {WorkflowId}: {BlobPath}",
                workflowId,
                blobClient!.Uri);
            return download.Content.ToString();
        }

        if (!fileExists)
            return null;

        _logger.LogInformation("Retrieving workflow JSON for workflow {WorkflowId} from {FilePath}", workflowId, filePath);
        return await File.ReadAllTextAsync(filePath, cancellationToken);
    }

    public async Task DeleteWorkflowJsonAsync(Guid workflowId, CancellationToken cancellationToken = default)
    {
        _cache.Remove(CacheKey(workflowId));
        await TryDeleteFromBlobAsync(workflowId, cancellationToken);

        var filePath = GetLocalFilePath(workflowId);
        if (!File.Exists(filePath))
            return;

        File.Delete(filePath);
        _logger.LogInformation("Deleted workflow JSON for workflow {WorkflowId} at {FilePath}", workflowId, filePath);
        await Task.CompletedTask;
    }

    private string GetLocalFilePath(Guid workflowId)
    {
        var basePath = Path.Combine(AppContext.BaseDirectory, "Flow Json");
        var tenantFolder = _tenantContext.TenantId?.ToString("N") ?? "default";
        return Path.Combine(basePath, tenantFolder, $"{workflowId:N}.json");
    }

    private async Task<bool> TrySaveToBlobAsync(Guid workflowId, string json, CancellationToken cancellationToken)
    {
        var blobClient = GetBlobClient(workflowId);
        if (blobClient == null)
            return false;

        using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(json));
        await blobClient.UploadAsync(stream, overwrite: true, cancellationToken);
        _logger.LogInformation("Workflow JSON saved to blob for workflow {WorkflowId}: {BlobPath}", workflowId, blobClient.Uri);
        return true;
    }

    private async Task<bool> TryDeleteFromBlobAsync(Guid workflowId, CancellationToken cancellationToken)
    {
        var blobClient = GetBlobClient(workflowId);
        if (blobClient == null)
            return false;

        await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
        _logger.LogInformation("Workflow JSON deleted from blob for workflow {WorkflowId}: {BlobPath}", workflowId, blobClient.Uri);
        return true;
    }

    private BlobClient? GetBlobClient(Guid workflowId, bool createContainer = true)
    {
        var connectionString = ResolveBlobConnectionString();
        if (string.IsNullOrWhiteSpace(connectionString))
            return null;

        var tenantId = _tenantContext.TenantId?.ToString("N").ToLowerInvariant() ?? "default";
        var containerPrefix = ResolveBlobContainerPrefix();
        var containerName = $"{containerPrefix}{tenantId}";
        var blobPath = $"Flow Json/{workflowId:N}.json";

        var container = BlobReads.ServiceClient(connectionString).GetBlobContainerClient(containerName);
        if (createContainer)
            container.CreateIfNotExists();
        return container.GetBlobClient(blobPath);
    }

    private string? ResolveBlobConnectionString() =>
        _configuration["EzofisBlobStorage:ConnectionString"]
        ?? _configuration["WorkflowJsonStorage:Blob:ConnectionString"]
        ?? _configuration["WorkflowJsonStorage:ConnectionString"];

    private string ResolveBlobContainerPrefix() =>
        (_configuration["EzofisBlobStorage:ContainerPrefix"]
         ?? _configuration["WorkflowJsonStorage:Blob:ContainerPrefix"]
         ?? "ezts").ToLowerInvariant();
}

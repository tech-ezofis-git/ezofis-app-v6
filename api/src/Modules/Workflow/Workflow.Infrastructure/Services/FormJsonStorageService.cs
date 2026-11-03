using Azure.Storage.Blobs;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Infrastructure.Services;

public sealed class FormJsonStorageService : IFormJsonStorageService
{
    private readonly ITenantContext _tenantContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FormJsonStorageService> _logger;
    private readonly IMemoryCache _cache;

    public FormJsonStorageService(
        ITenantContext tenantContext,
        IConfiguration configuration,
        ILogger<FormJsonStorageService> logger,
        IMemoryCache cache)
    {
        _tenantContext = tenantContext;
        _configuration = configuration;
        _logger = logger;
        _cache = cache;
    }

    public async Task SaveFormJsonAsync(string formId, string json, CancellationToken cancellationToken = default)
    {
        if (!await TrySaveToBlobAsync(formId, json, cancellationToken))
        {
            var folder = Path.Combine(AppContext.BaseDirectory, "Form Json");
            Directory.CreateDirectory(folder);
            var filePath = Path.Combine(folder, $"{SanitizeFileName(formId)}.json");
            await File.WriteAllTextAsync(filePath, json, cancellationToken);
            _logger.LogInformation("Form JSON saved for form {FormId} at {FilePath}", formId, filePath);
        }

        _cache.Set(CacheKey(formId), new BlobReads.CachedJson(json), BlobReads.JsonCacheDuration);
    }

    public async Task<string?> GetFormJsonAsync(string formId, CancellationToken cancellationToken = default)
    {
        var key = CacheKey(formId);
        if (_cache.TryGetValue(key, out BlobReads.CachedJson? cached) && cached != null)
            return cached.Json;

        var json = await TryGetFromBlobAsync(formId, cancellationToken);
        if (json == null)
        {
            var filePath = Path.Combine(AppContext.BaseDirectory, "Form Json", $"{SanitizeFileName(formId)}.json");
            if (File.Exists(filePath))
                json = await File.ReadAllTextAsync(filePath, cancellationToken);
        }

        // "Not stored" is cached too: most screens ask again for the same form.
        _cache.Set(key, new BlobReads.CachedJson(json), BlobReads.JsonCacheDuration);
        return json;
    }

    private string CacheKey(string formId) =>
        $"form-json:{_tenantContext.TenantId:N}:{SanitizeFileName(formId)}";

    private static string SanitizeFileName(string formId) =>
        string.Concat(formId.Where(c => char.IsLetterOrDigit(c) || c is '-' or '_'));

    private async Task<bool> TrySaveToBlobAsync(string formId, string json, CancellationToken cancellationToken)
    {
        var blobClient = GetBlobClient(formId);
        if (blobClient == null)
            return false;

        using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(json));
        await blobClient.UploadAsync(stream, overwrite: true, cancellationToken);
        _logger.LogInformation("Form JSON saved to blob for form {FormId}", formId);
        return true;
    }

    private async Task<string?> TryGetFromBlobAsync(string formId, CancellationToken cancellationToken)
    {
        // Read-only: no container create, and one download instead of exists + download.
        var blobClient = GetBlobClient(formId, createContainer: false);
        if (blobClient == null)
            return null;

        var download = await BlobReads.TryDownloadAsync(blobClient, cancellationToken);
        return download?.Content.ToString();
    }

    private BlobClient? GetBlobClient(string formId, bool createContainer = true)
    {
        var connectionString = _configuration["EzofisBlobStorage:ConnectionString"]
            ?? _configuration["WorkflowJsonStorage:Blob:ConnectionString"]
            ?? _configuration["WorkflowJsonStorage:ConnectionString"];
        if (string.IsNullOrWhiteSpace(connectionString))
            return null;

        var tenantId = _tenantContext.TenantId?.ToString("N").ToLowerInvariant() ?? "default";
        var containerPrefix = (_configuration["EzofisBlobStorage:ContainerPrefix"]
            ?? _configuration["WorkflowJsonStorage:Blob:ContainerPrefix"]
            ?? "ezts").ToLowerInvariant();
        var containerName = $"{containerPrefix}{tenantId}";
        var blobPath = $"Form Json/{SanitizeFileName(formId)}.json";

        var container = BlobReads.ServiceClient(connectionString).GetBlobContainerClient(containerName);
        if (createContainer)
            container.CreateIfNotExists();
        return container.GetBlobClient(blobPath);
    }
}

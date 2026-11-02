using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using SaaSApp.Repository.Application;
using SaaSApp.SharedKernel.Options;

namespace SaaSApp.Api.Services;

/// <summary>
/// Server-side PII redaction of repository files via the agents (<c>POST /api/pii/redact</c>,
/// PyMuPDF). The returned file has the text and image pixels under each cover removed.
/// </summary>
public interface IPiiRedactedFileService
{
    /// <summary>PDF, images, Word (.docx), Excel (.xlsx), CSV and text. Others cannot be redacted.</summary>
    bool CanRedact(string? fileName, string? contentType);

    /// <exception cref="PiiRedactionUnavailableException">The file could not be redacted.</exception>
    Task<PiiRedactedFile> RedactAsync(
        byte[] original,
        string fileName,
        string contentType,
        IReadOnlyList<string> values,
        IReadOnlyList<string> labels,
        CancellationToken cancellationToken = default);
}

public sealed record PiiRedactedFile(byte[] Content, string ContentType, int Redactions);

/// <summary>Redaction failed; callers must not fall back to the original file.</summary>
public sealed class PiiRedactionUnavailableException : Exception
{
    public PiiRedactionUnavailableException(string message, Exception? inner = null)
        : base(message, inner)
    {
    }
}

public sealed class PiiRedactedFileService : IPiiRedactedFileService
{
    private const int MaxCachedBytes = 20 * 1024 * 1024;

    /// <summary>Bump when the redaction rules change, so cached copies are rebuilt.</summary>
    private const string RedactorVersion = "5";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);

    private static readonly HashSet<string> Extensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tif", ".tiff", ".webp",
        ".docx", ".xlsx", ".csv", ".txt"
    };

    private readonly HttpClient _httpClient;
    private readonly AgentsChatOptions _agentsChat;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PiiRedactedFileService> _logger;

    public PiiRedactedFileService(
        HttpClient httpClient,
        IOptions<AgentsChatOptions> agentsChat,
        IMemoryCache cache,
        ILogger<PiiRedactedFileService> logger)
    {
        _httpClient = httpClient;
        _agentsChat = agentsChat.Value;
        _cache = cache;
        _logger = logger;
    }

    public bool CanRedact(string? fileName, string? contentType)
    {
        // The agents pick the handler by file extension, so the name must carry a known one.
        var type = (contentType ?? string.Empty).Trim().ToLowerInvariant();
        return Extensions.Contains(Path.GetExtension(fileName ?? string.Empty))
               || (string.IsNullOrEmpty(Path.GetExtension(fileName ?? string.Empty))
                   && (type == "application/pdf" || type.StartsWith("image/", StringComparison.Ordinal)));
    }

    public async Task<PiiRedactedFile> RedactAsync(
        byte[] original,
        string fileName,
        string contentType,
        IReadOnlyList<string> values,
        IReadOnlyList<string> labels,
        CancellationToken cancellationToken = default)
    {
        // Same file + same values/labels → same output; anything changed → new key.
        var key = $"pii-redacted:v{RedactorVersion}:" + CacheKey(original, values, labels);
        if (_cache.TryGetValue(key, out PiiRedactedFile? cached) && cached != null)
            return cached;

        var url = RepositoryPiiFieldRules.ResolveAgentsUrl(_agentsChat.ResolveChatUrl(), "/api/pii/redact")
            ?? throw new PiiRedactionUnavailableException("Agents:ChatUrl is not configured, so files cannot be redacted.");

        using var form = new MultipartFormDataContent();
        var filePart = new ByteArrayContent(original);
        filePart.Headers.ContentType = MediaTypeHeaderValue.TryParse(contentType, out var parsed)
            ? parsed
            : new MediaTypeHeaderValue("application/octet-stream");
        form.Add(filePart, "file", string.IsNullOrWhiteSpace(fileName) ? "document" : fileName);
        form.Add(new StringContent(JsonSerializer.Serialize(new { values, labels, patterns = true })), "spec");

        try
        {
            using var response = await _httpClient.PostAsync(url, form, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var detail = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new PiiRedactionUnavailableException(
                    $"The file could not be redacted ({(int)response.StatusCode}): {Truncate(detail, 300)}");
            }

            var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            var type = response.Content.Headers.ContentType?.MediaType ?? "application/pdf";
            int.TryParse(
                response.Headers.TryGetValues("X-Pii-Redactions", out var counts) ? counts.FirstOrDefault() : null,
                out var redactions);

            var result = new PiiRedactedFile(bytes, type, redactions);
            if (bytes.Length <= MaxCachedBytes)
                _cache.Set(key, result, CacheTtl);
            _logger.LogInformation(
                "PII redaction of {FileName}: {Redactions} covers, {Bytes} bytes", fileName, redactions, bytes.Length);
            return result;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException
                                       && !cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "PII redaction call failed for {FileName}.", fileName);
            throw new PiiRedactionUnavailableException("The redaction service is unavailable. Try again later.", ex);
        }
    }

    private static string CacheKey(byte[] original, IReadOnlyList<string> values, IReadOnlyList<string> labels)
    {
        using var sha = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        sha.AppendData(original);
        foreach (var part in values.Append("\u001e").Concat(labels))
            sha.AppendData(Encoding.UTF8.GetBytes(part + "\u001f"));
        return Convert.ToHexString(sha.GetHashAndReset());
    }

    private static string Truncate(string value, int limit) => value.Length > limit ? value[..limit] : value;
}

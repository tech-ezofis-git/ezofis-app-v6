using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaaSApp.MultiTenancy;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.Security;

namespace SaaSApp.Api.Controllers;

/// <summary>
/// Chunked, resumable upload of large files (up to 10 GB) into a repository's Draft Files.
/// The browser only talks to this API; the API alone writes the file to storage.
/// 1. POST init → fileId, chunk size and how many chunks to send at once.
/// 2. PUT chunks/{index} for every chunk (parallel, any order).
/// 3. POST complete → commits the chunks and saves the OCR metadata from the browser.
/// GET {id} lists stored chunks so an interrupted upload resumes where it stopped.
/// </summary>
[ApiController]
[Authorize(Policy = AuthorizationPolicies.TenantUser)]
public sealed class LargeUploadController : ControllerBase
{
    /// <summary>Upper bound for one chunk body (the configured chunk size is 8 MiB).</summary>
    private const long MaxChunkBodyBytes = 64L * 1024 * 1024;

    private readonly ITenantProvider _tenantProvider;
    private readonly IRepositoryLargeUploadService _largeUpload;

    public LargeUploadController(ITenantProvider tenantProvider, IRepositoryLargeUploadService largeUpload)
    {
        _tenantProvider = tenantProvider;
        _largeUpload = largeUpload;
    }

    /// <summary>POST api/uploadAndIndex/large/init — start a large upload.</summary>
    [HttpPost("/api/uploadAndIndex/large/init")]
    [ProducesResponseType(typeof(LargeUploadSession), StatusCodes.Status200OK)]
    public Task<IActionResult> Init([FromBody] LargeUploadInitRequest request, CancellationToken cancellationToken) =>
        Run(async () => Ok(await _largeUpload.InitAsync(request, RequireTenantId(), GetUserId(), cancellationToken)));

    /// <summary>GET api/uploadAndIndex/large/{id} — chunks already stored (resume).</summary>
    [HttpGet("/api/uploadAndIndex/large/{id:guid}")]
    [ProducesResponseType(typeof(LargeUploadStatus), StatusCodes.Status200OK)]
    public Task<IActionResult> Status(
        Guid id,
        [FromQuery] Guid repositoryId,
        [FromQuery] long fileSize,
        CancellationToken cancellationToken) =>
        Run(async () =>
        {
            var status = await _largeUpload.GetStatusAsync(id, repositoryId, fileSize, RequireTenantId(), GetUserId(), cancellationToken);
            return status == null ? NotFoundUpload() : Ok(status);
        });

    /// <summary>PUT api/uploadAndIndex/large/{id}/chunks/{index} — raw chunk bytes (application/octet-stream).</summary>
    [HttpPut("/api/uploadAndIndex/large/{id:guid}/chunks/{index:int}")]
    [RequestSizeLimit(MaxChunkBodyBytes)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public Task<IActionResult> UploadChunk(
        Guid id,
        int index,
        [FromQuery] Guid repositoryId,
        [FromQuery] long fileSize,
        CancellationToken cancellationToken) =>
        Run(async () =>
        {
            if (Request.ContentLength is null or 0)
                return BadRequest(new { error = "Chunk body is empty." });

            var stored = await _largeUpload.UploadChunkAsync(
                id, repositoryId, index, fileSize, Request.Body, RequireTenantId(), GetUserId(), cancellationToken);
            return stored ? NoContent() : NotFoundUpload();
        });

    /// <summary>POST api/uploadAndIndex/large/{id}/complete — assemble the file and save OCR metadata.</summary>
    [HttpPost("/api/uploadAndIndex/large/{id:guid}/complete")]
    [ProducesResponseType(typeof(UploadWithOcrResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public Task<IActionResult> Complete(
        Guid id,
        [FromBody] LargeUploadCompleteRequest request,
        CancellationToken cancellationToken) =>
        Run(async () =>
        {
            var result = await _largeUpload.CompleteAsync(id, request, RequireTenantId(), GetUserId(), cancellationToken);
            return result == null ? NotFoundUpload() : Ok(result);
        });

    private async Task<IActionResult> Run(Func<Task<IActionResult>> action)
    {
        try
        {
            return await action();
        }
        catch (LargeUploadIncompleteException ex)
        {
            // The browser re-sends these chunks and calls complete again.
            return Conflict(new { error = ex.Message, missingChunks = ex.MissingChunks });
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or NotSupportedException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private IActionResult NotFoundUpload() => NotFound(new { error = "Upload not found." });

    private Guid RequireTenantId() =>
        _tenantProvider.GetTenantId() ?? throw new InvalidOperationException("Tenant context is required (X-Tenant-Id).");

    private Guid? GetUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? User.FindFirstValue("oid");
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

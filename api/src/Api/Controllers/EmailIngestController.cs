using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Mvc;
using SaaSApp.Security;
using SaaSApp.Workflow.Application.Connectors;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Api.Controllers;

[ApiController]
[Route("api/email-ingest")]
[Authorize(Policy = AuthorizationPolicies.TenantUser)]
public sealed class EmailIngestController : ControllerBase
{
    private readonly IServiceProvider _services;
    private readonly IGmailPushService _gmailPush;
    private readonly IWatchFoxWebhookService _watchFox;

    public EmailIngestController(
        IServiceProvider services,
        IGmailPushService gmailPush,
        IWatchFoxWebhookService watchFox)
    {
        _services = services;
        _gmailPush = gmailPush;
        _watchFox = watchFox;
    }

    /// <summary>
    /// Mailbox actions need the tenant database. The anonymous Gmail push does not,
    /// so this stays lazy and is not opened while Pub/Sub calls /gmail/push.
    /// </summary>
    private IEmailIngestService EmailIngest => _services.GetRequiredService<IEmailIngestService>();

    /// <summary>Tenant of the signed-in user (JWT <c>tid</c> or <c>X-Tenant-Id</c>). Not used by anonymous calls.</summary>
    private Guid? CurrentTenantId => _services.GetRequiredService<ITenantContext>().TenantId;

    private Guid? CurrentUserId => _services.GetRequiredService<ICurrentUserProvider>().GetUserId();

    private IWorkflowEmailWebhookService EmailWebhook => _services.GetRequiredService<IWorkflowEmailWebhookService>();

    /// <summary>Google Pub/Sub push. When mail arrives, poll the linked mailbox and start the workflow.</summary>
    [AllowAnonymous]
    [HttpPost("gmail/push")]
    public async Task<IActionResult> GmailPush([FromQuery] string? token, CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(cancellationToken);
        var headerToken = Request.Headers["X-Gmail-Push-Token"].FirstOrDefault();
        try
        {
            await _gmailPush.HandlePushAsync(body, string.IsNullOrWhiteSpace(token) ? headerToken : token, cancellationToken);
            return Ok(new { accepted = true });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// WatchFox webhook. Invoice matches queue an MJB ticket.
    /// Enquiries matches, or a multipart <c>.eml</c> file, start workflow
    /// <c>1325cf43-3902-426d-800f-ffde5bbfe0da</c> with that file on
    /// <c>POST /api/workflows/{{id}}/start</c>.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("watchfox")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(MultipartBodyLengthLimit = 104_857_600)]
    public async Task<IActionResult> WatchFox(CancellationToken cancellationToken)
    {
        var signature = Request.Headers["X-WatchFox-Signature"].FirstOrDefault();
        try
        {
            if (Request.HasFormContentType)
            {
                var file = Request.Form.Files.GetFile("file")
                    ?? Request.Form.Files.GetFile("eml")
                    ?? Request.Form.Files.FirstOrDefault();
                if (file == null || file.Length == 0)
                    return BadRequest(new { error = "Enquiry webhook requires the .eml form file." });

                await using var ms = new MemoryStream();
                await file.CopyToAsync(ms, cancellationToken);
                var payload = Request.Form["payload"].FirstOrDefault();
                await _watchFox.AcceptEnquiryFileAsync(
                    ms.ToArray(),
                    file.FileName,
                    file.ContentType,
                    signature,
                    payload,
                    cancellationToken);
            }
            else
            {
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync(cancellationToken);
                await _watchFox.AcceptAsync(body, signature, cancellationToken);
            }

            return Ok(new { accepted = true });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// One UI call. Open the returned <c>url</c>. After Office 365 sign-in the API creates the
    /// enquiry watch and sends the browser to <c>redirectUrl</c> with <c>connectionId</c> and <c>watchId</c>.
    /// Branding defaults come from host WatchFox settings; optional body fields override them for this link.
    /// </summary>
    /// <remarks>
    /// <c>provider</c> is <c>outlook</c> (default) or <c>gmail</c>. <c>types</c> are the WatchFox
    /// types to catch (default <c>["enquiry"]</c>). The watch posts to
    /// <c>/api/email-ingest/webhook/{tenantId}/{workflowId}</c>.
    /// </remarks>
    [HttpPost("watchfox/connect")]
    public async Task<IActionResult> ConnectMailbox(
        [FromBody] WatchFoxConnectRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = CurrentTenantId ?? request.TenantId;
        if (request.TenantId != Guid.Empty && request.TenantId != tenantId)
            return BadRequest(new { error = "tenantId does not match the signed-in tenant." });

        try
        {
            var branding = new WatchFoxConnectBranding(
                request.AppName,
                request.LogoUrl,
                request.AccentColor,
                request.SupportEmail,
                request.HidePoweredBy);
            var link = await _watchFox.CreateConnectLinkAsync(
                new WatchFoxConnectRequestArgs(
                    tenantId,
                    request.WorkflowId,
                    request.Provider,
                    request.Types,
                    request.RedirectUrl,
                    CurrentUserId,
                    branding),
                cancellationToken);
            return Ok(link);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>WatchFox browser return (Outlook or Gmail). Creates the watch, then opens the UI page.</summary>
    [AllowAnonymous]
    [HttpGet("watchfox/connected")]
    public async Task<IActionResult> MailboxConnected(
        [FromQuery] string? status,
        [FromQuery(Name = "connection_id")] string? connectionId,
        [FromQuery] string? email,
        [FromQuery] string? state,
        [FromQuery(Name = "r")] string? returnUrl,
        CancellationToken cancellationToken)
    {
        var back = await _watchFox.CompleteConnectAsync(status, connectionId, email, state, returnUrl, cancellationToken);
        return Redirect(back);
    }

    /// <summary>
    /// Per-workflow email webhook. Every workflow has its own URL in this format, and the email
    /// starts <paramref name="workflowId"/> with its .eml. Two ways in:
    /// WatchFox (signed with <c>X-WatchFox-Signature</c>), or a client's own tool with the workflow's
    /// key in <c>X-Webhook-Key</c>, sending the .eml as multipart <c>file</c>, a <c>message/rfc822</c>
    /// body, or JSON <c>{ "eml_base64": "…" }</c>.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("webhook/{tenantId:guid}/{workflowId:guid}")]
    [RequestSizeLimit(40_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 40_000_000)]
    public async Task<IActionResult> WorkflowWebhook(
        Guid tenantId,
        Guid workflowId,
        CancellationToken cancellationToken)
    {
        var signature = Request.Headers["X-WatchFox-Signature"].FirstOrDefault();
        try
        {
            if (!string.IsNullOrWhiteSpace(signature))
            {
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync(cancellationToken);
                await _watchFox.AcceptForWorkflowAsync(body, signature, tenantId, workflowId, cancellationToken);
                return Ok(new { accepted = true });
            }

            var key = Request.Headers["X-Webhook-Key"].FirstOrDefault();
            string? json = null;
            byte[]? file = null;
            string? fileName = null;
            if (Request.HasFormContentType)
            {
                // An empty form still goes to the service, so the key is checked before the body.
                var form = await Request.ReadFormAsync(cancellationToken);
                var upload = form.Files.GetFile("file") ?? form.Files.GetFile("eml") ?? form.Files.FirstOrDefault();
                if (upload is { Length: > 0 })
                {
                    await using var ms = new MemoryStream();
                    await upload.CopyToAsync(ms, cancellationToken);
                    file = ms.ToArray();
                    fileName = upload.FileName;
                }
            }
            else if (Request.ContentType?.Contains("rfc822", StringComparison.OrdinalIgnoreCase) == true)
            {
                await using var ms = new MemoryStream();
                await Request.Body.CopyToAsync(ms, cancellationToken);
                file = ms.ToArray();
            }
            else
            {
                using var reader = new StreamReader(Request.Body);
                json = await reader.ReadToEndAsync(cancellationToken);
            }

            await EmailWebhook.AcceptAsync(tenantId, workflowId, key, json, file, fileName, cancellationToken);
            return Ok(new { accepted = true });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>The workflow's webhook URL and whether a key is set (the key itself is never shown again).</summary>
    [HttpGet("webhook/workflows/{workflowId:guid}")]
    public Task<IActionResult> WorkflowWebhookInfo(Guid workflowId, CancellationToken cancellationToken) =>
        RunForTenant(tenantId => EmailWebhook.GetAsync(tenantId, workflowId, cancellationToken));

    /// <summary>Creates or replaces the workflow's webhook key. The response has the key once.</summary>
    [HttpPost("webhook/workflows/{workflowId:guid}/key")]
    public Task<IActionResult> CreateWorkflowWebhookKey(Guid workflowId, CancellationToken cancellationToken) =>
        RunForTenant(tenantId => EmailWebhook.CreateKeyAsync(tenantId, workflowId, CurrentUserId, cancellationToken));

    /// <summary>Turns the workflow's webhook key off.</summary>
    [HttpDelete("webhook/workflows/{workflowId:guid}/key")]
    public Task<IActionResult> DisableWorkflowWebhookKey(Guid workflowId, CancellationToken cancellationToken) =>
        RunForTenant(tenantId => EmailWebhook.DisableAsync(tenantId, workflowId, CurrentUserId, cancellationToken));

    /// <summary>Types for the "what to catch" picker: WatchFox presets plus the account's custom types.</summary>
    [HttpGet("watchfox/types")]
    public async Task<IActionResult> WatchFoxTypes(CancellationToken cancellationToken) =>
        Ok(await _watchFox.GetTypesAsync(cancellationToken));

    /// <summary>This workflow's webhook URL and the mailboxes watching it.</summary>
    [HttpGet("watchfox/workflows/{workflowId:guid}/watches")]
    public Task<IActionResult> WorkflowWatches(Guid workflowId, CancellationToken cancellationToken) =>
        RunForTenant(tenantId => _watchFox.ListWorkflowWatchesAsync(tenantId, workflowId, cancellationToken));

    /// <summary>Change the types a saved watch catches.</summary>
    [HttpPatch("watchfox/watches/{id:guid}")]
    public Task<IActionResult> UpdateWatch(
        Guid id,
        [FromBody] WatchFoxUpdateWatchRequest request,
        CancellationToken cancellationToken) =>
        RunForTenant(tenantId => _watchFox.UpdateWatchTypesAsync(tenantId, id, request.Types, CurrentUserId, cancellationToken));

    [HttpPost("watchfox/watches/{id:guid}/pause")]
    public Task<IActionResult> PauseWatch(Guid id, CancellationToken cancellationToken) =>
        RunForTenant(tenantId => _watchFox.PauseWatchAsync(tenantId, id, CurrentUserId, cancellationToken));

    [HttpPost("watchfox/watches/{id:guid}/resume")]
    public Task<IActionResult> ResumeWatch(
        Guid id,
        [FromBody] WatchFoxResumeWatchRequest? request,
        CancellationToken cancellationToken) =>
        RunForTenant(tenantId => _watchFox.ResumeWatchAsync(tenantId, id, request?.CatchUp ?? false, CurrentUserId, cancellationToken));

    /// <summary>Sign-in link for a mailbox that needs attention.</summary>
    [HttpPost("watchfox/watches/{id:guid}/reconnect")]
    public Task<IActionResult> ReconnectWatch(
        Guid id,
        [FromBody] WatchFoxReconnectRequest? request,
        CancellationToken cancellationToken) =>
        RunForTenant(tenantId => _watchFox.CreateReconnectLinkAsync(tenantId, id, request?.RedirectUrl, cancellationToken));

    [HttpDelete("watchfox/watches/{id:guid}")]
    public Task<IActionResult> DeleteWatch(Guid id, CancellationToken cancellationToken) =>
        RunForTenant(async tenantId =>
        {
            await _watchFox.DeleteWatchAsync(tenantId, id, CurrentUserId, cancellationToken);
            return new { deleted = true };
        });

    private async Task<IActionResult> RunForTenant<T>(Func<Guid, Task<T>> action)
    {
        if (CurrentTenantId is not { } tenantId || tenantId == Guid.Empty)
            return BadRequest(new { error = "Tenant is required." });
        try
        {
            return Ok(await action(tenantId));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// After Office 365 sign-in, start the Enquiries watch for <c>connectionId</c> (<c>cn_...</c>).
    /// The connect button does this itself. This remains for a direct call.
    /// </summary>
    [HttpPost("watchfox/watches")]
    public async Task<IActionResult> StartEnquiryWatch(
        [FromBody] WatchFoxStartWatchRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var watch = await _watchFox.CreateEnquiryWatchAsync(
                request.ConnectionId,
                request.TenantId,
                request.WorkflowId,
                cancellationToken);
            return Ok(watch);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("mailboxes")]
    [ProducesResponseType(typeof(IReadOnlyList<EmailIngestMailboxDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var items = await EmailIngest.ListMailboxesAsync(cancellationToken);
        return Ok(items);
    }

    [HttpGet("mailboxes/{id:guid}")]
    [ProducesResponseType(typeof(EmailIngestMailboxDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var item = await EmailIngest.GetMailboxAsync(id, cancellationToken);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpPost("mailboxes")]
    [ProducesResponseType(typeof(EmailIngestMailboxDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] EmailIngestMailboxUpsertRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await EmailIngest.CreateMailboxAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("mailboxes/{id:guid}")]
    [ProducesResponseType(typeof(EmailIngestMailboxDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] EmailIngestMailboxUpsertRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await EmailIngest.UpdateMailboxAsync(id, request, cancellationToken);
            return updated == null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("mailboxes/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ok = await EmailIngest.DeleteMailboxAsync(id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    /// <summary>Manual poll for one mailbox (Swagger / UI "Poll now").</summary>
    [HttpPost("mailboxes/{id:guid}/poll")]
    [ProducesResponseType(typeof(EmailIngestPollResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Poll(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await EmailIngest.PollMailboxAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

public sealed record WatchFoxConnectRequest(
    Guid TenantId,
    Guid WorkflowId,
    string? RedirectUrl = null,
    string? AppName = null,
    string? LogoUrl = null,
    string? AccentColor = null,
    string? SupportEmail = null,
    bool? HidePoweredBy = null,
    string? Provider = null,
    IReadOnlyList<string>? Types = null);

public sealed record WatchFoxUpdateWatchRequest(IReadOnlyList<string>? Types);

public sealed record WatchFoxResumeWatchRequest(bool CatchUp = false);

public sealed record WatchFoxReconnectRequest(string? RedirectUrl = null);

public sealed record WatchFoxStartWatchRequest(string ConnectionId, Guid TenantId, Guid WorkflowId);

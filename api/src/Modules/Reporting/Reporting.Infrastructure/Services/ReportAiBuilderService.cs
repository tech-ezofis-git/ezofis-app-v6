using System.Text.Json;
using SaaSApp.Reporting.Application.Contracts;

namespace SaaSApp.Reporting.Infrastructure.Services;

public sealed class ReportAiBuilderService : IReportAiBuilderService
{
    private readonly IReportAgentPythonClient _client;
    private readonly IReportAiDefinitionService _store;
    private readonly IReportQueryService? _query;
    private readonly IReportExportService? _export;
    private readonly IReportMailService? _mail;

    public ReportAiBuilderService(
        IReportAgentPythonClient client,
        IReportAiDefinitionService store,
        IReportQueryService? query = null,
        IReportExportService? export = null,
        IReportMailService? mail = null)
    {
        _client = client;
        _store = store;
        _query = query;
        _export = export;
        _mail = mail;
    }

    public async Task<ReportAiHttpResult> GenerateAndSaveAsync(
        Guid tenantId,
        Guid userId,
        ReportAiPromptRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
            return ReportAiHttpResult.Error(400, "description is required.");
        if (string.IsNullOrWhiteSpace(request.ReportType))
            return ReportAiHttpResult.Error(400, "reportType is required.");

        var reportType = request.ReportType.Trim();
        if (reportType.Equals("specific_workflow", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrWhiteSpace(request.WorkflowName))
            return ReportAiHttpResult.Error(400, "workflowName is required for specific_workflow.");
        if (reportType.Equals("specific_repository", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrWhiteSpace(request.RepositoryName))
            return ReportAiHttpResult.Error(400, "repositoryName is required for specific_repository.");

        var sessionId = string.IsNullOrWhiteSpace(request.SessionId)
            ? $"report-{Guid.NewGuid():N}"
            : request.SessionId.Trim();

        ReportAgentProxyResult proxy;
        try
        {
            proxy = await _client.GeneratePromptAsync(
                new ReportAgentChatRequest
                {
                    SessionId = sessionId,
                    Phase = "prompt",
                    TenantId = tenantId,
                    Message = request.Description,
                    Description = request.Description,
                    ReportType = reportType,
                    WorkflowName = request.WorkflowName,
                    RepositoryName = request.RepositoryName,
                    Model = request.Model
                },
                cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return ReportAiHttpResult.Error(502, ex.Message);
        }

        var mapped = MapProxy(proxy);
        if (mapped is not null)
            return mapped;
        if (!proxy.HasReportResult)
            return ReportAiHttpResult.Error(422, proxy.Reply ?? "Report prompt was not generated.");

        var title = ReportAgentChatMapper.ReadString(proxy.ReportResult, "title")
                    ?? (string.IsNullOrWhiteSpace(request.Name) ? request.Description.Trim() : request.Name.Trim());
        var prompt = ReportAgentChatMapper.ReadString(proxy.ReportResult, "reportPrompt", "report_prompt") ?? "";
        var spec = ReportAgentChatMapper.ReadProperty(proxy.ReportResult, "reportSpec", "report_spec");

        var record = request.Id is { } existingId && existingId != Guid.Empty
            ? await _store.GetAsync(tenantId, existingId, cancellationToken)
            : null;
        record ??= new ReportAiDefinitionRecord
        {
            Id = request.Id is { } reuseId && reuseId != Guid.Empty ? reuseId : Guid.Empty,
            TenantId = tenantId,
            OwnerUserId = userId,
            Status = "Draft"
        };

        record.TenantId = tenantId;
        record.OwnerUserId = record.OwnerUserId == Guid.Empty ? userId : record.OwnerUserId;
        record.SessionId = sessionId;
        record.Name = string.IsNullOrWhiteSpace(request.Name) ? title : request.Name.Trim();
        record.Description = request.Description.Trim();
        record.ReportType = reportType;
        record.WorkflowName = request.WorkflowName?.Trim();
        record.RepositoryName = request.RepositoryName?.Trim();
        record.ReportPrompt = prompt;
        record.ReportSpecJson = ReportAgentChatMapper.SpecJson(spec);

        var saved = await _store.SaveAsync(record, cancellationToken);
        return ReportAiHttpResult.Ok(
            ReportAgentChatMapper.MergePromptResponse(saved.Id, saved.SessionId, proxy.ReportResult));
    }

    public async Task<ReportAiHttpResult> RunSavedAsync(
        Guid tenantId,
        Guid reportId,
        ReportAiRunRequest request,
        CancellationToken cancellationToken = default)
    {
        var record = await _store.GetAsync(tenantId, reportId, cancellationToken);
        if (record is null)
            return ReportAiHttpResult.Error(404, "Report not found.");

        var overlayPrompt = ReportAgentChatMapper.IsUsablePrompt(request.ReportPrompt)
            ? request.ReportPrompt
            : null;
        var overlaySpec = request.ReportSpec;
        if (overlayPrompt is not null || ReportAgentChatMapper.IsUsableSpec(overlaySpec))
        {
            record = await _store.UpdateAsync(
                tenantId,
                reportId,
                new ReportAiUpdateRequest
                {
                    ReportPrompt = overlayPrompt,
                    ReportSpec = overlaySpec
                },
                cancellationToken) ?? record;
        }

        if (!ReportAgentChatMapper.IsUsablePrompt(record.ReportPrompt)
            && !ReportAgentChatMapper.IsUsableSpec(ReportAgentChatMapper.ParseObjectOrEmpty(record.ReportSpecJson)))
        {
            return ReportAiHttpResult.Error(
                400,
                "Saved prompt is empty or invalid. Call POST /api/report-ai-builder/prompt again. "
                + "Do not send Swagger example values (reportPrompt/reportSpec/model = \"string\"). "
                + "Run with { \"page\": 1, \"pageSize\": 25 } to use the saved prompt.");
        }

        var spec = ReportAgentChatMapper.ParseObjectOrEmpty(record.ReportSpecJson);
        if (_query is not null && ReportAgentChatMapper.IsSpecifiedScope(record.ReportType))
            return await RunSpecifiedFormAsync(tenantId, reportId, record, spec, request, cancellationToken);

        ReportAgentProxyResult proxy;
        try
        {
            proxy = await _client.RunReportAsync(
                new ReportAgentChatRequest
                {
                    SessionId = string.IsNullOrWhiteSpace(record.SessionId)
                        ? $"report-{record.Id:N}"
                        : record.SessionId,
                    Phase = "run",
                    TenantId = tenantId,
                    ReportType = record.ReportType,
                    WorkflowName = record.WorkflowName,
                    RepositoryName = record.RepositoryName,
                    ReportPrompt = ReportAgentChatMapper.IsUsablePrompt(record.ReportPrompt)
                        ? record.ReportPrompt
                        : null,
                    ReportSpec = spec,
                    Page = request.Page < 1 ? 1 : request.Page,
                    PageSize = ExportRequested(request)
                        ? 500
                        : request.PageSize is < 1 or > 500 ? 25 : request.PageSize,
                    Model = ReportAgentChatMapper.UsableModel(request.Model)
                },
                cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return ReportAiHttpResult.Error(502, ex.Message);
        }

        var mapped = MapProxy(proxy);
        if (mapped is not null)
            return mapped;
        if (!proxy.HasReportResult)
            return ReportAiHttpResult.Error(422, proxy.Reply ?? "Report was not generated.");

        var warnings = ReportAgentChatMapper.ReadWarnings(proxy.ReportResult);
        if (ReportAgentChatMapper.IsLockFailure(warnings))
            return ReportAiHttpResult.Error(422, warnings[0]);

        await _store.IncrementRunsAsync(tenantId, reportId, cancellationToken);
        var payload = ReportAgentChatMapper.MergeRunResponse(record.Id, proxy.ReportResult);
        if (!ExportRequested(request))
            return ReportAiHttpResult.Ok(payload);

        var exportData = ReportAgentChatMapper.ToExportResult(record, proxy.ReportResult);
        return await DeliverAsync(tenantId, record, request, exportData, payload, cancellationToken);
    }

    public async Task<ReportAiHttpResult> GetAsync(
        Guid tenantId,
        Guid userId,
        bool isAdmin,
        Guid reportId,
        CancellationToken cancellationToken = default)
    {
        var record = await _store.GetAsync(tenantId, reportId, cancellationToken);
        if (record is null)
            return ReportAiHttpResult.Error(404, "Report not found.");
        if (!await _store.CanSeeAsync(tenantId, userId, isAdmin, record, cancellationToken))
            return ReportAiHttpResult.Error(404, "Report not found.");
        return ReportAiHttpResult.Ok(ReportAgentChatMapper.ToDto(record, userId, isAdmin));
    }

    public async Task<ReportAiHttpResult> ListAsync(
        Guid tenantId,
        Guid userId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var rows = await _store.ListAsync(tenantId, userId, isAdmin, cancellationToken);
        var items = rows.Select(row => new ReportAiListItemDto
        {
            Id = row.Id,
            Name = row.Name,
            Description = row.Description,
            ReportType = row.ReportType,
            WorkflowName = row.WorkflowName,
            RepositoryName = row.RepositoryName,
            Status = row.Status,
            Runs = row.Runs,
            CreatedAtUtc = row.CreatedAtUtc,
            ModifiedAtUtc = row.ModifiedAtUtc,
            Visibility = row.Visibility,
            CanEdit = isAdmin || row.OwnerUserId == userId,
            Access = row.OwnerUserId == userId ? "owner" : isAdmin ? "admin" : "shared"
        }).ToList();
        return ReportAiHttpResult.Ok(items);
    }

    public async Task<ReportAiHttpResult> UpdateAsync(
        Guid tenantId,
        Guid userId,
        bool isAdmin,
        Guid reportId,
        ReportAiUpdateRequest request,
        CancellationToken cancellationToken = default)
    {
        var existing = await _store.GetAsync(tenantId, reportId, cancellationToken);
        if (existing is null)
            return ReportAiHttpResult.Error(404, "Report not found.");
        if (!isAdmin && existing.OwnerUserId != userId)
            return ReportAiHttpResult.Error(403, "Only the owner or an Admin can edit this report.");

        try
        {
            var updated = await _store.UpdateAsync(tenantId, reportId, request, cancellationToken);
            return updated is null
                ? ReportAiHttpResult.Error(404, "Report not found.")
                : ReportAiHttpResult.Ok(ReportAgentChatMapper.ToDto(updated, userId, isAdmin));
        }
        catch (KeyNotFoundException)
        {
            return ReportAiHttpResult.Error(404, "Report not found.");
        }
    }

    public async Task<ReportAiHttpResult> DeleteAsync(
        Guid tenantId,
        Guid userId,
        bool isAdmin,
        Guid reportId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var ok = await _store.DeleteAsync(tenantId, userId, isAdmin, reportId, cancellationToken);
            return ok
                ? ReportAiHttpResult.Ok(new { deleted = true, id = reportId })
                : ReportAiHttpResult.Error(404, "Report not found.");
        }
        catch (UnauthorizedAccessException ex)
        {
            return ReportAiHttpResult.Error(403, ex.Message);
        }
    }

    public async Task<ReportAiHttpResult> ListTypesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var proxy = await _client.GetTypesAsync(cancellationToken);
            return FromRawJson(proxy, "Failed to list report types.");
        }
        catch (InvalidOperationException ex)
        {
            return ReportAiHttpResult.Error(502, ex.Message);
        }
    }

    public async Task<ReportAiHttpResult> ListScopeOptionsAsync(
        string scope,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(scope)
            || (!scope.Equals("workflows", StringComparison.OrdinalIgnoreCase)
                && !scope.Equals("repositories", StringComparison.OrdinalIgnoreCase)))
            return ReportAiHttpResult.Error(400, "scope must be workflows or repositories.");

        try
        {
            var proxy = await _client.GetScopeOptionsAsync(scope, tenantId, cancellationToken);
            return FromRawJson(proxy, "Failed to list scope options.");
        }
        catch (InvalidOperationException ex)
        {
            return ReportAiHttpResult.Error(502, ex.Message);
        }
    }

    private async Task<ReportAiHttpResult> RunSpecifiedFormAsync(
        Guid tenantId,
        Guid reportId,
        ReportAiDefinitionRecord record,
        JsonElement spec,
        ReportAiRunRequest request,
        CancellationToken cancellationToken)
    {
        var columns = ReportAgentChatMapper.ReadSpecColumns(spec);
        if (columns.Count == 0)
        {
            return ReportAiHttpResult.Error(
                400,
                "Saved spec has no columns to run. Call POST /api/report-ai-builder/prompt again.");
        }

        var isRepository = record.ReportType.Equals("specific_repository", StringComparison.OrdinalIgnoreCase);
        var domain = (isRepository ? record.RepositoryName : record.WorkflowName)?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(domain))
        {
            return ReportAiHttpResult.Error(
                400,
                isRepository
                    ? "repositoryName is required for specific_repository."
                    : "workflowName is required for specific_workflow.");
        }

        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize is < 1 or > 500 ? 25 : request.PageSize;
        var config = new ReportBuilderConfig
        {
            Name = string.IsNullOrWhiteSpace(record.Name) ? domain : record.Name,
            Description = record.Description,
            Domain = domain,
            SourceType = isRepository ? "Repository" : "Workflow",
            SourceForm = domain,
            Fields = columns.Select(c => c.Key).ToList(),
            FieldSettings = columns.ToDictionary(
                c => c.Key,
                c => new ReportFieldSetting
                {
                    Label = c.Label,
                    Formula = c.Formula,
                    Expression = c.Formula,
                    ColType = string.IsNullOrWhiteSpace(c.Formula) ? "value" : "calculated"
                },
                StringComparer.OrdinalIgnoreCase),
            Filters = ReportAgentChatMapper.ReadSpecFilters(spec)
        };

        ReportRunResult run;
        try
        {
            run = await _query!.ExecuteAsync(tenantId, config, cancellationToken);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return ReportAiHttpResult.Error(422, ex.Message);
        }

        var start = Math.Max(0, (page - 1) * pageSize);
        var pageRows = run.Rows.Skip(start).Take(pageSize).Select(row =>
        {
            var mapped = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            foreach (var column in columns)
            {
                if (row.TryGetValue(column.Key, out var byKey))
                    mapped[column.Key] = byKey;
                else if (row.TryGetValue(column.Label, out var byLabel))
                    mapped[column.Key] = byLabel;
                else
                    mapped[column.Key] = null;
            }

            return mapped;
        }).ToList();

        await _store.IncrementRunsAsync(tenantId, reportId, cancellationToken);
        var payload = new
        {
            id = record.Id,
            title = string.IsNullOrWhiteSpace(record.Name) ? domain : record.Name,
            reportType = record.ReportType,
            columns = columns.Select(c => new { key = c.Key, label = c.Label }).ToList(),
            rows = pageRows,
            totalCount = run.RowCount,
            page,
            pageSize,
            warnings = new[]
            {
                isRepository
                    ? "Counted live folder rows from the selected repository."
                    : "Counted live form rows from the selected workflow. Request No, Stage, Status, Acted by, and Workflow are joined from the workflow instance and inbox."
            }
        };
        if (!ExportRequested(request))
            return ReportAiHttpResult.Ok(payload);

        return await DeliverAsync(tenantId, record, request, run, payload, cancellationToken);
    }

    private async Task<ReportAiHttpResult> DeliverAsync(
        Guid tenantId,
        ReportAiDefinitionRecord record,
        ReportAiRunRequest request,
        ReportRunResult data,
        object jsonPayload,
        CancellationToken cancellationToken)
    {
        if (request.SendEmail)
        {
            var recipients = (request.Recipients ?? [])
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (recipients.Count == 0)
                return ReportAiHttpResult.Error(400, "recipients are required to email this report.");
            if (_mail is null)
                return ReportAiHttpResult.Error(500, "Report email is not configured.");

            try
            {
                await _mail.SendAsync(
                    tenantId,
                    new ReportBuilderConfig
                    {
                        Id = record.Id,
                        Name = data.Name,
                        Domain = data.Domain,
                        OwnerUserId = record.OwnerUserId,
                        Schedule = new ReportScheduleConfig
                        {
                            Format = string.IsNullOrWhiteSpace(request.Format) ? "PDF" : request.Format,
                            Recipients = recipients,
                            Cc = (request.Cc ?? []).Where(value => !string.IsNullOrWhiteSpace(value)).ToList(),
                            Subject = request.Subject,
                            Message = request.Message
                        }
                    },
                    data,
                    cancellationToken);
            }
            catch (InvalidOperationException ex)
            {
                return ReportAiHttpResult.Error(422, ex.Message);
            }
        }

        if (!request.Download)
            return ReportAiHttpResult.Ok(jsonPayload);
        if (_export is null)
            return ReportAiHttpResult.Error(500, "Report export is not configured.");

        return ReportAiHttpResult.FileResult(_export.Export(data, request.Format));
    }

    private static bool ExportRequested(ReportAiRunRequest request) =>
        request.Download || request.SendEmail;

    private static ReportAiHttpResult? MapProxy(ReportAgentProxyResult proxy)
    {
        if (proxy.TimedOut)
            return ReportAiHttpResult.Error(504, "Report Agent timed out.");
        if (proxy.StatusCode is >= 500)
            return ReportAiHttpResult.Error(502, ReportAgentChatMapper.ErrorMessage(proxy, "Report Agent is unavailable."));
        if (proxy.StatusCode is >= 400 and < 500)
            return ReportAiHttpResult.Error(proxy.StatusCode, ReportAgentChatMapper.ErrorMessage(proxy, "Report Agent rejected the request."));
        return null;
    }

    private static ReportAiHttpResult FromRawJson(ReportAgentProxyResult proxy, string fallback)
    {
        if (proxy.TimedOut)
            return ReportAiHttpResult.Error(504, "Report Agent timed out.");
        if (proxy.StatusCode is >= 500)
            return ReportAiHttpResult.Error(502, fallback);
        if (string.IsNullOrWhiteSpace(proxy.RawBody))
            return new ReportAiHttpResult { StatusCode = proxy.StatusCode, Payload = null };

        try
        {
            using var doc = JsonDocument.Parse(proxy.RawBody);
            return new ReportAiHttpResult
            {
                StatusCode = proxy.StatusCode,
                Payload = JsonSerializer.Deserialize<object>(doc.RootElement.GetRawText())
            };
        }
        catch (JsonException)
        {
            return ReportAiHttpResult.Error(proxy.StatusCode >= 400 ? proxy.StatusCode : 502, fallback);
        }
    }
}

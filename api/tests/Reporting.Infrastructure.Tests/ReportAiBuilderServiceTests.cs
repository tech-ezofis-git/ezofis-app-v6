using System.Text.Json;
using SaaSApp.Reporting.Application.Contracts;
using SaaSApp.Reporting.Infrastructure.Services;

namespace SaaSApp.Reporting.Infrastructure.Tests;

public sealed class ReportAiBuilderServiceTests
{
    private static readonly Guid TenantId = Guid.Parse("b843b988-00ec-44e3-aca2-b8470133ef63");
    private static readonly Guid UserId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    [Fact]
    public async Task GenerateAndSave_persists_prompt_and_returns_id()
    {
        var store = new MemoryStore();
        var client = new FakeClient
        {
            Prompt = AgentResult(200, """
                {"reply":"Report prompt generated.","report_result":{
                  "title":"Aging",
                  "reportType":"all_workflows",
                  "reportPrompt":"{\"Objective\":\"Aging\"}",
                  "reportSpec":{"title":"Aging","columns":[{"key":"Aging_Bucket","label":"Aging Bucket"}]}
                }}
                """)
        };
        var service = new ReportAiBuilderService(client, store);

        var result = await service.GenerateAndSaveAsync(
            TenantId,
            UserId,
            new ReportAiPromptRequest
            {
                SessionId = "report-session-1",
                Description = "Aging",
                ReportType = "all_workflows"
            });

        Assert.Equal(200, result.StatusCode);
        Assert.Single(store.Rows);
        var saved = store.Rows.Values.Single();
        Assert.Equal("Aging", saved.Name);
        Assert.Contains("Objective", saved.ReportPrompt);
        Assert.Equal("report-session-1", saved.SessionId);
        Assert.Contains(saved.Id.ToString(), JsonSerializer.Serialize(result.Payload));
    }

    [Fact]
    public async Task RunSaved_loads_prompt_and_forwards_it_to_agents()
    {
        var store = new MemoryStore();
        var id = Guid.NewGuid();
        store.Rows[id] = new ReportAiDefinitionRecord
        {
            Id = id,
            TenantId = TenantId,
            OwnerUserId = UserId,
            SessionId = "report-session-1",
            Name = "Aging",
            Description = "Aging",
            ReportType = "all_workflows",
            ReportPrompt = """{"Objective":"Aging"}""",
            ReportSpecJson = """{"title":"Aging","sourceTable":"workflow_instances_all"}"""
        };
        var client = new FakeClient
        {
            Run = AgentResult(200, """
                {"reply":"Report ready.","report_result":{
                  "title":"Aging",
                  "columns":[{"key":"Aging_Bucket","label":"Aging Bucket"}],
                  "rows":[{"Aging_Bucket":"0-5","Request_Count":49}],
                  "totalCount":1,
                  "page":1,
                  "pageSize":25,
                  "warnings":[]
                }}
                """)
        };
        var service = new ReportAiBuilderService(client, store);

        var result = await service.RunSavedAsync(TenantId, id, new ReportAiRunRequest());

        Assert.Equal(200, result.StatusCode);
        Assert.NotNull(client.LastRun);
        Assert.Equal("""{"Objective":"Aging"}""", client.LastRun!.ReportPrompt);
        Assert.Equal("all_workflows", client.LastRun.ReportType);
        Assert.Equal(1, store.Rows[id].Runs);
    }

    [Fact]
    public async Task RunSaved_ignores_swagger_placeholder_overlay()
    {
        var store = new MemoryStore();
        var id = Guid.NewGuid();
        store.Rows[id] = new ReportAiDefinitionRecord
        {
            Id = id,
            TenantId = TenantId,
            OwnerUserId = UserId,
            SessionId = "report-session-1",
            ReportType = "all_workflows",
            ReportPrompt = """{"Objective":"Aging"}""",
            ReportSpecJson = """{"title":"Aging","sourceTable":"workflow_instances_all"}"""
        };
        var client = new FakeClient
        {
            Run = AgentResult(200, """
                {"reply":"Report ready.","report_result":{
                  "title":"Aging",
                  "columns":[{"key":"Aging_Bucket","label":"Aging Bucket"}],
                  "rows":[],
                  "totalCount":0,
                  "page":1,
                  "pageSize":25
                }}
                """)
        };
        using var specDoc = JsonDocument.Parse("\"string\"");
        var service = new ReportAiBuilderService(client, store);

        var result = await service.RunSavedAsync(
            TenantId,
            id,
            new ReportAiRunRequest
            {
                Page = 0,
                PageSize = 0,
                ReportPrompt = "string",
                ReportSpec = specDoc.RootElement.Clone(),
                Model = "string"
            });

        Assert.Equal(200, result.StatusCode);
        Assert.Equal("""{"Objective":"Aging"}""", store.Rows[id].ReportPrompt);
        Assert.Equal("""{"Objective":"Aging"}""", client.LastRun!.ReportPrompt);
        Assert.Null(client.LastRun.Model);
        Assert.Equal(1, client.LastRun.Page);
        Assert.Equal(25, client.LastRun.PageSize);
    }

    [Fact]
    public async Task RunSaved_surfaces_agents_detail_on_4xx()
    {
        var store = new MemoryStore();
        var id = Guid.NewGuid();
        store.Rows[id] = new ReportAiDefinitionRecord
        {
            Id = id,
            TenantId = TenantId,
            ReportType = "all_workflows",
            ReportPrompt = """{"Objective":"Aging"}""",
            ReportSpecJson = """{"title":"Aging"}"""
        };
        var client = new FakeClient
        {
            Run = AgentResult(422, """{"detail":"reportPrompt or reportSpec is required for phase=run."}""")
        };
        var service = new ReportAiBuilderService(client, store);
        var result = await service.RunSavedAsync(TenantId, id, new ReportAiRunRequest());
        Assert.Equal(422, result.StatusCode);
        var json = JsonSerializer.Serialize(result.Payload);
        Assert.Contains("reportPrompt or reportSpec is required", json);
    }

    [Fact]
    public async Task RunSaved_maps_lock_redirect_to_422()
    {
        var store = new MemoryStore();
        var id = Guid.NewGuid();
        store.Rows[id] = new ReportAiDefinitionRecord
        {
            Id = id,
            TenantId = TenantId,
            OwnerUserId = UserId,
            ReportType = "specific_workflow",
            WorkflowName = "RFQ Process",
            ReportPrompt = "{}",
            ReportSpecJson = "{}"
        };
        var client = new FakeClient
        {
            Run = AgentResult(200, """
                {"reply":"Report ready.","report_result":{
                  "columns":[{"key":"Name","label":"Name"}],
                  "rows":[{"Name":"Accounts Payable"}],
                  "warnings":["Dropped unknown source table 'ezfb_787372d8_items'."]
                }}
                """)
        };
        var service = new ReportAiBuilderService(client, store);

        var result = await service.RunSavedAsync(TenantId, id, new ReportAiRunRequest());

        Assert.Equal(422, result.StatusCode);
        Assert.Equal(0, store.Rows[id].Runs);
    }

    [Fact]
    public async Task RunSaved_specified_workflow_uses_form_query()
    {
        var store = new MemoryStore();
        var id = Guid.NewGuid();
        store.Rows[id] = new ReportAiDefinitionRecord
        {
            Id = id,
            TenantId = TenantId,
            OwnerUserId = UserId,
            ReportType = "specific_workflow",
            WorkflowName = "RFQ Process",
            Name = "RFQ Estimation",
            ReportPrompt = """{"Objective":"RFQ"}""",
            ReportSpecJson = """
                {"title":"RFQ","columns":[{"key":"Company_Name","label":"Company Name"}]}
                """
        };
        var client = new FakeClient
        {
            Run = AgentResult(200, """
                {"reply":"Report ready.","report_result":{
                  "warnings":["Dropped unknown source table 'ezfb_787372d8_items'."]
                }}
                """)
        };
        var query = new FakeQuery
        {
            Result = new ReportRunResult(
                id,
                "RFQ Estimation",
                "RFQ Process",
                [new ReportColumnDto("Company Name", "Company Name", "None", "value", 160, false)],
                [
                    new Dictionary<string, string?> { ["Company Name"] = "Acme" },
                    new Dictionary<string, string?> { ["Company Name"] = "Globex" }
                ],
                null,
                2,
                Guid.NewGuid(),
                "form-1")
        };
        var service = new ReportAiBuilderService(client, store, query);

        var result = await service.RunSavedAsync(
            TenantId,
            id,
            new ReportAiRunRequest { Page = 1, PageSize = 1 });

        Assert.Equal(200, result.StatusCode);
        Assert.Null(client.LastRun);
        Assert.Equal("RFQ Process", query.LastConfig?.Domain);
        Assert.Contains("Company_Name", query.LastConfig?.Fields ?? []);
        Assert.Equal(1, store.Rows[id].Runs);
        var json = JsonSerializer.Serialize(result.Payload);
        Assert.Contains("Acme", json);
        Assert.DoesNotContain("Globex", json);
        Assert.Contains("\"totalCount\":2", json);
        Assert.Contains("Counted live form rows", json);
    }

    [Fact]
    public async Task RunSaved_specified_repository_uses_python_agent()
    {
        var store = new MemoryStore();
        var id = Guid.NewGuid();
        store.Rows[id] = new ReportAiDefinitionRecord
        {
            Id = id,
            TenantId = TenantId,
            OwnerUserId = UserId,
            ReportType = "specific_repository",
            RepositoryName = "Expense Reimbursement",
            Name = "Expense Reimbursement Folder Summary",
            ReportPrompt = """{"Objective":"Folder summary"}""",
            ReportSpecJson = """
                {"title":"Folder summary","columns":[
                  {"key":"FileName","label":"File Name"},
                  {"key":"CreatedBy","label":"Created By"}
                ]}
                """
        };
        var client = new FakeClient
        {
            Run = AgentResult(200, """
                {"reply":"Report ready.","report_result":{
                  "title":"Expense Reimbursement Folder Summary",
                  "columns":[
                    {"key":"FileName","label":"File Name"},
                    {"key":"CreatedBy","label":"Created By"}
                  ],
                  "rows":[{"FileName":"BeerTown Food receipt with Tip.pdf","CreatedBy":"Student Lawyer"}],
                  "totalCount":1,
                  "page":1,
                  "pageSize":25,
                  "warnings":[]
                }}
                """)
        };
        var query = new FakeQuery
        {
            Result = new ReportRunResult(
                id,
                "Expense Reimbursement Folder Summary",
                "Expense Reimbursement",
                [new ReportColumnDto("File Name", "File Name", "None", "value", 160, false)],
                [new Dictionary<string, string?> { ["File Name"] = null, ["Created By"] = "049b5a38-fb6c-4037-baca-5c732ee667d9" }],
                null,
                1,
                null,
                "form-1")
        };
        var service = new ReportAiBuilderService(client, store, query);

        var result = await service.RunSavedAsync(TenantId, id, new ReportAiRunRequest());

        Assert.Equal(200, result.StatusCode);
        Assert.NotNull(client.LastRun);
        Assert.Equal("specific_repository", client.LastRun!.ReportType);
        Assert.Equal("Expense Reimbursement", client.LastRun.RepositoryName);
        Assert.Null(query.LastConfig);
        var json = JsonSerializer.Serialize(result.Payload);
        Assert.Contains("BeerTown Food receipt with Tip.pdf", json);
        Assert.Contains("Student Lawyer", json);
        Assert.DoesNotContain("049b5a38-fb6c-4037-baca-5c732ee667d9", json);
    }

    [Fact]
    public async Task RunSaved_download_returns_exported_file()
    {
        var store = SpecifiedStore(out var id);
        var query = SpecifiedQuery(id);
        var export = new FakeExport();
        var service = new ReportAiBuilderService(new FakeClient(), store, query, export);

        var result = await service.RunSavedAsync(
            TenantId,
            id,
            new ReportAiRunRequest { Download = true, Format = "CSV" });

        Assert.Equal(200, result.StatusCode);
        Assert.NotNull(result.File);
        Assert.Equal("text/csv", result.File!.ContentType);
        Assert.Equal("CSV", export.LastFormat);
        Assert.Equal(2, export.LastData?.RowCount);
    }

    [Fact]
    public async Task RunSaved_email_requires_recipients()
    {
        var store = SpecifiedStore(out var id);
        var service = new ReportAiBuilderService(
            new FakeClient(), store, SpecifiedQuery(id), new FakeExport(), new FakeMail());
        var result = await service.RunSavedAsync(
            TenantId,
            id,
            new ReportAiRunRequest { SendEmail = true, Format = "PDF" });
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task RunSaved_email_sends_exported_file()
    {
        var store = SpecifiedStore(out var id);
        var mail = new FakeMail();
        var service = new ReportAiBuilderService(
            new FakeClient(), store, SpecifiedQuery(id), new FakeExport(), mail);

        var result = await service.RunSavedAsync(
            TenantId,
            id,
            new ReportAiRunRequest
            {
                SendEmail = true,
                Format = "PDF",
                Recipients = ["ops@ezofis.com"]
            });

        Assert.Equal(200, result.StatusCode);
        Assert.NotNull(mail.LastConfig);
        Assert.Contains("ops@ezofis.com", mail.LastConfig!.Schedule!.Recipients);
        Assert.Equal("PDF", mail.LastConfig.Schedule.Format);
        Assert.Equal(2, mail.LastData?.RowCount);
    }

    [Fact]
    public async Task GenerateAndSave_requires_workflow_name_for_specific_workflow()
    {
        var service = new ReportAiBuilderService(new FakeClient(), new MemoryStore());
        var result = await service.GenerateAndSaveAsync(
            TenantId,
            UserId,
            new ReportAiPromptRequest { Description = "RFQ", ReportType = "specific_workflow" });
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task RunSaved_missing_id_is_404()
    {
        var service = new ReportAiBuilderService(new FakeClient(), new MemoryStore());
        var result = await service.RunSavedAsync(TenantId, Guid.NewGuid(), new ReportAiRunRequest());
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Delete_owner_removes_saved_report()
    {
        var store = new MemoryStore();
        var id = Guid.NewGuid();
        store.Rows[id] = new ReportAiDefinitionRecord
        {
            Id = id,
            TenantId = TenantId,
            OwnerUserId = UserId,
            Name = "RFQ",
            ReportType = "specific_workflow",
            WorkflowName = "RFQ Process",
            ReportPrompt = "{}",
            ReportSpecJson = "{}"
        };
        var service = new ReportAiBuilderService(new FakeClient(), store);

        var result = await service.DeleteAsync(TenantId, UserId, isAdmin: false, id);

        Assert.Equal(200, result.StatusCode);
        Assert.False(store.Rows.ContainsKey(id));
        var missing = await service.GetAsync(TenantId, UserId, isAdmin: false, id);
        Assert.Equal(404, missing.StatusCode);
    }

    [Fact]
    public async Task Delete_other_user_is_403()
    {
        var store = new MemoryStore();
        var id = Guid.NewGuid();
        store.Rows[id] = new ReportAiDefinitionRecord
        {
            Id = id,
            TenantId = TenantId,
            OwnerUserId = UserId,
            ReportType = "all_workflows",
            ReportPrompt = "{}",
            ReportSpecJson = "{}"
        };
        var service = new ReportAiBuilderService(new FakeClient(), store);
        var result = await service.DeleteAsync(TenantId, Guid.NewGuid(), isAdmin: false, id);
        Assert.Equal(403, result.StatusCode);
        Assert.True(store.Rows.ContainsKey(id));
    }

    [Fact]
    public async Task Delete_missing_id_is_404()
    {
        var service = new ReportAiBuilderService(new FakeClient(), new MemoryStore());
        var result = await service.DeleteAsync(TenantId, UserId, isAdmin: true, Guid.NewGuid());
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GenerateAndSave_timeout_is_504()
    {
        var service = new ReportAiBuilderService(
            new FakeClient { Prompt = new ReportAgentProxyResult { StatusCode = 504, TimedOut = true } },
            new MemoryStore());
        var result = await service.GenerateAndSaveAsync(
            TenantId,
            UserId,
            new ReportAiPromptRequest { Description = "Aging", ReportType = "all_workflows" });
        Assert.Equal(504, result.StatusCode);
    }

    private static ReportAgentProxyResult AgentResult(int status, string body) =>
        ReportAgentChatMapper.Parse(status, body);

    private static MemoryStore SpecifiedStore(out Guid id)
    {
        var store = new MemoryStore();
        id = Guid.NewGuid();
        store.Rows[id] = new ReportAiDefinitionRecord
        {
            Id = id,
            TenantId = TenantId,
            OwnerUserId = UserId,
            ReportType = "specific_workflow",
            WorkflowName = "RFQ Process",
            Name = "RFQ Estimation",
            ReportPrompt = """{"Objective":"RFQ"}""",
            ReportSpecJson = """{"title":"RFQ","columns":[{"key":"Company_Name","label":"Company Name"}]}"""
        };
        return store;
    }

    private static FakeQuery SpecifiedQuery(Guid id) =>
        new()
        {
            Result = new ReportRunResult(
                id,
                "RFQ Estimation",
                "RFQ Process",
                [new ReportColumnDto("Company Name", "Company Name", "None", "value", 160, false)],
                [
                    new Dictionary<string, string?> { ["Company Name"] = "Acme" },
                    new Dictionary<string, string?> { ["Company Name"] = "Globex" }
                ],
                null,
                2,
                Guid.NewGuid(),
                "form-1")
        };

    private sealed class MemoryStore : IReportAiDefinitionService
    {
        public Dictionary<Guid, ReportAiDefinitionRecord> Rows { get; } = new();

        public Task<ReportAiDefinitionRecord> SaveAsync(
            ReportAiDefinitionRecord record,
            CancellationToken cancellationToken = default)
        {
            if (record.Id == Guid.Empty)
                record.Id = Guid.NewGuid();
            Rows[record.Id] = Clone(record);
            return Task.FromResult(Clone(record));
        }

        public Task<ReportAiDefinitionRecord?> GetAsync(
            Guid tenantId,
            Guid reportId,
            CancellationToken cancellationToken = default)
        {
            if (!Rows.TryGetValue(reportId, out var row) || row.TenantId != tenantId)
                return Task.FromResult<ReportAiDefinitionRecord?>(null);
            return Task.FromResult<ReportAiDefinitionRecord?>(Clone(row));
        }

        public Task<IReadOnlyList<ReportAiDefinitionRecord>> ListAsync(
            Guid tenantId,
            Guid userId,
            bool isAdmin,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ReportAiDefinitionRecord>>(
                Rows.Values.Where(r => r.TenantId == tenantId
                    && (isAdmin || r.OwnerUserId == userId
                        || (r.Visibility ?? "Private").Equals("Public", StringComparison.OrdinalIgnoreCase)))
                    .Select(Clone).ToList());

        public Task<bool> CanSeeAsync(
            Guid tenantId,
            Guid userId,
            bool isAdmin,
            ReportAiDefinitionRecord record,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(
                isAdmin
                || record.OwnerUserId == userId
                || (record.Visibility ?? "Private").Equals("Public", StringComparison.OrdinalIgnoreCase));

        public Task<ReportAiDefinitionRecord?> UpdateAsync(
            Guid tenantId,
            Guid reportId,
            ReportAiUpdateRequest patch,
            CancellationToken cancellationToken = default)
        {
            if (!Rows.TryGetValue(reportId, out var row) || row.TenantId != tenantId)
                return Task.FromResult<ReportAiDefinitionRecord?>(null);
            if (patch.ReportPrompt is not null)
                row.ReportPrompt = patch.ReportPrompt;
            if (patch.ReportSpec.ValueKind is JsonValueKind.Object or JsonValueKind.Array)
                row.ReportSpecJson = ReportAgentChatMapper.SpecJson(patch.ReportSpec);
            return Task.FromResult<ReportAiDefinitionRecord?>(Clone(row));
        }

        public Task IncrementRunsAsync(
            Guid tenantId,
            Guid reportId,
            CancellationToken cancellationToken = default)
        {
            if (Rows.TryGetValue(reportId, out var row) && row.TenantId == tenantId)
                row.Runs++;
            return Task.CompletedTask;
        }

        public Task<bool> DeleteAsync(
            Guid tenantId,
            Guid userId,
            bool isAdmin,
            Guid reportId,
            CancellationToken cancellationToken = default)
        {
            if (!Rows.TryGetValue(reportId, out var row) || row.TenantId != tenantId)
                return Task.FromResult(false);
            if (!isAdmin && row.OwnerUserId != userId)
                throw new UnauthorizedAccessException("Only the owner or an Admin can delete this report.");
            Rows.Remove(reportId);
            return Task.FromResult(true);
        }

        private static ReportAiDefinitionRecord Clone(ReportAiDefinitionRecord row) =>
            new()
            {
                Id = row.Id,
                TenantId = row.TenantId,
                OwnerUserId = row.OwnerUserId,
                SessionId = row.SessionId,
                Name = row.Name,
                Description = row.Description,
                ReportType = row.ReportType,
                WorkflowName = row.WorkflowName,
                RepositoryName = row.RepositoryName,
                ReportPrompt = row.ReportPrompt,
                ReportSpecJson = row.ReportSpecJson,
                Status = row.Status,
                Runs = row.Runs,
                CreatedAtUtc = row.CreatedAtUtc,
                ModifiedAtUtc = row.ModifiedAtUtc
            };
    }

    private sealed class FakeQuery : IReportQueryService
    {
        public ReportBuilderConfig? LastConfig { get; private set; }
        public ReportRunResult Result { get; set; } = new(
            null, "Untitled", "", [], [], null, 0, null, null);

        public Task<IReadOnlyList<ReportDomainDto>> ListDomainsAsync(
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ReportDomainDto>>([]);

        public Task<IReadOnlyList<ReportSourceFormDto>> ListSourceFormsAsync(
            string? sourceType,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ReportSourceFormDto>>([]);

        public Task<IReadOnlyList<ReportAvailableFieldDto>> ListFieldsAsync(
            Guid tenantId,
            string? domain,
            string? sourceFormId,
            string? sourceForm = null,
            string? sourceType = null,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ReportAvailableFieldDto>>([]);

        public Task<ReportRunResult> ExecuteAsync(
            Guid tenantId,
            ReportBuilderConfig config,
            CancellationToken cancellationToken = default)
        {
            LastConfig = config;
            return Task.FromResult(Result);
        }
    }

    private sealed class FakeExport : IReportExportService
    {
        public string? LastFormat { get; private set; }
        public ReportRunResult? LastData { get; private set; }

        public ReportFileResult Export(ReportRunResult data, string? format)
        {
            LastData = data;
            LastFormat = format;
            return new ReportFileResult(
                System.Text.Encoding.UTF8.GetBytes("name\nAcme"),
                "text/csv",
                "report.csv");
        }
    }

    private sealed class FakeMail : IReportMailService
    {
        public ReportBuilderConfig? LastConfig { get; private set; }
        public ReportRunResult? LastData { get; private set; }

        public Task SendAsync(
            Guid tenantId,
            ReportBuilderConfig config,
            ReportRunResult data,
            CancellationToken cancellationToken = default)
        {
            LastConfig = config;
            LastData = data;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeClient : IReportAgentPythonClient
    {
        public ReportAgentProxyResult Prompt { get; set; } = new() { StatusCode = 500 };
        public ReportAgentProxyResult Run { get; set; } = new() { StatusCode = 500 };
        public ReportAgentChatRequest? LastRun { get; private set; }

        public Task<ReportAgentProxyResult> GeneratePromptAsync(
            ReportAgentChatRequest request,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Prompt);

        public Task<ReportAgentProxyResult> RunReportAsync(
            ReportAgentChatRequest request,
            CancellationToken cancellationToken = default)
        {
            LastRun = request;
            return Task.FromResult(Run);
        }

        public Task<ReportAgentProxyResult> GetTypesAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(new ReportAgentProxyResult { StatusCode = 200, RawBody = "[]" });

        public Task<ReportAgentProxyResult> GetScopeOptionsAsync(
            string scope,
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new ReportAgentProxyResult { StatusCode = 200, RawBody = "[]" });
    }
}

using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Forms;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class WorkflowEndSyncServiceTests
{
    [Fact]
    public async Task TrySync_writes_main_field_and_match_key_onto_master()
    {
        var formEntry = new CapturingFormEntryService();
        var service = CreateService(
            workflowJson: EndSyncJson(blockId: "step-1"),
            persistedJson: """{"Vendor_Name":"Acme","Amount":"99"}""",
            formEntry);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "step-1",
            "workflow-form",
            Guid.NewGuid(),
            submittedFormDataJson: null,
            formDataFields: null);

        Assert.NotNull(formEntry.LastRequest);
        Assert.Equal("master-form", formEntry.LastFormId);
        Assert.Equal("Vendor", formEntry.LastRequest!.MatchColumnId);
        Assert.Equal("Acme", formEntry.LastRequest.MatchValue);
        Assert.Equal("Acme", ReadField(formEntry.LastRequest, "Vendor"));
        Assert.Equal("99", ReadField(formEntry.LastRequest, "Total"));
        Assert.Equal(2, formEntry.LastRequest.Fields!.Count);
    }

    [Fact]
    public async Task TrySync_reads_END_block_and_matches_compact_field_ids()
    {
        var formEntry = new CapturingFormEntryService();
        var service = CreateService(
            workflowJson: """
                {"blocks":[{"id":"finish","type":"END","settings":{
                  "endSync":{
                    "enabled":true,
                    "target":"MASTER_FORM",
                    "masterFormId":"master-form",
                    "fieldMappings":[
                      {"workflowFieldId":"Vendor_Name","masterFieldId":"Vendor","IsMainField":true},
                      {"workflowFieldId":"Amount","masterFieldId":"Total","IsMainField":false}
                    ]
                  }
                }}]}
                """,
            persistedJson: null,
            formEntry);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "END",
            "workflow-form",
            Guid.Empty,
            submittedFormDataJson: """{"Vendor Name":"Acme Co","Amount":"12"}""",
            formDataFields: null);

        Assert.NotNull(formEntry.LastRequest);
        Assert.Equal("Acme Co", formEntry.LastRequest!.MatchValue);
        Assert.Equal("Acme Co", ReadField(formEntry.LastRequest, "Vendor"));
        Assert.Equal("12", ReadField(formEntry.LastRequest, "Total"));
    }

    [Fact]
    public async Task TrySync_uses_submitted_values_when_form_entry_id_is_empty()
    {
        var loader = new RecordingFormDataLoader();
        var formEntry = new CapturingFormEntryService();
        var service = new WorkflowEndSyncService(
            new StubJsonStorage(EndSyncJson("step-1")),
            loader,
            formEntry,
            NullLogger<WorkflowEndSyncService>.Instance);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "step-1",
            "workflow-form",
            Guid.Empty,
            submittedFormDataJson: null,
            formDataFields: new Dictionary<string, string>
            {
                ["Vendor_Name"] = "Beta",
                ["Amount"] = "5"
            });

        Assert.Equal(0, loader.Calls);
        Assert.Equal("Beta", formEntry.LastRequest!.MatchValue);
        Assert.Equal("Beta", ReadField(formEntry.LastRequest, "Vendor"));
    }

    [Fact]
    public async Task TrySync_does_not_write_when_that_activity_endSync_is_disabled()
    {
        var formEntry = new CapturingFormEntryService();
        var json = """
            {"blocks":[
              {"id":"step-1","type":"INTERNAL_ACTOR","settings":{
                "endSync":{
                  "enabled":true,
                  "target":"MASTER_FORM",
                  "masterFormId":"master-form",
                  "fieldMappings":[
                    {"workflowFieldId":"Vendor_Name","masterFieldId":"Vendor","IsMainField":true}
                  ]
                }
              }},
              {"id":"step-2","type":"INTERNAL_ACTOR","settings":{
                "endSync":{
                  "enabled":false,
                  "target":"MASTER_FORM",
                  "masterFormId":"master-form",
                  "fieldMappings":[
                    {"workflowFieldId":"Vendor_Name","masterFieldId":"Vendor","IsMainField":true}
                  ]
                }
              }}
            ]}
            """;
        var service = CreateService(json, """{"Vendor_Name":"Acme"}""", formEntry);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "step-2",
            "workflow-form",
            Guid.NewGuid(),
            submittedFormDataJson: null,
            formDataFields: null);

        Assert.Null(formEntry.LastRequest);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "step-1",
            "workflow-form",
            Guid.NewGuid(),
            submittedFormDataJson: null,
            formDataFields: null);

        Assert.NotNull(formEntry.LastRequest);
        Assert.Equal("Acme", formEntry.LastRequest!.MatchValue);
    }

    [Fact]
    public async Task TrySync_writes_when_enabled_node_is_found_by_approved_label()
    {
        var formEntry = new CapturingFormEntryService();
        var json = """
            {"blocks":[{"id":"node-xyz","type":"INTERNAL_ACTOR","settings":{
              "label":"Approved",
              "endSync":{
                "enabled":true,
                "target":"MASTER_FORM",
                "masterFormId":"master-form",
                "fieldMappings":[
                  {"workflowFieldId":"Vendor_Name","masterFieldId":"Vendor","IsMainField":true}
                ]
              }
            }}]}
            """;
        var service = CreateService(json, """{"Vendor_Name":"Acme"}""", formEntry);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "not-the-block-id",
            "workflow-form",
            Guid.NewGuid(),
            submittedFormDataJson: null,
            formDataFields: null,
            stepName: "Approved");

        Assert.NotNull(formEntry.LastRequest);
        Assert.Equal("Acme", formEntry.LastRequest!.MatchValue);
    }

    [Fact]
    public async Task TrySync_flattens_lookup_json_values()
    {
        var formEntry = new CapturingFormEntryService();
        var service = CreateService(
            workflowJson: EndSyncJson(blockId: "step-1"),
            persistedJson: """{"Vendor_Name":{"id":"v1","name":"Acme"},"Amount":{"value":40}}""",
            formEntry);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "step-1",
            "workflow-form",
            Guid.NewGuid(),
            submittedFormDataJson: null,
            formDataFields: null);

        Assert.Equal("Acme", formEntry.LastRequest!.MatchValue);
        Assert.Equal("Acme", ReadField(formEntry.LastRequest, "Vendor"));
        Assert.Equal("40", ReadField(formEntry.LastRequest, "Total"));
    }

    [Fact]
    public async Task TrySync_copies_balance_after_expenses_onto_remaining_budget()
    {
        var formEntry = new CapturingFormEntryService
        {
            MasterRow = new Dictionary<string, object?>
            {
                ["Email"] = "student.lawyer@ezofis.com",
                ["Remaining Budget"] = "10000"
            }
        };
        var service = CreateService(
            workflowJson: """
                {"blocks":[{"id":"approved","type":"INTERNAL_ACTOR","settings":{
                  "endSync":{
                    "enabled":true,
                    "target":"MASTER_FORM",
                    "masterFormId":"portal-users",
                    "fieldMappings":[
                      {"workflowFieldId":"Email","masterFieldId":"Email","IsMainField":true},
                      {"workflowFieldId":"Balance After Expenses","masterFieldId":"Remaining Budget","IsMainField":false}
                    ]
                  }
                }}]}
                """,
            persistedJson: """{"Email":"student.lawyer@ezofis.com","Balance After Expenses":"2655.40","Amount":"120"}""",
            formEntry);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "approved",
            "workflow-form",
            Guid.NewGuid(),
            submittedFormDataJson: null,
            formDataFields: null,
            stepName: "Approved");

        Assert.Equal("portal-users", formEntry.LastFormId);
        Assert.Equal("student.lawyer@ezofis.com", formEntry.LastRequest!.MatchValue);
        Assert.Equal("2655.40", ReadField(formEntry.LastRequest, "Remaining Budget"));
        Assert.Equal("student.lawyer@ezofis.com", ReadField(formEntry.LastRequest, "Email"));
    }

    [Fact]
    public async Task TrySync_matches_master_row_on_every_main_field()
    {
        var formEntry = new CapturingFormEntryService();
        var service = CreateService(
            workflowJson: """
                {"blocks":[{"id":"step-1","type":"INTERNAL_ACTOR","settings":{
                  "endSync":{
                    "enabled":true,
                    "target":"MASTER_FORM",
                    "masterFormId":"master-form",
                    "fieldMappings":[
                      {"workflowFieldId":"Vendor_Name","masterFieldId":"Vendor","IsMainField":true},
                      {"workflowFieldId":"Amount","masterFieldId":"Total","IsMainField":false},
                      {"workflowFieldId":"Invoice_No","masterFieldId":"Invoice","IsMainField":true}
                    ]
                  }
                }}]}
                """,
            persistedJson: """{"Vendor_Name":"Acme","Amount":"99","Invoice_No":"INV-7"}""",
            formEntry);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "step-1",
            "workflow-form",
            Guid.NewGuid(),
            submittedFormDataJson: null,
            formDataFields: null);

        var request = formEntry.LastRequest!;
        Assert.Equal("Vendor", request.MatchColumnId);
        Assert.Equal("Acme", request.MatchValue);
        var filter = Assert.Single(request.MatchFilters!);
        Assert.Equal("Invoice", filter.ColumnId);
        Assert.Equal("INV-7", filter.ColumnValue);
        Assert.Equal("INV-7", ReadField(request, "Invoice"));
        Assert.Equal("99", ReadField(request, "Total"));
    }

    [Fact]
    public async Task TrySync_normalises_main_field_whitespace_so_existing_row_matches()
    {
        var formEntry = new CapturingFormEntryService();
        var service = CreateService(
            workflowJson: EndSyncJson(blockId: "step-1"),
            persistedJson: "{\"Vendor_Name\":\"  March Elevator \\n  Limited \",\"Amount\":\" 12 \"}",
            formEntry);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "step-1",
            "workflow-form",
            Guid.NewGuid(),
            submittedFormDataJson: null,
            formDataFields: null);

        Assert.Equal("March Elevator Limited", formEntry.LastRequest!.MatchValue);
        Assert.Equal("March Elevator Limited", ReadField(formEntry.LastRequest, "Vendor"));
    }

    [Fact]
    public async Task TrySync_skips_when_any_main_field_has_no_value()
    {
        var formEntry = new CapturingFormEntryService();
        var service = CreateService(
            workflowJson: """
                {"blocks":[{"id":"step-1","type":"INTERNAL_ACTOR","settings":{
                  "endSync":{
                    "enabled":true,
                    "target":"MASTER_FORM",
                    "masterFormId":"master-form",
                    "fieldMappings":[
                      {"workflowFieldId":"Vendor_Name","masterFieldId":"Vendor","IsMainField":true},
                      {"workflowFieldId":"Invoice_No","masterFieldId":"Invoice","IsMainField":true}
                    ]
                  }
                }}]}
                """,
            persistedJson: """{"Vendor_Name":"Acme","Invoice_No":"  "}""",
            formEntry);

        await service.TrySyncOnStepCompleteAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "step-1",
            "workflow-form",
            Guid.NewGuid(),
            submittedFormDataJson: null,
            formDataFields: null);

        // Matching on Vendor alone could update the wrong row; never insert with half a key either.
        Assert.Null(formEntry.LastRequest);
    }

    [Fact]
    public void Master_match_sql_collapses_whitespace_and_compares_plain_numbers()
    {
        var sql = FormEntryService.ScalarEqualsSql("\"Total\"", "@Filter0");
        Assert.Contains("regexp_replace(", sql);
        Assert.Contains("[[:space:]", sql);
        Assert.Contains("::numeric", sql);
    }

    [Fact]
    public void Master_match_sql_is_case_insensitive()
    {
        var where = new List<string>();
        FormEntryService.AppendFilterPredicates(where, [("Vendor", "Acme")]);
        Assert.Single(where);
        Assert.Contains("dbo.try_json_scalar(\"Vendor\"::text)", where[0]);
        Assert.Contains("dbo.try_json_scalar(@Filter0::text)", where[0]);
        Assert.Contains("lower(btrim(", where[0]);
        Assert.Contains("ILIKE", where[0]);
    }

    private static WorkflowEndSyncService CreateService(
        string workflowJson,
        string? persistedJson,
        CapturingFormEntryService formEntry) =>
        new(
            new StubJsonStorage(workflowJson),
            new StubFormDataLoader(persistedJson),
            formEntry,
            NullLogger<WorkflowEndSyncService>.Instance);

    private static string EndSyncJson(string blockId) =>
        """
        {"blocks":[{"id":"__BLOCK__","type":"INTERNAL_ACTOR","settings":{
          "endSync":{
            "enabled":true,
            "target":"MASTER_FORM",
            "masterFormId":"master-form",
            "fieldMappings":[
              {"workflowFieldId":"Vendor_Name","masterFieldId":"Vendor","IsMainField":true},
              {"workflowFieldId":"Amount","masterFieldId":"Total","IsMainField":false}
            ]
          }
        }}]}
        """.Replace("__BLOCK__", blockId);

    private static string ReadField(FormEntryUpsertByColumnsRequest request, string key)
    {
        Assert.True(request.Fields!.TryGetValue(key, out var value));
        return value.ValueKind == JsonValueKind.String ? value.GetString()! : value.GetRawText();
    }

    private sealed class StubJsonStorage(string json) : IWorkflowJsonStorageService
    {
        public Task DeleteWorkflowJsonAsync(Guid workflowId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task<string?> GetWorkflowJsonAsync(Guid workflowId, CancellationToken cancellationToken = default) =>
            Task.FromResult<string?>(json);

        public Task SaveWorkflowJsonAsync(Guid workflowId, string json, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    private sealed class StubFormDataLoader(string? json) : IWorkflowEzfbFormDataLoader
    {
        public Task<string?> LoadFormDataJsonAsync(
            string formId,
            Guid formEntryId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(json);

        public Task<string?> LoadDeletedFormDataJsonAsync(
            string formId,
            Guid formEntryId,
            CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
    }

    private sealed class RecordingFormDataLoader : IWorkflowEzfbFormDataLoader
    {
        public int Calls { get; private set; }

        public Task<string?> LoadFormDataJsonAsync(
            string formId,
            Guid formEntryId,
            CancellationToken cancellationToken = default)
        {
            Calls++;
            return Task.FromResult<string?>(null);
        }

        public Task<string?> LoadDeletedFormDataJsonAsync(
            string formId,
            Guid formEntryId,
            CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
    }

    private sealed class CapturingFormEntryService : IFormEntryService
    {
        public string? LastFormId { get; private set; }
        public FormEntryUpsertByColumnsRequest? LastRequest { get; private set; }
        public Dictionary<string, object?>? MasterRow { get; init; }

        public Task<FormEntryByColumnResult> UpsertEntryByColumnsAsync(
            string formId,
            FormEntryUpsertByColumnsRequest request,
            CancellationToken cancellationToken = default)
        {
            LastFormId = formId;
            LastRequest = request;
            return Task.FromResult(new FormEntryByColumnResult(
                FormEntryByColumnStatus.Found,
                "updated form entry",
                formId,
                request.MatchColumnId,
                ResolvedColumn: null,
                Entries: [],
                UpdatedCount: 1));
        }

        public Task<FormEntryResult> UpsertEntryAsync(
            string formId, Guid entryId, FormEntryUpsertRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<FormEntryResult> UpsertEntryAsync(
            string formId, Guid entryId, JsonElement body, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<FormEntryDeleteResult> DeleteEntryAsync(
            string formId, Guid entryId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<FormEntryRestoreResult> RestoreEntryAsync(
            string formId, Guid entryId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<FormEntryPermanentDeleteResult> PermanentlyDeleteEntryAsync(
            string formId, Guid entryId, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<FormEntryGetResult> GetEntriesAsync(
            string formId, string entryIds, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<FormEntryAllResult> ListEntriesAsync(
            string formId, FormEntryAllRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<FormControlDistinctValuesResult> GetDistinctControlValuesAsync(
            string wFormId, string wFormControlName, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<FormEntryByColumnResult> GetEntriesByColumnAsync(
            string formId,
            string? columnName,
            string? columnValue = null,
            IReadOnlyList<FormEntryColumnFilter>? filters = null,
            string? columnId = null,
            CancellationToken cancellationToken = default)
        {
            var entries = MasterRow is null
                ? Array.Empty<Dictionary<string, object?>>()
                : new[] { MasterRow };
            return Task.FromResult(new FormEntryByColumnResult(
                MasterRow is null ? FormEntryByColumnStatus.NotFound : FormEntryByColumnStatus.Found,
                null,
                formId,
                columnName,
                columnName,
                entries));
        }

        public Task<FormEntryByColumnResult> UpdateEntriesByColumnAsync(
            string formId,
            string columnName,
            string columnValue,
            FormEntryUpsertRequest request,
            CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
    }
}

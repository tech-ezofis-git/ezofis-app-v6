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
    public async Task TrySync_deducts_amount_from_master_budget()
    {
        var formEntry = new CapturingFormEntryService
        {
            MasterRow = new Dictionary<string, object?>
            {
                ["Code"] = "IT",
                ["Budget"] = "5000"
            }
        };
        var service = CreateService(
            workflowJson: """
                {"blocks":[{"id":"approved","type":"INTERNAL_ACTOR","settings":{
                  "endSync":{
                    "enabled":true,
                    "target":"MASTER_FORM",
                    "masterFormId":"master-form",
                    "fieldMappings":[
                      {"workflowFieldId":"Cost_Center","masterFieldId":"Code","IsMainField":true},
                      {"workflowFieldId":"Budget","masterFieldId":"Budget","IsMainField":false}
                    ]
                  }
                }}]}
                """,
            persistedJson: """{"Cost_Center":"IT","Amount":"120"}""",
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

        Assert.NotNull(formEntry.LastRequest);
        Assert.Equal("IT", formEntry.LastRequest!.MatchValue);
        Assert.Equal("4880", ReadField(formEntry.LastRequest, "Budget"));
    }

    [Fact]
    public void Master_match_sql_is_case_insensitive()
    {
        var where = new List<string>();
        FormEntryService.AppendFilterPredicates(where, [("Vendor", "Acme")]);
        Assert.Single(where);
        Assert.Contains("lower(btrim(COALESCE(\"Vendor\"::text, ''))) = lower(btrim(@Filter0))", where[0]);
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

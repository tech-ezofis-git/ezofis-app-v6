using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>One place a workflow uses an SLA form: its whole-request SLA, or a stage's SLA.</summary>
public sealed record WorkflowSlaFormUsageRow(
    string FormId,
    Guid WorkflowId,
    string WorkflowName,
    bool Published,
    /// <summary>workflow or stage.</summary>
    string Scope,
    string? StageId,
    string? StageName,
    /// <summary>Entries this SLA names. A per-request method can also use others: see <see cref="AnyEntry"/>.</summary>
    IReadOnlyList<string> EntryIds,
    /// <summary>The request decides (selected record or same name), so any entry of the form may be used.</summary>
    bool AnyEntry);

/// <summary>Finds which SLA forms a workflow definition uses. Only Custom Setup (Advanced) uses a form.</summary>
public static class WorkflowSlaFormUsage
{
    public const string ScopeWorkflow = "workflow";
    public const string ScopeStage = "stage";

    public static IReadOnlyList<WorkflowSlaFormUsageRow> Find(Guid workflowId, string workflowName, bool published, WorkflowJsonDto json)
    {
        var rows = new List<WorkflowSlaFormUsageRow>();

        void Add(WorkflowSlaConfigurationDto? sla, string scope, string? stageId, string? stageName)
        {
            if (sla == null
                || !string.Equals(sla.Mode?.Trim(), WorkflowSlaSettingsValidator.ModeAdvanced, StringComparison.OrdinalIgnoreCase)
                || string.IsNullOrWhiteSpace(sla.SlaMasterId))
                return;

            var selection = sla.Selection;
            rows.Add(new WorkflowSlaFormUsageRow(
                sla.SlaMasterId.Trim(), workflowId, workflowName, published, scope, stageId, stageName,
                NamedEntries(sla),
                selection?.Method is WorkflowSlaRuleSelector.MethodColumn or WorkflowSlaRuleSelector.MethodSameName));
        }

        Add(json.Settings?.SlaSettings, ScopeWorkflow, null, null);
        foreach (var block in json.Blocks ?? [])
            Add(block.Settings?.SlaSettings, ScopeStage, block.Id, block.Settings?.Label);
        return rows;
    }

    private static IReadOnlyList<string> NamedEntries(WorkflowSlaConfigurationDto sla) =>
        (sla.MasterEntries ?? []).Select(r => r.EntryId)
            .Append(sla.EntryId)
            .Append(sla.FallbackEntryId)
            .Concat((sla.AdvancedRules ?? []).SelectMany(r => r.EntryIds ?? []))
            .Concat((sla.Selection?.ValueRules ?? []).Select(r => r.EntryId))
            .Append(sla.Selection?.DefaultEntryId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
}

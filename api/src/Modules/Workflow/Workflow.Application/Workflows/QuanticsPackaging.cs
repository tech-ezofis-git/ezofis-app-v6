namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>
/// "New Packaging Requisition": when a ticket completes, its form fields are synced to the
/// tenant's packaging master form via the Python chat API (intent <c>form_sync</c>).
/// Scoped to the tenants + workflows listed in <see cref="Targets"/>, like <see cref="MjbUsAgent"/>.
/// </summary>
public static class QuanticsPackaging
{
    /// <summary>One tenant's packaging workflow, its ticket form and its master form.</summary>
    public sealed record SyncTarget(
        string Name,
        Guid TenantId,
        Guid WorkflowId,
        Guid SourceFormId,
        Guid TargetFormId);

    /// <summary>Quantics (Kenneth): New Packaging Requisition_WF -> New Packaging Requisition_MF.</summary>
    public static readonly SyncTarget Quantics = new(
        "Quantics",
        TenantId: Guid.Parse("1f10e791-b054-483a-8414-e77961f3e282"),
        WorkflowId: Guid.Parse("663804ee-3def-440f-80d8-5fa1b4635e41"),
        SourceFormId: Guid.Parse("aa038e45-b62f-4b4d-8dd8-638c75c3f447"),
        TargetFormId: Guid.Parse("f271d1d3-a0ac-4747-a9f4-09aab4214a88"));

    /// <summary>Amlion (it_admin@amlion.com.my): New Packaging Requisition_WF -> New Packaging Requisition_MF.</summary>
    public static readonly SyncTarget Amlion = new(
        "Amlion",
        TenantId: Guid.Parse("5b50ee42-7b17-41d3-9e1c-631ff354e5c1"),
        WorkflowId: Guid.Parse("8f5d262a-46dc-473b-bb6c-565566e99a65"),
        SourceFormId: Guid.Parse("11698ef8-61e3-49b1-a41d-9e1684bd3541"),
        TargetFormId: Guid.Parse("1c95c6df-7392-4cbc-bd2c-f08550aeb641"));

    public static readonly IReadOnlyList<SyncTarget> Targets = [Quantics, Amlion];

    // Quantics' ids, kept for existing callers.
    public static readonly Guid TenantId = Quantics.TenantId;
    public static readonly Guid WorkflowId = Quantics.WorkflowId;

    /// <summary>Source form on the requisition ticket (Quantics).</summary>
    public static readonly Guid SourceFormId = Quantics.SourceFormId;

    /// <summary>Packaging master form updated by the Python form_sync intent (Quantics).</summary>
    public static readonly Guid TargetFormId = Quantics.TargetFormId;

    public const string FormSyncIntent = "form_sync";
    public const string FormSyncLabel = "Master form sync";

    /// <summary>The sync target for a workflow in a tenant, or null when it has none.</summary>
    public static SyncTarget? Find(Guid workflowId, Guid? tenantId) =>
        Targets.FirstOrDefault(t => t.WorkflowId == workflowId && t.TenantId == tenantId);

    public static bool IsThisWorkflow(Guid workflowId, Guid? tenantId) => Find(workflowId, tenantId) is not null;
}

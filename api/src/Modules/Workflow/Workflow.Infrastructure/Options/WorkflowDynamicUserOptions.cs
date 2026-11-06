namespace SaaSApp.Workflow.Infrastructure.Options;

/// <summary>Policy for Dynamic User (Form Input) stages.</summary>
public sealed class WorkflowDynamicUserOptions
{
    public const string SectionName = "WorkflowDynamicUser";

    /// <summary>
    /// Tenants where an email that has no account yet may get one automatically. Empty by default: the value on a
    /// form is typed by whoever raises the request, so account creation stays off until a tenant is listed here.
    /// </summary>
    public string[] AutoProvisionTenantIds { get; set; } = [];

    public bool IsAutoProvisionAllowed(Guid tenantId) =>
        AutoProvisionTenantIds.Any(id => Guid.TryParse(id, out var parsed) && parsed == tenantId);
}

using SaaSApp.Workflow.Application.Connectors;

namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>AP agent master lookups for PO / vendor (not the typeahead GET /api/master/resolve).</summary>
public interface IApAgentMasterLookupService
{
    Task<ApAgentPoMasterDto?> LookupPoAsync(
        string poNumber,
        string? formId,
        string? table,
        CancellationToken cancellationToken = default);

    Task<ApAgentVendorMasterDto?> LookupVendorAsync(
        string name,
        CancellationToken cancellationToken = default);
}

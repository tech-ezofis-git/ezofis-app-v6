namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>Loads jsonId → value JSON from dbo.ezfb_{form}_items for inbox / mailbox.</summary>
public interface IWorkflowEzfbFormDataLoader
{
    Task<string?> LoadFormDataJsonAsync(
        string formId,
        Guid formEntryId,
        CancellationToken cancellationToken = default);

    /// <summary>Same JSON for a soft-deleted entry, for the form entries Trash list only.</summary>
    Task<string?> LoadDeletedFormDataJsonAsync(
        string formId,
        Guid formEntryId,
        CancellationToken cancellationToken = default);
}

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

    /// <summary>
    /// Same JSON for many entries of one form. The default just loops over the single-entry
    /// methods; <c>WorkflowEzfbFormDataLoader</c> overrides it to read the form metadata once and
    /// fetch every row in one query (a list of N entries is 1 round trip, not about 5 x N).
    /// Entries that are missing (or deleted / not deleted, per <paramref name="deleted"/>) are
    /// simply absent from the result.
    /// </summary>
    async Task<IReadOnlyDictionary<Guid, string>> LoadFormDataJsonBatchAsync(
        string formId,
        IReadOnlyCollection<Guid> formEntryIds,
        bool deleted,
        CancellationToken cancellationToken = default)
    {
        var result = new Dictionary<Guid, string>();
        foreach (var entryId in formEntryIds)
        {
            var json = deleted
                ? await LoadDeletedFormDataJsonAsync(formId, entryId, cancellationToken)
                : await LoadFormDataJsonAsync(formId, entryId, cancellationToken);
            if (!string.IsNullOrWhiteSpace(json))
                result[entryId] = json;
        }

        return result;
    }
}

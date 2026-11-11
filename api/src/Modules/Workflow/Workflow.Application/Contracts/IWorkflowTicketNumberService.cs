namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>
/// Allocates sequential ticket numbers per workflow from
/// <c>settings.general.processNumberPrefix</c> (e.g. REQ-1, REQ-2).
/// </summary>
public interface IWorkflowTicketNumberService
{
    /// <summary>
    /// Returns the next ticket number for the workflow using processNumberPrefix
    /// from workflow JSON, and persists the counter so concurrent starts do not collide.
    /// </summary>
    /// <param name="formValues">
    /// The submitted form values keyed by field jsonId. Used when the request number format has a
    /// Form Column token; without them that token adds nothing to the number.
    /// </param>
    /// <param name="formId">The workflow's form, used to match a Form Column token's field label to its jsonId.</param>
    Task<string> AllocateNextAsync(
        Guid workflowId,
        IReadOnlyDictionary<string, string>? formValues = null,
        string? formId = null,
        CancellationToken cancellationToken = default);
}

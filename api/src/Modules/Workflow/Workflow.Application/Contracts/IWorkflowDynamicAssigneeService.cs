using SaaSApp.Workflow.Domain.Entities;

namespace SaaSApp.Workflow.Application.Contracts;

/// <summary>Dynamic User (Form Input): stage assignees read from a submitted form field.</summary>
public interface IWorkflowDynamicAssigneeService
{
    /// <summary>
    /// Checks the stage that opens right after Start, using the submitted values, before the request is created,
    /// so a bad value is refused instead of leaving a half-started request. Creates nothing.
    /// </summary>
    /// <exception cref="WorkflowDynamicAssignmentException">The stage cannot be assigned from these values.</exception>
    Task ValidateStartAsync(
        Guid workflowId,
        IReadOnlyList<WorkflowStep> orderedSteps,
        IReadOnlyDictionary<string, string>? formDataFields,
        CancellationToken cancellationToken = default);
}

/// <summary>A Dynamic User stage cannot be assigned. The message is safe to show to the person acting.</summary>
public sealed class WorkflowDynamicAssignmentException : InvalidOperationException
{
    public WorkflowDynamicAssignmentException(string message)
        : base(message)
    {
    }

    public WorkflowDynamicAssignmentException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}

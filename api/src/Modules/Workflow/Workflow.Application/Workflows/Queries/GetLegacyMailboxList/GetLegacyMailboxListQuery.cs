using MediatR;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Application.Workflows.Queries.GetLegacyMailboxList;

public sealed record GetLegacyMailboxListQuery(
    LegacyMailboxTableKind Kind,
    Guid WorkflowId,
    Guid? InstanceId = null,
    string? TransactionId = null,
    int PageNumber = 1,
    int PageSize = 20,
    bool SkipTotal = false,
    /// <summary>Skip the "assigned to current user" filter -- find this ticket in this mailbox regardless of who it's assigned to.</summary>
    bool IgnoreUserFilter = false) : IRequest<LegacyMailboxListResult>;

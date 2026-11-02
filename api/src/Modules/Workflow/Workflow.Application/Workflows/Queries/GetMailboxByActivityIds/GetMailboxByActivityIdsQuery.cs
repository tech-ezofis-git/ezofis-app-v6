using MediatR;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Application.Workflows.Queries.GetMailboxByActivityIds;

public sealed record GetMailboxByActivityIdsQuery(
    Guid WorkflowId,
    IReadOnlyList<string> ActivityIds,
    int PageNumber = 1,
    int PageSize = 0) : IRequest<LegacyMailboxListResult>;

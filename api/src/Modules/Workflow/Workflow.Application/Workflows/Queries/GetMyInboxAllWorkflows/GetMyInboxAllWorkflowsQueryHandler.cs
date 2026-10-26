using MediatR;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Domain.Enums;

namespace SaaSApp.Workflow.Application.Workflows.Queries.GetMyInboxAllWorkflows;

public sealed class GetMyInboxAllWorkflowsQueryHandler
    : IRequestHandler<GetMyInboxAllWorkflowsQuery, GetMyInboxAllWorkflowsResult>
{
    private readonly IWorkflowRepository _repository;
    private readonly IWorkflowSecurityService _security;
    private readonly IWorkflowLegacyMailboxQueryService _mailboxQuery;
    private readonly ICurrentUserProvider _currentUserProvider;

    public GetMyInboxAllWorkflowsQueryHandler(
        IWorkflowRepository repository,
        IWorkflowSecurityService security,
        IWorkflowLegacyMailboxQueryService mailboxQuery,
        ICurrentUserProvider currentUserProvider)
    {
        _repository = repository;
        _security = security;
        _mailboxQuery = mailboxQuery;
        _currentUserProvider = currentUserProvider;
    }

    public async Task<GetMyInboxAllWorkflowsResult> Handle(
        GetMyInboxAllWorkflowsQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserProvider.GetUserId()
            ?? throw new InvalidOperationException("User context is required.");

        var workflows = await _repository.ListAsync(cancellationToken);
        workflows = workflows.Where(w => w.Status == WorkflowStatus.Active).ToList();

        if (!await _security.UserSeesAllWorkflowsAsync(userId, cancellationToken))
        {
            var allowed = await _security.GetAccessibleWorkflowIdsAsync(userId, cancellationToken);
            workflows = workflows.Where(w => allowed.Contains(w.Id)).ToList();
        }

        var pageSize = request.ItemsPerWorkflow <= 0 ? 20 : request.ItemsPerWorkflow;
        var today = DateTime.UtcNow.Date;

        var groups = new List<MyInboxWorkflowGroup>();
        foreach (var workflow in workflows)
        {
            // Same query the single-workflow GET /inbox endpoint uses -- this endpoint is purely
            // "run it once per accessible workflow and group the results," no new ticket logic.
            var result = await _mailboxQuery.ListAsync(
                new LegacyMailboxListRequest(
                    LegacyMailboxTableKind.Inbox,
                    workflow.Id,
                    InstanceId: null,
                    TransactionId: null,
                    userId,
                    PageNumber: 1,
                    PageSize: pageSize),
                cancellationToken);

            if (!result.TableExists || result.TotalCount == 0)
                continue;

            var newToday = result.Items.Count(i => (i.TransactionCreatedAt ?? i.CreatedAtUtc)?.Date == today);
            var earlier = result.Items.Count - newToday;

            groups.Add(new MyInboxWorkflowGroup(
                workflow.Id,
                workflow.Name,
                result.TotalCount,
                newToday,
                earlier,
                result.Items));
        }

        groups = groups.OrderByDescending(g => g.TotalCount).ToList();

        return new GetMyInboxAllWorkflowsResult(groups, groups.Sum(g => g.TotalCount));
    }
}

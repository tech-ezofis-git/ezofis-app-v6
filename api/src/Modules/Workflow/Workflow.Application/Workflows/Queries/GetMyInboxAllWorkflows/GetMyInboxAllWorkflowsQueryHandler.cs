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

            var items = result.Items
                .Select(i => i with { IsNewToday = (i.TransactionCreatedAt ?? i.CreatedAtUtc)?.Date == today })
                .ToList();
            var newToday = items.Count(i => i.IsNewToday == true);
            var earlier = items.Count - newToday;
            var latestActivity = items
                .Select(i => i.TransactionCreatedAt ?? i.CreatedAtUtc)
                .Where(d => d.HasValue)
                .Select(d => d!.Value)
                .DefaultIfEmpty()
                .Max();

            groups.Add(new MyInboxWorkflowGroup(
                workflow.Id,
                workflow.Name,
                result.TotalCount,
                newToday,
                earlier,
                latestActivity == default ? null : latestActivity,
                items));
        }

        // Most recently active workflow first -- not raw ticket count -- so a workflow with one
        // brand-new ticket surfaces above one with many stale ones.
        groups = groups
            .OrderByDescending(g => g.LatestActivityAtUtc ?? DateTime.MinValue)
            .ToList();

        return new GetMyInboxAllWorkflowsResult(groups, groups.Sum(g => g.TotalCount));
    }
}

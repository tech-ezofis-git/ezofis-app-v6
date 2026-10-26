using MediatR;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Application.Workflows.Queries.GetMyInboxAllWorkflows;

/// <summary>
/// Inbox tickets for the current user across every workflow they have access to, grouped by
/// workflow -- the "All Workflows" inbox landing page, so the client doesn't have to call
/// /inbox once per workflow.
/// </summary>
public sealed record GetMyInboxAllWorkflowsQuery(
    /// <summary>Rows per workflow group. Default 20, same as the single-workflow inbox.</summary>
    int ItemsPerWorkflow = 20) : IRequest<GetMyInboxAllWorkflowsResult>;

public sealed record MyInboxWorkflowGroup(
    Guid WorkflowId,
    string WorkflowName,
    /// <summary>Total open inbox tickets for this user on this workflow (not just the returned page).</summary>
    int TotalCount,
    /// <summary>Of the fetched items: tickets whose transaction (the step landing in this user's inbox) was created today (UTC).</summary>
    int NewTodayCount,
    /// <summary>Of the fetched items: everything not NewTodayCount -- landed in this user's inbox before today. NewTodayCount + EarlierCount == Items.Count (not TotalCount when a workflow has more open tickets than itemsPerWorkflow).</summary>
    int EarlierCount,
    IReadOnlyList<LegacyMailboxRowDto> Items);

public sealed record GetMyInboxAllWorkflowsResult(
    IReadOnlyList<MyInboxWorkflowGroup> Workflows,
    int TotalCount);

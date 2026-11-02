using Hangfire;
using MediatR;
using Microsoft.Extensions.Options;
using SaaSApp.Api.Options;
using SaaSApp.MultiTenancy;
using SaaSApp.Workflow.Application.Workflows.Queries.GetMyInboxAllWorkflows;

namespace SaaSApp.Api.Services.MobilePush;

/// <summary>
/// Recurring (every minute by default): for each user with a registered phone, reads their inbox exactly as
/// GET /api/Workflows/inbox/all-workflows does (running as that user in their tenant), and sends a push to their
/// phones for requests that weren't there on the previous check. Covers every way a request reaches someone
/// (new request, move-next, group stages), because it compares the inbox itself. The first check for a user only
/// records what is already there.
/// </summary>
public sealed class RunMobilePushPollJob
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly MobilePushDeviceStore _store;
    private readonly FcmSender _fcm;
    private readonly ITenantConnectionStringResolver _connectionStringResolver;
    private readonly IOptions<MobilePushOptions> _options;
    private readonly ILogger<RunMobilePushPollJob> _logger;

    public RunMobilePushPollJob(
        IServiceScopeFactory scopeFactory,
        MobilePushDeviceStore store,
        FcmSender fcm,
        ITenantConnectionStringResolver connectionStringResolver,
        IOptions<MobilePushOptions> options,
        ILogger<RunMobilePushPollJob> logger)
    {
        _scopeFactory = scopeFactory;
        _store = store;
        _fcm = fcm;
        _connectionStringResolver = connectionStringResolver;
        _options = options;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 0)]
    [DisableConcurrentExecution(timeoutInSeconds: 50)]
    [JobDisplayName("Mobile push · new inbox requests")]
    public async Task Execute()
    {
        if (!_options.Value.Enabled || !_fcm.IsConfigured)
            return;

        var devices = await _store.ListAsync(CancellationToken.None);
        var sent = 0;
        foreach (var user in devices.GroupBy(d => (d.TenantId, d.UserId)))
        {
            try
            {
                sent += await CheckUserAsync(user.Key.TenantId, user.Key.UserId, user.ToList());
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Mobile push check failed for user {UserId} in tenant {TenantId}", user.Key.UserId, user.Key.TenantId);
            }
        }

        if (sent > 0)
            _logger.LogInformation("Mobile push: sent {Sent} notification(s) to {Users} user(s) with phones", sent, devices.Select(d => d.UserId).Distinct().Count());
    }

    private async Task<int> CheckUserAsync(Guid tenantId, Guid userId, IReadOnlyList<MobilePushDevice> phones)
    {
        var connectionString = await _connectionStringResolver.GetConnectionStringAsync(tenantId);
        if (string.IsNullOrWhiteSpace(connectionString))
            return 0;

        GetMyInboxAllWorkflowsResult inbox;
        using (var scope = _scopeFactory.CreateScope())
        {
            var services = scope.ServiceProvider;
            services.GetRequiredService<ITenantConnectionProvider>().SetConnectionString(connectionString);
            var jobContext = services.GetRequiredService<JobExecutionContext>();
            jobContext.Set(tenantId, userId);
            try
            {
                inbox = await services.GetRequiredService<IMediator>().Send(new GetMyInboxAllWorkflowsQuery(_options.Value.ItemsPerWorkflow));
            }
            finally
            {
                jobContext.Clear();
            }
        }

        // Same key as the app: instance + step, so a request coming back to the user on a new step counts as new.
        var rows = inbox.Workflows.SelectMany(g => g.Items.Select(r => (Group: g, Row: r))).ToList();
        static string KeyOf(SaaSApp.Workflow.Application.Contracts.LegacyMailboxRowDto r) =>
            $"{r.WorkflowInstanceId}|{(string.IsNullOrEmpty(r.TransactionId) ? r.ActivityId : r.TransactionId)}";
        var keys = rows.Select(x => KeyOf(x.Row)).ToList();

        var seen = await _store.GetSeenAsync(userId, tenantId, CancellationToken.None);
        await _store.SetSeenAsync(userId, tenantId, keys, CancellationToken.None);
        if (seen is null)
            return 0; // first check for this user: remember what's waiting, announce nothing

        var fresh = rows.Where(x => !seen.Contains(KeyOf(x.Row))).ToList();
        if (fresh.Count == 0)
            return 0;

        var first = fresh[0];
        var title = fresh.Count == 1 ? $"New request · {first.Row.ReferenceNumber ?? first.Row.Name ?? first.Group.WorkflowName}" : $"{fresh.Count} new requests";
        var body = fresh.Count == 1
            ? $"{first.Row.Name ?? first.Group.WorkflowName}{(string.IsNullOrEmpty(first.Row.Stage) ? "" : " · " + first.Row.Stage)} is waiting for you"
            : $"{inbox.TotalCount} waiting in your EZOFIS inbox";
        // The app opens the request on tap (one request) or the inbox (several).
        var route = fresh.Count == 1 ? $"/app/inbox/{Uri.EscapeDataString($"{first.Group.WorkflowId:D}~{first.Row.WorkflowInstanceId}")}" : "/app/inbox";
        var data = new Dictionary<string, string> { ["route"] = route, ["tenantId"] = tenantId.ToString("D") };

        var sent = 0;
        foreach (var phone in phones)
        {
            var result = await _fcm.SendAsync(phone.Token, title, body, data, CancellationToken.None);
            if (result == FcmSendResult.Sent) sent++;
            else if (result == FcmSendResult.TokenGone) await _store.RemoveAsync(phone.Token, CancellationToken.None);
        }
        return sent;
    }
}

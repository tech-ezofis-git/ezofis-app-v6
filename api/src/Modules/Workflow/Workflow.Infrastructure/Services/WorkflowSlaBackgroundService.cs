using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SaaSApp.Catalog.Persistence;
using SaaSApp.MultiTenancy;
using SaaSApp.Workflow.Infrastructure.Options;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// The SLA mail process: on a timer inside the API (not Hangfire), for each active tenant runs
/// <see cref="WorkflowSlaTimerService"/> (create + fire due SLA timers) and then
/// <see cref="WorkflowSlaOutboxSender"/> (send queued emails/SMS). Work per pass is capped by the batch
/// sizes, and rows are claimed with SKIP LOCKED, so several API instances can run it safely.
/// Enabled by <c>WorkflowSla:Enabled</c>.
/// </summary>
public sealed class WorkflowSlaBackgroundService : BackgroundService
{
    private static readonly Guid SystemUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly WorkflowSlaOptions _options;
    private readonly ILogger<WorkflowSlaBackgroundService> _logger;

    public WorkflowSlaBackgroundService(
        IServiceScopeFactory scopeFactory,
        IOptions<WorkflowSlaOptions> options,
        ILogger<WorkflowSlaBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(Math.Max(15, _options.IntervalSeconds));
        _logger.LogInformation("Workflow SLA mail process started (every {Seconds}s, no Hangfire).", interval.TotalSeconds);

        // Let the API finish starting before the first pass.
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        using var timer = new PeriodicTimer(interval);
        do
        {
            try
            {
                await RunPassAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Workflow SLA pass failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunPassAsync(CancellationToken cancellationToken)
    {
        List<(Guid Id, string Name)> tenants;
        using (var catalogScope = _scopeFactory.CreateScope())
        await using (var catalog = await catalogScope.ServiceProvider
                         .GetRequiredService<IDbContextFactory<CatalogDbContext>>()
                         .CreateDbContextAsync(cancellationToken))
        {
            tenants = (await catalog.Tenants
                    .AsNoTracking()
                    .Where(t => t.IsActive)
                    .Select(t => new { t.Id, t.Name })
                    .ToListAsync(cancellationToken))
                .Select(t => (t.Id, t.Name ?? t.Id.ToString("D")))
                .ToList();
        }

        foreach (var (tenantId, tenantName) in tenants)
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Tenant services (including the connection resolver) are scoped: one scope per tenant.
            using var scope = _scopeFactory.CreateScope();
            var services = scope.ServiceProvider;
            var connectionString = await services.GetRequiredService<ITenantConnectionStringResolver>()
                .GetConnectionStringAsync(tenantId, cancellationToken);
            if (string.IsNullOrWhiteSpace(connectionString))
                continue;

            services.GetRequiredService<ITenantConnectionProvider>().SetConnectionString(connectionString);
            var jobContext = services.GetRequiredService<JobExecutionContext>();
            jobContext.Set(tenantId, SystemUserId);
            try
            {
                var fired = await services.GetRequiredService<WorkflowSlaTimerService>().RunAsync(cancellationToken);
                var sent = await services.GetRequiredService<WorkflowSlaOutboxSender>().RunAsync(cancellationToken);
                if (fired > 0 || sent > 0)
                    _logger.LogInformation("Workflow SLA {TenantName}: fired {Fired} rule(s), sent {Sent} message(s).", tenantName, fired, sent);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Workflow SLA failed for tenant {TenantId} ({TenantName}).", tenantId, tenantName);
            }
            finally
            {
                jobContext.Clear();
            }
        }
    }
}

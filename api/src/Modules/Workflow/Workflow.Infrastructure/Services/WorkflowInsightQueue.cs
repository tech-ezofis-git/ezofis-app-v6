using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SaaSApp.MultiTenancy;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// In-process queue for AI insight generation. start / move-next enqueue and return immediately;
/// <see cref="WorkflowInsightWorker"/> generates the insight so the request is never slowed or failed by the LLM.
/// </summary>
public sealed class WorkflowInsightQueue : IWorkflowInsightQueue
{
    private readonly Channel<WorkflowInsightGenerateRequest> _channel =
        Channel.CreateUnbounded<WorkflowInsightGenerateRequest>(new UnboundedChannelOptions { SingleReader = true });

    public ChannelReader<WorkflowInsightGenerateRequest> Reader => _channel.Reader;

    public void Enqueue(WorkflowInsightGenerateRequest request) => _channel.Writer.TryWrite(request);
}

public sealed class WorkflowInsightWorker : BackgroundService
{
    private static readonly TimeSpan JobTimeout = TimeSpan.FromMinutes(3);

    private readonly WorkflowInsightQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WorkflowInsightWorker> _logger;

    public WorkflowInsightWorker(
        WorkflowInsightQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<WorkflowInsightWorker> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var request in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                timeout.CancelAfter(JobTimeout);
                await RunAsync(request, timeout.Token);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "AI insight generation failed for workflow {WorkflowId} instance {InstanceId}.",
                    request.WorkflowId,
                    request.InstanceId);
            }
        }
    }

    private async Task RunAsync(WorkflowInsightGenerateRequest request, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var services = scope.ServiceProvider;

        var connectionString = await services.GetRequiredService<ITenantConnectionStringResolver>()
            .GetConnectionStringAsync(request.TenantId, cancellationToken);
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException($"Tenant connection string not found for {request.TenantId:D}.");

        services.GetRequiredService<ITenantConnectionProvider>().SetConnectionString(connectionString);
        var jobContext = services.GetRequiredService<JobExecutionContext>();
        jobContext.Set(request.TenantId, request.UserId);
        try
        {
            await services.GetRequiredService<IWorkflowInsightService>().GenerateAsync(request, cancellationToken);
        }
        finally
        {
            jobContext.Clear();
        }
    }
}

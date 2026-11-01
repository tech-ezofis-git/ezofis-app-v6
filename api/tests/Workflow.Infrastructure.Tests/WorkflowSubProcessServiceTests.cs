using System.Reflection;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

/// <summary>
/// Access rules that run before any database work. The tenant context has no connection string,
/// so a call that got past the check would fail with "Tenant connection string not resolved".
/// </summary>
public class WorkflowSubProcessServiceTests
{
    private static readonly Guid Tenant = Guid.NewGuid();
    private static readonly Guid User = Guid.NewGuid();
    private static readonly Guid MainWorkflow = Guid.NewGuid();
    private static readonly Guid SubWorkflow = Guid.NewGuid();

    private static readonly WorkflowSubProcessLinkDto Link =
        new(MainWorkflow, Guid.NewGuid(), SubWorkflow, Guid.NewGuid());

    [Fact]
    public async Task Link_is_refused_without_access_to_the_parent_workflow()
    {
        var service = CreateService(SubWorkflow);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.LinkAsync(Tenant, User, Link));
    }

    [Fact]
    public async Task Link_is_refused_without_access_to_the_child_workflow()
    {
        var service = CreateService(MainWorkflow);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.LinkAsync(Tenant, User, Link));
    }

    [Fact]
    public async Task Link_reaches_the_database_only_with_access_to_both_workflows()
    {
        var service = CreateService(MainWorkflow, SubWorkflow);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.LinkAsync(Tenant, User, Link));

        Assert.Contains("connection string", error.Message);
    }

    [Fact]
    public async Task Invalid_links_are_refused_before_the_access_check()
    {
        var service = CreateService();
        var selfLink = Link with { SubProcessId = Link.MainProcessId };

        await Assert.ThrowsAsync<ArgumentException>(() => service.LinkAsync(Tenant, User, selfLink));
    }

    private static WorkflowSubProcessService CreateService(params Guid[] accessibleWorkflows)
    {
        var security = DispatchProxy.Create<IWorkflowSecurityService, FakeSecurity>();
        ((FakeSecurity)(object)security).Accessible = accessibleWorkflows;
        return new WorkflowSubProcessService(new NoConnectionTenantContext(), security);
    }

    private sealed class NoConnectionTenantContext : ITenantContext
    {
        public Guid? TenantId => Tenant;
        public string? ConnectionString => null;
    }

    /// <summary>Answers only CanAccessWorkflowAsync; any other call fails the test.</summary>
    public class FakeSecurity : DispatchProxy
    {
        public Guid[] Accessible { get; set; } = [];

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            if (targetMethod?.Name != nameof(IWorkflowSecurityService.CanAccessWorkflowAsync))
                throw new NotSupportedException(targetMethod?.Name);
            return Task.FromResult(Accessible.Contains((Guid)args![0]!));
        }
    }
}

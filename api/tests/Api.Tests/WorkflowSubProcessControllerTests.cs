using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SaaSApp.Api.Controllers;
using SaaSApp.MultiTenancy;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Api.Tests;

public class WorkflowSubProcessControllerTests
{
    private static readonly WorkflowSubProcessLinkDto Link =
        new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

    public static TheoryData<Exception, int> Failures => new()
    {
        { new ArgumentException("bad"), StatusCodes.Status400BadRequest },
        { new UnauthorizedAccessException("denied"), StatusCodes.Status403Forbidden },
        { new KeyNotFoundException("missing"), StatusCodes.Status404NotFound },
        { new InvalidOperationException("conflict"), StatusCodes.Status409Conflict },
    };

    [Theory]
    [MemberData(nameof(Failures))]
    public async Task Link_failures_map_to_their_status_with_an_error_body(Exception failure, int expectedStatus)
    {
        var result = await CreateController(new StubSubProcesses(failure)).Link(Link, CancellationToken.None);

        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.Equal(expectedStatus, objectResult.StatusCode);
        Assert.Contains(failure.Message, objectResult.Value!.ToString());
    }

    [Fact]
    public async Task A_successful_link_returns_201()
    {
        var result = await CreateController(new StubSubProcesses(null)).Link(Link, CancellationToken.None);

        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
        Assert.Equal(Link, objectResult.Value);
    }

    [Fact]
    public async Task A_missing_body_returns_400()
    {
        var result = await CreateController(new StubSubProcesses(null)).Link(null, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Batch_returns_ok_for_a_page_of_ids()
    {
        var controller = CreateController(new StubSubProcesses(null));

        var result = await controller.GetChildrenBatch(
            Guid.NewGuid(), new WorkflowSubProcessBatchRequest([Guid.NewGuid(), Guid.NewGuid()]), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Batch_rejects_more_than_100_ids()
    {
        var controller = CreateController(new StubSubProcesses(null));
        var ids = Enumerable.Range(0, 101).Select(_ => Guid.NewGuid()).ToList();

        var result = await controller.GetChildrenBatch(Guid.NewGuid(), new WorkflowSubProcessBatchRequest(ids), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    private static WorkflowSubProcessController CreateController(IWorkflowSubProcessService service)
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", Guid.NewGuid().ToString())], "test"));
        return new WorkflowSubProcessController(service, new StubTenantProvider())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = user } },
        };
    }

    private sealed class StubTenantProvider : ITenantProvider
    {
        public Guid? GetTenantId() => Guid.NewGuid();
    }

    private sealed class StubSubProcesses(Exception? failure) : IWorkflowSubProcessService
    {
        public Task<WorkflowSubProcessLinkDto> LinkAsync(
            Guid tenantId, Guid userId, WorkflowSubProcessLinkDto link, CancellationToken cancellationToken = default) =>
            failure is null ? Task.FromResult(link) : Task.FromException<WorkflowSubProcessLinkDto>(failure);

        public Task<bool> IsSubProcessAsync(
            Guid tenantId, Guid workflowId, Guid processId, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<WorkflowSubProcessRowDto>> GetChildrenAsync(
            Guid tenantId, Guid userId, Guid workflowId, Guid processId, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<IReadOnlyDictionary<Guid, IReadOnlyList<WorkflowSubProcessRowDto>>> GetChildrenBatchAsync(
            Guid tenantId, Guid userId, Guid workflowId, IReadOnlyCollection<Guid> processIds, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyDictionary<Guid, IReadOnlyList<WorkflowSubProcessRowDto>>>(
                processIds.ToDictionary(id => id, _ => (IReadOnlyList<WorkflowSubProcessRowDto>)[]));

        public Task<IReadOnlyList<WorkflowMainProcessDto>> GetParentAsync(
            Guid tenantId, Guid userId, Guid workflowId, Guid processId, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }
}

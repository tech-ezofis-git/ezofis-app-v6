using SaaSApp.Workflow.Application.Workflows;
using Xunit;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class PackagingFormSyncTargetTests
{
    [Fact]
    public void Each_tenant_workflow_finds_its_own_forms()
    {
        var quantics = QuanticsPackaging.Find(
            Guid.Parse("663804ee-3def-440f-80d8-5fa1b4635e41"), Guid.Parse("1f10e791-b054-483a-8414-e77961f3e282"));
        var amlion = QuanticsPackaging.Find(
            Guid.Parse("8f5d262a-46dc-473b-bb6c-565566e99a65"), Guid.Parse("5b50ee42-7b17-41d3-9e1c-631ff354e5c1"));

        Assert.NotNull(quantics);
        Assert.Equal(Guid.Parse("aa038e45-b62f-4b4d-8dd8-638c75c3f447"), quantics!.SourceFormId);
        Assert.Equal(Guid.Parse("f271d1d3-a0ac-4747-a9f4-09aab4214a88"), quantics.TargetFormId);

        Assert.NotNull(amlion);
        Assert.Equal(Guid.Parse("11698ef8-61e3-49b1-a41d-9e1684bd3541"), amlion!.SourceFormId);
        Assert.Equal(Guid.Parse("1c95c6df-7392-4cbc-bd2c-f08550aeb641"), amlion.TargetFormId);
    }

    [Fact]
    public void A_workflow_only_syncs_in_its_own_tenant()
    {
        // Amlion's workflow under Quantics' tenant (and the reverse) must not sync.
        Assert.False(QuanticsPackaging.IsThisWorkflow(QuanticsPackaging.Amlion.WorkflowId, QuanticsPackaging.Quantics.TenantId));
        Assert.False(QuanticsPackaging.IsThisWorkflow(QuanticsPackaging.Quantics.WorkflowId, QuanticsPackaging.Amlion.TenantId));
        Assert.False(QuanticsPackaging.IsThisWorkflow(QuanticsPackaging.Amlion.WorkflowId, null));
        Assert.True(QuanticsPackaging.IsThisWorkflow(QuanticsPackaging.Amlion.WorkflowId, QuanticsPackaging.Amlion.TenantId));
    }
}

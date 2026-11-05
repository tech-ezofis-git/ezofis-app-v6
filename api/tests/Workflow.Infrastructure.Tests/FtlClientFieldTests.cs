using SaaSApp.Workflow.Infrastructure.Services;
using Xunit;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class FtlClientFieldTests
{
    [Theory]
    [InlineData("Billing Address")]
    [InlineData("Contact")]
    [InlineData("Phone Number")]
    [InlineData("Email")]
    public void ClientFields_CanBeSaved(string label) =>
        Assert.True(FtlAgentPipelineService.IsSavableClientLabel(label));

    [Theory]
    [InlineData("Company Name")]
    [InlineData("Shipping Address")]
    [InlineData("Total")]
    [InlineData("quote_2 Email")]
    [InlineData("")]
    [InlineData(null)]
    public void OtherFields_CannotBeSaved(string? label) =>
        Assert.False(FtlAgentPipelineService.IsSavableClientLabel(label));
}

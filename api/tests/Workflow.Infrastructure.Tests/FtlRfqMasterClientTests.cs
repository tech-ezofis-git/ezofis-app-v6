using SaaSApp.Workflow.Infrastructure.Services;
using Xunit;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class FtlRfqMasterClientTests
{
    private static Dictionary<string, string> Quote(params (string Key, string Value)[] extra)
    {
        var fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Rfq Master No Match"] = "true",
            ["Company Name"] = "Test Elevator Co",
            ["Billing Address"] = "1 Main St, Toronto, ON",
            ["Shipping Address"] = "2 Ship St, Toronto, ON",
            ["Contact"] = "Pat Example",
            ["Email"] = "pat@example.com",
        };
        foreach (var (key, value) in extra)
            fields[key] = value;
        return fields;
    }

    [Fact]
    public void NewClient_StoresDetailsButNotShipTo()
    {
        var fields = FtlRfqMasterClient.BuildNewClientFields(Quote());

        Assert.NotNull(fields);
        Assert.Equal("Test Elevator Co", fields!["Company Name"]);
        Assert.Equal("1 Main St, Toronto, ON", fields["Billing Address"]);
        Assert.Equal("Pat Example", fields["Contact"]);
        Assert.Equal("pat@example.com", fields["Email"]);
        Assert.DoesNotContain(fields.Keys, key => key.Contains("Ship", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData("Rfq Master No Match", "false")]
    [InlineData("Rfq Master No Match", "")]
    [InlineData("Company Name", "")]
    [InlineData("Billing Address", "")]
    [InlineData("Billing Address", "(jobsite from Project — e.g. 1 Main St)")]
    [InlineData("Billing Address", "TBD")]
    public void NothingIsStored_WhenNotANewClientWithARealBillTo(string key, string value)
    {
        Assert.Null(FtlRfqMasterClient.BuildNewClientFields(Quote((key, value))));
    }

    [Fact]
    public void NothingIsStored_WhenTheAgentDidNotReportNoMatch()
    {
        var quote = Quote();
        quote.Remove("Rfq Master No Match");

        Assert.Null(FtlRfqMasterClient.BuildNewClientFields(quote));
    }

    [Fact]
    public void PlaceholderContact_IsLeftOut()
    {
        var fields = FtlRfqMasterClient.BuildNewClientFields(Quote(("Contact", "TBD")));

        Assert.NotNull(fields);
        Assert.False(fields!.ContainsKey("Contact"));
    }
}

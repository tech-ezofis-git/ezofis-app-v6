using SaaSApp.Workflow.Infrastructure.Services;
using Xunit;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class FtlQuoteFormDataMergeTests
{
    private static string Merge(string existing, string key, string incoming) =>
        FtlAgentPipelineService.MergeQuoteFormData(
            existing,
            new Dictionary<string, string> { [key] = incoming })[key];

    [Theory]
    [InlineData("""{"f":"0"}""")]
    [InlineData("""{"f":0}""")]
    [InlineData("""{"f":"0.00"}""")]
    public void DefaultZero_GivesWayToTheAgentValue(string existing) =>
        Assert.Equal("375", Merge(existing, "f", "375"));

    [Fact]
    public void RealSavedValue_IsKept() =>
        Assert.Equal("450", Merge("""{"f":"450"}""", "f", "375"));

    [Fact]
    public void EmptyAgentValue_DoesNotClearZero() =>
        Assert.Equal("0", Merge("""{"f":"0"}""", "f", ""));

    [Fact]
    public void BlankSavedValue_TakesTheAgentValue() =>
        Assert.Equal("375", Merge("""{"f":""}""", "f", "375"));
}

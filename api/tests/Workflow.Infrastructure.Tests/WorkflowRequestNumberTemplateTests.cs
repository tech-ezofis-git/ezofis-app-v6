using SaaSApp.Workflow.Infrastructure.Services;
using Xunit;

namespace Workflow.Infrastructure.Tests;

public class WorkflowRequestNumberTemplateTests
{
    private static readonly DateTime Now = new(2026, 11, 9, 10, 0, 0, DateTimeKind.Utc);

    private static RequestNumberToken T(string key, string value) => new(key, value);

    [Fact]
    public void Old_formats_are_not_templates()
    {
        Assert.False(WorkflowRequestNumberTemplate.IsTemplate(
            [T("prefix", "REQ"), T("seperator", "-"), T("year", "yyyy"), T("autoIncrement", "1")]));
    }

    [Theory]
    [InlineData("formColumn")]
    [InlineData("month")]
    [InlineData("currentDate")]
    public void Form_column_month_and_date_make_a_template(string key)
    {
        Assert.True(WorkflowRequestNumberTemplate.IsTemplate([T("prefix", "REQ"), T(key, "x")]));
    }

    [Fact]
    public void Form_column_value_is_part_of_the_number()
    {
        var tokens = new[]
        {
            T("prefix", "PO"), T("formColumn", "Supplier Number"), T("autoIncrement", "4"), T("seperator", "-"),
        };
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { ["Supplier Number"] = "1234" };

        Assert.Equal("PO-1234-0007", WorkflowRequestNumberTemplate.Render(tokens, 7, Now, values));
    }

    [Fact]
    public void Several_fields_in_one_token_are_joined_and_empty_ones_skipped()
    {
        var tokens = new[] { T("formColumn", "Supplier Name, Plant Code, Missing"), T("seperator", "_") };
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Supplier Name"] = "Acme",
            ["Plant Code"] = "BLR",
        };

        Assert.Equal("Acme_BLR", WorkflowRequestNumberTemplate.Render(tokens, 1, Now, values));
    }

    [Fact]
    public void Month_and_date_tokens_use_the_given_time()
    {
        var tokens = new[]
        {
            T("prefix", "INV"), T("year", "yy"), T("month", "mmm"), T("currentDate", "ddMMyyyy"), T("autoIncrement", "2"),
        };

        Assert.Equal("INV-26-Nov-09112026-05", WorkflowRequestNumberTemplate.Render(tokens, 5, Now, new Dictionary<string, string>()));
    }

    [Fact]
    public void Unsafe_date_pattern_is_ignored()
    {
        var tokens = new[] { T("prefix", "A"), T("currentDate", "yyyy'x'"), T("autoIncrement", "1") };

        Assert.Equal("A-3", WorkflowRequestNumberTemplate.Render(tokens, 3, Now, new Dictionary<string, string>()));
    }

    [Fact]
    public void Form_column_labels_are_collected_once()
    {
        var tokens = new[] { T("formColumn", "A,B"), T("formColumn", "b, C") };

        Assert.Equal(["A", "B", "C"], WorkflowRequestNumberTemplate.FormColumnLabels(tokens));
    }
}

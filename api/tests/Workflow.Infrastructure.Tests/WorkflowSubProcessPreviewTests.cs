using SaaSApp.Workflow.Application.Workflows;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class WorkflowSubProcessPreviewTests
{
    private const string Form = """
        [
          {"id":"f-number","label":"Supplier Number","type":"SHORT_TEXT"},
          {"id":"f-name","label":"Supplier Name","type":"SHORT_TEXT"},
          {"id":"f-divider","label":"Section","type":"DIVIDER"},
          {"id":"f-email","label":"Supplier Email","type":"EMAIL"},
          {"id":"f-empty","label":"Notes","type":"LONG_TEXT"},
          {"id":"f-lookup","label":"Stock","type":"LOOKUP"},
          {"id":"f-table","label":"Documents","type":"TABLE"},
          {"id":"f-code","label":"Stock Code","type":"SHORT_TEXT"},
          {"id":"f-extra","label":"Extra","type":"SHORT_TEXT"}
        ]
        """;

    [Fact]
    public void Takes_the_first_filled_values_in_form_order()
    {
        var values = new Dictionary<string, string>
        {
            ["f-name"] = "Sam Wilson",
            ["f-number"] = "1234",
            ["f-email"] = "sam@example.com",
            ["f-code"] = "456",
            ["f-extra"] = "not shown (limit of four)",
        };

        var preview = WorkflowSubProcessPreview.Build(Form, values);

        Assert.Equal(
            new[] { "Supplier Number=1234", "Supplier Name=Sam Wilson", "Supplier Email=sam@example.com", "Stock Code=456" },
            preview.Select(p => $"{p.Label}={p.Value}"));
    }

    [Fact]
    public void Skips_empty_values_layout_tables_and_structured_values()
    {
        var values = new Dictionary<string, string>
        {
            ["f-empty"] = "   ",
            ["f-lookup"] = """{"id":"1","name":"A"}""",
            ["f-table"] = """[{"a":"b"}]""",
            ["f-divider"] = "x",
            ["f-name"] = "  Sam  ",
        };

        var preview = WorkflowSubProcessPreview.Build(Form, values);

        var only = Assert.Single(preview);
        Assert.Equal("Supplier Name", only.Label);
        Assert.Equal("Sam", only.Value);
    }

    [Fact]
    public void Honours_a_smaller_limit_and_missing_data()
    {
        var values = new Dictionary<string, string> { ["f-number"] = "1", ["f-name"] = "A", ["f-email"] = "b" };

        Assert.Equal(2, WorkflowSubProcessPreview.Build(Form, values, maxFields: 2).Count);
        Assert.Empty(WorkflowSubProcessPreview.Build(null, values));
        Assert.Empty(WorkflowSubProcessPreview.Build(Form, new Dictionary<string, string>()));
    }
}

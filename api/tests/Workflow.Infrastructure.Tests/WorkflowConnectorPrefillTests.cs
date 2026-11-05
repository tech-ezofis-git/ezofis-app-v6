using System.Text.Json;
using SaaSApp.Workflow.Application.Workflows;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class WorkflowConnectorPrefillTests
{
    private const string ParentForm = """
        {"panels":[{"fields":[
          {"id":"p-vendor","label":"Vendor","type":"SHORT_TEXT"},
          {"id":"p-amount","label":"Amount","type":"NUMBER"},
          {"id":"p-note","label":"Note","type":"SHORT_TEXT"},
          {"id":"p-items","label":"Items","type":"TABLE","settings":{"specific":{"tableColumns":[
            {"id":"p-col-name","label":"Item Name","type":"SHORT_TEXT"},
            {"id":"p-col-qty","label":"Qty","type":"NUMBER"},
            {"id":"p-col-cost","label":"Cost","type":"NUMBER"}
          ]}}}
        ]}]}
        """;

    private static readonly Dictionary<string, string> ParentValues = new(StringComparer.OrdinalIgnoreCase)
    {
        ["p-vendor"] = "Acme",
        ["p-amount"] = "5000",
        ["p-note"] = "  ",
        ["p-items"] = """[{"p-col-name":"Laptop","p-col-qty":2,"p-col-cost":900},{"p-col-name":"Chair","p-col-qty":1}]""",
    };

    [Fact]
    public void Copies_values_into_fields_with_the_same_label()
    {
        const string child = """
            [{"id":"c-vendor","label":" vendor ","type":"SHORT_TEXT"},
             {"id":"c-amount","label":"Amount","type":"NUMBER"},
             {"id":"c-other","label":"Other","type":"SHORT_TEXT"}]
            """;

        var fields = WorkflowConnectorPrefill.Build(ParentForm, ParentValues, child);

        Assert.Equal(2, fields.Count);
        Assert.Equal("Acme", fields["c-vendor"]);
        Assert.Equal("5000", fields["c-amount"]);
    }

    [Fact]
    public void Skips_empty_disabled_and_layout_fields()
    {
        const string child = """
            [{"id":"c-note","label":"Note","type":"SHORT_TEXT"},
             {"id":"c-vendor","label":"Vendor","type":"SHORT_TEXT","settings":{"general":{"visibility":"DISABLE"}}},
             {"id":"c-label","label":"Amount","type":"LABEL"}]
            """;

        Assert.Empty(WorkflowConnectorPrefill.Build(ParentForm, ParentValues, child));
    }

    [Fact]
    public void Each_parent_field_is_copied_once()
    {
        const string child = """
            [{"id":"c-1","label":"Vendor","type":"SHORT_TEXT"},
             {"id":"c-2","label":"Vendor","type":"SHORT_TEXT"}]
            """;

        var fields = WorkflowConnectorPrefill.Build(ParentForm, ParentValues, child);

        Assert.Equal("Acme", Assert.Single(fields).Value);
        Assert.True(fields.ContainsKey("c-1"));
    }

    [Fact]
    public void Tables_copy_rows_keeping_columns_with_matching_labels()
    {
        const string child = """
            [{"id":"c-items","label":"Items","type":"DYNAMIC_TABLE","settings":{"specific":{"tableColumns":[
              {"id":"c-col-qty","label":"QTY","type":"NUMBER"},
              {"id":"c-col-name","label":"Item Name","type":"SHORT_TEXT"},
              {"id":"c-col-extra","label":"Extra","type":"SHORT_TEXT"}
            ]}}}]
            """;

        var fields = WorkflowConnectorPrefill.Build(ParentForm, ParentValues, child);

        using var rows = JsonDocument.Parse(fields["c-items"]);
        var list = rows.RootElement.EnumerateArray().ToList();
        Assert.Equal(2, list.Count);
        Assert.Equal("Laptop", list[0].GetProperty("c-col-name").GetString());
        Assert.Equal(2, list[0].GetProperty("c-col-qty").GetInt32());
        Assert.False(list[0].TryGetProperty("c-col-extra", out _));
        Assert.False(list[0].TryGetProperty("p-col-cost", out _));
        Assert.Equal("Chair", list[1].GetProperty("c-col-name").GetString());
    }

    [Fact]
    public void Tables_read_saved_rows_keyed_by_column_label()
    {
        var saved = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["p-items"] = """[{"Item Name":"Laptop","qty":2,"Cost":900}]""",
        };
        const string child = """
            [{"id":"c-items","label":"Items","type":"TABLE","settings":{"specific":{"tableColumns":[
              {"id":"c-col-name","label":"Item Name","type":"SHORT_TEXT"},
              {"id":"c-col-qty","label":"Qty","type":"NUMBER"}
            ]}}}]
            """;

        var fields = WorkflowConnectorPrefill.Build(ParentForm, saved, child);

        Assert.Equal("""[{"c-col-name":"Laptop","c-col-qty":2}]""", fields["c-items"]);
    }

    [Fact]
    public void Table_and_plain_field_with_the_same_label_are_not_mixed()
    {
        const string child = """[{"id":"c-items","label":"Items","type":"SHORT_TEXT"}]""";

        Assert.Empty(WorkflowConnectorPrefill.Build(ParentForm, ParentValues, child));
    }

    [Fact]
    public void Table_columns_are_not_read_as_fields()
    {
        var fields = WorkflowConnectorPrefill.ReadFields(ParentForm);

        Assert.Equal(["p-vendor", "p-amount", "p-note", "p-items"], fields.Select(f => f.Id));
        Assert.Equal(3, fields[3].Columns.Count);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not json")]
    public void Missing_or_bad_form_json_copies_nothing(string? child)
    {
        Assert.Empty(WorkflowConnectorPrefill.Build(ParentForm, ParentValues, child));
        Assert.Empty(WorkflowConnectorPrefill.Build(child, ParentValues, ParentForm));
    }
}

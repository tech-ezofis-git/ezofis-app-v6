using SaaSApp.Workflow.Application.Workflows;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public sealed class WorkflowConditionEvaluatorTests
{
    private static readonly Dictionary<string, string[]> Form = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Amount"] = ["12,000.50"],
        ["Limit"] = ["10000"],
        ["Vendor"] = ["Acme Supplies"],
        ["Category"] = ["Travel"],
        ["Tags"] = ["urgent, travel"],
        ["InvoiceDate"] = ["2026-10-15"],
        ["Item"] = ["Laptop", "Chair"],
    };

    private static IReadOnlyList<string> ValuesOf(string id) =>
        Form.TryGetValue(id, out var v) ? v : [];

    private static WorkflowConditionOutcome Check(bool matchAll, params WorkflowConditionRule[] rules) =>
        WorkflowConditionEvaluator.Evaluate(
            new WorkflowConditionConfig(true, matchAll, rules, null, []),
            ValuesOf);

    private static WorkflowConditionRule Rule(string field, string logic, string? value = null, bool valueIsField = false) =>
        new(field, logic, value, valueIsField);

    [Theory]
    [InlineData("IS_GREATER_THAN", "10000", true)]
    [InlineData("IS_GREATER_THAN", "12000.50", false)]
    [InlineData("IS_GREATER_THAN_OR_EQUALS_TO", "12000.50", true)]
    [InlineData("IS_LESSER_THAN", "20000", true)]
    [InlineData("IS_LESSER_THAN_OR_EQUALS_TO", "100", false)]
    [InlineData("IS_EQUALS_TO", "12000.5", true)]
    [InlineData("IS_NOT_EQUALS_TO", "12000.5", false)]
    public void Numbers_compare_as_numbers(string logic, string value, bool expected)
    {
        Assert.Equal(expected, Check(true, Rule("Amount", logic, value)).Satisfied);
    }

    [Theory]
    [InlineData("IS_EQUALS_TO", "acme supplies", true)]
    [InlineData("CONTAINS", "SUPP", true)]
    [InlineData("NOT_CONTAINS", "supp", false)]
    [InlineData("STARTS_WITH", "acme", true)]
    [InlineData("NOT_STARTS_WITH", "acme", false)]
    [InlineData("ENDS_WITH", "plies", true)]
    [InlineData("NOT_ENDS_WITH", "xyz", true)]
    public void Text_compares_ignoring_case(string logic, string value, bool expected)
    {
        Assert.Equal(expected, Check(true, Rule("Vendor", logic, value)).Satisfied);
    }

    [Fact]
    public void All_needs_every_rule_and_any_needs_one()
    {
        var pass = Rule("Amount", "IS_GREATER_THAN", "10000");
        var fail = Rule("Vendor", "IS_EQUALS_TO", "Other Co");

        Assert.False(Check(true, pass, fail).Satisfied);
        Assert.True(Check(false, pass, fail).Satisfied);
        Assert.Equal(WorkflowConditionEvaluator.NotSatisfiedReview, Check(true, pass, fail).Review);
        Assert.Equal(WorkflowConditionEvaluator.SatisfiedReview, Check(false, pass, fail).Review);
    }

    [Fact]
    public void Missing_field_is_empty()
    {
        Assert.True(Check(true, Rule("Missing", "IS_EMPTY")).Satisfied);
        Assert.False(Check(true, Rule("Missing", "IS_NOT_EMPTY")).Satisfied);
        Assert.False(Check(true, Rule("Missing", "IS_GREATER_THAN", "0")).Satisfied);
        Assert.True(Check(true, Rule("Missing", "IS_NOT_EQUALS_TO", "x")).Satisfied);
    }

    [Fact]
    public void Any_of_accepts_lists_and_multi_value_fields()
    {
        Assert.True(Check(true, Rule("Category", "IS_ANY_OF", "Food, travel")).Satisfied);
        Assert.True(Check(true, Rule("Category", "IS_ANY_OF", """["Food","Travel"]""")).Satisfied);
        Assert.False(Check(true, Rule("Category", "IS_NOT_ANY_OF", "travel")).Satisfied);
        Assert.True(Check(true, Rule("Tags", "IS_ANY_OF", "urgent")).Satisfied);
    }

    [Fact]
    public void Table_column_matches_any_row_and_negations_need_no_row()
    {
        Assert.True(Check(true, Rule("Item", "IS_EQUALS_TO", "chair")).Satisfied);
        Assert.False(Check(true, Rule("Item", "NOT_CONTAINS", "lap")).Satisfied);
        Assert.True(Check(true, Rule("Item", "NOT_CONTAINS", "desk")).Satisfied);
    }

    [Fact]
    public void Dates_compare_and_date_range_includes_end_day()
    {
        Assert.True(Check(true, Rule("InvoiceDate", "IS_GREATER_THAN", "2026-10-01")).Satisfied);
        Assert.True(Check(true, Rule("InvoiceDate", "IS_LESSER_THAN", "20-10-2026")).Satisfied);
        Assert.True(Check(true, Rule("InvoiceDate", "DATE_RANGE", "2026-10-01,2026-10-15")).Satisfied);
        Assert.True(Check(true, Rule("InvoiceDate", "DATE_RANGE", """{"from":"2026-10-15","to":"2026-10-31"}""")).Satisfied);
        Assert.False(Check(true, Rule("InvoiceDate", "DATE_RANGE", """["2026-11-01","2026-11-30"]""")).Satisfied);
    }

    [Fact]
    public void Value_can_be_another_field()
    {
        Assert.True(Check(true, Rule("Amount", "IS_GREATER_THAN", "Limit", valueIsField: true)).Satisfied);
    }

    [Fact]
    public void Old_equals_default_from_the_designer_still_works()
    {
        Assert.True(Check(true, Rule("Category", "EQUALS", "Travel")).Satisfied);
    }

    [Fact]
    public void Reason_lists_each_rule()
    {
        var outcome = Check(true, Rule("Amount", "IS_GREATER_THAN", "10000"));
        Assert.Equal("Amount (12,000.50) greater than '10000': yes", outcome.Reason);
    }

    [Fact]
    public void Bad_setup_throws()
    {
        Assert.Throws<WorkflowConditionConfigException>(() => Check(true));
        Assert.Throws<WorkflowConditionConfigException>(() => Check(true, Rule("Amount", "IS_SIMILAR_TO", "1")));
        Assert.Throws<WorkflowConditionConfigException>(() => Check(true, Rule("", "IS_EQUALS_TO", "1")));
        Assert.Throws<WorkflowConditionConfigException>(() => Check(true, Rule("InvoiceDate", "DATE_RANGE", "soon")));
    }
}

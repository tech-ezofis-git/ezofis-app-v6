using System.Text.Json;
using SaaSApp.Workflow.Domain.Entities;
using SaaSApp.Workflow.Domain.Enums;
using SaaSApp.Workflow.Infrastructure.Options;
using SaaSApp.Workflow.Infrastructure.Services;
using Xunit;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowDynamicUserTests
{
    private const string Muthu = "muthu.perumal@example.com";
    private const string Raja = "raja@example.com";

    private static WorkflowDynamicUserEmails ParseJson(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return WorkflowDynamicUserEmailParser.Parse(doc.RootElement);
    }

    [Fact]
    public void Single_email_string()
    {
        var result = WorkflowDynamicUserEmailParser.Parse(Muthu);
        Assert.Equal([Muthu], result.Emails);
        Assert.Empty(result.Invalid);
    }

    [Fact]
    public void Multiple_emails_in_an_array()
    {
        var result = ParseJson($"""["{Muthu}", "{Raja}"]""");
        Assert.Equal([Muthu, Raja], result.Emails);
    }

    [Fact]
    public void One_email_in_an_array()
    {
        Assert.Equal([Muthu], ParseJson($"""["{Muthu}"]""").Emails);
    }

    [Fact]
    public void Array_stored_as_text_as_ezfb_columns_do()
    {
        var result = WorkflowDynamicUserEmailParser.Parse($"""["{Muthu}","{Raja}"]""");
        Assert.Equal([Muthu, Raja], result.Emails);
    }

    [Fact]
    public void Duplicates_are_removed_ignoring_case_and_spaces()
    {
        var result = ParseJson($"""["{Muthu}", "  MUTHU.PERUMAL@EXAMPLE.COM  "]""");
        Assert.Equal([Muthu], result.Emails);
        Assert.Empty(result.Invalid);
    }

    [Theory]
    [InlineData("null")]
    [InlineData("\"\"")]
    [InlineData("\"   \"")]
    [InlineData("[]")]
    public void Empty_values_give_no_emails_and_no_errors(string json)
    {
        var result = ParseJson(json);
        Assert.Empty(result.Emails);
        Assert.Empty(result.Invalid);
    }

    [Fact]
    public void Invalid_email_is_named_and_valid_ones_kept()
    {
        var result = ParseJson($"""["{Muthu}", "invalid-email"]""");
        Assert.Equal([Muthu], result.Emails);
        Assert.Equal(["invalid-email"], result.Invalid);
    }

    [Theory]
    [InlineData("""{"id":"1","email":"raja@example.com","label":"Raja"}""")]
    [InlineData("""{"id":"raja@example.com","name":"raja@example.com"}""")]
    [InlineData("""{"Value":"raja@example.com"}""")]
    public void Select_option_objects(string json)
    {
        Assert.Equal([Raja], ParseJson(json).Emails);
    }

    [Fact]
    public void Array_of_select_option_objects()
    {
        var result = ParseJson($$"""[{"id":"{{Muthu}}"},{"id":"{{Raja}}"}]""");
        Assert.Equal([Muthu, Raja], result.Emails);
    }

    [Fact]
    public void Option_without_an_email_is_invalid()
    {
        var result = ParseJson("""{"id":"7","label":"Sales team"}""");
        Assert.Empty(result.Emails);
        Assert.Equal(["7"], result.Invalid);
    }

    [Theory]
    [InlineData("plain")]
    [InlineData("a@b")]
    [InlineData("a b@example.com")]
    [InlineData("a@@example.com")]
    [InlineData("Raja <raja@example.com>")]
    public void Rejects_what_is_not_a_bare_email(string value)
    {
        Assert.False(WorkflowDynamicUserEmailParser.IsValidEmail(value));
    }

    private static WorkflowStep Step(string activityId) =>
        WorkflowStep.Create(Guid.NewGuid(), "Review", StepType.Approval, 2, activityId: activityId);

    [Fact]
    public void Reads_the_saved_field_id_for_this_block_only()
    {
        const string json = """
            {"blocks":[
              {"id":"A","settings":{"isDynamicUserEnabled":false,"dynamicUserField":"other"}},
              {"id":"B","settings":{"isDynamicUserEnabled":true,"dynamicUserField":"field-1","isUserEnabled":true}}
            ]}
            """;

        var settings = WorkflowDynamicAssigneeService.ReadStepSettings(json, Step("B"));

        Assert.NotNull(settings);
        Assert.True(settings.IsDynamicUserEnabled);
        Assert.True(settings.IsStaticUserEnabled);
        Assert.Equal("field-1", settings.FieldId);
    }

    [Fact]
    public void A_static_stage_is_not_dynamic()
    {
        const string json = """{"blocks":[{"id":"A","settings":{"users":["x"],"isUserEnabled":true}}]}""";

        var settings = WorkflowDynamicAssigneeService.ReadStepSettings(json, Step("A"));

        Assert.NotNull(settings);
        Assert.False(settings.IsDynamicUserEnabled);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("""{"blocks":[]}""")]
    public void Missing_settings_leave_the_existing_logic_in_charge(string? json)
    {
        Assert.Null(WorkflowDynamicAssigneeService.ReadStepSettings(json, Step("A")));
    }

    [Fact]
    public void Account_creation_is_off_until_a_tenant_is_listed()
    {
        var tenant = Guid.NewGuid();
        Assert.False(new WorkflowDynamicUserOptions().IsAutoProvisionAllowed(tenant));
        Assert.False(new WorkflowDynamicUserOptions { AutoProvisionTenantIds = [Guid.NewGuid().ToString()] }
            .IsAutoProvisionAllowed(tenant));
        Assert.True(new WorkflowDynamicUserOptions { AutoProvisionTenantIds = [tenant.ToString()] }
            .IsAutoProvisionAllowed(tenant));
    }
}

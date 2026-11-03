using System.Text;
using System.Text.Json;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowEmailWebhookRulesTests
{
    private static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid WorkflowId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private const string Eml = "From: Buyer <buyer@example.com>\r\nSubject: RFQ 118\r\n  for 40 doors\r\nMessage-ID: <rfq-118@example.com>\r\n\r\nPlease quote.\r\nMessage-ID: not-a-header\r\n";

    [Theory]
    [InlineData(null)]
    [InlineData("https://cloud.ezofis.com/api/email-ingest/webhook")]
    [InlineData("https://cloud.ezofis.com/api/email-ingest/webhook/")]
    public void BuildWebhookUrl_adds_tenant_and_workflow(string? baseUrl)
    {
        Assert.Equal(
            "https://cloud.ezofis.com/api/email-ingest/webhook/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222",
            WorkflowEmailWebhookRules.BuildWebhookUrl(baseUrl, TenantId, WorkflowId));
    }

    [Fact]
    public void BuildWebhookUrl_gives_each_workflow_its_own_url()
    {
        var other = Guid.Parse("33333333-3333-3333-3333-333333333333");

        Assert.NotEqual(
            WorkflowEmailWebhookRules.BuildWebhookUrl(null, TenantId, WorkflowId),
            WorkflowEmailWebhookRules.BuildWebhookUrl(null, TenantId, other));
    }

    [Fact]
    public void GenerateKey_is_random_url_safe_and_prefixed()
    {
        var a = WorkflowEmailWebhookRules.GenerateKey();
        var b = WorkflowEmailWebhookRules.GenerateKey();

        Assert.NotEqual(a, b);
        Assert.StartsWith(WorkflowEmailWebhookRules.KeyStart, a);
        Assert.True(a.Length >= 40);
        Assert.DoesNotContain('+', a);
        Assert.DoesNotContain('/', a);
        Assert.DoesNotContain('=', a);
    }

    [Fact]
    public void KeyMatches_only_the_stored_hash()
    {
        var key = WorkflowEmailWebhookRules.GenerateKey();
        var hash = WorkflowEmailWebhookRules.HashKey(key);

        Assert.Equal(64, hash.Length);
        Assert.DoesNotContain(key, hash);
        Assert.True(WorkflowEmailWebhookRules.KeyMatches(key, hash));
        Assert.True(WorkflowEmailWebhookRules.KeyMatches($" {key} ", hash.ToUpperInvariant()));
        Assert.False(WorkflowEmailWebhookRules.KeyMatches(WorkflowEmailWebhookRules.GenerateKey(), hash));
        Assert.False(WorkflowEmailWebhookRules.KeyMatches(null, hash));
        Assert.False(WorkflowEmailWebhookRules.KeyMatches(key, null));
    }

    [Fact]
    public void ReadJsonEmail_reads_base64_and_fields()
    {
        var json = JsonSerializer.Serialize(new
        {
            eml_base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(Eml)),
            from = "buyer@example.com",
            subject = "RFQ 118",
            message_id = "rfq-118@example.com",
        });
        using var doc = JsonDocument.Parse(json);

        var email = WorkflowEmailWebhookRules.ReadJsonEmail(doc.RootElement);

        Assert.NotNull(email);
        Assert.Equal(Eml, Encoding.UTF8.GetString(email.Eml));
        Assert.Equal("buyer@example.com", email.From);
        Assert.Equal("RFQ 118", email.Subject);
        Assert.Equal("rfq-118@example.com", email.MessageId);
    }

    [Fact]
    public void ReadJsonEmail_accepts_raw_mime_text()
    {
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(new { eml = Eml }));

        var email = WorkflowEmailWebhookRules.ReadJsonEmail(doc.RootElement);

        Assert.NotNull(email);
        Assert.Equal(Eml.Trim(), Encoding.UTF8.GetString(email.Eml));
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("""{ "eml_base64": "not base64!" }""")]
    [InlineData("[]")]
    public void ReadJsonEmail_is_null_without_a_usable_eml(string json)
    {
        using var doc = JsonDocument.Parse(json);

        Assert.Null(WorkflowEmailWebhookRules.ReadJsonEmail(doc.RootElement));
    }

    [Fact]
    public void ReadHeader_reads_folded_headers_only_from_the_header_block()
    {
        var eml = Encoding.UTF8.GetBytes(Eml);

        Assert.Equal("<rfq-118@example.com>", WorkflowEmailWebhookRules.ReadHeader(eml, "Message-ID"));
        Assert.Equal("RFQ 118 for 40 doors", WorkflowEmailWebhookRules.ReadHeader(eml, "subject"));
        Assert.Null(WorkflowEmailWebhookRules.ReadHeader(eml, "Reply-To"));
    }

    [Fact]
    public void EventKey_is_the_same_for_a_repeat_and_different_per_workflow()
    {
        var eml = Encoding.UTF8.GetBytes(Eml);
        var other = Guid.Parse("33333333-3333-3333-3333-333333333333");

        Assert.Equal(
            WorkflowEmailWebhookRules.EventKey(WorkflowId, null, eml),
            WorkflowEmailWebhookRules.EventKey(WorkflowId, null, eml));
        Assert.Equal(
            WorkflowEmailWebhookRules.EventKey(WorkflowId, "<a@example.com>", eml),
            WorkflowEmailWebhookRules.EventKey(WorkflowId, "<a@example.com>", Encoding.UTF8.GetBytes("changed")));
        Assert.NotEqual(
            WorkflowEmailWebhookRules.EventKey(WorkflowId, "<a@example.com>", eml),
            WorkflowEmailWebhookRules.EventKey(other, "<a@example.com>", eml));
        Assert.True(WorkflowEmailWebhookRules.EventKey(WorkflowId, new string('x', 500), eml).Length <= 160);
    }
}

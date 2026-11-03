using System.Text.Json;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WatchFoxWatchRulesTests
{
    private static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    [Theory]
    [InlineData(null, "m365")]
    [InlineData("", "m365")]
    [InlineData("Outlook", "m365")]
    [InlineData("office365", "m365")]
    [InlineData("m365", "m365")]
    [InlineData("gmail", "gmail")]
    [InlineData(" Google ", "gmail")]
    public void NormalizeProvider_maps_outlook_and_gmail(string? input, string expected)
    {
        Assert.Equal(expected, WatchFoxWatchRules.NormalizeProvider(input));
    }

    [Fact]
    public void NormalizeProvider_rejects_imap()
    {
        Assert.Throws<InvalidOperationException>(() => WatchFoxWatchRules.NormalizeProvider("imap"));
    }

    [Fact]
    public void NormalizeTypes_defaults_to_enquiry()
    {
        Assert.Equal(["enquiry"], WatchFoxWatchRules.NormalizeTypes(null));
        Assert.Equal(["enquiry"], WatchFoxWatchRules.NormalizeTypes([" ", null]));
    }

    [Fact]
    public void NormalizeTypes_trims_and_removes_repeats()
    {
        var types = WatchFoxWatchRules.NormalizeTypes([" invoice", "Invoice", "type_abc123", "purchase_order"]);

        Assert.Equal(["invoice", "type_abc123", "purchase_order"], types);
    }

    [Theory]
    [InlineData("enquiry; drop table")]
    [InlineData("has space")]
    public void NormalizeTypes_rejects_bad_ids(string bad)
    {
        Assert.Throws<InvalidOperationException>(() => WatchFoxWatchRules.NormalizeTypes([bad]));
    }

    [Fact]
    public void NormalizeTypes_rejects_too_many()
    {
        var many = Enumerable.Range(0, WatchFoxWatchRules.MaxTypes + 1).Select(i => $"type_{i}");

        Assert.Throws<InvalidOperationException>(() => WatchFoxWatchRules.NormalizeTypes(many));
    }

    [Fact]
    public void State_round_trips_and_fits_watchfox_limit()
    {
        var recordId = Guid.NewGuid();
        var state = WatchFoxWatchRules.EncodeState(TenantId, recordId);

        Assert.True(state.Length <= 200);
        Assert.True(WatchFoxWatchRules.TryDecodeState(state, out var tenant, out var record));
        Assert.Equal(TenantId, tenant);
        Assert.Equal(recordId, record);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("0000000000000000000000000000000022222222222222222222222222222222")]
    public void State_rejects_missing_or_empty_ids(string? state)
    {
        Assert.False(WatchFoxWatchRules.TryDecodeState(state, out _, out _));
    }

    [Fact]
    public void MatchedTypes_reads_matches_and_results()
    {
        using var doc = JsonDocument.Parse("""
            {
              "type": "email.matched",
              "matches": [{ "what": "enquiry", "label": "Enquiries" }],
              "results": {
                "enquiry": { "matched": true },
                "purchase_order": { "matched": true },
                "invoice": { "matched": false }
              }
            }
            """);

        Assert.Equal(["enquiry", "purchase_order"], WatchFoxWatchRules.MatchedTypes(doc.RootElement));
    }

    [Fact]
    public void MatchedTypes_is_empty_without_a_match()
    {
        using var doc = JsonDocument.Parse("""{ "results": { "invoice": { "matched": false } } }""");

        Assert.Empty(WatchFoxWatchRules.MatchedTypes(doc.RootElement));
    }

    [Fact]
    public void UseInvoiceJob_only_for_invoice_on_the_mjb_workflow()
    {
        Assert.True(WatchFoxWatchRules.UseInvoiceJob(["invoice"], isMjbWorkflow: true));
        Assert.False(WatchFoxWatchRules.UseInvoiceJob(["invoice"], isMjbWorkflow: false));
        Assert.False(WatchFoxWatchRules.UseInvoiceJob(["enquiry", "support"], isMjbWorkflow: true));
    }
}

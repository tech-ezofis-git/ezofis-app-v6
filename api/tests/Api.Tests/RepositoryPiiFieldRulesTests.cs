using SaaSApp.Repository.Application;
using SaaSApp.Repository.Application.Contracts;
using Xunit;

namespace SaaSApp.Api.Tests;

public class RepositoryPiiFieldRulesTests
{
    private static PiiFieldDefinitionDto Field(
        string name,
        string key = "",
        string category = "Government ID",
        string detection = "PATTERN",
        string source = "custom",
        string? pattern = null) =>
        new(key, name, category, detection, source, true, pattern);

    [Theory]
    [InlineData("Aadhaar No.", "aadhaar_no")]
    [InlineData("  PAN  Number ", "pan_number")]
    [InlineData("A/C No", "a_c_no")]
    [InlineData("***", "")]
    public void NormalizeFieldKey_matches_agents_rule(string input, string expected) =>
        Assert.Equal(expected, RepositoryPiiFieldRules.NormalizeFieldKey(input));

    [Fact]
    public void NormalizeDefinitions_normalizes_and_dedupes()
    {
        var result = RepositoryPiiFieldRules.NormalizeDefinitions(new[]
        {
            Field("Aadhaar Number", detection: "pattern", category: "government id", source: "AI_INFERRED"),
            Field("Aadhaar number duplicate", key: "aadhaar_number"),
            Field("UPI\nID", category: "Financial", source: "anything-else"),
        });

        Assert.Equal(2, result.Count);
        Assert.Equal("aadhaar_number", result[0].FieldKey);
        Assert.Equal("PATTERN", result[0].DetectionType);
        Assert.Equal("Government ID", result[0].Category);
        Assert.Equal("ai_inferred", result[0].Source);
        Assert.Equal("UPI ID", result[1].DisplayName);
        Assert.Equal("upi_id", result[1].FieldKey);
        Assert.Equal("custom", result[1].Source);
    }

    [Theory]
    [InlineData("Name", "Government ID", "EXECUTE")]
    [InlineData("Name", "Secrets", "PATTERN")]
    [InlineData("", "Government ID", "PATTERN")]
    public void NormalizeDefinitions_rejects_invalid(string name, string category, string detection) =>
        Assert.Throws<ArgumentException>(() =>
            RepositoryPiiFieldRules.NormalizeDefinitions(new[] { Field(name, category: category, detection: detection) }));

    [Fact]
    public void NormalizeDefinitions_rejects_too_many() =>
        Assert.Throws<ArgumentException>(() => RepositoryPiiFieldRules.NormalizeDefinitions(
            Enumerable.Range(0, RepositoryPiiFieldRules.MaxAdditionalFields + 1)
                .Select(i => Field($"Field {i}"))
                .ToList()));

    [Fact]
    public void Safe_pattern_is_kept()
    {
        var result = RepositoryPiiFieldRules.NormalizeDefinitions(new[]
        {
            Field("PAN Number", pattern: "[A-Z]{5}[0-9]{4}[A-Z]")
        });

        Assert.Equal("[A-Z]{5}[0-9]{4}[A-Z]", result[0].Pattern);
    }

    [Theory]
    [InlineData("(a+)+\\1")]          // backreference: not linear-time
    [InlineData("(?=secret)\\w+")]   // lookaround
    [InlineData("[unclosed")]
    public void Unsafe_or_invalid_pattern_is_rejected(string pattern) =>
        Assert.Throws<ArgumentException>(() => RepositoryPiiFieldRules.NormalizeDefinitions(new[]
        {
            Field("Custom", pattern: pattern)
        }));

    [Fact]
    public void Overlong_pattern_is_rejected() =>
        Assert.Throws<ArgumentException>(() => RepositoryPiiFieldRules.ValidatePattern(
            new string('a', RepositoryPiiFieldRules.MaxPatternLength + 1), "Custom"));

    [Theory]
    [InlineData("http://agents:8000/chat", "http://agents:8000/api/pii/field-recommendations")]
    [InlineData("http://localhost:8010/chat", "http://localhost:8010/api/pii/field-recommendations")]
    [InlineData("https://cloud.ezofis.com/chat?x=1", "https://cloud.ezofis.com/api/pii/field-recommendations")]
    [InlineData("", null)]
    [InlineData("not a url", null)]
    public void ResolveRecommendationUrl_uses_agents_host(string chatUrl, string? expected) =>
        Assert.Equal(expected, RepositoryPiiFieldRules.ResolveRecommendationUrl(chatUrl));

    [Theory]
    [InlineData("http://agents:8000/chat", "http://agents:8000/api/pii/redact")]
    [InlineData("http://localhost:8010/chat", "http://localhost:8010/api/pii/redact")]
    [InlineData(null, null)]
    public void ResolveAgentsUrl_targets_redact_route(string? chatUrl, string? expected) =>
        Assert.Equal(expected, RepositoryPiiFieldRules.ResolveAgentsUrl(chatUrl, "/api/pii/redact"));
}

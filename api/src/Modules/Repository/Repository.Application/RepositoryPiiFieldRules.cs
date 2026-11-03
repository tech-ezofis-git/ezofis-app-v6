using System.Text.RegularExpressions;
using SaaSApp.Repository.Application.Contracts;

namespace SaaSApp.Repository.Application;

/// <summary>Validation and normalisation for PII field definitions and recommendation calls.</summary>
public static class RepositoryPiiFieldRules
{
    public const int MaxAdditionalFields = 100;
    public const int MaxPatternLength = 200;

    public static readonly IReadOnlyList<string> DetectionTypes =
        new[] { "PATTERN", "NER", "HYBRID", "CONTEXTUAL", "METADATA" };

    public static readonly IReadOnlyList<string> Categories = new[]
    {
        "Personal Identity", "Contact Information", "Government ID", "Financial",
        "Employment", "Health", "Tax", "Document", "Other"
    };

    private static readonly Regex NonKeyChars = new("[^a-z0-9]+", RegexOptions.Compiled);

    /// <summary>"Aadhaar No." → "aadhaar_no" (same rule as the agents' catalog).</summary>
    public static string NormalizeFieldKey(string? value)
    {
        var key = NonKeyChars.Replace((value ?? string.Empty).Trim().ToLowerInvariant(), "_").Trim('_');
        return key.Length > 64 ? key[..64] : key;
    }

    /// <summary>
    /// Validates and normalises a definition list for saving. Throws <see cref="ArgumentException"/>
    /// naming the first bad item; duplicate keys keep the first occurrence.
    /// </summary>
    public static IReadOnlyList<PiiFieldDefinitionDto> NormalizeDefinitions(IReadOnlyList<PiiFieldDefinitionDto>? definitions)
    {
        var list = definitions ?? Array.Empty<PiiFieldDefinitionDto>();
        if (list.Count > MaxAdditionalFields)
            throw new ArgumentException($"At most {MaxAdditionalFields} additional PII fields are allowed.");

        var seen = new HashSet<string>(StringComparer.Ordinal);
        var result = new List<PiiFieldDefinitionDto>(list.Count);
        foreach (var definition in list)
        {
            if (definition == null)
                continue;

            var displayName = Clean(definition.DisplayName, 80);
            if (displayName.Length == 0)
                throw new ArgumentException("Each PII field needs a display name.");

            var key = NormalizeFieldKey(string.IsNullOrWhiteSpace(definition.FieldKey) ? displayName : definition.FieldKey);
            if (key.Length == 0)
                throw new ArgumentException($"PII field '{displayName}' needs a key with letters or digits.");
            if (!seen.Add(key))
                continue;

            var detection = (definition.DetectionType ?? string.Empty).Trim().ToUpperInvariant();
            if (!DetectionTypes.Contains(detection))
                throw new ArgumentException(
                    $"PII field '{displayName}': detectionType must be one of {string.Join(", ", DetectionTypes)}.");

            var category = Categories.FirstOrDefault(c =>
                string.Equals(c, definition.Category?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (category == null)
                throw new ArgumentException(
                    $"PII field '{displayName}': category must be one of {string.Join(", ", Categories)}.");

            var source = string.Equals(definition.Source?.Trim(), "ai_inferred", StringComparison.OrdinalIgnoreCase)
                ? "ai_inferred"
                : "custom";

            var pattern = string.IsNullOrWhiteSpace(definition.Pattern) ? null : definition.Pattern.Trim();
            if (pattern != null)
                ValidatePattern(pattern, displayName);

            var description = Clean(definition.Description, 300);
            result.Add(new PiiFieldDefinitionDto(
                key,
                displayName,
                category,
                detection,
                source,
                definition.Enabled,
                pattern,
                description.Length == 0 ? null : description));
        }

        return result;
    }

    /// <summary>
    /// A custom pattern must compile under the non-backtracking engine (linear time, so no
    /// catastrophic backtracking; backreferences and lookarounds are rejected) and stay short.
    /// </summary>
    public static void ValidatePattern(string pattern, string displayName)
    {
        if (pattern.Length > MaxPatternLength)
            throw new ArgumentException($"PII field '{displayName}': pattern is longer than {MaxPatternLength} characters.");
        try
        {
            _ = new Regex(pattern, RegexOptions.NonBacktracking | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100));
        }
        catch (Exception ex) when (ex is ArgumentException or NotSupportedException)
        {
            throw new ArgumentException($"PII field '{displayName}': pattern is not a supported regular expression ({ex.Message}).");
        }
    }

    /// <summary>
    /// The agents serve <c>/api/pii/field-recommendations</c> next to <c>/chat</c>, so the URL is
    /// the scheme and host of <c>Agents:ChatUrl</c> (e.g. <c>http://agents:8000/chat</c>).
    /// </summary>
    public static string? ResolveRecommendationUrl(string? chatUrl) =>
        ResolveAgentsUrl(chatUrl, "/api/pii/field-recommendations");

    /// <summary>An agents route (<paramref name="path"/>) on the host of <c>Agents:ChatUrl</c>.</summary>
    public static string? ResolveAgentsUrl(string? chatUrl, string path)
    {
        if (string.IsNullOrWhiteSpace(chatUrl) || !Uri.TryCreate(chatUrl.Trim(), UriKind.Absolute, out var uri))
            return null;
        return new Uri(uri, path).ToString();
    }

    private static string Clean(string? value, int limit)
    {
        var chars = (value ?? string.Empty).Select(c => char.IsControl(c) ? ' ' : c).ToArray();
        var text = string.Join(' ', new string(chars).Split(' ', StringSplitOptions.RemoveEmptyEntries));
        return text.Length > limit ? text[..limit] : text;
    }
}

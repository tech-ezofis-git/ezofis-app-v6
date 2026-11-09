using System.Globalization;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>One part of the designer's Request Number Format (<c>processNumberPrefix</c>), in designer order.</summary>
internal sealed record RequestNumberToken(string Key, string Value);

/// <summary>
/// Renders a Request Number Format that uses the designer's richer tokens: Form Column, Month and
/// Current Date (plus Prefix, Year and Auto Increment). Mirrors the designer's own preview: the
/// parts are joined with the separator, Auto Increment is zero-padded to its digit count, and a
/// Form Column token adds the submitted value of each field it lists.
/// Formats with only Prefix, Year and Auto Increment keep the older numbering and don't come here.
/// </summary>
internal static class WorkflowRequestNumberTemplate
{
    public const string FormColumnKey = "formColumn";

    private const int MaxDigits = 7;

    public static bool IsTemplate(IEnumerable<RequestNumberToken> tokens) =>
        tokens.Any(t => IsKey(t.Key, FormColumnKey) || IsKey(t.Key, "month") || IsKey(t.Key, "currentDate"));

    /// <summary>The field labels listed by every Form Column token, in order, without repeats.</summary>
    public static IReadOnlyList<string> FormColumnLabels(IEnumerable<RequestNumberToken> tokens) =>
        tokens
            .Where(t => IsKey(t.Key, FormColumnKey))
            .SelectMany(t => SplitLabels(t.Value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    /// <param name="formColumnValues">Field label → submitted value, for the labels in <see cref="FormColumnLabels"/>.</param>
    public static string Render(
        IReadOnlyList<RequestNumberToken> tokens,
        int number,
        DateTime now,
        IReadOnlyDictionary<string, string> formColumnValues)
    {
        var separator = tokens.FirstOrDefault(t => IsKey(t.Key, "seperator") || IsKey(t.Key, "separator"))?.Value;
        if (string.IsNullOrEmpty(separator))
            separator = "-";

        var parts = new List<string>();
        foreach (var token in tokens)
        {
            var part = RenderToken(token, number, now, formColumnValues, separator);
            if (!string.IsNullOrWhiteSpace(part))
                parts.Add(part);
        }

        return parts.Count == 0
            ? number.ToString(CultureInfo.InvariantCulture)
            : string.Join(separator, parts);
    }

    private static string RenderToken(
        RequestNumberToken token,
        int number,
        DateTime now,
        IReadOnlyDictionary<string, string> formColumnValues,
        string separator)
    {
        var key = token.Key.Trim();
        var value = token.Value.Trim();

        if (IsKey(key, "prefix"))
            return value;

        if (IsKey(key, "year"))
            return now.ToString(value.Equals("yy", StringComparison.OrdinalIgnoreCase) ? "yy" : "yyyy", CultureInfo.InvariantCulture);

        if (IsKey(key, "month"))
        {
            var format = value.ToLowerInvariant() switch
            {
                "mmmm" => "MMMM",
                "mmm" => "MMM",
                _ => "MM",
            };
            return now.ToString(format, CultureInfo.InvariantCulture);
        }

        if (IsKey(key, FormColumnKey))
        {
            var values = SplitLabels(value)
                .Select(label => formColumnValues.TryGetValue(label, out var v) ? v.Trim() : "")
                .Where(v => v.Length > 0);
            return string.Join(separator, values);
        }

        if (IsKey(key, "autoIncrement"))
        {
            var digits = int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var d) ? d : 1;
            digits = Math.Clamp(digits, 1, MaxDigits);
            return number.ToString(CultureInfo.InvariantCulture).PadLeft(digits, '0');
        }

        if (IsKey(key, "currentDate"))
            return IsDatePattern(value) ? now.ToString(value, CultureInfo.InvariantCulture) : "";

        // seperator, reset and anything unknown add nothing.
        return "";
    }

    // The designer only offers combinations of dd, MM, MMM, MMMM, yy and yyyy.
    private static bool IsDatePattern(string value) =>
        value.Length > 0 && value.All(c => c is 'd' or 'M' or 'y');

    private static IEnumerable<string> SplitLabels(string value) =>
        value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

    private static bool IsKey(string key, string expected) =>
        key.Trim().Equals(expected, StringComparison.OrdinalIgnoreCase);
}

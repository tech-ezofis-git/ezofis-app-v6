using System.Globalization;
using System.Text.Json;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>Result of checking a condition block: which branch to take and why.</summary>
public sealed record WorkflowConditionOutcome(bool Satisfied, string Reason)
{
    public string Review => Satisfied
        ? WorkflowConditionEvaluator.SatisfiedReview
        : WorkflowConditionEvaluator.NotSatisfiedReview;
}

/// <summary>The condition block is set up wrongly (no rules, unknown operator, bad value), so it cannot be checked.</summary>
public sealed class WorkflowConditionConfigException(string message) : Exception(message);

/// <summary>
/// Checks a condition block's standard-mode rules against the ticket's form values.
/// Field values come from <c>valuesOf(fieldId)</c>: none (empty), one (a control), or many
/// (a table column, one per row). Positive operators pass when any value passes; negative
/// operators (NOT_*, IS_NOT_*) are the exact opposite, so they pass only when no value matches.
/// </summary>
public static class WorkflowConditionEvaluator
{
    /// <summary>ProceedAction on the designer's "satisfied" edge (see exportWorkflow.ts).</summary>
    public const string SatisfiedReview = "SATISFIED";

    /// <summary>ProceedAction on the designer's "not satisfied" edge.</summary>
    public const string NotSatisfiedReview = "NOT SATISFIED";

    private static readonly string[] DateFormats =
    [
        "yyyy-MM-dd", "yyyy-MM-ddTHH:mm", "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-ddTHH:mm:ss.fff",
        "yyyy-MM-dd HH:mm", "yyyy-MM-dd HH:mm:ss", "yyyy/MM/dd",
        "dd-MM-yyyy", "dd/MM/yyyy", "dd-MMM-yyyy", "dd MMM yyyy", "MMM dd, yyyy", "MMM d, yyyy"
    ];

    public static WorkflowConditionOutcome Evaluate(
        WorkflowConditionConfig config,
        Func<string, IReadOnlyList<string>> valuesOf)
    {
        if (config.Rules.Count == 0)
            throw new WorkflowConditionConfigException("The condition has no rules.");

        var results = new List<(bool Pass, string Text)>();
        foreach (var rule in config.Rules)
            results.Add(EvaluateRule(rule, valuesOf));

        var satisfied = config.MatchAll
            ? results.All(r => r.Pass)
            : results.Any(r => r.Pass);

        var joiner = config.MatchAll ? " AND " : " OR ";
        return new WorkflowConditionOutcome(satisfied, string.Join(joiner, results.Select(r => r.Text)));
    }

    private static (bool Pass, string Text) EvaluateRule(
        WorkflowConditionRule rule,
        Func<string, IReadOnlyList<string>> valuesOf)
    {
        if (string.IsNullOrWhiteSpace(rule.FieldId))
            throw new WorkflowConditionConfigException("A condition rule has no field selected.");

        var op = NormalizeOperator(rule.Logic);
        var actual = valuesOf(rule.FieldId.Trim())
            .Select(v => v?.Trim() ?? "")
            .Where(v => v.Length > 0)
            .ToList();

        var expected = rule.ValueIsField && !string.IsNullOrWhiteSpace(rule.Value)
            ? valuesOf(rule.Value.Trim()).Select(v => v?.Trim() ?? "").FirstOrDefault(v => v.Length > 0) ?? ""
            : rule.Value?.Trim() ?? "";

        var negate = op.StartsWith("NOT_", StringComparison.Ordinal)
            || op.StartsWith("IS_NOT_", StringComparison.Ordinal);
        var positive = negate
            ? op.StartsWith("IS_NOT_", StringComparison.Ordinal) ? "IS_" + op["IS_NOT_".Length..] : op["NOT_".Length..]
            : op;

        bool pass;
        if (positive == "IS_EMPTY")
        {
            pass = actual.Count == 0;
        }
        else
        {
            Func<string, bool> test = positive switch
            {
                "IS_EQUALS_TO" => v => ValuesEqual(v, expected),
                "IS_GREATER_THAN" => v => CompareOrNull(v, expected) > 0,
                "IS_GREATER_THAN_OR_EQUALS_TO" => v => CompareOrNull(v, expected) >= 0,
                "IS_LESSER_THAN" => v => CompareOrNull(v, expected) < 0,
                "IS_LESSER_THAN_OR_EQUALS_TO" => v => CompareOrNull(v, expected) <= 0,
                "IS_ANY_OF" => AnyOfTest(expected),
                "CONTAINS" => v => v.Contains(expected, StringComparison.OrdinalIgnoreCase),
                "STARTS_WITH" => v => v.StartsWith(expected, StringComparison.OrdinalIgnoreCase),
                "ENDS_WITH" => v => v.EndsWith(expected, StringComparison.OrdinalIgnoreCase),
                "DATE_RANGE" => DateRangeTest(expected),
                _ => throw new WorkflowConditionConfigException($"Unknown condition operator '{rule.Logic}'.")
            };

            // An empty field only equals an empty expected value; every other test fails on it.
            pass = actual.Count == 0
                ? positive == "IS_EQUALS_TO" && expected.Length == 0
                : actual.Any(test);
        }

        if (negate)
            pass = !pass;

        var shown = actual.Count == 0 ? "empty" : string.Join(", ", actual);
        var compareText = op is "IS_EMPTY" or "IS_NOT_EMPTY" ? "" : $" '{expected}'";
        return (pass, $"{rule.FieldId.Trim()} ({shown}) {OperatorLabel(op)}{compareText}: {(pass ? "yes" : "no")}");
    }

    private static string NormalizeOperator(string? logic)
    {
        var op = (logic ?? "").Trim().ToUpperInvariant().Replace(' ', '_');
        return op switch
        {
            "" or "EQUALS" or "IS_EQUAL_TO" => "IS_EQUALS_TO",
            "NOT_EQUALS" or "IS_NOT_EQUAL_TO" => "IS_NOT_EQUALS_TO",
            "IS_LESS_THAN" => "IS_LESSER_THAN",
            "IS_LESS_THAN_OR_EQUALS_TO" => "IS_LESSER_THAN_OR_EQUALS_TO",
            _ => op
        };
    }

    private static string OperatorLabel(string op) =>
        op.ToLowerInvariant().Replace("is_", "").Replace('_', ' ');

    private static bool ValuesEqual(string actual, string expected)
    {
        if (TryNumber(actual, out var a) && TryNumber(expected, out var b))
            return a == b;
        if (LooksLikeDate(actual) && LooksLikeDate(expected)
            && TryDate(actual, out var da) && TryDate(expected, out var db))
            return da == db;
        return string.Equals(actual, expected, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Numbers, then dates, then text. Null when either side is blank (comparison fails).</summary>
    private static int? CompareOrNull(string actual, string expected)
    {
        if (actual.Length == 0 || expected.Length == 0)
            return null;
        if (TryNumber(actual, out var a) && TryNumber(expected, out var b))
            return a.CompareTo(b);
        if (TryDate(actual, out var da) && TryDate(expected, out var db))
            return da.CompareTo(db);
        return string.Compare(actual, expected, StringComparison.OrdinalIgnoreCase);
    }

    private static Func<string, bool> AnyOfTest(string expected)
    {
        var options = SplitList(expected);
        return v => options.Any(o => ValuesEqual(v, o))
            || v.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Any(part => options.Any(o => ValuesEqual(part, o)));
    }

    private static Func<string, bool> DateRangeTest(string expected)
    {
        var (fromText, toText) = SplitRange(expected);
        DateTime? from = null, to = null;
        if (!string.IsNullOrWhiteSpace(fromText))
        {
            if (!TryDate(fromText, out var f))
                throw new WorkflowConditionConfigException($"Date range start '{fromText}' is not a date.");
            from = f;
        }
        if (!string.IsNullOrWhiteSpace(toText))
        {
            if (!TryDate(toText, out var t))
                throw new WorkflowConditionConfigException($"Date range end '{toText}' is not a date.");
            // A date-only end includes that whole day.
            to = t.TimeOfDay == TimeSpan.Zero ? t.AddDays(1).AddTicks(-1) : t;
        }
        if (from == null && to == null)
            throw new WorkflowConditionConfigException("The date range has no start or end date.");

        return v => TryDate(v, out var d)
            && (from == null || d >= from)
            && (to == null || d <= to);
    }

    private static (string? From, string? To) SplitRange(string value)
    {
        var trimmed = value.Trim();
        if (trimmed.StartsWith('[') || trimmed.StartsWith('{'))
        {
            try
            {
                using var doc = JsonDocument.Parse(trimmed);
                var root = doc.RootElement;
                if (root.ValueKind == JsonValueKind.Array)
                {
                    var items = root.EnumerateArray().Select(ElementText).ToList();
                    return (items.ElementAtOrDefault(0), items.ElementAtOrDefault(1));
                }
                if (root.ValueKind == JsonValueKind.Object)
                {
                    return (
                        PropertyText(root, "from", "start", "fromDate", "startDate"),
                        PropertyText(root, "to", "end", "toDate", "endDate"));
                }
            }
            catch (JsonException)
            {
            }
        }

        foreach (var separator in new[] { " to ", ",", "|" })
        {
            var at = trimmed.IndexOf(separator, StringComparison.OrdinalIgnoreCase);
            if (at >= 0)
                return (trimmed[..at].Trim(), trimmed[(at + separator.Length)..].Trim());
        }

        throw new WorkflowConditionConfigException($"Date range '{value}' needs a start and end date.");
    }

    private static List<string> SplitList(string value)
    {
        var trimmed = value.Trim();
        if (trimmed.StartsWith('['))
        {
            try
            {
                using var doc = JsonDocument.Parse(trimmed);
                return doc.RootElement.EnumerateArray()
                    .Select(ElementText)
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Select(s => s!.Trim())
                    .ToList();
            }
            catch (JsonException)
            {
            }
        }

        return trimmed
            .Split([',', '\n', ';'], StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToList();
    }

    private static string? ElementText(JsonElement el) =>
        el.ValueKind switch
        {
            JsonValueKind.String => el.GetString(),
            JsonValueKind.Number => el.GetRawText(),
            JsonValueKind.Object => PropertyText(el, "value", "name", "label", "id"),
            _ => null
        };

    private static string? PropertyText(JsonElement obj, params string[] names)
    {
        foreach (var prop in obj.EnumerateObject())
        {
            if (names.Any(n => string.Equals(n, prop.Name, StringComparison.OrdinalIgnoreCase)))
            {
                var text = ElementText(prop.Value);
                if (!string.IsNullOrWhiteSpace(text))
                    return text;
            }
        }

        return null;
    }

    private static bool TryNumber(string text, out decimal value)
    {
        var cleaned = new string(text.Where(c => !"$€£₹¥ ".Contains(c)).ToArray());
        return decimal.TryParse(cleaned, NumberStyles.Number, CultureInfo.InvariantCulture, out value);
    }

    private static bool LooksLikeDate(string text) =>
        text.Contains('-') || text.Contains('/') || text.Any(char.IsLetter);

    private static bool TryDate(string text, out DateTime value) =>
        DateTime.TryParseExact(text.Trim(), DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out value)
        || (LooksLikeDate(text)
            && DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out value));
}

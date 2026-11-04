using System.Text.RegularExpressions;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// The RFQ Master row for a client the quote agent could not find there. The agent reports
/// "Rfq Master No Match" only after a successful lookup found no client and no tie. A row needs a
/// company and a real Bill To; model placeholders such as "(jobsite from Project — e.g. ...)" are
/// never stored. Ship To is not part of the master.
/// </summary>
internal static class FtlRfqMasterClient
{
    private static readonly Regex Placeholder = new(
        @"\b(e\.g\.|tbd|n/?a|unknown|not stated|jobsite from)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly (string Source, string[] Columns)[] Mappings =
    [
        ("Company Name", ["Company Name", "Company_Name"]),
        ("Billing Address", ["Billing Address", "Billing_Address"]),
        ("Contact", ["Contact", "Contact Name", "Contact_Name"]),
        ("Phone Number", ["Phone Number", "Phone_Number", "Phone"]),
        ("Email", ["Email"]),
    ];

    internal static Dictionary<string, string>? BuildNewClientFields(IReadOnlyDictionary<string, string> quoteFields)
    {
        if (!quoteFields.TryGetValue("Rfq Master No Match", out var noMatch)
            || !string.Equals(noMatch?.Trim(), "true", StringComparison.OrdinalIgnoreCase))
            return null;

        if (!IsRealValue(Read(quoteFields, "Company Name")) || !IsRealValue(Read(quoteFields, "Billing Address")))
            return null;

        var fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (source, columns) in Mappings)
        {
            var value = Read(quoteFields, source);
            if (!IsRealValue(value))
                continue;
            // The master's own labels aren't known here. Names it doesn't have are ignored on save.
            foreach (var column in columns)
                fields[column] = value;
        }

        return fields;
    }

    private static string Read(IReadOnlyDictionary<string, string> fields, string key) =>
        fields.TryGetValue(key, out var value) ? value?.Trim() ?? string.Empty : string.Empty;

    private static bool IsRealValue(string value) =>
        !string.IsNullOrWhiteSpace(value) && !Placeholder.IsMatch(value);
}

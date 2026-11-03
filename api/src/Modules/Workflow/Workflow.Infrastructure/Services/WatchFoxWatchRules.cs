using System.Text.Json;
using System.Text.RegularExpressions;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>Small WatchFox rules with no I/O, kept apart so they can be tested.</summary>
public static class WatchFoxWatchRules
{
    public const string ProviderOutlook = "m365";
    public const string ProviderGmail = "gmail";

    public const string StatusPending = "pending";
    public const string StatusActive = "active";
    public const string StatusPaused = "paused";
    public const string StatusNeedsAttention = "needs_attention";
    public const string StatusError = "error";

    public const int MaxTypes = 10;

    /// <summary>The six WatchFox presets, shown when the WatchFox type list cannot be read.</summary>
    public static readonly IReadOnlyList<(string Id, string Label)> BuiltInTypes =
    [
        ("enquiry", "Enquiries"),
        ("invoice", "Invoices"),
        ("purchase_order", "Purchase orders"),
        ("support", "Support"),
        ("claim", "Claims"),
        ("job_application", "Job applications"),
    ];

    private static readonly Regex TypeIdPattern = new("^[A-Za-z0-9_-]{1,64}$", RegexOptions.Compiled);

    /// <summary><c>outlook</c>/<c>office365</c>/<c>m365</c> → <c>m365</c>, <c>gmail</c>/<c>google</c> → <c>gmail</c>.</summary>
    public static string NormalizeProvider(string? provider)
    {
        var value = provider?.Trim().ToLowerInvariant();
        return value switch
        {
            null or "" or "m365" or "outlook" or "office365" or "microsoft" => ProviderOutlook,
            "gmail" or "google" => ProviderGmail,
            _ => throw new InvalidOperationException("provider must be outlook or gmail."),
        };
    }

    /// <summary>Trimmed, distinct, at most <see cref="MaxTypes"/>. Empty means <c>enquiry</c>, as before.</summary>
    public static IReadOnlyList<string> NormalizeTypes(IEnumerable<string?>? types)
    {
        var list = new List<string>();
        foreach (var raw in types ?? [])
        {
            var id = raw?.Trim();
            if (string.IsNullOrEmpty(id))
                continue;
            if (!TypeIdPattern.IsMatch(id))
                throw new InvalidOperationException($"Type '{id}' is not a valid WatchFox type id.");
            if (!list.Contains(id, StringComparer.OrdinalIgnoreCase))
                list.Add(id);
        }

        if (list.Count > MaxTypes)
            throw new InvalidOperationException($"Choose at most {MaxTypes} types.");
        return list.Count == 0 ? ["enquiry"] : list;
    }

    /// <summary>64 hex characters (WatchFox allows 200): the tenant, then the saved watch row or workflow.</summary>
    public static string EncodeState(Guid tenantId, Guid recordId) =>
        tenantId.ToString("N") + recordId.ToString("N");

    public static bool TryDecodeState(string? state, out Guid tenantId, out Guid recordId)
    {
        tenantId = Guid.Empty;
        recordId = Guid.Empty;
        var compact = state?.Trim();
        if (compact is not { Length: 64 })
            return false;

        return Guid.TryParseExact(compact[..32], "N", out tenantId)
            && tenantId != Guid.Empty
            && Guid.TryParseExact(compact[32..], "N", out recordId)
            && recordId != Guid.Empty;
    }

    /// <summary>The type ids that matched in a WatchFox <c>email.matched</c> event.</summary>
    public static IReadOnlyList<string> MatchedTypes(JsonElement root)
    {
        var found = new List<string>();
        if (root.TryGetProperty("matches", out var matches) && matches.ValueKind == JsonValueKind.Array)
        {
            foreach (var match in matches.EnumerateArray())
            {
                if (match.ValueKind == JsonValueKind.Object
                    && match.TryGetProperty("what", out var what)
                    && what.ValueKind == JsonValueKind.String
                    && what.GetString() is { Length: > 0 } id)
                    Add(found, id);
            }
        }

        if (root.TryGetProperty("results", out var results) && results.ValueKind == JsonValueKind.Object)
        {
            foreach (var result in results.EnumerateObject())
            {
                if (result.Value.ValueKind == JsonValueKind.Object
                    && result.Value.TryGetProperty("matched", out var matched)
                    && matched.ValueKind == JsonValueKind.True)
                    Add(found, result.Name);
            }
        }

        return found;

        static void Add(List<string> list, string id)
        {
            if (!list.Contains(id, StringComparer.OrdinalIgnoreCase))
                list.Add(id);
        }
    }

    /// <summary>
    /// Invoice attachments go to the MJB invoice job (only that workflow is wired for it).
    /// Every other match starts the workflow with the email .eml, like Enquiries.
    /// </summary>
    public static bool UseInvoiceJob(IReadOnlyList<string> matchedTypes, bool isMjbWorkflow) =>
        isMjbWorkflow && matchedTypes.Any(t => t.Contains("invoice", StringComparison.OrdinalIgnoreCase));
}

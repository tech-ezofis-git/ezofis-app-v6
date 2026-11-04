using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>One email posted to the per-workflow webhook by a client's own tool.</summary>
public sealed record WorkflowWebhookEmail(byte[] Eml, string? From, string? Subject, string? MessageId);

/// <summary>Per-workflow email webhook rules with no I/O, kept apart so they can be tested.</summary>
public static class WorkflowEmailWebhookRules
{
    public const string KeyHeader = "X-Webhook-Key";
    public const string KeyStart = "ezwh_";

    /// <summary>Largest .eml accepted from a client tool (25 MB).</summary>
    public const int MaxEmlBytes = 25 * 1024 * 1024;

    /// <summary>
    /// <c>{base}/{tenantId}/{workflowId}</c>, where base is <c>EmailIngest:WorkflowWebhookUrl</c>.
    /// Every workflow gets its own URL in the same format, for WatchFox or any other tool.
    /// </summary>
    public static string BuildWebhookUrl(string? baseUrl, Guid tenantId, Guid workflowId)
    {
        var root = string.IsNullOrWhiteSpace(baseUrl)
            ? "https://cloud.ezofis.com/api/email-ingest/webhook"
            : baseUrl.Trim().TrimEnd('/');
        return $"{root}/{tenantId:D}/{workflowId:D}";
    }

    /// <summary><c>ezwh_</c> plus 32 random bytes, URL-safe. Shown to the user once.</summary>
    public static string GenerateKey()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return KeyStart + Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    /// <summary>Lower-case hex SHA-256. Only this is stored.</summary>
    public static string HashKey(string key) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key.Trim()))).ToLowerInvariant();

    public static bool KeyMatches(string? key, string? storedHash)
    {
        if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(storedHash))
            return false;
        var actual = Encoding.UTF8.GetBytes(HashKey(key));
        var expected = Encoding.UTF8.GetBytes(storedHash.Trim().ToLowerInvariant());
        return actual.Length == expected.Length && CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    /// <summary>The first characters, so the user can tell which key a tool uses.</summary>
    public static string KeyPrefix(string key) => key.Length <= 12 ? key : key[..12];

    /// <summary>
    /// JSON body: <c>eml_base64</c> (or <c>emlBase64</c>, or <c>eml</c> as raw MIME text), plus optional
    /// <c>from</c>, <c>subject</c> and <c>message_id</c>. Null when there is no usable .eml.
    /// </summary>
    public static WorkflowWebhookEmail? ReadJsonEmail(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
            return null;

        var eml = DecodeEml(Read(root, "eml_base64") ?? Read(root, "emlBase64") ?? Read(root, "eml"));
        if (eml is not { Length: > 0 })
            return null;

        return new WorkflowWebhookEmail(
            eml,
            Read(root, "from"),
            Read(root, "subject"),
            Read(root, "message_id") ?? Read(root, "messageId"));
    }

    /// <summary>Raw MIME text is used as is; anything else is read as base64.</summary>
    public static byte[]? DecodeEml(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var trimmed = value.Trim();
        if (trimmed.Contains('\n') && trimmed.Contains(':'))
            return Encoding.UTF8.GetBytes(trimmed);
        try
        {
            return Convert.FromBase64String(trimmed);
        }
        catch (FormatException)
        {
            return null;
        }
    }

    /// <summary>
    /// The same email sent twice starts one ticket: keyed by Message-ID when the tool sends it,
    /// otherwise by a hash of the .eml.
    /// </summary>
    public static string EventKey(Guid workflowId, string? messageId, byte[] eml)
    {
        var id = string.IsNullOrWhiteSpace(messageId)
            ? Convert.ToHexString(SHA256.HashData(eml)).ToLowerInvariant()
            : messageId.Trim();
        var key = $"webhook:{workflowId:N}:{id}";
        return key.Length <= 160 ? key : key[..160];
    }

    /// <summary>One header from the .eml header block (unfolded), or null.</summary>
    public static string? ReadHeader(byte[] eml, string name)
    {
        var text = Encoding.UTF8.GetString(eml, 0, Math.Min(eml.Length, 64 * 1024)).Replace("\r\n", "\n");
        var end = text.IndexOf("\n\n", StringComparison.Ordinal);
        var lines = (end >= 0 ? text[..end] : text).Split('\n');
        for (var i = 0; i < lines.Length; i++)
        {
            if (!lines[i].StartsWith(name + ":", StringComparison.OrdinalIgnoreCase))
                continue;
            var value = new StringBuilder(lines[i][(name.Length + 1)..].Trim());
            while (i + 1 < lines.Length && lines[i + 1].Length > 0 && char.IsWhiteSpace(lines[i + 1][0]))
                value.Append(' ').Append(lines[++i].Trim());
            return value.Length == 0 ? null : value.ToString();
        }

        return null;
    }

    private static string? Read(JsonElement root, string name) =>
        root.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}

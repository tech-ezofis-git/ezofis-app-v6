using System.Net.Mail;
using System.Text.Json;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>The normalized emails found in a form value, plus anything that is not a valid email.</summary>
internal sealed record WorkflowDynamicUserEmails(IReadOnlyList<string> Emails, IReadOnlyList<string> Invalid);

/// <summary>
/// Turns a submitted form value into a clean email list. Form values arrive as a plain string, a JSON array
/// (or a string holding one, as ezfb columns store it), or select-option objects.
/// </summary>
internal static class WorkflowDynamicUserEmailParser
{
    private static readonly string[] OptionEmailProperties =
        ["email", "userEmail", "value", "id", "label", "name"];

    private static readonly char[] ListSeparators = [',', ';', '\n', '\r'];

    public static WorkflowDynamicUserEmails Parse(JsonElement value)
    {
        var emails = new List<string>();
        var invalid = new List<string>();
        Collect(value, emails, invalid);
        return new WorkflowDynamicUserEmails(emails, invalid);
    }

    public static WorkflowDynamicUserEmails Parse(string? value)
    {
        var emails = new List<string>();
        var invalid = new List<string>();
        CollectText(value, emails, invalid);
        return new WorkflowDynamicUserEmails(emails, invalid);
    }

    internal static bool IsValidEmail(string email)
    {
        if (email.Any(char.IsWhiteSpace))
            return false;

        var at = email.IndexOf('@');
        if (at < 1 || at != email.LastIndexOf('@') || !email[(at + 1)..].Contains('.', StringComparison.Ordinal))
            return false;

        try
        {
            // MailAddress also accepts "Name <a@b.com>"; only the bare address counts here.
            return string.Equals(new MailAddress(email).Address, email, StringComparison.OrdinalIgnoreCase);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static void Collect(JsonElement value, List<string> emails, List<string> invalid)
    {
        switch (value.ValueKind)
        {
            case JsonValueKind.String:
                CollectText(value.GetString(), emails, invalid);
                break;
            case JsonValueKind.Array:
                foreach (var item in value.EnumerateArray())
                    Collect(item, emails, invalid);
                break;
            case JsonValueKind.Object:
                CollectOption(value, emails, invalid);
                break;
            case JsonValueKind.Number:
            case JsonValueKind.True:
            case JsonValueKind.False:
                AddInvalid(value.GetRawText(), invalid);
                break;
        }
    }

    private static void CollectText(string? text, List<string> emails, List<string> invalid)
    {
        var trimmed = text?.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return;

        if (trimmed[0] is '[' or '{')
        {
            try
            {
                using var doc = JsonDocument.Parse(trimmed);
                Collect(doc.RootElement, emails, invalid);
                return;
            }
            catch (JsonException)
            {
                // Not JSON after all: treated as plain text below, and fails validation there.
            }
        }

        foreach (var part in trimmed.Split(ListSeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!IsValidEmail(part))
            {
                AddInvalid(part, invalid);
                continue;
            }

            var normalized = part.ToLowerInvariant();
            if (!emails.Contains(normalized))
                emails.Add(normalized);
        }
    }

    /// <summary>Takes the first property that holds an email. An option with no email at all is invalid.</summary>
    private static void CollectOption(JsonElement option, List<string> emails, List<string> invalid)
    {
        string? firstText = null;
        foreach (var name in OptionEmailProperties)
        {
            foreach (var property in option.EnumerateObject())
            {
                if (!property.Name.Equals(name, StringComparison.OrdinalIgnoreCase)
                    || property.Value.ValueKind != JsonValueKind.String)
                    continue;

                var text = property.Value.GetString()?.Trim();
                if (string.IsNullOrEmpty(text))
                    continue;

                firstText ??= text;
                if (IsValidEmail(text))
                {
                    CollectText(text, emails, invalid);
                    return;
                }
            }
        }

        if (firstText != null)
            AddInvalid(firstText, invalid);
    }

    private static void AddInvalid(string value, List<string> invalid)
    {
        if (!invalid.Contains(value, StringComparer.OrdinalIgnoreCase))
            invalid.Add(value);
    }
}

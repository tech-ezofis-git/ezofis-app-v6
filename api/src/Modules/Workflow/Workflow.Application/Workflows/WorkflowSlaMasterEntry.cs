using System.Globalization;
using System.Text.Json;
using SaaSApp.Workflow.Application.Forms;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>An SLA Master entry's SLA values, read by field label.</summary>
public sealed record WorkflowSlaMasterValues(
    string EntryId,
    string EntryName,
    decimal? ResponseDuration,
    string? ResponseUnit,
    decimal? ResolutionDuration,
    string? ResolutionUnit,
    IReadOnlyList<string> NotifyUsers,
    IReadOnlyList<string> EscalationUsers,
    IReadOnlyList<string> Errors,
    /// <summary>The entry's SLA Steps table; null for an entry with the older time columns.</summary>
    IReadOnlyList<WorkflowSlaMasterStep>? Steps = null);

/// <summary>
/// One row of an entry's SLA Steps table: after this long, notify these people and / or escalate to
/// one target. <see cref="EscalateTo"/> is null when the row does not escalate.
/// </summary>
public sealed record WorkflowSlaMasterStep(
    int Index,
    decimal After,
    string Unit,
    IReadOnlyList<string> NotifyUsers,
    string? NotifyGroup,
    bool NotifyInitiator,
    string? EscalateTo,
    IReadOnlyList<string> EscalateUsers,
    string? EscalateGroup,
    string? EscalateStage,
    /// <summary>The row's Send by choice; null when empty, which means email.</summary>
    bool? SendEmail = null,
    bool? SendSms = null);

/// <summary>
/// Advanced SLA with one SLA Master entry (picked by a field and its value in the settings): the
/// values are found in the entry by field label — Response Time / Type, Resolution Time / Type, Notify,
/// Escalate — compared without case, spaces, underscores or hyphens. Read when the SLA runs, so editing
/// the entry changes the SLA of requests that reach it afterwards.
/// </summary>
public static class WorkflowSlaMasterEntry
{
    public const string ResponseTime = "Response Time";
    public const string ResponseType = "Response Type";
    public const string ResolutionTime = "Resolution Time";
    public const string ResolutionType = "Resolution Type";
    public const string Notify = "Notify";
    public const string Escalate = "Escalate";
    public const string SlaSteps = "SLA Steps";
    public const string SendToUsers = "users";
    public const string SendToGroup = "group";
    public const string SendToStage = "stage";

    /// <summary>"Response_Time", "response time", "RESPONSETIME" → "responsetime".</summary>
    public static string NormalizeLabel(string? label) =>
        new((label ?? "").Where(c => !char.IsWhiteSpace(c) && c is not '_' and not '-').Select(char.ToLowerInvariant).ToArray());

    /// <summary>
    /// The SLA values of <paramref name="entry"/>. <paramref name="fields"/> maps labels to the entry's
    /// keys (jsonId / column); keys that are themselves the label also match.
    /// </summary>
    public static WorkflowSlaMasterValues Read(
        string entryId,
        IReadOnlyDictionary<string, object?> entry,
        IReadOnlyList<FormFieldLabel> fields,
        string? nameFieldId)
    {
        var errors = new List<string>();
        string? Find(string label) => FindText(entry, fields, label);

        var name = WorkflowSlaAdvancedEvaluator.Text(entry, nameFieldId) ?? Find("Policy Name") ?? Find("Name") ?? entryId;

        // A form with the SLA Steps table uses only that, even if older columns still hold values.
        if (HasStepsTable(entry, fields))
        {
            var steps = ReadSteps(entry, fields, errors);
            return new WorkflowSlaMasterValues(entryId, name, null, null, null, null, [], [], errors, steps);
        }

        var (responseDuration, responseUnit) = ReadTarget(Find(ResponseTime), Find(ResponseType), "Response", errors);
        var (resolutionDuration, resolutionUnit) = ReadTarget(Find(ResolutionTime), Find(ResolutionType), "Resolution", errors);

        return new WorkflowSlaMasterValues(
            entryId,
            name,
            responseDuration,
            responseUnit,
            resolutionDuration,
            resolutionUnit,
            UserValues(entry, fields, Notify),
            UserValues(entry, fields, Escalate),
            errors);
    }

    private static bool HasStepsTable(IReadOnlyDictionary<string, object?> entry, IReadOnlyList<FormFieldLabel> fields) =>
        KeysFor(entry, fields, SlaSteps).Any()
        || fields.Any(f => NormalizeLabel(f.Label) == NormalizeLabel(SlaSteps));

    /// <summary>The usable rows of the SLA Steps table. A row that cannot run is reported, the others still run.</summary>
    private static IReadOnlyList<WorkflowSlaMasterStep> ReadSteps(
        IReadOnlyDictionary<string, object?> entry,
        IReadOnlyList<FormFieldLabel> fields,
        List<string> errors)
    {
        var steps = new List<WorkflowSlaMasterStep>();
        var rows = StepRows(entry, fields);
        if (rows.Count == 0)
            errors.Add("The entry has no SLA Steps.");

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var label = $"SLA step {i + 1}";
            string? Cell(string column) => FindText(row, fields, column);

            var afterText = Cell("After");
            if (!decimal.TryParse(afterText, NumberStyles.Number, CultureInfo.InvariantCulture, out var after) || after <= 0)
            {
                errors.Add($"{label}: After '{afterText ?? "empty"}' is not a number greater than zero.");
                continue;
            }

            var unitText = Cell("Time unit") ?? Cell("Unit");
            var unit = WorkflowBusinessCalendar.NormalizeUnit(unitText);
            if (unit == null)
            {
                errors.Add($"{label}: Time unit '{unitText ?? "empty"}' must be Minutes, Hours or Days.");
                continue;
            }

            var step = KeysFor(row, fields, "Action").Any()
                ? ReadActionRow(i, after, unit, label, row, fields, errors)
                : ReadRow(i, after, unit, label, row, fields, errors);
            if (step != null)
                steps.Add(step);
        }

        return steps;
    }

    /// <summary>A row of the table: who to notify, and where to escalate. Either side can be left out.</summary>
    private static WorkflowSlaMasterStep? ReadRow(
        int index,
        decimal after,
        string unit,
        string label,
        IReadOnlyDictionary<string, object?> row,
        IReadOnlyList<FormFieldLabel> fields,
        List<string> errors)
    {
        string? Cell(string column) => FindText(row, fields, column)?.Trim();

        var notifyUsers = UserValues(row, fields, "Notify users");
        var notifyGroup = Cell("Notify group");
        var initiator = Cell("Notify initiator")?.ToLowerInvariant() is "yes" or "true";
        var escalateUsers = UserValues(row, fields, "Escalate user");
        var escalateGroup = Cell("Escalate group");
        var escalateStage = Cell("Escalate stage");

        var chosen = Cell("Escalate to");
        var escalateTo = chosen?.ToLowerInvariant() switch
        {
            "user" or "users" => SendToUsers,
            "group" or "groups" => SendToGroup,
            "stage" => SendToStage,
            // Not chosen: whichever target is filled in.
            _ => escalateUsers.Count > 0 ? SendToUsers
                : !string.IsNullOrEmpty(escalateGroup) ? SendToGroup
                : !string.IsNullOrEmpty(escalateStage) ? SendToStage
                : null
        };
        var missing = escalateTo switch
        {
            SendToUsers when escalateUsers.Count == 0 => "Escalate user",
            SendToGroup when string.IsNullOrEmpty(escalateGroup) => "Escalate group",
            SendToStage when string.IsNullOrEmpty(escalateStage) => "Escalate stage",
            _ => null
        };
        if (missing != null)
        {
            errors.Add($"{label}: {missing} is empty, so this step does not escalate.");
            escalateTo = null;
        }

        var notifies = notifyUsers.Count > 0 || !string.IsNullOrEmpty(notifyGroup) || initiator;
        if (!notifies && escalateTo == null)
        {
            if (missing == null)
                errors.Add($"{label}: choose who to notify or where to escalate.");
            return null;
        }

        var sendBy = Cell("Send by")?.ToLowerInvariant();
        return new WorkflowSlaMasterStep(
            index, after, unit, notifyUsers, notifyGroup, initiator, escalateTo,
            escalateTo == SendToUsers ? escalateUsers : [],
            escalateTo == SendToGroup ? escalateGroup : null,
            escalateTo == SendToStage ? escalateStage : null,
            sendBy?.Contains("email"),
            sendBy?.Contains("sms"));
    }

    /// <summary>A row of the earlier table shape: one Action (Notify or Escalate) with one Send to.</summary>
    private static WorkflowSlaMasterStep? ReadActionRow(
        int index,
        decimal after,
        string unit,
        string label,
        IReadOnlyDictionary<string, object?> row,
        IReadOnlyList<FormFieldLabel> fields,
        List<string> errors)
    {
        string? Cell(string column) => FindText(row, fields, column)?.Trim();

        var action = Cell("Action")?.ToLowerInvariant();
        if (action is not ("notify" or "escalate"))
        {
            errors.Add($"{label}: Action '{Cell("Action") ?? "empty"}' must be Notify or Escalate.");
            return null;
        }

        var users = UserValues(row, fields, "Users");
        var group = Cell("Group");
        var stage = Cell("Stage");
        var sendTo = Cell("Send to")?.ToLowerInvariant() switch
        {
            "users" or "user" => SendToUsers,
            "group" or "groups" => SendToGroup,
            "stage" => SendToStage,
            // Not chosen: whichever of the three is filled in.
            _ => users.Count > 0 ? SendToUsers
                : !string.IsNullOrEmpty(group) ? SendToGroup
                : !string.IsNullOrEmpty(stage) ? SendToStage
                : null
        };
        var missing = sendTo switch
        {
            SendToUsers when users.Count == 0 => "Users",
            SendToGroup when string.IsNullOrEmpty(group) => "Group",
            SendToStage when string.IsNullOrEmpty(stage) => "Stage",
            null => "Send to",
            _ => null
        };
        if (missing != null)
        {
            errors.Add($"{label}: {missing} is empty.");
            return null;
        }

        var toUsers = sendTo == SendToUsers ? users : [];
        var toGroup = sendTo == SendToGroup ? group : null;
        if (action == "escalate")
        {
            return new WorkflowSlaMasterStep(
                index, after, unit, [], null, false, sendTo, toUsers, toGroup, sendTo == SendToStage ? stage : null);
        }

        if (sendTo == SendToStage)
        {
            errors.Add($"{label}: a Notify step cannot send to a stage.");
            return null;
        }

        return new WorkflowSlaMasterStep(index, after, unit, toUsers, toGroup, false, null, [], null, null);
    }

    /// <summary>The table's rows: stored as a JSON string in the entry, or already parsed.</summary>
    private static List<IReadOnlyDictionary<string, object?>> StepRows(
        IReadOnlyDictionary<string, object?> entry,
        IReadOnlyList<FormFieldLabel> fields)
    {
        foreach (var key in KeysFor(entry, fields, SlaSteps))
        {
            if (!entry.TryGetValue(key, out var value) || value == null)
                continue;
            try
            {
                using var doc = value is JsonElement element
                    ? JsonDocument.Parse(element.GetRawText())
                    : value is string text && text.TrimStart().StartsWith('[') ? JsonDocument.Parse(text) : null;
                if (doc?.RootElement.ValueKind != JsonValueKind.Array)
                    continue;
                var rows = new List<IReadOnlyDictionary<string, object?>>();
                foreach (var row in doc.RootElement.EnumerateArray())
                {
                    if (row.ValueKind != JsonValueKind.Object)
                        continue;
                    var cells = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                    foreach (var cell in row.EnumerateObject())
                        cells[cell.Name] = cell.Value.Clone();
                    rows.Add(cells);
                }

                if (rows.Count > 0)
                    return rows;
            }
            catch (JsonException)
            {
            }
        }

        return [];
    }

    /// <summary>Labels the SLA Master is missing (time / type fields needed for the SLA).</summary>
    public static IReadOnlyList<string> MissingFields(IReadOnlyList<FormFieldLabel> fields, bool response, bool resolution)
    {
        var have = fields.Select(f => NormalizeLabel(f.Label)).ToHashSet();
        if (have.Contains(NormalizeLabel(SlaSteps)))
            return [];
        var needed = new List<string>();
        if (response)
            needed.AddRange([ResponseTime, ResponseType]);
        if (resolution)
            needed.AddRange([ResolutionTime, ResolutionType]);
        return needed.Where(label => !have.Contains(NormalizeLabel(label))).ToList();
    }

    private static (decimal? Duration, string? Unit) ReadTarget(string? durationText, string? unitText, string what, List<string> errors)
    {
        if (durationText == null && unitText == null)
        {
            errors.Add($"{what} Time / {what} Type are empty or missing in the SLA Master entry.");
            return (null, null);
        }

        if (!decimal.TryParse(durationText, NumberStyles.Number, CultureInfo.InvariantCulture, out var duration) || duration <= 0)
        {
            errors.Add($"{what} Time '{durationText ?? "empty"}' is not a number greater than zero.");
            return (null, null);
        }

        var unit = WorkflowBusinessCalendar.NormalizeUnit(unitText);
        if (unit == null)
        {
            errors.Add($"{what} Type '{unitText ?? "empty"}' must be Minutes, Hours or Days.");
            return (null, null);
        }

        return (duration, unit);
    }

    private static IEnumerable<string> KeysFor(IReadOnlyDictionary<string, object?> entry, IReadOnlyList<FormFieldLabel> fields, string label)
    {
        var target = NormalizeLabel(label);
        foreach (var field in fields.Where(f => NormalizeLabel(f.Label) == target))
        {
            yield return field.JsonId;
            if (!string.IsNullOrWhiteSpace(field.ColumnName))
                yield return field.ColumnName!;
        }

        foreach (var key in entry.Keys.Where(k => NormalizeLabel(k) == target))
            yield return key;
    }

    private static string? FindText(IReadOnlyDictionary<string, object?> entry, IReadOnlyList<FormFieldLabel> fields, string label) =>
        KeysFor(entry, fields, label)
            .Select(key => WorkflowSlaAdvancedEvaluator.Text(entry, key))
            .FirstOrDefault(text => !string.IsNullOrWhiteSpace(text));

    private static IReadOnlyList<string> UserValues(IReadOnlyDictionary<string, object?> entry, IReadOnlyList<FormFieldLabel> fields, string label) =>
        KeysFor(entry, fields, label)
            .Select(key => WorkflowSlaAdvancedEvaluator.UserValues(entry, key))
            .FirstOrDefault(values => values.Count > 0) ?? [];
}

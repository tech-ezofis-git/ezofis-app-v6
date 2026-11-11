using System.Text.Json;
using System.Text.Json.Serialization;

namespace SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

/// <summary>
/// Designer SLA configuration stored as <c>SlaSettings</c> on a block's settings (response SLA)
/// and on the workflow's top-level settings (resolution SLA). Separate from the legacy
/// <c>settings.general.slaSettings</c> work-hours calendar.
/// </summary>
public record WorkflowSlaConfigurationDto(
    [property: JsonPropertyName("mode")]
    string? Mode = null,
    [property: JsonPropertyName("rules")]
    List<WorkflowSlaConfigurationRuleDto>? Rules = null,
    [property: JsonPropertyName("slaMasterId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? SlaMasterId = null,
    [property: JsonPropertyName("notifications")]
    WorkflowSlaNotificationsDto? Notifications = null,
    /// <summary>Advanced (workflow settings): SLA Master fields (stable jsonIds) the SLA values are read from.</summary>
    [property: JsonPropertyName("fieldMapping")]
    WorkflowSlaFieldMappingDto? FieldMapping = null,
    /// <summary>Advanced: rules that pick SLA Master entries from the request's form values.</summary>
    [property: JsonPropertyName("advancedRules")]
    List<WorkflowSlaAdvancedRuleDto>? AdvancedRules = null,
    /// <summary>
    /// Advanced: the stage whose first action completes the response SLA. No stage = no response SLA
    /// (only resolution, which completes when the request reaches the end of the workflow).
    /// </summary>
    [property: JsonPropertyName("responseStageId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? ResponseStageId = null,
    /// <summary>Advanced: entry used when no rule matches. None = no SLA for that request.</summary>
    [property: JsonPropertyName("fallbackEntryId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? FallbackEntryId = null,
    /// <summary>
    /// Advanced (workflow or stage): the SLA Master field (jsonId) that names the entries in the settings,
    /// e.g. Name. The SLA itself always comes from <see cref="EntryId"/>.
    /// </summary>
    [property: JsonPropertyName("masterFieldId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? MasterFieldId = null,
    /// <summary>Not used: the designer saves only <see cref="EntryId"/>, so renaming the entry keeps it.</summary>
    [property: JsonPropertyName("masterValue")]
    string? MasterValue = null,
    /// <summary>
    /// Advanced: the chosen SLA Master entry (item_id). Its Response / Resolution Time and Type, Notify and
    /// Escalate are read from the master by field label each time timers are created and fired.
    /// </summary>
    [property: JsonPropertyName("entryId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? EntryId = null,
    /// <summary>
    /// Advanced (workflow or stage): several SLA Master entries, each with its own time and what it does
    /// (notify, escalate, or both). Settings saved with only <see cref="EntryId"/> mean one row doing both.
    /// </summary>
    [property: JsonPropertyName("masterEntries")]
    List<WorkflowSlaMasterEntryDto>? MasterEntries = null,
    /// <summary>
    /// Custom Setup, "It depends on the request": a value in each request picks the entry. Left out of the
    /// JSON when null, so the SLA fingerprint of existing workflows stays the same.
    /// </summary>
    [property: JsonPropertyName("selection")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    WorkflowSlaSelectionDto? Selection = null,
    /// <summary>Custom Setup: what happens if the ticket is still not done after the last level.</summary>
    [property: JsonPropertyName("afterLastLevel")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    WorkflowSlaAfterLastDto? AfterLastLevel = null
);

/// <summary>How a value in the request picks the SLA form entry (see <c>WorkflowSlaRuleSelector</c>).</summary>
public record WorkflowSlaSelectionDto(
    /// <summary>The request form's field (jsonId) whose value decides.</summary>
    [property: JsonPropertyName("fieldId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? FieldId = null,
    /// <summary>column | map | sameName.</summary>
    [property: JsonPropertyName("method")] string? Method = null,
    /// <summary>Method column: the form the dropdown gets its options from.</summary>
    [property: JsonPropertyName("recordFormId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? RecordFormId = null,
    /// <summary>Method column: that form's column the dropdown shows.</summary>
    [property: JsonPropertyName("recordValueColumn")] string? RecordValueColumn = null,
    /// <summary>Method column: that form's field (jsonId) naming the rule.</summary>
    [property: JsonPropertyName("ruleColumn")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? RuleColumn = null,
    /// <summary>Method map: the rule for each option. Options left out use the default.</summary>
    [property: JsonPropertyName("valueRules")] List<WorkflowSlaValueRuleDto>? ValueRules = null,
    /// <summary>Entry used when no rule is found. None = no SLA for that request.</summary>
    [property: JsonPropertyName("defaultEntryId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? DefaultEntryId = null
);

public record WorkflowSlaValueRuleDto(
    [property: JsonPropertyName("value")] string? Value = null,
    [property: JsonPropertyName("entryId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? EntryId = null
);

/// <summary>After the last level and a wait: none | remind (daily) | group | user | manager.</summary>
public record WorkflowSlaAfterLastDto(
    [property: JsonPropertyName("type")] string? Type = null,
    [property: JsonPropertyName("wait")]
    [property: JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    decimal? Wait = null,
    [property: JsonPropertyName("waitUnit")] string? WaitUnit = null,
    [property: JsonPropertyName("groupId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? GroupId = null,
    [property: JsonPropertyName("userId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? UserId = null
);

/// <summary>One SLA Master entry on an SLA: its time comes live from the entry.</summary>
public record WorkflowSlaMasterEntryDto(
    [property: JsonPropertyName("id")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? Id = null,
    [property: JsonPropertyName("entryId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? EntryId = null,
    /// <summary>At the entry's time, notify its Notify users.</summary>
    [property: JsonPropertyName("notify")] bool? Notify = null,
    /// <summary>At the entry's time, escalate to its Escalate users.</summary>
    [property: JsonPropertyName("escalate")] bool? Escalate = null
);

/// <summary>SLA Master field jsonIds for each SLA property (Advanced mode).</summary>
public record WorkflowSlaFieldMappingDto(
    [property: JsonPropertyName("name")] string? Name = null,
    [property: JsonPropertyName("responseDuration")] string? ResponseDuration = null,
    [property: JsonPropertyName("responseUnit")] string? ResponseUnit = null,
    [property: JsonPropertyName("resolutionDuration")] string? ResolutionDuration = null,
    [property: JsonPropertyName("resolutionUnit")] string? ResolutionUnit = null,
    [property: JsonPropertyName("notifyUsers")] string? NotifyUsers = null,
    [property: JsonPropertyName("escalationUsers")] string? EscalationUsers = null
);

/// <summary>One condition on the request's form: field jsonId, operator (condition block operators), value.</summary>
public record WorkflowSlaConditionDto(
    [property: JsonPropertyName("fieldId")] string? FieldId = null,
    [property: JsonPropertyName("logic")] string? Logic = null,
    [property: JsonPropertyName("value")] string? Value = null
);

/// <summary>
/// Advanced SLA rule: when its conditions match the request, the selected SLA Master entries give the
/// response / resolution targets. Several entries are resolved by <see cref="EntryStrategy"/>.
/// </summary>
public record WorkflowSlaAdvancedRuleDto(
    [property: JsonPropertyName("id")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? Id = null,
    [property: JsonPropertyName("name")] string? Name = null,
    [property: JsonPropertyName("enabled")] bool? Enabled = null,
    [property: JsonPropertyName("priority")]
    [property: JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    int? Priority = null,
    [property: JsonPropertyName("stopAfterMatch")] bool? StopAfterMatch = null,
    /// <summary>True = all conditions (AND), false = any (OR). No conditions = always matches.</summary>
    [property: JsonPropertyName("matchAll")] bool? MatchAll = null,
    [property: JsonPropertyName("conditions")] List<WorkflowSlaConditionDto>? Conditions = null,
    [property: JsonPropertyName("entryIds")] List<string>? EntryIds = null,
    /// <summary>first | shortest | longest | each.</summary>
    [property: JsonPropertyName("entryStrategy")] string? EntryStrategy = null,
    /// <summary>Remind this many working minutes before each deadline; null / 0 = no reminder.</summary>
    [property: JsonPropertyName("reminderMinutes")]
    [property: JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    int? ReminderMinutes = null,
    /// <summary>Users notified besides the entry's Notify users.</summary>
    [property: JsonPropertyName("notifyUserIds")] List<string>? NotifyUserIds = null,
    [property: JsonPropertyName("initiator")] bool? Initiator = null,
    [property: JsonPropertyName("breachAction")] WorkflowSlaBreachActionDto? BreachAction = null
);

/// <summary>
/// What happens when a deadline passes: <c>notify</c> (escalation users are notified only),
/// <c>reassign</c> (current assignee replaced by the first escalation user, through Forward) or
/// <c>stage</c> (moved to <see cref="StageId"/>). <see cref="On"/>: response | resolution | both.
/// </summary>
public record WorkflowSlaBreachActionDto(
    [property: JsonPropertyName("type")] string? Type = null,
    [property: JsonPropertyName("stageId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? StageId = null,
    [property: JsonPropertyName("on")] string? On = null
);

public record WorkflowSlaConfigurationRuleDto(
    [property: JsonPropertyName("id")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? Id = null,
    [property: JsonPropertyName("name")]
    string? Name = null,
    [property: JsonPropertyName("duration")]
    [property: JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    decimal? Duration = null,
    [property: JsonPropertyName("durationUnit")]
    string? DurationUnit = null,
    [property: JsonPropertyName("notifyUserIds")]
    List<string>? NotifyUserIds = null,
    /// <summary>Block scope only; must be absent for the workflow-level SLA.</summary>
    [property: JsonPropertyName("escalateTo")]
    WorkflowSlaEscalationDto? EscalateTo = null,
    [property: JsonPropertyName("initiator")]
    bool? Initiator = null,
    /// <summary>Channels used when this rule fires; falls back to the configuration's <c>notifications</c>.</summary>
    [property: JsonPropertyName("channels")]
    WorkflowSlaNotificationsDto? Channels = null
);

public record WorkflowSlaEscalationDto(
    [property: JsonPropertyName("type")]
    string? Type = null,
    [property: JsonPropertyName("userId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? UserId = null,
    [property: JsonPropertyName("stageId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? StageId = null,
    /// <summary>Type <c>group</c>: the tenant group (<c>users."Groups"</c>) that receives the request.</summary>
    [property: JsonPropertyName("groupId")]
    [property: JsonConverter(typeof(FlexibleStringJsonConverter))]
    string? GroupId = null
);

public record WorkflowSlaNotificationsDto(
    [property: JsonPropertyName("email")]
    bool? Email = null,
    [property: JsonPropertyName("sms")]
    bool? Sms = null
);

/// <summary>Reads an id that may arrive as a JSON string or number (e.g. legacy numeric form ids).</summary>
public sealed class FlexibleStringJsonConverter : JsonConverter<string?>
{
    public override bool HandleNull => true;

    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.Null => null,
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.Number => reader.TryGetInt64(out var l)
                ? l.ToString(System.Globalization.CultureInfo.InvariantCulture)
                : reader.GetDecimal().ToString(System.Globalization.CultureInfo.InvariantCulture),
            _ => throw new JsonException($"Expected a string or number id but found {reader.TokenType}.")
        };

    public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
    {
        if (value == null)
            writer.WriteNullValue();
        else
            writer.WriteStringValue(value);
    }
}

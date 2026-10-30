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
    WorkflowSlaNotificationsDto? Notifications = null
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
    string? StageId = null
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

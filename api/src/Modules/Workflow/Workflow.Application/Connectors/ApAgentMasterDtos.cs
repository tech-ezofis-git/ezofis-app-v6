using System.Text.Json.Serialization;

namespace SaaSApp.Workflow.Application.Connectors;

/// <summary>Shape expected by agents GET /api/masters/po (snake_case).</summary>
public sealed class ApAgentPoMasterDto
{
    [JsonPropertyName("po_number")]
    public string? PoNumber { get; init; }

    [JsonPropertyName("vendor")]
    public string? Vendor { get; init; }

    [JsonPropertyName("supplier")]
    public string? Supplier { get; init; }

    [JsonPropertyName("total")]
    public decimal? Total { get; init; }

    [JsonPropertyName("amount")]
    public decimal? Amount { get; init; }

    [JsonPropertyName("currency")]
    public string? Currency { get; init; }

    [JsonPropertyName("lines")]
    public IReadOnlyList<ApAgentPoLineDto> Lines { get; init; } = Array.Empty<ApAgentPoLineDto>();

    [JsonPropertyName("form_id")]
    public string? FormId { get; init; }
}

public sealed class ApAgentPoLineDto
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("description")]
    public string? Description { get; init; }

    [JsonPropertyName("qty")]
    public decimal? Qty { get; init; }

    [JsonPropertyName("price")]
    public decimal? Price { get; init; }

    [JsonPropertyName("amount")]
    public decimal? Amount { get; init; }
}

/// <summary>Shape expected by agents GET /api/masters/vendor (snake_case).</summary>
public sealed class ApAgentVendorMasterDto
{
    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("vendor")]
    public string? Vendor { get; init; }

    [JsonPropertyName("status")]
    public string Status { get; init; } = "ACTIVE";
}

using System.Globalization;
using System.Text.Json;
using Npgsql;
using SaaSApp.Workflow.Application.Connectors;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Forms;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Resolves purchase orders and vendors from tenant MASTER forms (and PO Supplier as vendor fallback).
/// Returns agent-shaped JSON without mock flags.
/// </summary>
public sealed class ApAgentMasterLookupService : IApAgentMasterLookupService
{
    private static readonly string[] PoNumberAliases =
        ["PO Number", "PONumber", "PoNumber", "po_number", "PO_Number"];
    private static readonly string[] VendorAliases =
        ["Supplier", "Vendor", "Vendor Name", "VendorName", "Supplier Name"];
    private static readonly string[] AmountAliases =
        ["PO Amount", "PO_Amount", "Total", "Amount", "POAmount"];
    private static readonly string[] CurrencyAliases = ["Currency"];
    private static readonly string[] LineTableAliases =
        ["PO Line Item", "PO Line Items", "PO_Line_Item", "Lines"];
    private static readonly string[] LineIdAliases = ["Line", "Part Number", "Part_Number", "id"];
    private static readonly string[] LineDescriptionAliases = ["Description", "description"];
    private static readonly string[] LineQtyAliases = ["Quantity", "Qty", "qty"];
    private static readonly string[] LinePriceAliases = ["Unit Cost", "Unit_Cost", "Price", "price"];
    private static readonly string[] LineAmountAliases = ["Extended", "Amount", "amount"];

    private readonly ITenantContext _tenantContext;
    private readonly IFormService _formService;
    private readonly IFormEntryService _formEntryService;

    public ApAgentMasterLookupService(
        ITenantContext tenantContext,
        IFormService formService,
        IFormEntryService formEntryService)
    {
        _tenantContext = tenantContext;
        _formService = formService;
        _formEntryService = formEntryService;
    }

    public async Task<ApAgentPoMasterDto?> LookupPoAsync(
        string poNumber,
        string? formId,
        string? table,
        CancellationToken cancellationToken = default)
    {
        var needle = poNumber.Trim();
        if (needle.Length == 0)
            return null;

        foreach (var candidateId in await ResolvePoFormIdsAsync(formId, table, cancellationToken))
        {
            var controls = await _formService.GetControlsAsync(candidateId, cancellationToken);
            if (controls == null)
                continue;

            var poColumn = ResolveColumn(controls.Controls, PoNumberAliases);
            if (string.IsNullOrWhiteSpace(poColumn))
                continue;

            var listed = await _formEntryService.ListEntriesAsync(
                candidateId,
                new FormEntryAllRequest(
                    SortBy: null,
                    FilterBy:
                    [
                        new FormAllFilterGroup("AND",
                        [
                            new FormAllFilter(poColumn, "eq", needle)
                        ])
                    ],
                    CurrentPage: 1,
                    ItemsPerPage: 5,
                    Mode: "browse",
                    IncludeFormJson: false),
                cancellationToken);

            var row = listed.Entries?.FirstOrDefault(r =>
                string.Equals(GetString(r, poColumn), needle, StringComparison.OrdinalIgnoreCase));
            if (row == null)
                continue;

            return MapPo(row, candidateId, controls.Controls);
        }

        return null;
    }

    public async Task<ApAgentVendorMasterDto?> LookupVendorAsync(
        string name,
        CancellationToken cancellationToken = default)
    {
        var needle = name.Trim();
        if (needle.Length == 0)
            return null;

        var forms = await ListFormsAsync(cancellationToken);
        var vendorForms = forms
            .Where(f => IsVendorMaster(f.Name, f.Type))
            .Select(f => f.Id)
            .ToList();
        var poForms = forms
            .Where(f => IsPoMaster(f.Name, f.Type))
            .Select(f => f.Id)
            .ToList();

        foreach (var candidateId in vendorForms.Concat(poForms).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var controls = await _formService.GetControlsAsync(candidateId, cancellationToken);
            if (controls == null)
                continue;

            var vendorColumn = ResolveColumn(controls.Controls, VendorAliases)
                ?? ResolveColumn(controls.Controls, ["Name", "DisplayName"]);
            if (string.IsNullOrWhiteSpace(vendorColumn))
                continue;

            var listed = await _formEntryService.ListEntriesAsync(
                candidateId,
                new FormEntryAllRequest(
                    SortBy: null,
                    FilterBy:
                    [
                        new FormAllFilterGroup("AND",
                        [
                            new FormAllFilter(vendorColumn, "contains", needle)
                        ])
                    ],
                    CurrentPage: 1,
                    ItemsPerPage: 20,
                    Mode: "browse",
                    IncludeFormJson: false),
                cancellationToken);

            var match = PickBestName(listed.Entries, vendorColumn, needle);
            if (string.IsNullOrWhiteSpace(match))
                continue;

            return new ApAgentVendorMasterDto
            {
                Name = match,
                Vendor = match,
                Status = "ACTIVE"
            };
        }

        return null;
    }

    private async Task<List<string>> ResolvePoFormIdsAsync(
        string? formId,
        string? table,
        CancellationToken cancellationToken)
    {
        var forms = await ListFormsAsync(cancellationToken);
        var ordered = new List<string>();

        void Add(string? id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return;
            var normalized = FormIdNaming.NormalizeFormId(id);
            if (!ordered.Contains(normalized, StringComparer.OrdinalIgnoreCase))
                ordered.Add(normalized);
        }

        var tableSuffix = ParseEzfbTableSuffix(table);
        if (!string.IsNullOrWhiteSpace(tableSuffix))
        {
            var fromTable = forms.FirstOrDefault(f =>
                string.Equals(FormIdNaming.GetEzfbTableSuffix(f.Id), tableSuffix, StringComparison.OrdinalIgnoreCase)
                && IsPoMaster(f.Name, f.Type));
            if (fromTable != null)
                Add(fromTable.Id);
        }

        if (!string.IsNullOrWhiteSpace(formId))
        {
            var normalized = FormIdNaming.NormalizeFormId(formId);
            var explicitForm = forms.FirstOrDefault(f =>
                string.Equals(FormIdNaming.NormalizeFormId(f.Id), normalized, StringComparison.OrdinalIgnoreCase));
            if (explicitForm != null && IsPoMaster(explicitForm.Name, explicitForm.Type))
                Add(explicitForm.Id);
        }

        foreach (var form in forms.Where(f => IsPoMaster(f.Name, f.Type)))
            Add(form.Id);

        // Invoice form_id is a last resort (same PO Number column may exist on the workflow form).
        if (!string.IsNullOrWhiteSpace(formId))
            Add(formId);

        return ordered;
    }

    private async Task<List<FormListRow>> ListFormsAsync(CancellationToken cancellationToken)
    {
        var connectionString = _tenantContext.ConnectionString
            ?? throw new InvalidOperationException("Tenant connection string not resolved.");
        var tenantGuid = _tenantContext.TenantId
            ?? throw new InvalidOperationException("Tenant context is required.");

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT id, name, type
            FROM dbo."wForm"
            WHERE "isDeleted" = false AND "tenantId" = @TenantId
            ORDER BY name;
            """;

        var items = new List<FormListRow>();
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@TenantId", tenantGuid);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new FormListRow(
                reader.GetString(0),
                reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2)));
        }

        return items;
    }

    private ApAgentPoMasterDto MapPo(
        Dictionary<string, object?> row,
        string formId,
        IReadOnlyList<FormControlItem> controls)
    {
        var poNumber = FirstString(row, controls, PoNumberAliases);
        var vendor = FirstString(row, controls, VendorAliases);
        var total = FirstDecimal(row, controls, AmountAliases);
        var currency = FirstString(row, controls, CurrencyAliases);
        var lines = MapLines(FirstRaw(row, controls, LineTableAliases), controls);

        return new ApAgentPoMasterDto
        {
            PoNumber = poNumber,
            Vendor = vendor,
            Supplier = vendor,
            Total = total,
            Amount = total,
            Currency = currency,
            Lines = lines,
            FormId = formId
        };
    }

    private static List<ApAgentPoLineDto> MapLines(object? raw, IReadOnlyList<FormControlItem> controls)
    {
        var json = raw switch
        {
            string text => text,
            JsonElement el => el.GetRawText(),
            _ => raw?.ToString()
        };
        if (string.IsNullOrWhiteSpace(json))
            return [];

        JsonElement root;
        try
        {
            root = JsonSerializer.Deserialize<JsonElement>(json);
        }
        catch (JsonException)
        {
            return [];
        }

        if (root.ValueKind != JsonValueKind.Array)
            return [];

        var idToName = controls
            .Where(c => !string.IsNullOrWhiteSpace(c.JsonId) && !string.IsNullOrWhiteSpace(c.Name))
            .GroupBy(c => c.JsonId!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Name!, StringComparer.OrdinalIgnoreCase);

        var lines = new List<ApAgentPoLineDto>();
        foreach (var item in root.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object)
                continue;

            var named = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
            foreach (var prop in item.EnumerateObject())
            {
                named[prop.Name] = prop.Value;
                if (idToName.TryGetValue(prop.Name, out var controlName))
                    named[controlName] = prop.Value;
            }

            var qty = PickDecimal(named, LineQtyAliases);
            var price = PickDecimal(named, LinePriceAliases);
            var amount = PickDecimal(named, LineAmountAliases) ?? (qty != null && price != null ? qty * price : null);
            lines.Add(new ApAgentPoLineDto
            {
                Id = PickString(named, LineIdAliases),
                Description = PickString(named, LineDescriptionAliases),
                Qty = qty,
                Price = price,
                Amount = amount
            });
        }

        return lines;
    }

    private static string? ResolveColumn(IReadOnlyList<FormControlItem> controls, IReadOnlyList<string> aliases)
    {
        foreach (var alias in aliases)
        {
            foreach (var control in controls)
            {
                if (string.IsNullOrWhiteSpace(control.Name)
                    || !string.Equals(control.Name, alias, StringComparison.OrdinalIgnoreCase))
                    continue;
                if (!string.IsNullOrWhiteSpace(control.ColumnName))
                    return control.ColumnName;
                return EzfbColumnNaming.ToColumnNameFromLabel(control.Name);
            }
        }

        return null;
    }

    private static string? FirstString(
        Dictionary<string, object?> row,
        IReadOnlyList<FormControlItem> controls,
        IReadOnlyList<string> aliases)
    {
        var column = ResolveColumn(controls, aliases);
        return GetString(row, column) ?? aliases.Select(a => GetString(row, a)).FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
    }

    private static decimal? FirstDecimal(
        Dictionary<string, object?> row,
        IReadOnlyList<FormControlItem> controls,
        IReadOnlyList<string> aliases)
    {
        var text = FirstString(row, controls, aliases);
        return ParseDecimal(text);
    }

    private static object? FirstRaw(
        Dictionary<string, object?> row,
        IReadOnlyList<FormControlItem> controls,
        IReadOnlyList<string> aliases)
    {
        var column = ResolveColumn(controls, aliases);
        if (!string.IsNullOrWhiteSpace(column) && TryGet(row, column, out var value))
            return value;
        foreach (var alias in aliases)
        {
            if (TryGet(row, alias, out value))
                return value;
        }

        return null;
    }

    private static string? PickBestName(
        IReadOnlyList<Dictionary<string, object?>>? entries,
        string column,
        string needle)
    {
        if (entries == null || entries.Count == 0)
            return null;

        string? bestContains = null;
        foreach (var row in entries)
        {
            var value = GetString(row, column);
            if (string.IsNullOrWhiteSpace(value))
                continue;
            if (string.Equals(value, needle, StringComparison.OrdinalIgnoreCase))
                return value;
            if (bestContains == null
                && value.Contains(needle, StringComparison.OrdinalIgnoreCase))
                bestContains = value;
        }

        return bestContains;
    }

    private static string? GetString(Dictionary<string, object?> row, string? key)
    {
        if (string.IsNullOrWhiteSpace(key) || !TryGet(row, key, out var value) || value == null)
            return null;
        var text = Convert.ToString(value, CultureInfo.InvariantCulture)?.Trim();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    private static bool TryGet(Dictionary<string, object?> row, string key, out object? value)
    {
        foreach (var kv in row)
        {
            if (!string.Equals(kv.Key, key, StringComparison.OrdinalIgnoreCase))
                continue;
            value = kv.Value;
            return true;
        }

        value = null;
        return false;
    }

    private static string? PickString(Dictionary<string, JsonElement> named, IReadOnlyList<string> aliases)
    {
        foreach (var alias in aliases)
        {
            if (!named.TryGetValue(alias, out var el))
                continue;
            var text = el.ValueKind is JsonValueKind.String or JsonValueKind.Number
                ? el.ToString().Trim()
                : el.GetRawText().Trim('"');
            if (!string.IsNullOrWhiteSpace(text))
                return text;
        }

        return null;
    }

    private static decimal? PickDecimal(Dictionary<string, JsonElement> named, IReadOnlyList<string> aliases)
    {
        var text = PickString(named, aliases);
        return ParseDecimal(text);
    }

    private static decimal? ParseDecimal(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;
        return decimal.TryParse(
            text.Replace(",", "", StringComparison.Ordinal),
            NumberStyles.Any,
            CultureInfo.InvariantCulture,
            out var parsed)
            ? parsed
            : null;
    }

    private static bool IsPoMaster(string name, string? type)
    {
        if (!IsMasterType(type))
            return false;
        var n = name ?? string.Empty;
        return n.Contains("PO", StringComparison.OrdinalIgnoreCase)
            || n.Contains("Purchase", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsVendorMaster(string name, string? type)
    {
        if (!IsMasterType(type))
            return false;
        var n = name ?? string.Empty;
        return n.Contains("Vendor", StringComparison.OrdinalIgnoreCase)
            || n.Contains("Supplier", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsMasterType(string? type) =>
        string.Equals(type?.Trim(), "MASTER", StringComparison.OrdinalIgnoreCase);

    private static string? ParseEzfbTableSuffix(string? table)
    {
        if (string.IsNullOrWhiteSpace(table))
            return null;
        var t = table.Trim();
        const string prefix = "ezfb_";
        const string suffix = "_items";
        if (t.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) && t.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
        {
            var mid = t[prefix.Length..^suffix.Length];
            return string.IsNullOrWhiteSpace(mid) ? null : mid.ToLowerInvariant();
        }

        return t.Length == FormIdNaming.EzfbTableSuffixLength ? t.ToLowerInvariant() : null;
    }

    private sealed record FormListRow(string Id, string Name, string? Type);
}

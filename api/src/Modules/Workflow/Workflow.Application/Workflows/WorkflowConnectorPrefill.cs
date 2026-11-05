using System.Text.Json;
using System.Text.Json.Nodes;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>
/// Builds the child request's form values for a Workflow Connector: each parent value is copied
/// into the child field with the same label, once. Tables copy their rows, keeping only the
/// columns whose labels match. Layout-only and disabled child fields are skipped. This is the same
/// rule the web app uses to pre-fill a child started with Initiate.
/// </summary>
public static class WorkflowConnectorPrefill
{
    private static readonly HashSet<string> SkippedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "DIVIDER", "LABEL", "PARAGRAPH"
    };

    private static readonly HashSet<string> TableTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "TABLE", "DYNAMIC_TABLE"
    };

    /// <summary>A form control: its jsonId, label, type, and the columns when it's a table.</summary>
    public sealed record FormField(
        string Id,
        string Label,
        string Type,
        bool Disabled,
        IReadOnlyList<FormField> Columns)
    {
        public bool IsTable => TableTypes.Contains(Type);
    }

    /// <summary>Child jsonId → value (table rows as a JSON array), ready for the start form data.</summary>
    public static Dictionary<string, string> Build(
        string? parentFormJson,
        IReadOnlyDictionary<string, string> parentValues,
        string? childFormJson)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var parentFields = ReadFields(parentFormJson);
        var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var child in ReadFields(childFormJson))
        {
            if (SkippedTypes.Contains(child.Type) || child.Disabled)
                continue;

            var key = Key(child.Label);
            var parent = parentFields.FirstOrDefault(p => !used.Contains(p.Id) && Key(p.Label) == key);
            if (parent == null || !parentValues.TryGetValue(parent.Id, out var raw) || string.IsNullOrWhiteSpace(raw))
                continue;

            string? value;
            if (child.IsTable && parent.IsTable)
                value = CopyTableRows(parent, child, raw);
            else if (child.IsTable || parent.IsTable)
                continue;
            else
                value = raw.Trim();

            used.Add(parent.Id);
            if (!string.IsNullOrEmpty(value))
                result[child.Id] = value;
        }

        return result;
    }

    /// <summary>The form's controls in order. Table columns are listed under their table only.</summary>
    public static IReadOnlyList<FormField> ReadFields(string? formJson)
    {
        var fields = new List<FormField>();
        if (string.IsNullOrWhiteSpace(formJson))
            return fields;

        try
        {
            using var doc = JsonDocument.Parse(formJson);
            Collect(doc.RootElement, fields);
        }
        catch (JsonException)
        {
        }

        return fields;
    }

    private static void Collect(JsonElement element, List<FormField> fields)
    {
        if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
                Collect(item, fields);
            return;
        }

        if (element.ValueKind != JsonValueKind.Object)
            return;

        if (TryReadField(element, out var field))
        {
            fields.Add(field);
            // A table's columns look like fields too; they belong to the table.
            if (field.IsTable)
                return;
        }

        foreach (var prop in element.EnumerateObject())
            Collect(prop.Value, fields);
    }

    private static bool TryReadField(JsonElement element, out FormField field)
    {
        field = null!;
        var id = ReadString(element, "id");
        var type = ReadString(element, "type");
        var label = ReadString(element, "label") ?? "";
        if (id == null || type == null || (label.Length == 0 && !TableTypes.Contains(type)))
            return false;

        var disabled = TryGetPath(element, out var visibility, "settings", "general", "visibility")
            && visibility.ValueKind == JsonValueKind.String
            && string.Equals(visibility.GetString(), "DISABLE", StringComparison.OrdinalIgnoreCase);

        var columns = new List<FormField>();
        if (TableTypes.Contains(type)
            && TryGetPath(element, out var tableColumns, "settings", "specific", "tableColumns")
            && tableColumns.ValueKind == JsonValueKind.Array)
        {
            foreach (var column in tableColumns.EnumerateArray())
            {
                var columnId = column.ValueKind == JsonValueKind.Object ? ReadString(column, "id") : null;
                if (columnId != null)
                    columns.Add(new FormField(columnId, ReadString(column, "label") ?? "", ReadString(column, "type") ?? "", false, []));
            }
        }

        field = new FormField(id, label, type, disabled, columns);
        return true;
    }

    private static string? CopyTableRows(FormField parent, FormField child, string rawRows)
    {
        JsonArray? rows;
        try
        {
            rows = JsonNode.Parse(rawRows) as JsonArray;
        }
        catch (JsonException)
        {
            return null;
        }

        if (rows == null)
            return null;

        var columnMap = new List<(FormField From, string To)>();
        foreach (var childColumn in child.Columns)
        {
            var key = Key(childColumn.Label);
            var match = parent.Columns.FirstOrDefault(c => key.Length > 0 && Key(c.Label) == key);
            if (match != null)
                columnMap.Add((match, childColumn.Id));
        }

        if (columnMap.Count == 0)
            return null;

        var copied = new JsonArray();
        foreach (var row in rows)
        {
            if (row is not JsonObject source)
                continue;
            var target = new JsonObject();
            foreach (var (from, to) in columnMap)
            {
                if (TryGetCell(source, from, out var cell))
                    target[to] = cell?.DeepClone();
            }

            if (target.Count > 0)
                copied.Add(target);
        }

        return copied.Count > 0 ? copied.ToJsonString() : null;
    }

    /// <summary>
    /// A row's cell for a column. Saved rows of newer forms are keyed by column label
    /// ("Bill No"), older ones and submitted rows by column jsonId.
    /// </summary>
    private static bool TryGetCell(JsonObject row, FormField column, out JsonNode? cell)
    {
        if (row.TryGetPropertyValue(column.Id, out cell))
            return true;

        var label = Key(column.Label);
        foreach (var (name, value) in row)
        {
            if (label.Length > 0 && Key(name) == label)
            {
                cell = value;
                return true;
            }
        }

        cell = null;
        return false;
    }

    private static string Key(string? label) => label?.Trim().ToLowerInvariant() ?? "";

    private static string? ReadString(JsonElement element, string name)
    {
        foreach (var prop in element.EnumerateObject())
        {
            if (!string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
                continue;
            if (prop.Value.ValueKind != JsonValueKind.String)
                return null;
            var text = prop.Value.GetString()?.Trim();
            return string.IsNullOrEmpty(text) ? null : text;
        }

        return null;
    }

    private static bool TryGetPath(JsonElement element, out JsonElement value, params string[] path)
    {
        value = element;
        foreach (var name in path)
        {
            if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty(name, out value))
                return false;
        }

        return true;
    }
}

using System.Text.Json;

namespace SaaSApp.Reporting.Application.Contracts;

public static class ReportAgentChatMapper
{
    public const string Intent = "report";

    public static string ResolveAgentsBaseUrl(string? chatUrl)
    {
        var url = (chatUrl ?? string.Empty).Trim().TrimEnd('/');
        if (url.EndsWith("/chat", StringComparison.OrdinalIgnoreCase))
            url = url[..^5].TrimEnd('/');
        return url;
    }

    public static ReportAgentProxyResult Parse(int statusCode, string? body)
    {
        var raw = body ?? string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
            return new ReportAgentProxyResult { StatusCode = statusCode, RawBody = raw };

        try
        {
            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;
            var reply = ReadString(root, "reply", "detail", "error", "title")
                        ?? ReadDetailArray(root);
            var result = ReadProperty(root, "report_result", "reportResult");
            return new ReportAgentProxyResult
            {
                StatusCode = statusCode,
                RawBody = raw,
                Reply = reply,
                ReportResult = result.ValueKind is JsonValueKind.Undefined
                    ? default
                    : result.Clone()
            };
        }
        catch (JsonException)
        {
            return new ReportAgentProxyResult { StatusCode = statusCode, RawBody = raw };
        }
    }

    public static bool IsPlaceholder(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;
        var trimmed = value.Trim();
        return trimmed.Equals("string", StringComparison.OrdinalIgnoreCase)
               || trimmed.Equals("null", StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsUsablePrompt(string? prompt)
    {
        if (IsPlaceholder(prompt))
            return false;
        var trimmed = prompt!.Trim();
        if (trimmed.StartsWith('{') || trimmed.StartsWith('['))
        {
            try
            {
                using var doc = JsonDocument.Parse(trimmed);
                return doc.RootElement.ValueKind is JsonValueKind.Object or JsonValueKind.Array;
            }
            catch (JsonException)
            {
                return false;
            }
        }

        return trimmed.Length > 8;
    }

    public static bool IsUsableSpec(JsonElement spec) =>
        spec.ValueKind is JsonValueKind.Object or JsonValueKind.Array;

    public static string? UsableModel(string? model) =>
        IsPlaceholder(model) ? null : model?.Trim();

    public static string ErrorMessage(ReportAgentProxyResult proxy, string fallback)
    {
        if (!string.IsNullOrWhiteSpace(proxy.Reply))
            return proxy.Reply!;
        if (string.IsNullOrWhiteSpace(proxy.RawBody))
            return fallback;
        try
        {
            using var doc = JsonDocument.Parse(proxy.RawBody);
            var reply = ReadString(doc.RootElement, "reply", "detail", "error", "title")
                        ?? ReadDetailArray(doc.RootElement);
            if (!string.IsNullOrWhiteSpace(reply))
                return reply;
        }
        catch (JsonException)
        {
            // fall through
        }

        var raw = proxy.RawBody.Trim();
        return raw.Length <= 400 ? raw : fallback;
    }

    public static bool IsLockFailure(IEnumerable<string>? warnings)
    {
        foreach (var warning in warnings ?? [])
        {
            if (string.IsNullOrWhiteSpace(warning))
                continue;
            if (warning.Contains("Dropped unknown source table", StringComparison.OrdinalIgnoreCase)
                || warning.Contains("Redirected report source", StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    public static bool IsSpecifiedScope(string? reportType) =>
        reportType is not null
        && (reportType.Equals("specific_workflow", StringComparison.OrdinalIgnoreCase)
            || reportType.Equals("specific_repository", StringComparison.OrdinalIgnoreCase));

    public static IReadOnlyList<ReportAiSpecColumn> ReadSpecColumns(JsonElement spec)
    {
        foreach (var name in new[]
                 {
                     "columns", "userdefinedColumns", "userdefined_columns",
                     "defaultColumns", "default_columns", "agentColumns", "agent_columns"
                 })
        {
            var prop = ReadProperty(spec, name);
            if (prop.ValueKind != JsonValueKind.Array)
                continue;

            var list = new List<ReportAiSpecColumn>();
            foreach (var item in prop.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object)
                    continue;
                var key = ReadString(item, "key", "id", "field")?.Trim();
                if (string.IsNullOrWhiteSpace(key) || IsPlaceholder(key))
                    continue;
                var label = ReadString(item, "label", "name")?.Trim();
                var formula = ReadString(item, "formula", "expression")?.Trim();
                list.Add(new ReportAiSpecColumn(
                    key,
                    string.IsNullOrWhiteSpace(label) || IsPlaceholder(label) ? key : label,
                    string.IsNullOrWhiteSpace(formula) || IsPlaceholder(formula) ? null : formula));
            }

            if (list.Count > 0)
                return list;
        }

        return [];
    }

    public static List<ReportFilter> ReadSpecFilters(JsonElement spec)
    {
        var prop = ReadProperty(spec, "filters");
        if (prop.ValueKind != JsonValueKind.Array)
            return [];

        var list = new List<ReportFilter>();
        foreach (var item in prop.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object)
                continue;
            var field = ReadString(item, "field", "key", "id")?.Trim();
            if (string.IsNullOrWhiteSpace(field) || IsPlaceholder(field))
                continue;
            var op = ReadString(item, "op", "operator")?.Trim();
            var value = ReadProperty(item, "value");
            list.Add(new ReportFilter
            {
                Field = field,
                FieldId = field,
                Operator = string.IsNullOrWhiteSpace(op) || IsPlaceholder(op) ? "eq" : op,
                Op = string.IsNullOrWhiteSpace(op) || IsPlaceholder(op) ? "eq" : op,
                Value = value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null
                    ? default
                    : value.Clone()
            });
        }

        return list;
    }

    public static IReadOnlyList<string> ReadWarnings(JsonElement result)
    {
        if (result.ValueKind != JsonValueKind.Object)
            return [];

        var prop = ReadProperty(result, "warnings");
        if (prop.ValueKind != JsonValueKind.Array)
            return [];

        var list = new List<string>();
        foreach (var item in prop.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var value = item.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                    list.Add(value);
            }
        }

        return list;
    }

    public static string? ReadString(JsonElement obj, params string[] names)
    {
        var prop = ReadProperty(obj, names);
        return prop.ValueKind == JsonValueKind.String ? prop.GetString() : null;
    }

    public static JsonElement ReadProperty(JsonElement obj, params string[] names)
    {
        if (obj.ValueKind != JsonValueKind.Object)
            return default;

        foreach (var name in names)
        {
            if (obj.TryGetProperty(name, out var exact))
                return exact;
        }

        foreach (var prop in obj.EnumerateObject())
        {
            foreach (var name in names)
            {
                if (string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
                    return prop.Value;
            }
        }

        return default;
    }

    public static JsonElement ParseObjectOrEmpty(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return EmptyObject();

        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.ValueKind == JsonValueKind.Object
                ? doc.RootElement.Clone()
                : EmptyObject();
        }
        catch (JsonException)
        {
            return EmptyObject();
        }
    }

    public static string SpecJson(JsonElement spec) =>
        spec.ValueKind is JsonValueKind.Object or JsonValueKind.Array
            ? spec.GetRawText()
            : "{}";

    public static JsonElement EmptyObject()
    {
        using var doc = JsonDocument.Parse("{}");
        return doc.RootElement.Clone();
    }

    public static JsonElement EmptyArray()
    {
        using var doc = JsonDocument.Parse("[]");
        return doc.RootElement.Clone();
    }

    public static object MergePromptResponse(Guid id, string sessionId, JsonElement reportResult)
    {
        var spec = ReadProperty(reportResult, "reportSpec", "report_spec");
        if (spec.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            spec = EmptyObject();

        return new
        {
            id,
            sessionId,
            title = ReadString(reportResult, "title") ?? "Report",
            reportType = ReadString(reportResult, "reportType", "report_type"),
            reportPrompt = ReadString(reportResult, "reportPrompt", "report_prompt") ?? "",
            reportSpec = spec,
            warnings = ReadWarnings(reportResult),
            schemaTables = ReadStringList(reportResult, "schemaTables", "schema_tables"),
            durationMs = ReadNumber(reportResult, "durationMs", "duration_ms")
        };
    }

    public static ReportRunResult ToExportResult(
        ReportAiDefinitionRecord record,
        JsonElement reportResult)
    {
        var domain = record.WorkflowName ?? record.RepositoryName ?? record.ReportType ?? "";
        var name = string.IsNullOrWhiteSpace(record.Name) ? domain : record.Name;
        var columnsEl = ReadProperty(reportResult, "columns");
        var rowsEl = ReadProperty(reportResult, "rows");
        var columns = new List<ReportColumnDto>();
        if (columnsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in columnsEl.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object)
                    continue;
                var key = ReadString(item, "key", "id", "field")?.Trim();
                if (string.IsNullOrWhiteSpace(key) || IsPlaceholder(key))
                    continue;
                var label = ReadString(item, "label", "name")?.Trim();
                columns.Add(new ReportColumnDto(
                    key,
                    string.IsNullOrWhiteSpace(label) || IsPlaceholder(label) ? key : label,
                    "None",
                    "value",
                    160,
                    false));
            }
        }

        var rows = new List<IReadOnlyDictionary<string, string?>>();
        if (rowsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var row in rowsEl.EnumerateArray())
            {
                if (row.ValueKind != JsonValueKind.Object)
                    continue;
                var mapped = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
                foreach (var column in columns)
                {
                    var cell = ReadProperty(row, column.Key);
                    if (cell.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
                        cell = ReadProperty(row, column.Label);
                    mapped[column.Label] = CellText(cell);
                }

                rows.Add(mapped);
            }
        }

        return new ReportRunResult(
            record.Id,
            name,
            domain,
            columns,
            rows,
            null,
            rows.Count,
            null,
            null);
    }

    public static object MergeRunResponse(Guid id, JsonElement reportResult)
    {
        var columns = ReadProperty(reportResult, "columns");
        var rows = ReadProperty(reportResult, "rows");
        if (columns.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            columns = EmptyArray();
        if (rows.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            rows = EmptyArray();

        return new
        {
            id,
            title = ReadString(reportResult, "title") ?? "Report",
            reportType = ReadString(reportResult, "reportType", "report_type"),
            columns,
            rows,
            totalCount = ReadNumber(reportResult, "totalCount", "total_count") ?? 0,
            page = ReadNumber(reportResult, "page") ?? 1,
            pageSize = ReadNumber(reportResult, "pageSize", "page_size") ?? 25,
            warnings = ReadWarnings(reportResult)
        };
    }

    public static ReportAiDefinitionDto ToDto(ReportAiDefinitionRecord row)
    {
        var spec = ParseObjectOrEmpty(row.ReportSpecJson);
        return new ReportAiDefinitionDto
        {
            Id = row.Id,
            SessionId = row.SessionId,
            Name = row.Name,
            Description = row.Description,
            ReportType = row.ReportType,
            WorkflowName = row.WorkflowName,
            RepositoryName = row.RepositoryName,
            Title = row.Name,
            ReportPrompt = row.ReportPrompt,
            ReportSpec = spec,
            Status = row.Status,
            Runs = row.Runs,
            CreatedAtUtc = row.CreatedAtUtc,
            ModifiedAtUtc = row.ModifiedAtUtc
        };
    }

    private static string? ReadDetailArray(JsonElement root)
    {
        var detail = ReadProperty(root, "detail");
        if (detail.ValueKind != JsonValueKind.Array)
            return null;
        var parts = new List<string>();
        foreach (var item in detail.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var value = item.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                    parts.Add(value);
            }
            else if (item.ValueKind == JsonValueKind.Object)
            {
                var msg = ReadString(item, "msg", "message");
                if (!string.IsNullOrWhiteSpace(msg))
                    parts.Add(msg);
            }
        }

        return parts.Count == 0 ? null : string.Join("; ", parts);
    }

    private static IReadOnlyList<string> ReadStringList(JsonElement obj, params string[] names)
    {
        var prop = ReadProperty(obj, names);
        if (prop.ValueKind != JsonValueKind.Array)
            return [];

        var list = new List<string>();
        foreach (var item in prop.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var value = item.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                    list.Add(value);
            }
        }

        return list;
    }

    private static string CellText(JsonElement cell) =>
        cell.ValueKind switch
        {
            JsonValueKind.String => cell.GetString() ?? "",
            JsonValueKind.Number => cell.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Undefined or JsonValueKind.Null => "",
            _ => cell.GetRawText()
        };

    private static double? ReadNumber(JsonElement obj, params string[] names)
    {
        var prop = ReadProperty(obj, names);
        return prop.ValueKind is JsonValueKind.Number && prop.TryGetDouble(out var value)
            ? value
            : null;
    }
}

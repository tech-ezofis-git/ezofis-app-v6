using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using SaaSApp.Repository.Application.Contracts;

namespace SaaSApp.Repository.Infrastructure;

internal static class RepositoryItemMetadataUpdateHelper
{
    private static readonly HashSet<string> ReadOnlyColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "Id", "TenantId", "RepositoryId", "StorageProviderId",
        "FilePath", "FileName", "FileType", "FileSize", "TotalPages",
        "CreatedAtUtc", "CreatedBy", "IsDeleted", "ValidFrom", "ValidTo",
        "ModifiedAtUtc", "ModifiedBy"
    };

    /// <summary>
    /// <c>UpdatedFieldCount</c> = fields written (-1 when the item was not found);
    /// <c>Changes</c> = fields whose value actually differed; saved to metadata history only when
    /// <c>recordHistory</c> is true (<c>ChangeId</c> is then set).
    /// </summary>
    public sealed record UpdateResult(
        int UpdatedFieldCount,
        IReadOnlyList<RepositoryItemMetadataChangeDto> Changes,
        Guid? ChangeId);

    public static async Task<UpdateResult> UpdateAsync(
        NpgsqlConnection connection,
        RepositoryDetailDto repo,
        Guid tenantId,
        Guid repositoryId,
        Guid itemId,
        IReadOnlyDictionary<string, string> metadata,
        Guid? userId,
        bool recordHistory,
        CancellationToken cancellationToken)
    {
        if (metadata.Count == 0)
            throw new ArgumentException("At least one metadata field is required.");

        var table = RepositorySqlHelper.QualifiedItemsTable(repo.ItemsTableName);
        var tableColumns = await RepositoryItemTableColumns.LoadAsync(connection, repo.ItemsTableName, cancellationToken);
        var allowedColumns = RepositoryItemFilterHelper.BuildFilterableColumns(repo, tableColumns);

        var columnUpdates = BuildColumnUpdates(metadata, repo, allowedColumns, tableColumns);
        if (columnUpdates.Count == 0)
        {
            throw new ArgumentException(
                "No valid metadata fields to update. Use GET .../items/filter-fields for allowed keys that exist on this repository table.");
        }

        if (recordHistory)
            await RepositoryItemMetadataHistoryStore.EnsureTableAsync(connection, null, cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        var oldValues = await LoadCurrentValuesAsync(
            connection, transaction, table, columnUpdates.Keys.ToList(), tenantId, repositoryId, itemId, cancellationToken);
        if (oldValues == null)
            return new UpdateResult(-1, Array.Empty<RepositoryItemMetadataChangeDto>(), null);

        var changes = new List<RepositoryItemMetadataChangeDto>();
        foreach (var (column, newValue) in columnUpdates)
        {
            var oldText = FormatValue(oldValues.GetValueOrDefault(column));
            var newText = FormatValue(newValue);
            if (!string.Equals(oldText, newText, StringComparison.Ordinal))
                changes.Add(new RepositoryItemMetadataChangeDto(ResolveFieldName(repo, column), column, oldText, newText));
        }

        var sets = new List<string>();
        var parameters = new List<NpgsqlParameter>();
        var index = 0;

        foreach (var (column, value) in columnUpdates)
        {
            var param = $"@U{index++}";
            sets.Add($"{RepositorySqlHelper.PhysicalColumnRef(column)} = {param}");
            parameters.Add(CreateParameter(param, column, value));
        }

        sets.Add("modified_at_utc = now()");
        sets.Add("modified_by = @ModifiedBy");

        var sql = $"""
            UPDATE {table}
            SET {string.Join(", ", sets)}
            WHERE id = @ItemId AND tenant_id = @TenantId AND repository_id = @RepositoryId AND is_deleted = false;
            """;

        await using var cmd = new NpgsqlCommand(sql, connection, transaction);
        foreach (var p in parameters)
            cmd.Parameters.Add(p);
        cmd.Parameters.AddWithValue("@ModifiedBy", (object?)userId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@ItemId", itemId);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        cmd.Parameters.AddWithValue("@RepositoryId", repositoryId);

        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);
        if (rows == 0)
            return new UpdateResult(-1, Array.Empty<RepositoryItemMetadataChangeDto>(), null);

        Guid? changeId = null;
        if (recordHistory && changes.Count > 0)
        {
            changeId = Guid.NewGuid();
            await RepositoryItemMetadataHistoryStore.InsertAsync(
                connection, transaction, tenantId, repositoryId, itemId, changeId.Value, changes, userId, cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return new UpdateResult(columnUpdates.Count, changes, changeId);
    }

    /// <summary>Current values of the columns about to change (row locked); null when the item is missing.</summary>
    private static async Task<Dictionary<string, object?>?> LoadCurrentValuesAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        string table,
        IReadOnlyList<string> columns,
        Guid tenantId,
        Guid repositoryId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var select = string.Join(", ", columns.Select(RepositorySqlHelper.PhysicalColumnRef));
        var sql = $"""
            SELECT {select}
            FROM {table}
            WHERE id = @ItemId AND tenant_id = @TenantId AND repository_id = @RepositoryId AND is_deleted = false
            FOR UPDATE;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection, transaction);
        cmd.Parameters.AddWithValue("@ItemId", itemId);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        cmd.Parameters.AddWithValue("@RepositoryId", repositoryId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < columns.Count; i++)
            values[columns[i]] = reader.IsDBNull(i) ? null : reader.GetValue(i);
        return values;
    }

    /// <summary>
    /// Text form used for history and change detection, so 1200.00 vs 1200 or a date vs its
    /// midnight timestamp do not count as edits. Blank is treated as no value.
    /// </summary>
    private static string? FormatValue(object? value) => value switch
    {
        null or DBNull => null,
        string s => string.IsNullOrWhiteSpace(s) ? null : NormalizeJsonText(s.Trim()),
        decimal d => d.ToString("0.############################", CultureInfo.InvariantCulture),
        double d => d.ToString("0.############", CultureInfo.InvariantCulture),
        float f => f.ToString("0.######", CultureInfo.InvariantCulture),
        DateTime dt => dt.TimeOfDay == TimeSpan.Zero
            ? dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : dt.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture),
        DateOnly d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        bool b => b ? "true" : "false",
        IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
        _ => value.ToString()
    };

    private static readonly JsonSerializerOptions CompactJson = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    /// <summary>
    /// JSON object/array text (e.g. line items) rewritten in one compact form, so the same data
    /// with different spacing (<c>"qty": 6</c> vs <c>"qty":6</c>) is not seen as an edit.
    /// Non-JSON text is returned unchanged.
    /// </summary>
    private static string NormalizeJsonText(string text)
    {
        if (text.Length < 2 || (text[0] != '{' && text[0] != '['))
            return text;

        try
        {
            using var doc = JsonDocument.Parse(text);
            return JsonSerializer.Serialize(doc.RootElement, CompactJson);
        }
        catch (JsonException)
        {
            return text;
        }
    }

    /// <summary>Repository field display name for a column (e.g. "Billing Address"), else the column.</summary>
    private static string ResolveFieldName(RepositoryDetailDto repo, string column)
    {
        var field = repo.Fields.FirstOrDefault(f =>
            string.Equals(f.SqlColumnName, column, StringComparison.OrdinalIgnoreCase)
            || string.Equals(RepositorySqlHelper.ToPhysicalName(f.SqlColumnName), column, StringComparison.OrdinalIgnoreCase)
            || string.Equals(f.Name, column, StringComparison.OrdinalIgnoreCase));
        return string.IsNullOrWhiteSpace(field?.Name) ? column : field.Name;
    }

    private static Dictionary<string, object?> BuildColumnUpdates(
        IReadOnlyDictionary<string, string> metadata,
        RepositoryDetailDto repo,
        HashSet<string> allowedColumns,
        HashSet<string> tableColumns)
    {
        var updates = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var (key, rawValue) in metadata)
        {
            if (!RepositoryItemFilterHelper.TryResolveFilterColumn(key, allowedColumns, repo, out var logicalCol))
                continue;

            if (!RepositoryItemTableColumns.Has(tableColumns, logicalCol) || ReadOnlyColumns.Contains(logicalCol))
                continue;

            var column = RepositoryItemTableColumns.TryGetCanonicalName(tableColumns, logicalCol, out var canonicalCol)
                ? canonicalCol
                : logicalCol;

            updates[column] = CoerceValue(column, rawValue, repo.Fields);
        }

        return updates;
    }

    private static object? CoerceValue(string column, string rawValue, IReadOnlyList<RepositoryFieldDto> fields)
    {
        if (string.Equals(column, "Amount", StringComparison.OrdinalIgnoreCase)
            || string.Equals(column, "POAmount", StringComparison.OrdinalIgnoreCase)
            || string.Equals(column, "InvoiceAmount", StringComparison.OrdinalIgnoreCase)
            || string.Equals(column, "InvoiceTaxAmount", StringComparison.OrdinalIgnoreCase))
        {
            return decimal.TryParse(rawValue, out var amount) ? amount : rawValue;
        }

        if (string.Equals(column, "DocumentDate", StringComparison.OrdinalIgnoreCase)
            || string.Equals(column, "PODate", StringComparison.OrdinalIgnoreCase)
            || string.Equals(column, "InvoiceDate", StringComparison.OrdinalIgnoreCase))
        {
            return DateTime.TryParse(rawValue, out var date) ? date.Date : rawValue;
        }

        if (string.Equals(column, "OcrScore", StringComparison.OrdinalIgnoreCase))
        {
            return byte.TryParse(rawValue, out var score) ? score : rawValue;
        }

        // Fall back to the repository's own field-definition DataType for arbitrary custom columns not
        // in the fixed "core column" list above (same 42804 text-into-typed-column issue as the insert
        // path -- see RepositoryFieldValueCoercion).
        return RepositoryFieldValueCoercion.TryCoerce(fields, column, rawValue) ?? rawValue;
    }

    private static NpgsqlParameter CreateParameter(string name, string column, object? value)
    {
        if (value is byte b)
            // ocr_score is smallint (Postgres has no 1-byte integer type); widen to short.
            return new NpgsqlParameter(name, NpgsqlDbType.Smallint) { Value = (short)b };

        // decimal/DateTime/int/bool (from RepositoryFieldValueCoercion.TryCoerce, custom-field fallback
        // above) and the plain-string/DBNull case all share the same typed-parameter construction.
        return RepositoryFieldValueCoercion.CreateParameter(name, value);
    }
}

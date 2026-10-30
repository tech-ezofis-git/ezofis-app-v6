using System.Globalization;
using System.Text.Json;
using Npgsql;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Finds the .eml archived on a workflow instance and turns its repository fields into archive
/// metadata JSON, so files created from it (extracted attachments, generated quote PDFs) land in
/// the same Document Details / browse folders as the original email.
/// </summary>
internal static class EmlSourceMetadata
{
    private static readonly HashSet<string> MetadataCopyExcludedColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "Id", "Code", "TenantId", "RepositoryId", "FolderId", "StorageProviderId",
        "FilePath", "FileName", "FileType", "FileSize", "TotalPages", "IsDeleted",
        "CreatedAtUtc", "CreatedBy", "ModifiedAtUtc", "ModifiedBy",
        "WorkflowInstanceId", "OcrText", "OcrJson", "SummaryJson", "ActiveItem", "IsVerified",
        "FileVersion", "Revision", "StageStatus", "MailId", "ArchivedFrom", "ArchivedAt"
    };

    /// <summary>Most recently archived .eml-shaped attachment on this instance.</summary>
    public static async Task<(Guid RepositoryId, Guid ItemId, string FileName)?> FindLatestEmlAttachmentAsync(
        NpgsqlConnection connection,
        string workflowSuffix,
        Guid instanceId,
        CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT repository_id, item_id, file_name
            FROM workflow.workflow_attachments_{workflowSuffix}
            WHERE workflow_instance_id = @InstanceId
              AND is_deleted = false
              AND (file_name ILIKE '%.eml' OR content_type ILIKE '%rfc822%')
            ORDER BY created_at_utc DESC
            LIMIT 1;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@InstanceId", instanceId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return (reader.GetGuid(0), reader.GetGuid(1), reader.IsDBNull(2) ? "message.eml" : reader.GetString(2));
    }

    /// <summary>
    /// Archive metadata JSON from the source item's custom/folder fields (system and file columns
    /// excluded). Null when there is nothing to copy.
    /// </summary>
    public static string? ToMetadataJson(IReadOnlyDictionary<string, object?>? fields)
    {
        if (fields is not { Count: > 0 })
            return null;

        var metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (key, raw) in fields)
        {
            if (string.IsNullOrWhiteSpace(key) || MetadataCopyExcludedColumns.Contains(key))
                continue;
            if (raw is null || raw is DBNull)
                continue;

            var text = raw switch
            {
                string s => s.Trim(),
                DateTime dt => dt.ToString("O"),
                DateTimeOffset dto => dto.ToString("O"),
                _ => Convert.ToString(raw, CultureInfo.InvariantCulture)?.Trim()
            };
            if (string.IsNullOrWhiteSpace(text))
                continue;

            metadata[key.Trim()] = text;
        }

        return metadata.Count == 0 ? null : JsonSerializer.Serialize(metadata);
    }
}

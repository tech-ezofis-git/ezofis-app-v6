using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;
using SaaSApp.MultiTenancy;
using SaaSApp.Repository.Application;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.SharedKernel.Options;

namespace SaaSApp.Repository.Infrastructure.Services;

/// <summary>
/// PII field recommendations (via the agents) and the folder's extra PII field definitions,
/// stored in <c>repository."RepositoryPiiConfigurations"</c>. Reads, never writes, the existing
/// <c>PiiRedaction*</c> columns on <c>repository."Repositories"</c>.
/// </summary>
public sealed class RepositoryPiiFieldService : IRepositoryPiiFieldService
{
    private static readonly JsonSerializerOptions AgentJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static readonly JsonSerializerOptions StoreJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _httpClient;
    private readonly AgentsChatOptions _agentsChat;
    private readonly IStaticRepositoryProvisioner _provisioner;
    private readonly ITenantConnectionProvider _connectionProvider;
    private readonly ILogger<RepositoryPiiFieldService> _logger;

    public RepositoryPiiFieldService(
        HttpClient httpClient,
        IOptions<AgentsChatOptions> agentsChat,
        IStaticRepositoryProvisioner provisioner,
        ITenantConnectionProvider connectionProvider,
        ILogger<RepositoryPiiFieldService> logger)
    {
        _httpClient = httpClient;
        _agentsChat = agentsChat.Value;
        _provisioner = provisioner;
        _connectionProvider = connectionProvider;
        _logger = logger;
    }

    public async Task<PiiFieldRecommendationsResult?> RecommendAsync(
        Guid repositoryId,
        Guid tenantId,
        Guid? userId,
        PiiFieldRecommendationRequest request,
        CancellationToken cancellationToken = default)
    {
        var repo = await _provisioner.GetRepositoryAsync(repositoryId, tenantId, cancellationToken);
        if (repo == null)
            return null;

        await using var connection = await OpenAsync(cancellationToken);
        var stored = await ReadRowAsync(connection, repositoryId, cancellationToken);
        var selectedKeys = SelectedKeys(repo, stored);

        var categories = (request.DocumentCategories ?? Array.Empty<string>())
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(30)
            .ToList();
        var fingerprint = Fingerprint(repo, categories, request.IncludeContextualRecommendations, request.Model);

        if (!request.Regenerate
            && stored?.RecommendationFingerprint == fingerprint
            && TryReadCached(stored.RecommendationJson) is { } cached)
        {
            return cached with
            {
                Recommendations = MarkSelected(cached.Recommendations, selectedKeys),
                FromCache = true
            };
        }

        var body = new AgentRequest(
            tenantId.ToString("D"),
            repositoryId.ToString("D"),
            repo.Name,
            repo.Description,
            repo.Fields.Select(f => new AgentField(f.Id.ToString("D"), f.Name, f.DataType)).ToList(),
            categories,
            selectedKeys.ToList(),
            request.IncludeContextualRecommendations,
            string.IsNullOrWhiteSpace(request.Model) ? null : request.Model.Trim());

        var fieldsById = repo.Fields.ToDictionary(f => f.Id.ToString("D"), f => ((Guid?)f.Id, f.Name),
            StringComparer.OrdinalIgnoreCase);
        var result = await CallAgentsAsync(repositoryId, body, fieldsById, cancellationToken);
        var items = result.Recommendations;

        await SaveRecommendationAsync(connection, repositoryId, userId, fingerprint, result, cancellationToken);
        _logger.LogInformation(
            "PII field recommendations for repository {RepositoryId} by {UserId}: mode={Mode} count={Count}",
            repositoryId, userId, result.Mode, items.Count);

        return result with { Recommendations = MarkSelected(items, selectedKeys) };
    }

    public async Task<PiiFieldRecommendationsResult> RecommendForDraftAsync(
        Guid tenantId,
        Guid? userId,
        PiiFieldDraftRecommendationRequest request,
        CancellationToken cancellationToken = default)
    {
        var folderName = request.FolderName?.Trim() ?? string.Empty;
        if (folderName.Length == 0)
            throw new ArgumentException("Enter a folder name first.");

        // Draft fields have no ids yet: number them so the agents can point back at one.
        var fields = (request.Fields ?? Array.Empty<PiiDraftFieldDto>())
            .Where(f => !string.IsNullOrWhiteSpace(f?.FieldName))
            .Take(150)
            .Select((f, i) => new AgentField($"draft-{i}", f.FieldName.Trim(), f.DataType))
            .ToList();
        var categories = (request.DocumentCategories ?? Array.Empty<string>())
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim())
            .Take(30)
            .ToList();

        var body = new AgentRequest(
            tenantId.ToString("D"),
            "draft",
            folderName,
            request.FolderDescription,
            fields,
            categories,
            Array.Empty<string>(),
            request.IncludeContextualRecommendations,
            string.IsNullOrWhiteSpace(request.Model) ? null : request.Model.Trim());

        var fieldsById = fields.ToDictionary(f => f.FieldId, f => ((Guid?)null, f.FieldName));
        var result = await CallAgentsAsync(Guid.Empty, body, fieldsById, cancellationToken);
        _logger.LogInformation(
            "PII field recommendations for a draft folder by {UserId}: mode={Mode} count={Count}",
            userId, result.Mode, result.Recommendations.Count);
        return result;
    }

    public async Task<IReadOnlyList<PiiRedactionLabelDto>?> GetRedactionLabelsAsync(
        Guid repositoryId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var repo = await _provisioner.GetRepositoryAsync(repositoryId, tenantId, cancellationToken);
        if (repo == null)
            return null;
        if (!repo.PiiRedactionEnabled)
            return Array.Empty<PiiRedactionLabelDto>();

        await using var connection = await OpenAsync(cancellationToken);
        var row = await ReadRowAsync(connection, repositoryId, cancellationToken);
        return (row?.Fields ?? Array.Empty<PiiFieldDefinitionDto>())
            .Where(f => f.Enabled && !string.IsNullOrWhiteSpace(f.DisplayName))
            .Select(f => new PiiRedactionLabelDto(f.DisplayName, f.DetectionType))
            .ToList();
    }

    public async Task<RepositoryPiiConfigurationDto?> GetConfigurationAsync(
        Guid repositoryId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var repo = await _provisioner.GetRepositoryAsync(repositoryId, tenantId, cancellationToken);
        if (repo == null)
            return null;

        await using var connection = await OpenAsync(cancellationToken);
        return ToConfiguration(repo, await ReadRowAsync(connection, repositoryId, cancellationToken));
    }

    public async Task<RepositoryPiiConfigurationDto?> SaveConfigurationAsync(
        Guid repositoryId,
        Guid tenantId,
        Guid? userId,
        SaveRepositoryPiiConfigurationRequest request,
        CancellationToken cancellationToken = default)
    {
        var repo = await _provisioner.GetRepositoryAsync(repositoryId, tenantId, cancellationToken);
        if (repo == null)
            return null;

        var definitions = RepositoryPiiFieldRules.NormalizeDefinitions(request.AdditionalFields);
        var folderFieldKeys = repo.Fields
            .ToDictionary(f => RepositoryPiiFieldRules.NormalizeFieldKey(f.Name), f => f.Name);
        var clash = definitions.FirstOrDefault(d => folderFieldKeys.ContainsKey(d.FieldKey));
        if (clash != null)
        {
            throw new ArgumentException(
                $"'{folderFieldKeys[clash.FieldKey]}' is already a folder field. Select it under Sensitive Values to Redact instead.");
        }

        await using var connection = await OpenAsync(cancellationToken);
        await using var tx = await connection.BeginTransactionAsync(cancellationToken);

        await using (var ensureRow = new NpgsqlCommand("""
            INSERT INTO repository."RepositoryPiiConfigurations" ("RepositoryId", "CreatedBy")
            VALUES (@RepositoryId, @UserId)
            ON CONFLICT ("RepositoryId") DO NOTHING
            """, connection, tx))
        {
            ensureRow.Parameters.AddWithValue("@RepositoryId", repositoryId);
            ensureRow.Parameters.AddWithValue("@UserId", (object?)userId ?? DBNull.Value);
            await ensureRow.ExecuteNonQueryAsync(cancellationToken);
        }

        await using (var update = new NpgsqlCommand("""
            UPDATE repository."RepositoryPiiConfigurations"
            SET "ConfigurationVersion" = "ConfigurationVersion" + 1,
                "AdditionalFields" = @AdditionalFields,
                "UpdatedAtUtc" = now(),
                "UpdatedBy" = @UserId
            WHERE "RepositoryId" = @RepositoryId AND "ConfigurationVersion" = @ExpectedVersion
            RETURNING "ConfigurationVersion"
            """, connection, tx))
        {
            update.Parameters.AddWithValue("@RepositoryId", repositoryId);
            update.Parameters.AddWithValue("@ExpectedVersion", request.ConfigurationVersion);
            update.Parameters.AddWithValue("@UserId", (object?)userId ?? DBNull.Value);
            update.Parameters.Add(new NpgsqlParameter("@AdditionalFields", NpgsqlDbType.Jsonb)
            {
                Value = JsonSerializer.Serialize(definitions, StoreJson)
            });
            if (await update.ExecuteScalarAsync(cancellationToken) is not int)
            {
                await tx.RollbackAsync(cancellationToken);
                var current = await ReadRowAsync(connection, repositoryId, cancellationToken);
                throw new PiiConfigurationConflictException(current?.Version ?? 0);
            }
        }

        await tx.CommitAsync(cancellationToken);
        var row = await ReadRowAsync(connection, repositoryId, cancellationToken);
        _logger.LogInformation(
            "PII configuration for repository {RepositoryId} saved by {UserId}: version={Version} additionalFields={Count}",
            repositoryId, userId, row?.Version, definitions.Count);
        return ToConfiguration(repo, row);
    }

    /// <param name="fieldsById">Agent field id → (saved field id or null, folder field name).</param>
    private async Task<PiiFieldRecommendationsResult> CallAgentsAsync(
        Guid repositoryId,
        AgentRequest body,
        IReadOnlyDictionary<string, (Guid? Id, string Name)> fieldsById,
        CancellationToken cancellationToken)
    {
        var url = RepositoryPiiFieldRules.ResolveRecommendationUrl(_agentsChat.ResolveChatUrl())
            ?? throw new InvalidOperationException("Agents:ChatUrl is not configured, so PII suggestions are unavailable.");

        AgentResponse agent;
        try
        {
            using var response = await _httpClient.PostAsync(
                url,
                new StringContent(JsonSerializer.Serialize(body, AgentJson), Encoding.UTF8, "application/json"),
                cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new HttpRequestException($"agents returned {(int)response.StatusCode}");
            agent = JsonSerializer.Deserialize<AgentResponse>(
                        await response.Content.ReadAsStringAsync(cancellationToken), AgentJson)
                    ?? throw new JsonException("empty agents response");
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException
                                       && !cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "PII field recommendation call failed for repository {RepositoryId}.", repositoryId);
            throw new InvalidOperationException("The PII suggestion service is unavailable. Try again later.", ex);
        }

        var items = (agent.Recommendations ?? new List<AgentRecommendation>())
            .Select(r => ToDto(r, fieldsById))
            .Where(r => r != null)
            .Select(r => r!)
            .ToList();
        return new PiiFieldRecommendationsResult(
            repositoryId,
            items,
            string.IsNullOrWhiteSpace(agent.ModelVersion) ? "unknown" : agent.ModelVersion!,
            agent.Mode == "ai" ? "ai" : "fallback",
            agent.Warnings ?? new List<string>(),
            DateTime.UtcNow,
            FromCache: false);
    }

    private async Task<NpgsqlConnection> OpenAsync(CancellationToken cancellationToken)
    {
        var connectionString = _connectionProvider.ConnectionString
            ?? throw new InvalidOperationException("Tenant connection string not resolved.");
        var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);
        return connection;
    }

    /// <summary>Same DDL as <c>api/scripts/postgres/AddRepositoryPiiConfigurations.sql</c>.</summary>
    internal static async Task EnsureTableAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS repository."RepositoryPiiConfigurations" (
                "RepositoryId" uuid PRIMARY KEY,
                "ConfigurationVersion" integer NOT NULL DEFAULT 0,
                "AdditionalFields" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "LastRecommendationAtUtc" timestamptz NULL,
                "LastRecommendationModel" varchar(120) NULL,
                "LastRecommendationMode" varchar(20) NULL,
                "LastRecommendationFingerprint" varchar(64) NULL,
                "LastRecommendationJson" jsonb NULL,
                "CreatedAtUtc" timestamptz NOT NULL DEFAULT now(),
                "CreatedBy" uuid NULL,
                "UpdatedAtUtc" timestamptz NULL,
                "UpdatedBy" uuid NULL
            );
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<StoredRow?> ReadRowAsync(
        NpgsqlConnection connection,
        Guid repositoryId,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand("""
            SELECT "ConfigurationVersion", "AdditionalFields"::text, "UpdatedAtUtc", "UpdatedBy",
                   "LastRecommendationAtUtc", "LastRecommendationModel",
                   "LastRecommendationFingerprint", "LastRecommendationJson"::text
            FROM repository."RepositoryPiiConfigurations"
            WHERE "RepositoryId" = @RepositoryId
            """, connection);
        cmd.Parameters.AddWithValue("@RepositoryId", repositoryId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        IReadOnlyList<PiiFieldDefinitionDto> fields;
        try
        {
            fields = JsonSerializer.Deserialize<List<PiiFieldDefinitionDto>>(reader.GetString(1), StoreJson)
                     ?? new List<PiiFieldDefinitionDto>();
        }
        catch (JsonException)
        {
            fields = Array.Empty<PiiFieldDefinitionDto>();
        }

        return new StoredRow(
            reader.GetInt32(0),
            fields,
            reader.IsDBNull(2) ? null : reader.GetDateTime(2),
            reader.IsDBNull(3) ? null : reader.GetGuid(3),
            reader.IsDBNull(4) ? null : reader.GetDateTime(4),
            reader.IsDBNull(5) ? null : reader.GetString(5),
            reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.IsDBNull(7) ? null : reader.GetString(7));
    }

    private static async Task SaveRecommendationAsync(
        NpgsqlConnection connection,
        Guid repositoryId,
        Guid? userId,
        string fingerprint,
        PiiFieldRecommendationsResult result,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand("""
            INSERT INTO repository."RepositoryPiiConfigurations"
                ("RepositoryId", "CreatedBy", "LastRecommendationAtUtc", "LastRecommendationModel",
                 "LastRecommendationMode", "LastRecommendationFingerprint", "LastRecommendationJson")
            VALUES (@RepositoryId, @UserId, @At, @Model, @Mode, @Fingerprint, @Json)
            ON CONFLICT ("RepositoryId") DO UPDATE SET
                "LastRecommendationAtUtc" = EXCLUDED."LastRecommendationAtUtc",
                "LastRecommendationModel" = EXCLUDED."LastRecommendationModel",
                "LastRecommendationMode" = EXCLUDED."LastRecommendationMode",
                "LastRecommendationFingerprint" = EXCLUDED."LastRecommendationFingerprint",
                "LastRecommendationJson" = EXCLUDED."LastRecommendationJson"
            """, connection);
        cmd.Parameters.AddWithValue("@RepositoryId", repositoryId);
        cmd.Parameters.AddWithValue("@UserId", (object?)userId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@At", result.GeneratedAtUtc);
        cmd.Parameters.AddWithValue("@Model", Truncate(result.ModelVersion, 120));
        cmd.Parameters.AddWithValue("@Mode", result.Mode);
        cmd.Parameters.AddWithValue("@Fingerprint", fingerprint);
        cmd.Parameters.Add(new NpgsqlParameter("@Json", NpgsqlDbType.Jsonb)
        {
            Value = JsonSerializer.Serialize(result, StoreJson)
        });
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static RepositoryPiiConfigurationDto ToConfiguration(RepositoryDetailDto repo, StoredRow? row)
    {
        var selectedIds = repo.PiiRedactionFieldIds ?? Array.Empty<Guid>();
        var namesById = repo.Fields.ToDictionary(f => f.Id, f => f.Name);
        return new RepositoryPiiConfigurationDto(
            repo.Id,
            repo.PiiRedactionEnabled,
            selectedIds,
            selectedIds.Where(namesById.ContainsKey).Select(id => namesById[id]).ToList(),
            row?.Fields ?? Array.Empty<PiiFieldDefinitionDto>(),
            row?.Version ?? 0,
            row?.UpdatedAtUtc,
            row?.UpdatedBy,
            row?.RecommendationAtUtc,
            row?.RecommendationModel);
    }

    /// <summary>Selected folder field ids plus saved extra-field keys, for the already-selected flag.</summary>
    private static HashSet<string> SelectedKeys(RepositoryDetailDto repo, StoredRow? row)
    {
        var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var id in repo.PiiRedactionFieldIds ?? Array.Empty<Guid>())
            keys.Add(id.ToString("D"));
        foreach (var field in row?.Fields ?? Array.Empty<PiiFieldDefinitionDto>())
        {
            if (field.Enabled)
                keys.Add(field.FieldKey);
        }

        return keys;
    }

    private static IReadOnlyList<PiiFieldRecommendationDto> MarkSelected(
        IReadOnlyList<PiiFieldRecommendationDto> items,
        HashSet<string> selectedKeys) =>
        items.Select(r => r with
        {
            AlreadySelected = selectedKeys.Contains(r.FieldKey)
                              || (r.ExistingFieldId is { } id && selectedKeys.Contains(id.ToString("D")))
        }).ToList();

    private static PiiFieldRecommendationDto? ToDto(
        AgentRecommendation r,
        IReadOnlyDictionary<string, (Guid? Id, string Name)> fieldsById)
    {
        var key = RepositoryPiiFieldRules.NormalizeFieldKey(r.FieldKey);
        var detection = (r.DetectionType ?? string.Empty).Trim().ToUpperInvariant();
        if (key.Length == 0
            || string.IsNullOrWhiteSpace(r.DisplayName)
            || !RepositoryPiiFieldRules.DetectionTypes.Contains(detection)
            || !RepositoryPiiFieldRules.Categories.Contains(r.Category ?? string.Empty))
            return null;

        // Only ids the request contained count as folder fields.
        (Guid? Id, string Name) folderField = default;
        var isFolderField = !string.IsNullOrWhiteSpace(r.ExistingFieldId)
                            && fieldsById.TryGetValue(r.ExistingFieldId.Trim(), out folderField);
        return new PiiFieldRecommendationDto(
            key,
            Truncate(r.DisplayName.Trim(), 80),
            r.Category!,
            isFolderField ? "existing_metadata" : "ai_inferred",
            isFolderField ? folderField.Id : null,
            Math.Clamp(r.Confidence, 0, 1),
            r.Recommended,
            detection,
            Truncate(r.Reason?.Trim() ?? string.Empty, 200),
            AlreadySelected: false,
            ExistingFieldName: isFolderField ? folderField.Name : null);
    }

    private static PiiFieldRecommendationsResult? TryReadCached(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;
        try
        {
            return JsonSerializer.Deserialize<PiiFieldRecommendationsResult>(json, StoreJson);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>Changes whenever the folder definition or the request options change.</summary>
    private static string Fingerprint(
        RepositoryDetailDto repo,
        IReadOnlyList<string> categories,
        bool includeContextual,
        string? model)
    {
        var sb = new StringBuilder()
            .Append(repo.Name).Append('\u001f')
            .Append(repo.Description).Append('\u001f')
            .Append(includeContextual).Append('\u001f')
            .Append(model?.Trim()).Append('\u001f');
        foreach (var field in repo.Fields.OrderBy(f => f.Id))
            sb.Append(field.Id).Append(':').Append(field.Name).Append(':').Append(field.DataType).Append('\u001e');
        foreach (var category in categories.OrderBy(c => c, StringComparer.OrdinalIgnoreCase))
            sb.Append(category.ToLowerInvariant()).Append('\u001e');
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sb.ToString())));
    }

    private static string Truncate(string value, int limit) => value.Length > limit ? value[..limit] : value;

    private sealed record StoredRow(
        int Version,
        IReadOnlyList<PiiFieldDefinitionDto> Fields,
        DateTime? UpdatedAtUtc,
        Guid? UpdatedBy,
        DateTime? RecommendationAtUtc,
        string? RecommendationModel,
        string? RecommendationFingerprint,
        string? RecommendationJson);

    private sealed record AgentField(string FieldId, string FieldName, string? DataType);

    private sealed record AgentRequest(
        string TenantId,
        string FolderId,
        string FolderName,
        string? FolderDescription,
        IReadOnlyList<AgentField> Fields,
        IReadOnlyList<string> DocumentCategories,
        IReadOnlyList<string> ExistingSelectedKeys,
        bool IncludeContextual,
        string? Model);

    private sealed class AgentRecommendation
    {
        public string? FieldKey { get; set; }
        public string? DisplayName { get; set; }
        public string? Category { get; set; }
        public string? ExistingFieldId { get; set; }
        public double Confidence { get; set; }
        public bool Recommended { get; set; } = true;
        public string? DetectionType { get; set; }
        public string? Reason { get; set; }
    }

    private sealed class AgentResponse
    {
        public List<AgentRecommendation>? Recommendations { get; set; }
        public string? ModelVersion { get; set; }
        public string? Mode { get; set; }
        public List<string>? Warnings { get; set; }
    }
}

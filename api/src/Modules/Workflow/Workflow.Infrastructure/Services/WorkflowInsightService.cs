using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;
using SaaSApp.SharedKernel.Options;
using SaaSApp.Workflow.Application.Contracts;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// AI Insights for workflow transactions. Builds a short context for the step the instance is on now,
/// asks agents <c>/chat</c> (<c>intent=insight</c>) for two short lines (what stands out, what to do next)
/// and stores them in <c>workflow.workflow_insights_{suffix}</c> for each user who owns the step.
/// </summary>
public sealed class WorkflowInsightService : IWorkflowInsightService
{
    private const int MaxFormDataChars = 6000;
    private const int MaxHistoryRows = 10;
    private const int MaxAssignees = 20;
    private const string MissingTableSqlState = "42P01";

    private static readonly System.Text.RegularExpressions.Regex HtmlTag =
        new("<[^>]*>", System.Text.RegularExpressions.RegexOptions.Compiled);
    private static readonly System.Text.RegularExpressions.Regex Whitespace =
        new(@"\s+", System.Text.RegularExpressions.RegexOptions.Compiled);

    private const string StyleRules =
        "Write exactly 2 insights, each at most 12 words. Plain text only: no HTML tags, no markdown, no quotes. " +
        "Never mention the workflow name, the step name, or the words 'request' or 'step owner'. ";

    private const string Instruction =
        StyleRules +
        "Base them mainly on submitted_data: use the concrete values filled in (amount, category, dates, " +
        "missing or unusual fields). " +
        "Insight 1: the key facts that stand out. " +
        "Insight 2: the action to take now, starting with a verb and choosing from available_actions " +
        "(for example: Approve after checking the receipt). " +
        "If submitted_data has few or no filled fields, make Insight 1 a few words and make Insight 2 " +
        "say which action or missing information is needed.";

    private const string CompletedInstruction =
        StyleRules +
        "This is finished. Base them on submitted_data and history. " +
        "Insight 1: the final outcome (for example approved or rejected) with the key values. " +
        "Insight 2: the follow-up action needed, or 'No further action needed'.";

    private readonly ITenantContext _tenantContext;
    private readonly IWorkflowRepository _repository;
    private readonly IWorkflowTableCreator _tableCreator;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AgentsChatOptions _agentsChat;
    private readonly ILogger<WorkflowInsightService> _logger;

    public WorkflowInsightService(
        ITenantContext tenantContext,
        IWorkflowRepository repository,
        IWorkflowTableCreator tableCreator,
        IHttpClientFactory httpClientFactory,
        IOptions<AgentsChatOptions> agentsChat,
        ILogger<WorkflowInsightService> logger)
    {
        _tenantContext = tenantContext;
        _repository = repository;
        _tableCreator = tableCreator;
        _httpClientFactory = httpClientFactory;
        _agentsChat = agentsChat.Value;
        _logger = logger;
    }

    public async Task GenerateAsync(WorkflowInsightGenerateRequest request, CancellationToken cancellationToken = default)
    {
        var connectionString = _tenantContext.ConnectionString
            ?? throw new InvalidOperationException("Tenant connection string not resolved.");
        var chatUrl = _agentsChat.ResolveChatUrl();
        if (string.IsNullOrWhiteSpace(chatUrl))
        {
            _logger.LogInformation("AI insight skipped: Agents:ChatUrl is not configured.");
            return;
        }

        var suffix = request.WorkflowId.ToString("N")[..8];
        await _tableCreator.EnsureWorkflowInsightsTableAsync(request.WorkflowId, connectionString, cancellationToken);

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var completed = request.Trigger == WorkflowInsightTrigger.Completed;
        var owner = await LoadStepOwnerAsync(connection, suffix, request.InstanceId, completed, cancellationToken);
        if (owner is null)
        {
            _logger.LogInformation(
                "AI insight skipped for instance {InstanceId}: no {Mailbox} row (no user to show it to).",
                request.InstanceId,
                completed ? "completed" : "open inbox");
            return;
        }

        // Completed rows can carry the last user step's activity id, so never dedupe those against the earlier insight.
        if (request.Trigger is not (WorkflowInsightTrigger.Manual or WorkflowInsightTrigger.Completed)
            && await HasCurrentInsightAsync(connection, suffix, request.InstanceId, owner.ActivityId, cancellationToken))
            return;

        var workflow = await _repository.GetByIdWithStepsAsync(request.WorkflowId, cancellationToken);
        var step = workflow?.Steps.FirstOrDefault(s =>
            !string.IsNullOrWhiteSpace(s.ActivityId)
            && string.Equals(s.ActivityId, owner.ActivityId, StringComparison.OrdinalIgnoreCase));
        var history = await LoadHistoryAsync(connection, suffix, request.InstanceId, cancellationToken);

        var insightJson = new Dictionary<string, object?>
        {
            ["workflow"] = workflow?.Name,
            ["request_no"] = owner.ReferenceNumber,
            ["current_step"] = new { name = step?.Name ?? owner.Stage, stage_type = owner.StageType },
            ["request_status"] = completed ? "Completed" : "In progress",
            ["available_actions"] = completed ? null : ParseJsonOrText(step?.ActionsJson, 1500),
            ["submitted_data"] = ParseJsonOrText(owner.FormData, MaxFormDataChars),
            ["history"] = history,
            ["user_input"] = string.IsNullOrWhiteSpace(request.UserInput) ? null : request.UserInput.Trim()
        };

        var area = $"Workflow request: {workflow?.Name} - {step?.Name ?? owner.Stage}";
        var body = JsonSerializer.Serialize(new
        {
            session_id = $"wf-insight-{request.InstanceId:N}",
            intent = "insight",
            message = "Generate AI insight for workflow request",
            instruction = completed ? CompletedInstruction : Instruction,
            payload = new { insights_count = 2, insight_area = area, insight_json = insightJson }
        });

        string? summary = null;
        string? nextAction = null;
        string? error = null;
        string? rawInsights = null;
        try
        {
            var lines = await CallAgentAsync(chatUrl, body, cancellationToken);
            if (lines.Count == 0)
                error = "Agent returned no insights.";
            else
            {
                summary = lines[0];
                nextAction = lines.Count > 1 ? lines[1] : null;
                rawInsights = JsonSerializer.Serialize(lines);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            error = ex.Message.Length > 500 ? ex.Message[..500] : ex.Message;
            _logger.LogWarning(ex, "AI insight agent call failed for instance {InstanceId}.", request.InstanceId);
        }

        await StoreAsync(
            connection, suffix, request, owner, completed ? "Completed" : step?.Name ?? owner.Stage,
            summary, nextAction, rawInsights, error, cancellationToken);
    }

    public async Task<IReadOnlyDictionary<string, WorkflowInsightDto>> GetCurrentAsync(
        Guid workflowId,
        IReadOnlyCollection<string> instanceIds,
        Guid? preferUserId = null,
        CancellationToken cancellationToken = default)
    {
        var result = new Dictionary<string, WorkflowInsightDto>(StringComparer.OrdinalIgnoreCase);
        var ids = instanceIds
            .Select(x => Guid.TryParse(x, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .Distinct()
            .ToArray();
        var connectionString = _tenantContext.ConnectionString;
        if (ids.Length == 0 || string.IsNullOrWhiteSpace(connectionString))
            return result;

        var suffix = workflowId.ToString("N")[..8];
        var sql = $@"
SELECT DISTINCT ON (workflow_instance_id)
    workflow_instance_id, summary, next_action, status, step_name, assignee_user_id, created_at_utc
FROM workflow.workflow_insights_{suffix}
WHERE is_deleted = false AND is_current = true AND status = 'Ready'
  AND workflow_instance_id = ANY(@ids)
ORDER BY workflow_instance_id,
         (assignee_user_id IS NOT DISTINCT FROM @uid) DESC,
         created_at_utc DESC;";
        try
        {
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);
            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.Add(new NpgsqlParameter("ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = ids });
            cmd.Parameters.Add(new NpgsqlParameter("uid", NpgsqlDbType.Uuid) { Value = (object?)preferUserId ?? DBNull.Value });
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var instanceId = reader.GetGuid(0).ToString("D");
                result[instanceId] = new WorkflowInsightDto(
                    reader.IsDBNull(1) ? null : reader.GetString(1),
                    reader.IsDBNull(2) ? null : reader.GetString(2),
                    reader.GetString(3),
                    reader.IsDBNull(4) ? null : reader.GetString(4),
                    reader.IsDBNull(5) ? null : reader.GetGuid(5).ToString("D"),
                    reader.IsDBNull(6) ? null : reader.GetDateTime(6));
            }
        }
        catch (PostgresException ex) when (ex.SqlState == MissingTableSqlState)
        {
            // Workflow has no insights table yet (created on first insert or next workflow save).
        }

        return result;
    }

    private sealed record StepOwner(
        string ActivityId,
        string? Stage,
        string? StageType,
        string? ReferenceNumber,
        string? TransactionId,
        string? FormData,
        IReadOnlyList<Guid> Assignees);

    /// <summary>
    /// Open inbox rows for the instance's current activity, or, for a completed request, its completed rows
    /// (every user who has one). Retried briefly in case the move is still committing.
    /// </summary>
    private static async Task<StepOwner?> LoadStepOwnerAsync(
        NpgsqlConnection connection,
        string suffix,
        Guid instanceId,
        bool completed,
        CancellationToken cancellationToken)
    {
        var mailbox = completed ? "completed" : "inbox";
        var sql = $@"
SELECT user_id, activity_id, stage, stage_type, reference_number, transaction_id, form_data
FROM workflow.{mailbox}_{suffix}
WHERE workflow_instance_id = @iid
ORDER BY id DESC;";

        for (var attempt = 0; attempt < 3; attempt++)
        {
            if (attempt > 0)
                await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);

            try
            {
                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("iid", instanceId.ToString("D"));
                await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

                string? activityId = null, stage = null, stageType = null, reference = null, transactionId = null, formData = null;
                var assignees = new List<Guid>();
                while (await reader.ReadAsync(cancellationToken))
                {
                    var rowActivity = reader.IsDBNull(1) ? null : reader.GetString(1);
                    if (string.IsNullOrWhiteSpace(rowActivity))
                        continue;
                    if (activityId is null)
                    {
                        activityId = rowActivity;
                        stage = reader.IsDBNull(2) ? null : reader.GetString(2);
                        stageType = reader.IsDBNull(3) ? null : reader.GetString(3);
                        reference = reader.IsDBNull(4) ? null : reader.GetString(4);
                        transactionId = reader.IsDBNull(5) ? null : reader.GetString(5);
                        formData = reader.IsDBNull(6) ? null : reader.GetString(6);
                    }

                    if (!completed && !string.Equals(rowActivity, activityId, StringComparison.OrdinalIgnoreCase))
                        continue;
                    if (!reader.IsDBNull(0) && Guid.TryParse(reader.GetString(0), out var userId)
                        && !assignees.Contains(userId) && assignees.Count < MaxAssignees)
                        assignees.Add(userId);
                }

                if (activityId is not null)
                    return new StepOwner(activityId, stage, stageType, reference, transactionId, formData, assignees);
            }
            catch (PostgresException ex) when (ex.SqlState == MissingTableSqlState)
            {
                return null;
            }
        }

        return null;
    }

    private static async Task<bool> HasCurrentInsightAsync(
        NpgsqlConnection connection,
        string suffix,
        Guid instanceId,
        string activityId,
        CancellationToken cancellationToken)
    {
        var sql = $@"SELECT EXISTS (SELECT 1 FROM workflow.workflow_insights_{suffix}
WHERE workflow_instance_id = @iid AND activity_id = @aid AND is_current = true AND status = 'Ready' AND is_deleted = false);";
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("iid", instanceId);
        cmd.Parameters.AddWithValue("aid", activityId);
        return (bool)(await cmd.ExecuteScalarAsync(cancellationToken))!;
    }

    private static async Task<List<object>> LoadHistoryAsync(
        NpgsqlConnection connection,
        string suffix,
        Guid instanceId,
        CancellationToken cancellationToken)
    {
        var rows = new List<object>();
        var sql = $@"
SELECT stage_name, stage_type, review, created_at
FROM workflow.transaction_{suffix}
WHERE workflow_instance_id = @iid AND is_deleted = false
ORDER BY id DESC LIMIT {MaxHistoryRows};";
        try
        {
            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("iid", instanceId);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                rows.Add(new
                {
                    step = reader.IsDBNull(0) ? null : reader.GetString(0),
                    stage_type = reader.IsDBNull(1) ? null : reader.GetString(1),
                    review = reader.IsDBNull(2) ? null : reader.GetString(2),
                    at = reader.GetDateTime(3)
                });
            }
        }
        catch (PostgresException ex) when (ex.SqlState == MissingTableSqlState)
        {
        }

        rows.Reverse();
        return rows;
    }

    private async Task<List<string>> CallAgentAsync(string chatUrl, string body, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient(nameof(WorkflowInsightService));
        using var content = new StringContent(body, Encoding.UTF8, "application/json");
        using var response = await client.PostAsync(chatUrl, content, cancellationToken);
        var text = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Agents /chat returned {(int)response.StatusCode}: {Truncate(text, 300)}");

        using var doc = JsonDocument.Parse(text);
        var lines = new List<string>();
        if (doc.RootElement.TryGetProperty("insight_result", out var result)
            && result.ValueKind == JsonValueKind.Object
            && result.TryGetProperty("insights", out var insights)
            && insights.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in insights.EnumerateArray())
            {
                var line = item.ValueKind == JsonValueKind.String ? item.GetString() : null;
                // The agent wraps highlights in <mark>; store plain text only.
                // Single line: collapse any line breaks or repeated spaces.
                line = line is null
                    ? null
                    : Whitespace.Replace(HtmlTag.Replace(line, string.Empty), " ").Trim();
                if (!string.IsNullOrWhiteSpace(line))
                    lines.Add(line);
            }
        }

        return lines;
    }

    private async Task StoreAsync(
        NpgsqlConnection connection,
        string suffix,
        WorkflowInsightGenerateRequest request,
        StepOwner owner,
        string? stepName,
        string? summary,
        string? nextAction,
        string? insightJson,
        string? error,
        CancellationToken cancellationToken)
    {
        var failed = error is not null;
        await using var tx = await connection.BeginTransactionAsync(cancellationToken);

        var version = 1;
        await using (var versionCmd = new NpgsqlCommand(
            $"SELECT COALESCE(MAX(version), 0) + 1 FROM workflow.workflow_insights_{suffix} WHERE workflow_instance_id = @iid;",
            connection, tx))
        {
            versionCmd.Parameters.AddWithValue("iid", request.InstanceId);
            version = Convert.ToInt32(await versionCmd.ExecuteScalarAsync(cancellationToken));
        }

        if (!failed)
        {
            await using var retire = new NpgsqlCommand(
                $"UPDATE workflow.workflow_insights_{suffix} SET is_current = false WHERE workflow_instance_id = @iid AND is_current = true;",
                connection, tx);
            retire.Parameters.AddWithValue("iid", request.InstanceId);
            await retire.ExecuteNonQueryAsync(cancellationToken);
        }

        var assignees = owner.Assignees.Count > 0 ? owner.Assignees.Select(a => (Guid?)a).ToList() : new List<Guid?> { null };
        foreach (var assignee in assignees)
        {
            await using var insert = new NpgsqlCommand($@"
INSERT INTO workflow.workflow_insights_{suffix}
 (tenant_id, workflow_id, workflow_instance_id, transaction_id, activity_id, stage_type, step_name, assignee_user_id,
  trigger_type, version, is_current, status, user_input, summary, next_action, insight_json, error_message, created_by, completed_at_utc)
VALUES
 (@tid, @wid, @iid, @txn, @aid, @stype, @sname, @assignee,
  @trigger, @version, @current, @status, @uinput, @summary, @next, @json, @error, @by, now());",
                connection, tx);
            insert.Parameters.AddWithValue("tid", request.TenantId);
            insert.Parameters.AddWithValue("wid", request.WorkflowId);
            insert.Parameters.AddWithValue("iid", request.InstanceId);
            insert.Parameters.AddWithValue("txn", (object?)owner.TransactionId ?? DBNull.Value);
            insert.Parameters.AddWithValue("aid", owner.ActivityId);
            insert.Parameters.AddWithValue("stype", (object?)owner.StageType ?? DBNull.Value);
            insert.Parameters.AddWithValue("sname", (object?)stepName ?? DBNull.Value);
            insert.Parameters.Add(new NpgsqlParameter("assignee", NpgsqlDbType.Uuid) { Value = (object?)assignee ?? DBNull.Value });
            insert.Parameters.AddWithValue("trigger", request.Trigger);
            insert.Parameters.AddWithValue("version", version);
            insert.Parameters.AddWithValue("current", !failed);
            insert.Parameters.AddWithValue("status", failed ? "Failed" : "Ready");
            insert.Parameters.AddWithValue("uinput", (object?)request.UserInput ?? DBNull.Value);
            insert.Parameters.AddWithValue("summary", (object?)summary ?? DBNull.Value);
            insert.Parameters.AddWithValue("next", (object?)nextAction ?? DBNull.Value);
            insert.Parameters.AddWithValue("json", (object?)insightJson ?? DBNull.Value);
            insert.Parameters.AddWithValue("error", (object?)error ?? DBNull.Value);
            insert.Parameters.AddWithValue("by", request.UserId);
            await insert.ExecuteNonQueryAsync(cancellationToken);
        }

        await tx.CommitAsync(cancellationToken);
        _logger.LogInformation(
            "AI insight {Status} for workflow {WorkflowId} instance {InstanceId} step {Step} ({Count} assignee row(s)).",
            failed ? "failed" : "stored", request.WorkflowId, request.InstanceId, stepName, assignees.Count);
    }

    /// <summary>Parses JSON text into a JSON value so the agent sees structure; falls back to truncated text.</summary>
    private static object? ParseJsonOrText(string? value, int maxChars)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        try
        {
            using var doc = JsonDocument.Parse(value);
            var raw = doc.RootElement.GetRawText();
            return raw.Length <= maxChars ? doc.RootElement.Clone() : Truncate(raw, maxChars);
        }
        catch (JsonException)
        {
            return Truncate(value, maxChars);
        }
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength] + "...";
}

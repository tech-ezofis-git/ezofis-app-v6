using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.Workflow.Application;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Application.Workflows;
using SaaSApp.Workflow.Domain.Entities;
using SaaSApp.Workflow.Infrastructure.Options;

namespace SaaSApp.Workflow.Infrastructure.Services;

/// <summary>
/// Dynamic User (Form Input): works out who a stage belongs to from the form field chosen in the designer, for this
/// request only. Existing tenant users are reused untouched; a missing one gets an account only when the tenant allows it.
/// </summary>
public sealed class WorkflowDynamicAssigneeService : IWorkflowDynamicAssigneeService
{
    private readonly ITenantContext _tenantContext;
    private readonly IWorkflowJsonStorageService _jsonStorage;
    private readonly IWorkflowLegacyMailboxSyncService _mailboxSync;
    private readonly IShareGuestUserProvisioningService _userProvisioning;
    private readonly IWorkflowSecurityService _workflowSecurity;
    private readonly WorkflowDynamicUserOptions _options;
    private readonly ILogger<WorkflowDynamicAssigneeService> _logger;

    public WorkflowDynamicAssigneeService(
        ITenantContext tenantContext,
        IWorkflowJsonStorageService jsonStorage,
        IWorkflowLegacyMailboxSyncService mailboxSync,
        IShareGuestUserProvisioningService userProvisioning,
        IWorkflowSecurityService workflowSecurity,
        IOptions<WorkflowDynamicUserOptions> options,
        ILogger<WorkflowDynamicAssigneeService> logger)
    {
        _tenantContext = tenantContext;
        _jsonStorage = jsonStorage;
        _mailboxSync = mailboxSync;
        _userProvisioning = userProvisioning;
        _workflowSecurity = workflowSecurity;
        _options = options.Value;
        _logger = logger;
    }

    internal sealed record StepSettings(bool IsDynamicUserEnabled, string? FieldId, bool IsStaticUserEnabled);

    private sealed record FieldControl(string? JsonId, string? Name, string? ColumnName);

    public async Task ValidateStartAsync(
        Guid workflowId,
        IReadOnlyList<WorkflowStep> orderedSteps,
        IReadOnlyDictionary<string, string>? formDataFields,
        CancellationToken cancellationToken = default)
    {
        var startStep = orderedSteps.FirstOrDefault();
        if (startStep == null)
            return;

        var review = WorkflowStartBootstrapService.ResolveStartProceedReview(startStep);
        var nextStep = WorkflowStepActionsHelper.ResolveNextStepByReview(startStep, review, orderedSteps)
            ?? orderedSteps.FirstOrDefault(s => s.Order > startStep.Order);
        if (nextStep == null || WorkflowLegacyTransactionSyncService.IsEndStage(nextStep))
            return;

        var settings = await LoadStepSettingsAsync(workflowId, nextStep, cancellationToken);
        if (settings is not { IsDynamicUserEnabled: true })
            return;

        var hasStaticFallback = settings.IsStaticUserEnabled && nextStep.GetApproverIds().Count > 0;
        if (string.IsNullOrWhiteSpace(settings.FieldId))
        {
            if (hasStaticFallback)
                return;
            throw NoFieldConfigured(nextStep);
        }

        var tenantId = RequireTenantId();
        await using var connection = await OpenConnectionAsync();

        var formId = await ReadWorkflowFormIdAsync(connection, workflowId, cancellationToken);
        var control = await LoadControlAsync(connection, formId, settings.FieldId, cancellationToken);
        var label = control?.Name?.Trim();

        string? raw = null;
        if (formDataFields != null)
        {
            foreach (var key in CandidateKeys(settings.FieldId, control))
            {
                var match = formDataFields.FirstOrDefault(f => f.Key.Equals(key, StringComparison.OrdinalIgnoreCase));
                if (match.Key != null)
                {
                    raw = match.Value;
                    break;
                }
            }
        }

        var parsed = WorkflowDynamicUserEmailParser.Parse(raw);
        ThrowIfInvalid(parsed, label);
        if (parsed.Emails.Count == 0)
        {
            if (hasStaticFallback)
                return;
            throw NoEmailValue(label, nextStep);
        }

        if (_options.IsAutoProvisionAllowed(tenantId))
            return;

        foreach (var email in parsed.Emails)
        {
            if (await FindTenantUserIdAsync(connection, tenantId, email, cancellationToken) == null)
                throw NoAccount(email);
        }
    }

    /// <summary>
    /// The people for this stage on this request, or null when the stage is not Dynamic User (or falls back to its
    /// static users), so the existing assignee logic carries on as before. Throws, before anything has changed, when
    /// the stage cannot be assigned. Safe to retry: nothing is created twice.
    /// </summary>
    internal async Task<IReadOnlyList<Guid>?> ResolveAsync(
        NpgsqlConnection connection,
        Guid workflowId,
        Guid workflowInstanceId,
        WorkflowStep step,
        MailboxFormSnapshot? mailboxForm,
        Guid actingUserId,
        CancellationToken cancellationToken)
    {
        var settings = await LoadStepSettingsAsync(workflowId, step, cancellationToken);
        if (settings is not { IsDynamicUserEnabled: true })
            return null;

        var staticUsers = settings.IsStaticUserEnabled ? step.GetApproverIds() : Array.Empty<Guid>();
        if (string.IsNullOrWhiteSpace(settings.FieldId))
        {
            if (staticUsers.Count > 0)
                return null;
            throw NoFieldConfigured(step);
        }

        var tenantId = RequireTenantId();

        var formId = mailboxForm?.FormId;
        var formEntryId = mailboxForm?.FormEntryId;
        if (string.IsNullOrWhiteSpace(formId) || formEntryId is null || formEntryId == Guid.Empty)
        {
            var process = await _mailboxSync.TryGetProcessFormIdentityAsync(workflowId, workflowInstanceId, cancellationToken);
            if (string.IsNullOrWhiteSpace(formId))
                formId = process?.FormId;
            if (formEntryId is null || formEntryId == Guid.Empty)
                formEntryId = process?.FormEntryId;
        }

        if (string.IsNullOrWhiteSpace(formId))
            formId = await ReadWorkflowFormIdAsync(connection, workflowId, cancellationToken);

        var control = await LoadControlAsync(connection, formId, settings.FieldId, cancellationToken);
        var label = control?.Name?.Trim();

        var parsed = await ReadSubmittedEmailsAsync(
            connection, settings.FieldId, control, mailboxForm?.FormDataJson, formId, formEntryId, cancellationToken);

        ThrowIfInvalid(parsed, label);
        if (parsed.Emails.Count == 0)
        {
            if (staticUsers.Count > 0)
                return null;
            throw NoEmailValue(label, step);
        }

        var users = new List<Guid>();
        foreach (var email in parsed.Emails)
        {
            var userId = await FindOrProvisionUserAsync(connection, tenantId, email, cancellationToken);
            if (!users.Contains(userId))
                users.Add(userId);
        }

        foreach (var staticUser in staticUsers)
        {
            if (!users.Contains(staticUser))
                users.Add(staticUser);
        }

        foreach (var userId in users)
            await _workflowSecurity.EnsureUserWorkflowAccessAsync(workflowId, userId, actingUserId, cancellationToken);

        _logger.LogInformation(
            "Dynamic User stage {StepName} on instance {InstanceId} resolved to {Count} assignee(s).",
            step.Name,
            workflowInstanceId,
            users.Count);
        return users;
    }

    internal static StepSettings? ReadStepSettings(string? workflowJson, WorkflowStep step)
    {
        if (string.IsNullOrWhiteSpace(workflowJson))
            return null;

        var activityId = !string.IsNullOrWhiteSpace(step.ActivityId) ? step.ActivityId.Trim() : step.Id.ToString("D");
        try
        {
            using var doc = JsonDocument.Parse(workflowJson);
            if (!TryGet(doc.RootElement, "blocks", out var blocks) || blocks.ValueKind != JsonValueKind.Array)
                return null;

            foreach (var block in blocks.EnumerateArray())
            {
                if (!TryGet(block, "id", out var id)
                    || !string.Equals(id.ToString(), activityId, StringComparison.OrdinalIgnoreCase)
                    || !TryGet(block, "settings", out var settings))
                    continue;

                var fieldId = TryGet(settings, "dynamicUserField", out var field)
                    && field.ValueKind == JsonValueKind.String
                        ? field.GetString()?.Trim()
                        : null;
                return new StepSettings(
                    IsTrue(settings, "isDynamicUserEnabled"),
                    fieldId,
                    IsTrue(settings, "isUserEnabled"));
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    /// <summary>The value on the request, never the form template's default. Latest submit first, then the saved entry.</summary>
    private static async Task<WorkflowDynamicUserEmails> ReadSubmittedEmailsAsync(
        NpgsqlConnection connection,
        string fieldId,
        FieldControl? control,
        string? submittedJson,
        string? formId,
        Guid? formEntryId,
        CancellationToken cancellationToken)
    {
        var keys = CandidateKeys(fieldId, control);

        if (TryReadField(submittedJson, keys, out var submitted))
            return submitted;

        if (!string.IsNullOrWhiteSpace(formId) && formEntryId is { } entryId && entryId != Guid.Empty)
        {
            var saved = await WorkflowEzfbFormDataLoader.LoadFormDataJsonAsync(connection, formId, entryId, cancellationToken);
            if (TryReadField(saved, keys, out var fromEntry))
                return fromEntry;
        }

        return new WorkflowDynamicUserEmails([], []);
    }

    private static bool TryReadField(string? formJson, IReadOnlyList<string> keys, out WorkflowDynamicUserEmails emails)
    {
        emails = new WorkflowDynamicUserEmails([], []);
        if (string.IsNullOrWhiteSpace(formJson))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(formJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return false;

            foreach (var key in keys)
            {
                if (TryGet(doc.RootElement, key, out var value))
                {
                    emails = WorkflowDynamicUserEmailParser.Parse(value);
                    return true;
                }
            }
        }
        catch (JsonException)
        {
            return false;
        }

        return false;
    }

    private static IReadOnlyList<string> CandidateKeys(string fieldId, FieldControl? control)
    {
        var keys = new List<string> { fieldId };
        foreach (var key in new[] { control?.JsonId, control?.Name, control?.ColumnName })
        {
            if (!string.IsNullOrWhiteSpace(key) && !keys.Contains(key.Trim(), StringComparer.OrdinalIgnoreCase))
                keys.Add(key.Trim());
        }

        return keys;
    }

    private async Task<Guid> FindOrProvisionUserAsync(
        NpgsqlConnection connection,
        Guid tenantId,
        string email,
        CancellationToken cancellationToken)
    {
        var existing = await FindTenantUserIdAsync(connection, tenantId, email, cancellationToken);
        if (existing is Guid existingId)
            return existingId;

        if (!_options.IsAutoProvisionAllowed(tenantId))
            throw NoAccount(email);

        // Users has no unique index on email, so two requests naming the same new person must take turns.
        var lockKey = $"workflow-dynamic-user:{tenantId:N}:{email}";
        await SetAdvisoryLockAsync(connection, lockKey, acquire: true, cancellationToken);
        try
        {
            existing = await FindTenantUserIdAsync(connection, tenantId, email, cancellationToken);
            if (existing is Guid createdMeanwhile)
                return createdMeanwhile;

            // Least privilege, no password: the same guest account as Share File. It cannot sign in until it is set up.
            var created = await _userProvisioning.EnsureGuestUserAsync(tenantId, email, externalOnly: false, cancellationToken);
            _logger.LogInformation("Dynamic User stage created tenant user {UserId}.", created.UserId);
            return created.UserId;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Dynamic User stage could not create a tenant user.");
            throw new WorkflowDynamicAssignmentException(
                $"An account could not be created for {email}. Please try again or contact your administrator.",
                ex);
        }
        finally
        {
            await SetAdvisoryLockAsync(connection, lockKey, acquire: false, CancellationToken.None);
        }
    }

    private static async Task SetAdvisoryLockAsync(
        NpgsqlConnection connection,
        string key,
        bool acquire,
        CancellationToken cancellationToken)
    {
        var function = acquire ? "pg_advisory_lock" : "pg_advisory_unlock";
        await using var cmd = new NpgsqlCommand($"SELECT {function}(hashtextextended(@Key, 0));", connection);
        cmd.Parameters.AddWithValue("@Key", key);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<Guid?> FindTenantUserIdAsync(
        NpgsqlConnection connection,
        Guid tenantId,
        string email,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT "Id"
            FROM users."Users"
            WHERE "TenantId" = @TenantId AND "IsDeleted" = false AND LOWER("Email") = @Email
            ORDER BY "CreatedAtUtc"
            LIMIT 1;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@TenantId", tenantId);
        cmd.Parameters.AddWithValue("@Email", email);
        return await cmd.ExecuteScalarAsync(cancellationToken) is Guid id && id != Guid.Empty ? id : null;
    }

    private static async Task<FieldControl?> LoadControlAsync(
        NpgsqlConnection connection,
        string? formId,
        string fieldId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(formId))
            return null;

        // Older forms may predate this column (same guard as WorkflowEzfbFormDataLoader).
        await using (var alter = new NpgsqlCommand(
            """ALTER TABLE dbo."wFormControl" ADD COLUMN IF NOT EXISTS "columnName" varchar(200) NULL;""",
            connection))
            await alter.ExecuteNonQueryAsync(cancellationToken);

        const string sql = """
            SELECT "jsonId", name, "columnName"
            FROM dbo."wFormControl"
            WHERE "isDeleted" = false AND "wFormId" = @FormId AND "jsonId" = @FieldId
            LIMIT 1;
            """;
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@FormId", FormIdNaming.NormalizeFormId(formId));
        cmd.Parameters.AddWithValue("@FieldId", fieldId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return new FieldControl(
            reader.IsDBNull(0) ? null : reader.GetString(0),
            reader.IsDBNull(1) ? null : reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetString(2));
    }

    private static async Task<string?> ReadWorkflowFormIdAsync(
        NpgsqlConnection connection,
        Guid workflowId,
        CancellationToken cancellationToken)
    {
        const string sql = """SELECT "FormId" FROM workflow."Workflows" WHERE "Id" = @WorkflowId AND "IsDeleted" = false;""";
        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@WorkflowId", workflowId);
        var value = await cmd.ExecuteScalarAsync(cancellationToken);
        return value == null || value == DBNull.Value ? null : Convert.ToString(value)?.Trim();
    }

    private async Task<StepSettings?> LoadStepSettingsAsync(
        Guid workflowId,
        WorkflowStep step,
        CancellationToken cancellationToken) =>
        ReadStepSettings(await _jsonStorage.GetWorkflowJsonAsync(workflowId, cancellationToken), step);

    private async Task<NpgsqlConnection> OpenConnectionAsync()
    {
        var connectionString = _tenantContext.ConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Tenant connection string not resolved.");

        var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        return connection;
    }

    private Guid RequireTenantId() =>
        _tenantContext.TenantId ?? throw new InvalidOperationException("Tenant context is required.");

    private static void ThrowIfInvalid(WorkflowDynamicUserEmails parsed, string? label)
    {
        if (parsed.Invalid.Count == 0)
            return;

        var field = string.IsNullOrWhiteSpace(label) ? "The assignee field" : $"'{label}'";
        throw new WorkflowDynamicAssignmentException(
            $"{field} has an invalid email address: {string.Join(", ", parsed.Invalid)}.");
    }

    private static WorkflowDynamicAssignmentException NoFieldConfigured(WorkflowStep step) =>
        new($"Stage '{step.Name}' has no email field selected for its assignee. Ask your workflow administrator to select one.");

    private static WorkflowDynamicAssignmentException NoEmailValue(string? label, WorkflowStep step) =>
        new(string.IsNullOrWhiteSpace(label)
            ? $"Stage '{step.Name}' cannot be assigned: its email field is no longer available or has no value."
            : $"Enter a valid email address in '{label}' so that stage '{step.Name}' can be assigned.");

    private static WorkflowDynamicAssignmentException NoAccount(string email) =>
        new($"{email} does not have an account in this organization. Use a registered user or ask your administrator to add them.");

    private static bool IsTrue(JsonElement settings, string name) =>
        TryGet(settings, name, out var value) && value.ValueKind == JsonValueKind.True;

    private static bool TryGet(JsonElement element, string name, out JsonElement value)
    {
        value = default;
        if (element.ValueKind != JsonValueKind.Object)
            return false;

        foreach (var property in element.EnumerateObject())
        {
            if (property.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        return false;
    }
}

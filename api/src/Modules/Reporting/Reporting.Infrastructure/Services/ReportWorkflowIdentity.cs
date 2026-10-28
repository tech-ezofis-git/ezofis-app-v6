using System.Text.RegularExpressions;

namespace SaaSApp.Reporting.Infrastructure.Services;

internal enum ReportWorkflowIdentityKind
{
    RequestNo,
    Stage,
    Status,
    ActedBy,
    ActedById,
    WorkflowName,
    CreatedAt,
    InstanceId,
    WorkflowId,
    ItemId
}

internal static class ReportWorkflowIdentity
{
    private static readonly Regex WaitingDaysRegex = new(
        @"waiting[^\d]{0,40}(\d+)\s*days?",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    public static bool TryMap(string? field, string? jsonId, string? label, out ReportWorkflowIdentityKind kind)
    {
        foreach (var raw in new[] { field, jsonId, label })
        {
            if (TryMapToken(raw, out kind))
                return true;
        }

        kind = default;
        return false;
    }

    public static bool PreferOverForm(ReportWorkflowIdentityKind kind) =>
        kind is not ReportWorkflowIdentityKind.CreatedAt
            and not ReportWorkflowIdentityKind.ItemId;

    public static string Alias(ReportWorkflowIdentityKind kind) => kind switch
    {
        ReportWorkflowIdentityKind.RequestNo => "RequestNo",
        ReportWorkflowIdentityKind.Stage => "Stage",
        ReportWorkflowIdentityKind.Status => "Status",
        ReportWorkflowIdentityKind.ActedBy => "ActedBy",
        ReportWorkflowIdentityKind.ActedById => "ActedById",
        ReportWorkflowIdentityKind.WorkflowName => "WorkflowName",
        ReportWorkflowIdentityKind.CreatedAt => "CreatedAt",
        ReportWorkflowIdentityKind.InstanceId => "InstanceId",
        ReportWorkflowIdentityKind.WorkflowId => "WorkflowId",
        ReportWorkflowIdentityKind.ItemId => "ItemId",
        _ => kind.ToString()
    };

    public static string SelectExpr(
        ReportWorkflowIdentityKind kind,
        bool hasInstances,
        bool hasInbox,
        bool hasSteps)
    {
        return kind switch
        {
            ReportWorkflowIdentityKind.RequestNo => hasInstances
                ? "wi.reference_number"
                : "NULL::text",
            ReportWorkflowIdentityKind.Stage => Coalesce(
                hasInbox ? "NULLIF(BTRIM(mb.stage), '')" : null,
                hasInbox ? "NULLIF(BTRIM(mb.name), '')" : null,
                hasSteps ? "NULLIF(BTRIM(si.step_name), '')" : null) ?? "NULL::text",
            ReportWorkflowIdentityKind.Status => hasInstances
                ? """
                  CASE wi.status
                    WHEN 0 THEN 'Pending'
                    WHEN 1 THEN 'Running'
                    WHEN 2 THEN 'Paused'
                    WHEN 3 THEN 'Completed'
                    WHEN 4 THEN 'Failed'
                    WHEN 5 THEN 'Cancelled'
                    ELSE wi.status::text
                  END
                  """
                : "NULL::text",
            ReportWorkflowIdentityKind.ActedBy => Coalesce(
                hasInbox ? "NULLIF(BTRIM(mb.created_by_name), '')" : null,
                hasInbox ? "NULLIF(BTRIM(mb.activity_user_email), '')" : null) ?? "NULL::text",
            ReportWorkflowIdentityKind.ActedById => hasInbox
                ? "NULLIF(BTRIM(mb.transaction_created_by), '')"
                : "NULL::text",
            ReportWorkflowIdentityKind.WorkflowName => hasInstances
                ? "wi.workflow_name"
                : "NULL::text",
            ReportWorkflowIdentityKind.CreatedAt => hasInstances
                ? "wi.created_at_utc"
                : "NULL::timestamptz",
            ReportWorkflowIdentityKind.InstanceId => hasInstances
                ? "wi.id::text"
                : "NULL::text",
            ReportWorkflowIdentityKind.WorkflowId => hasInstances
                ? "wi.workflow_id::text"
                : "NULL::text",
            ReportWorkflowIdentityKind.ItemId => "e.item_id::text",
            _ => "NULL::text"
        };
    }

    public static string? FilterIdent(
        ReportWorkflowIdentityKind kind,
        bool hasInstances,
        bool hasInbox,
        bool hasSteps)
    {
        var expr = SelectExpr(kind, hasInstances, hasInbox, hasSteps);
        return expr.StartsWith("NULL", StringComparison.OrdinalIgnoreCase) ? null : expr;
    }

    public static string WaitingSinceExpr(bool hasInstances, bool hasInbox, bool hasSteps) =>
        Coalesce(
            hasInbox ? "mb.started_at_utc" : null,
            hasInbox ? "mb.created_at_utc" : null,
            hasInbox ? "mb.transaction_created_at" : null,
            hasSteps ? "si.started_at_utc" : null,
            hasInstances ? "wi.started_at_utc" : null,
            hasInstances ? "wi.created_at_utc" : null,
            "e.created_at") ?? "e.created_at";

    public static int? TryReadWaitingDays(params string?[] texts)
    {
        foreach (var text in texts)
        {
            if (string.IsNullOrWhiteSpace(text))
                continue;
            var match = WaitingDaysRegex.Match(text);
            if (!match.Success)
                continue;
            if (int.TryParse(match.Groups[1].Value, out var days) && days is > 0 and < 3650)
                return days;
        }

        return null;
    }

    public static bool LooksLikePendingFormFlag(string? field, string? label)
    {
        foreach (var raw in new[] { field, label })
        {
            var token = Compact(raw);
            if (token is "todaytask" or "istodaytask")
                return true;
            if (token.Contains("todaytask", StringComparison.Ordinal) &&
                token.Contains("stage", StringComparison.Ordinal))
                return true;
        }

        return false;
    }

    private static bool TryMapToken(string? raw, out ReportWorkflowIdentityKind kind)
    {
        var token = Compact(raw);
        kind = token switch
        {
            "requestno" or "reqno" or "referencenumber" or "referenceno" or "requestnumber"
                => ReportWorkflowIdentityKind.RequestNo,
            "stage" or "currentstage" or "stagename" or "activity" or "activityname"
                or "step" or "stepname" or "pendingstage" or "pendingstagetodaytask"
                => ReportWorkflowIdentityKind.Stage,
            "status" or "instancestatus" or "wfstatus"
                => ReportWorkflowIdentityKind.Status,
            "actedbyid" or "startedbyid" or "updatedbyid" or "assignedtoid"
                or "transactioncreatedby"
                => ReportWorkflowIdentityKind.ActedById,
            "actedby" or "startedby" or "updatedby" or "assignedto"
                => ReportWorkflowIdentityKind.ActedBy,
            "workflow" or "workflowname"
                => ReportWorkflowIdentityKind.WorkflowName,
            "createdatutc" or "createdat"
                => ReportWorkflowIdentityKind.CreatedAt,
            "instanceid" or "workflowinstanceid"
                => ReportWorkflowIdentityKind.InstanceId,
            "workflowid"
                => ReportWorkflowIdentityKind.WorkflowId,
            "itemid" or "formentryid"
                => ReportWorkflowIdentityKind.ItemId,
            _ => (ReportWorkflowIdentityKind)(-1)
        };

        if ((int)kind >= 0)
            return true;

        if (token.Contains("stage", StringComparison.Ordinal)
            && (token.Contains("pending", StringComparison.Ordinal)
                || token.Contains("todaytask", StringComparison.Ordinal)
                || token.Contains("approval", StringComparison.Ordinal)))
        {
            kind = ReportWorkflowIdentityKind.Stage;
            return true;
        }

        return false;
    }

    private static string Compact(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;
        return string.Concat(value.Where(char.IsLetterOrDigit)).ToLowerInvariant();
    }

    private static string? Coalesce(params string?[] parts)
    {
        var present = parts.Where(p => !string.IsNullOrWhiteSpace(p)).ToList();
        if (present.Count == 0)
            return null;
        if (present.Count == 1)
            return present[0];
        return "COALESCE(" + string.Join(", ", present) + ")";
    }
}

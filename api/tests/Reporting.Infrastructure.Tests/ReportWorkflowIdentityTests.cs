using SaaSApp.Reporting.Infrastructure.Services;

namespace SaaSApp.Reporting.Infrastructure.Tests;

public sealed class ReportWorkflowIdentityTests
{
    [Theory]
    [InlineData("RequestNo", null, "Request No", "RequestNo")]
    [InlineData("reference_number", null, null, "RequestNo")]
    [InlineData("Stage", null, "Stage", "Stage")]
    [InlineData("today_task", null, "Pending Stage (today_task)", "Stage")]
    [InlineData("status", null, "Status", "Status")]
    [InlineData("startedBy", null, "Acted by", "ActedBy")]
    [InlineData("startedById", null, "Started by Id", "ActedById")]
    [InlineData("actedById", null, "Acted by Id", "ActedById")]
    [InlineData("workflowName", null, "Workflow", "WorkflowName")]
    [InlineData("Workflow", null, "Workflow", "WorkflowName")]
    public void TryMap_reads_mailbox_identity_keys(
        string field,
        string? jsonId,
        string? label,
        string expected)
    {
        Assert.True(ReportWorkflowIdentity.TryMap(field, jsonId, label, out var kind));
        Assert.Equal(expected, kind.ToString());
        Assert.True(ReportWorkflowIdentity.PreferOverForm(kind));
    }

    [Fact]
    public void TryMap_does_not_treat_matched_status_as_instance_status()
    {
        Assert.False(ReportWorkflowIdentity.TryMap("matched_status", null, "Matched Status", out _));
    }

    [Fact]
    public void CreatedAt_stays_on_form_when_present()
    {
        Assert.True(ReportWorkflowIdentity.TryMap("created_at", null, "Created At", out var kind));
        Assert.Equal(ReportWorkflowIdentityKind.CreatedAt, kind);
        Assert.False(ReportWorkflowIdentity.PreferOverForm(kind));
    }

    [Fact]
    public void Waiting_days_reads_report_title()
    {
        Assert.Equal(
            5,
            ReportWorkflowIdentity.TryReadWaitingDays(
                "Pending Approval (AP) — Waiting Action > 5 Days"));
        Assert.Equal(7, ReportWorkflowIdentity.TryReadWaitingDays("waiting more than 7 days"));
        Assert.Null(ReportWorkflowIdentity.TryReadWaitingDays("Invoice Amount", "Accounts Payable"));
    }

    [Fact]
    public void SelectExpr_uses_instance_and_inbox_when_joined()
    {
        Assert.Equal(
            "wi.reference_number",
            ReportWorkflowIdentity.SelectExpr(ReportWorkflowIdentityKind.RequestNo, true, true, false));
        Assert.Contains(
            "mb.stage",
            ReportWorkflowIdentity.SelectExpr(ReportWorkflowIdentityKind.Stage, true, true, true),
            StringComparison.Ordinal);
        Assert.Contains(
            "Running",
            ReportWorkflowIdentity.SelectExpr(ReportWorkflowIdentityKind.Status, true, false, false),
            StringComparison.Ordinal);
        Assert.Equal(
            "NULL::text",
            ReportWorkflowIdentity.SelectExpr(ReportWorkflowIdentityKind.RequestNo, false, false, false));
        var actedBy = ReportWorkflowIdentity.SelectExpr(
            ReportWorkflowIdentityKind.ActedBy, true, true, false);
        Assert.Contains("mb.created_by_name", actedBy, StringComparison.Ordinal);
        Assert.DoesNotContain("transaction_created_by", actedBy, StringComparison.Ordinal);
        Assert.Equal(
            "NULLIF(BTRIM(mb.transaction_created_by), '')",
            ReportWorkflowIdentity.SelectExpr(ReportWorkflowIdentityKind.ActedById, true, true, false));
    }

    [Fact]
    public void LooksLikePendingFormFlag_detects_today_task()
    {
        Assert.True(ReportWorkflowIdentity.LooksLikePendingFormFlag("today_task", "Pending Stage (today_task)"));
        Assert.False(ReportWorkflowIdentity.LooksLikePendingFormFlag("invoice_amount", "Invoice Amount"));
    }
}

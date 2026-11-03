using System.Text;
using SaaSApp.Workflow.Application.Contracts;
using SaaSApp.Workflow.Infrastructure.Services;

namespace SaaSApp.Workflow.Infrastructure.Tests;

public class WorkflowEmailTicketRulesTests
{
    private static EmailAttachmentInfo File(string? name, string? type = null, long? size = 300_000, bool inline = false, string id = "0") =>
        new(id, name, type, size, inline);

    private static WorkflowEmailSettings AttachmentMode(string noAttachment = "skip", params string[] types) =>
        new("attachment", noAttachment, false, types.Length == 0 ? WorkflowEmailTicketRules.DefaultTypes : types, false, null);

    [Fact]
    public void Defaults_keep_todays_behaviour()
    {
        var mjb = WorkflowEmailTicketRules.Defaults(isMjbWorkflow: true);
        var other = WorkflowEmailTicketRules.Defaults(isMjbWorkflow: false);

        Assert.Equal("attachment", mjb.TicketMode);
        Assert.Equal("email", mjb.NoAttachmentAction);
        Assert.False(mjb.AttachEmail);
        Assert.Equal([".pdf", ".tif", ".tiff"], mjb.AttachmentTypes);
        Assert.True(mjb.IsDefault);

        Assert.Equal("email", other.TicketMode);
        Assert.True(other.IsDefault);
    }

    [Fact]
    public void Email_mode_always_starts_one_email_ticket()
    {
        var plan = WorkflowEmailTicketRules.Plan(
            WorkflowEmailTicketRules.Defaults(isMjbWorkflow: false),
            [File("quote.pdf"), File("spec.pdf", id: "1")]);

        Assert.True(plan.StartEmailTicket);
        Assert.Empty(plan.AttachmentTickets);
    }

    [Fact]
    public void Attachment_mode_starts_one_ticket_per_matching_attachment()
    {
        var plan = WorkflowEmailTicketRules.Plan(
            AttachmentMode(),
            [File("inv-1.pdf"), File("notes.docx", id: "1"), File("inv-2.PDF", id: "2")]);

        Assert.False(plan.StartEmailTicket);
        Assert.Equal(["0", "2"], plan.AttachmentTickets.Select(a => a.Id));
    }

    [Theory]
    [InlineData("email", true)]
    [InlineData("skip", false)]
    public void No_matching_attachment_follows_the_setting(string action, bool startsEmailTicket)
    {
        var plan = WorkflowEmailTicketRules.Plan(AttachmentMode(action), [File("notes.docx")]);

        Assert.Equal(startsEmailTicket, plan.StartEmailTicket);
        Assert.Empty(plan.AttachmentTickets);
    }

    [Fact]
    public void Chosen_types_decide_what_counts()
    {
        var withWord = AttachmentMode("skip", ".pdf", ".docx");

        var plan = WorkflowEmailTicketRules.Plan(withWord, [File("notes.docx"), File("sheet.xlsx", id: "1")]);

        Assert.Equal(["0"], plan.AttachmentTickets.Select(a => a.Id));
    }

    [Theory]
    [InlineData("logo.png", 400_000, false)]
    [InlineData("image001.jpg", 400_000, false)]
    [InlineData("photo.png", 20_000, true)]
    public void Signature_and_logo_images_are_not_tickets(string name, long size, bool inline)
    {
        Assert.False(WorkflowEmailTicketRules.Counts(File(name, size: size, inline: inline), WorkflowEmailTicketRules.DefaultTypes));
    }

    [Fact]
    public void Large_inline_photos_and_named_pdfs_still_count()
    {
        Assert.True(WorkflowEmailTicketRules.Counts(File("site-photo.jpg", size: 400_000, inline: true), WorkflowEmailTicketRules.DefaultTypes));
        Assert.True(WorkflowEmailTicketRules.Counts(File(null, "application/pdf"), WorkflowEmailTicketRules.DefaultTypes));
    }

    [Fact]
    public void Normalize_keeps_saved_values_and_rejects_unknown_ones()
    {
        var fallback = WorkflowEmailTicketRules.Defaults(isMjbWorkflow: false);

        var saved = WorkflowEmailTicketRules.Normalize(
            new WorkflowEmailSettingsInput("Attachment", null, false, ["PDF", ".xlsx", "pdf"]),
            fallback);

        Assert.Equal("attachment", saved.TicketMode);
        Assert.Equal(fallback.NoAttachmentAction, saved.NoAttachmentAction);
        Assert.False(saved.AttachEmail);
        Assert.Equal([".pdf", ".xlsx"], saved.AttachmentTypes);
        Assert.False(saved.IsDefault);

        Assert.Throws<InvalidOperationException>(() =>
            WorkflowEmailTicketRules.Normalize(new WorkflowEmailSettingsInput("folder", null, null, null), fallback));
        Assert.Throws<InvalidOperationException>(() =>
            WorkflowEmailTicketRules.Normalize(new WorkflowEmailSettingsInput(null, null, null, [".exe"]), fallback));
        Assert.Throws<InvalidOperationException>(() =>
            WorkflowEmailTicketRules.Normalize(new WorkflowEmailSettingsInput("attachment", null, null, []), fallback));
    }

    [Fact]
    public void FileNameFor_uses_the_name_or_a_safe_fallback()
    {
        Assert.Equal("inv.pdf", WorkflowEmailTicketRules.FileNameFor(File("../x/inv.pdf"), 0));
        Assert.Equal("attachment-3.pdf", WorkflowEmailTicketRules.FileNameFor(File(null, "application/pdf"), 2));
    }

    [Fact]
    public void ReadAttachments_splits_a_raw_eml()
    {
        var pdf = Convert.ToBase64String(Encoding.ASCII.GetBytes("%PDF-1.4 test"));
        var eml = Encoding.ASCII.GetBytes(
            "From: Buyer <buyer@example.com>\r\n" +
            "Subject: Invoices\r\n" +
            "Message-ID: <inv-1@example.com>\r\n" +
            "MIME-Version: 1.0\r\n" +
            "Content-Type: multipart/mixed; boundary=\"b1\"\r\n\r\n" +
            "--b1\r\nContent-Type: text/plain\r\n\r\nPlease pay.\r\n" +
            "--b1\r\nContent-Type: application/pdf; name=\"inv-1.pdf\"\r\n" +
            "Content-Disposition: attachment; filename=\"inv-1.pdf\"\r\n" +
            "Content-Transfer-Encoding: base64\r\n\r\n" + pdf + "\r\n" +
            "--b1\r\nContent-Type: application/pdf; name=\"inv-2.pdf\"\r\n" +
            "Content-Disposition: attachment; filename=\"inv-2.pdf\"\r\n" +
            "Content-Transfer-Encoding: base64\r\n\r\n" + pdf + "\r\n" +
            "--b1--\r\n");

        var attachments = WorkflowEmailDispatcher.ReadAttachments(eml);
        var (from, subject, _) = WorkflowEmailDispatcher.ReadHeaders(eml);

        Assert.Equal(["inv-1.pdf", "inv-2.pdf"], attachments.Select(a => a.Info.FileName));
        Assert.Equal("%PDF-1.4 test", Encoding.ASCII.GetString(attachments[0].Content!));
        Assert.Equal("buyer@example.com", from);
        Assert.Equal("Invoices", subject);
    }

    [Fact]
    public void ReadAttachments_of_a_plain_email_is_empty()
    {
        var eml = Encoding.ASCII.GetBytes("From: a@example.com\r\nSubject: Hi\r\n\r\nNo files.\r\n");

        Assert.Empty(WorkflowEmailDispatcher.ReadAttachments(eml));
    }

    [Theory]
    [InlineData("Buyer <buyer@example.com>", "buyer@example.com")]
    [InlineData("buyer@example.com", "buyer@example.com")]
    [InlineData("", null)]
    public void CleanAddress_keeps_only_the_address(string value, string? expected)
    {
        Assert.Equal(expected, WorkflowEmailDispatcher.CleanAddress(value));
    }

    [Fact]
    public void AttachmentEventKey_keeps_the_attachment_id_when_the_email_key_is_long()
    {
        var longKey = new string('k', 200);

        var first = WorkflowEmailDispatcher.AttachmentEventKey(longKey, "1");
        var second = WorkflowEmailDispatcher.AttachmentEventKey(longKey, "2");

        Assert.Equal(160, first.Length);
        Assert.NotEqual(first, second);
        Assert.EndsWith(":a2", second);
    }
}

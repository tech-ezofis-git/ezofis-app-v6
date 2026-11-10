using System.Net;
using System.Text;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.Repository.Infrastructure.Services;
using SaaSApp.SharedKernel.Options;
using Xunit;

namespace SaaSApp.Api.Tests;

public sealed class TiffPdfConverterTests
{
    [Theory]
    [InlineData("scan.tif", null, true)]
    [InlineData("SCAN.TIFF", null, true)]
    [InlineData("scan", "image/tiff", true)]
    [InlineData("scan.pdf", "application/pdf", false)]
    [InlineData("photo.png", "image/png", false)]
    public void Tiff_files_are_recognised_by_name_or_type(string name, string? type, bool expected) =>
        Assert.Equal(expected, RepositoryTiffFiles.IsTiff(name, type));

    [Fact]
    public void Pdf_name_keeps_the_tiff_name()
    {
        Assert.Equal("Invoice 1001.pdf", RepositoryTiffFiles.PdfFileName("Invoice 1001.tiff"));
        Assert.Equal("document.pdf", RepositoryTiffFiles.PdfFileName(".tif"));
    }

    [Theory]
    [InlineData("http://agents:8000/chat", "http://agents:8000/api/agents/convert/tiff-to-pdf")]
    [InlineData("https://cloud.ezofis.com/chat/", "https://cloud.ezofis.com/api/agents/convert/tiff-to-pdf")]
    [InlineData("http://localhost:8010", "http://localhost:8010/api/agents/convert/tiff-to-pdf")]
    [InlineData("", "")]
    public void Agents_url_is_built_from_the_chat_url(string chatUrl, string expected) =>
        Assert.Equal(expected, new AgentsChatOptions { ChatUrl = chatUrl }.ResolveServiceUrl(TiffPdfConverterClient.ConvertPath));

    [Fact]
    public async Task Converter_posts_the_tiff_and_returns_the_pdf()
    {
        var handler = new FakeHandler(_ =>
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(Encoding.ASCII.GetBytes("%PDF-1.7 fake")) };
            response.Headers.Add("X-Page-Count", "3");
            response.Headers.Add("X-Searchable-Pages", "3");
            return response;
        });
        var client = Create(handler, new AgentsChatOptions { ChatUrl = "http://agents:8000/chat", TiffPdfLanguage = "eng+ara" });

        var result = await client.ConvertAsync(new byte[] { 0x49, 0x49, 0x2A, 0x00 }, "scan.tiff");

        Assert.Equal(3, result.Pages);
        Assert.Equal(3, result.SearchablePages);
        Assert.StartsWith("%PDF", Encoding.ASCII.GetString(result.Pdf));
        Assert.Equal("http://agents:8000/api/agents/convert/tiff-to-pdf", handler.LastUrl);
        Assert.Contains("name=file; filename=scan.tiff", handler.LastBody);
        Assert.Contains("eng+ara", handler.LastBody);
    }

    [Fact]
    public async Task Converter_reports_agent_errors_and_non_pdf_replies()
    {
        var failing = Create(new FakeHandler(_ => new HttpResponseMessage(HttpStatusCode.BadRequest)
            { Content = new StringContent("{\"detail\":\"The file is not a TIFF\"}") }),
            new AgentsChatOptions { ChatUrl = "http://agents:8000/chat" });
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => failing.ConvertAsync(new byte[] { 1 }, "x.tif"));
        Assert.Contains("400", ex.Message);

        var notPdf = Create(new FakeHandler(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("<html>") }),
            new AgentsChatOptions { ChatUrl = "http://agents:8000/chat" });
        await Assert.ThrowsAsync<InvalidOperationException>(() => notPdf.ConvertAsync(new byte[] { 1 }, "x.tif"));
    }

    [Fact]
    public void Converter_is_off_when_switched_off_or_unconfigured()
    {
        Assert.False(Create(new FakeHandler(_ => new HttpResponseMessage()), new AgentsChatOptions()).IsEnabled);
        Assert.False(Create(new FakeHandler(_ => new HttpResponseMessage()),
            new AgentsChatOptions { ChatUrl = "http://agents:8000/chat", ConvertTiffToPdf = false }).IsEnabled);
        Assert.True(Create(new FakeHandler(_ => new HttpResponseMessage()),
            new AgentsChatOptions { ChatUrl = "http://agents:8000/chat" }).IsEnabled);
    }

    private static TiffPdfConverterClient Create(FakeHandler handler, AgentsChatOptions options) =>
        new(new HttpClient(handler), Microsoft.Extensions.Options.Options.Create(options));

    private sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public string? LastUrl { get; private set; }
        public string LastBody { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastUrl = request.RequestUri?.ToString();
            LastBody = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
            return respond(request);
        }
    }
}

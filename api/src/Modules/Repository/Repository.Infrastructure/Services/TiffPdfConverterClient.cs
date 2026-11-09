using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.SharedKernel.Options;

namespace SaaSApp.Repository.Infrastructure.Services;

/// <summary>Calls the agents service's POST /api/agents/convert/tiff-to-pdf (multipart file -> PDF bytes).</summary>
public sealed class TiffPdfConverterClient : ITiffPdfConverter
{
    public const string ConvertPath = "/api/agents/convert/tiff-to-pdf";

    private readonly HttpClient _httpClient;
    private readonly AgentsChatOptions _agents;

    public TiffPdfConverterClient(HttpClient httpClient, IOptions<AgentsChatOptions> agents)
    {
        _httpClient = httpClient;
        _agents = agents.Value;
    }

    public bool IsEnabled =>
        _agents.ConvertTiffToPdf && !string.IsNullOrWhiteSpace(_agents.ResolveServiceUrl(ConvertPath));

    public async Task<TiffPdfConversion> ConvertAsync(byte[] tiff, string fileName, CancellationToken cancellationToken = default)
    {
        var url = _agents.ResolveServiceUrl(ConvertPath);
        if (string.IsNullOrWhiteSpace(url))
            throw new InvalidOperationException("Agents:ChatUrl is not configured.");

        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(tiff);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/tiff");
        form.Add(file, "file", string.IsNullOrWhiteSpace(fileName) ? "document.tiff" : Path.GetFileName(fileName));
        form.Add(new StringContent(string.IsNullOrWhiteSpace(_agents.TiffPdfLanguage) ? "eng" : _agents.TiffPdfLanguage), "language");

        using var response = await _httpClient.PostAsync(url, form, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(
                $"TIFF to PDF failed ({(int)response.StatusCode}): {(detail.Length > 300 ? detail[..300] : detail)}");
        }

        var pdf = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        if (pdf.Length < 5 || pdf[0] != (byte)'%' || pdf[1] != (byte)'P' || pdf[2] != (byte)'D' || pdf[3] != (byte)'F')
            throw new InvalidOperationException("TIFF to PDF returned something that is not a PDF.");

        return new TiffPdfConversion(pdf, ReadInt(response, "X-Page-Count"), ReadInt(response, "X-Searchable-Pages"));
    }

    private static int ReadInt(HttpResponseMessage response, string header) =>
        response.Headers.TryGetValues(header, out var values) && int.TryParse(values.FirstOrDefault(), out var n) ? n : 0;
}

namespace SaaSApp.SharedKernel.Options;

/// <summary>
/// Shared Python agents <c>/chat</c> endpoint. Intents (<c>ap</c>, <c>ocr</c>, <c>summary</c>,
/// <c>insight</c>, <c>dashboard</c>, <c>document_intelligent</c>, …) POST to the same URL;
/// <c>intent</c> selects the handler.
/// </summary>
public sealed class AgentsChatOptions
{
    public const string SectionName = "Agents";

    public string ChatUrl { get; set; } = string.Empty;

    /// <summary>
    /// Bulk upload: turn TIFF files into searchable PDFs (POST {agents}/api/agents/convert/tiff-to-pdf)
    /// before OCR, so the PDF is what gets indexed and archived. Set false to keep TIFFs as uploaded.
    /// </summary>
    public bool ConvertTiffToPdf { get; set; } = true;

    /// <summary>Tesseract language(s) for the PDF text layer, e.g. "eng" or "eng+ara".</summary>
    public string TiffPdfLanguage { get; set; } = "eng";

    /// <summary>
    /// URL of another endpoint on the agents service, built from <see cref="ChatUrl"/>
    /// ("http://agents:8000/chat" + "/api/agents/x" -> "http://agents:8000/api/agents/x").
    /// Empty when <see cref="ChatUrl"/> is not set.
    /// </summary>
    public string ResolveServiceUrl(string path)
    {
        var chat = ChatUrl?.Trim().TrimEnd('/');
        if (string.IsNullOrWhiteSpace(chat))
            return string.Empty;
        var root = chat.EndsWith("/chat", StringComparison.OrdinalIgnoreCase) ? chat[..^"/chat".Length] : chat;
        return root + "/" + path.TrimStart('/');
    }

    /// <summary>
    /// Returns <see cref="ChatUrl"/> when set, otherwise falls back to a legacy per-feature URL.
    /// </summary>
    public string ResolveChatUrl(string? legacyUrl = null)
    {
        var url = ChatUrl?.Trim();
        if (!string.IsNullOrWhiteSpace(url))
            return url;

        return legacyUrl?.Trim() ?? string.Empty;
    }
}

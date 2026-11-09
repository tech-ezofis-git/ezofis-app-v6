namespace SaaSApp.Repository.Application.Contracts;

/// <summary>A searchable PDF made from a TIFF: page images plus an invisible OCR text layer.</summary>
public sealed record TiffPdfConversion(byte[] Pdf, int Pages, int SearchablePages);

/// <summary>TIFF -> searchable PDF through the agents service (POST /api/agents/convert/tiff-to-pdf).</summary>
public interface ITiffPdfConverter
{
    /// <summary>False when switched off (Agents:ConvertTiffToPdf) or the agents URL is not configured.</summary>
    bool IsEnabled { get; }

    Task<TiffPdfConversion> ConvertAsync(byte[] tiff, string fileName, CancellationToken cancellationToken = default);
}

public static class RepositoryTiffFiles
{
    public static bool IsTiff(string? fileName, string? contentType)
    {
        var ext = Path.GetExtension(fileName ?? string.Empty);
        if (ext.Equals(".tif", StringComparison.OrdinalIgnoreCase) || ext.Equals(".tiff", StringComparison.OrdinalIgnoreCase))
            return true;
        var type = (contentType ?? string.Empty).Split(';')[0].Trim();
        return type.Equals("image/tiff", StringComparison.OrdinalIgnoreCase)
            || type.Equals("image/tif", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>"scan.tiff" -> "scan.pdf".</summary>
    public static string PdfFileName(string fileName)
    {
        var stem = Path.GetFileNameWithoutExtension(fileName);
        return (string.IsNullOrWhiteSpace(stem) ? "document" : stem) + ".pdf";
    }
}

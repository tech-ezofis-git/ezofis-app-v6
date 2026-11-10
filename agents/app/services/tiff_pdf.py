"""TIFF (single or multi-page) -> searchable PDF.

Each TIFF page becomes one PDF page: the page image plus an invisible OCR text layer, so
the PDF can be searched and its text selected. PyMuPDF reads the TIFF pages (any
compression, fax resolutions included) and renders them at 300 dpi; Tesseract's own PDF
renderer (`tesseract page.png out pdf`) writes each searchable page. (PyMuPDF's
Pixmap.pdfocr_tobytes was tried first: it writes an empty text layer with this build.)
Pages where OCR is unavailable are still added as image-only pages, so a conversion never
loses a page.

Used by the API's bulk upload (POST /api/agents/convert/tiff-to-pdf): a TIFF is turned
into a PDF before the usual OCR / index / archive steps.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass

import pymupdf

logger = logging.getLogger(__name__)

# Tesseract reads best around 300 dpi; fax TIFFs (204x98 dpi) are scaled up to it.
OCR_DPI = 300
# Guard against huge scans: cap the rendered page at this many pixels (about A2 at 300 dpi).
MAX_PIXELS = 7016 * 4961
TIFF_MAGIC = (b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+")  # classic + BigTIFF


class TiffConversionError(Exception):
    """The file is not a readable TIFF (bad, empty, or password-protected)."""


@dataclass
class TiffPdfResult:
    pdf: bytes
    pages: int
    searchable_pages: int


def is_tiff(data: bytes, filename: str | None = None) -> bool:
    if data[:4] in TIFF_MAGIC:
        return True
    return bool(filename) and filename.lower().endswith((".tif", ".tiff"))


def _is_gray(page: pymupdf.Page) -> bool:
    """True when the page has no colour (bilevel fax or grayscale scan): render it gray, 3x smaller."""
    small = page.get_pixmap(dpi=24, alpha=False)
    if small.n == 1:
        return True
    s = small.samples
    step = max(3, (len(s) // 3 // 4000) * 3)  # sample about 4000 pixels
    return all(abs(s[i] - s[i + 1]) < 8 and abs(s[i] - s[i + 2]) < 8 for i in range(0, len(s) - 2, step))


def _render(page: pymupdf.Page) -> pymupdf.Pixmap:
    dpi = OCR_DPI
    w_px = page.rect.width / 72 * dpi
    h_px = page.rect.height / 72 * dpi
    if w_px * h_px > MAX_PIXELS:
        dpi = int(dpi * (MAX_PIXELS / (w_px * h_px)) ** 0.5)
    cs = pymupdf.csGRAY if _is_gray(page) else pymupdf.csRGB
    return page.get_pixmap(dpi=dpi, colorspace=cs, alpha=False)


TESSERACT_TIMEOUT_S = 180  # per page


def _save_page_png(pix: pymupdf.Pixmap, path: str) -> None:
    """Save the page for Tesseract. Black-and-white pages (fax / scanned text) go as 1-bit
    images, which Tesseract embeds compactly; anything with real grey or colour as-is."""
    if pix.n == 1:
        try:
            from PIL import Image

            img = Image.frombytes("L", (pix.width, pix.height), pix.samples)
            hist = img.histogram()
            if sum(hist[24:232]) <= 0.03 * pix.width * pix.height:  # almost only black or white
                img.point(lambda v: 255 if v > 127 else 0, mode="1").save(path, format="PNG")
                return
        except ImportError:
            pass
    pix.save(path)


def _tesseract_pdf(pix: pymupdf.Pixmap, language: str) -> bytes:
    """One searchable PDF page (image + invisible text) from Tesseract's PDF renderer."""
    exe = shutil.which("tesseract")
    if not exe:
        raise RuntimeError("tesseract is not installed")
    with tempfile.TemporaryDirectory(prefix="tiff2pdf_") as tmp:
        png = os.path.join(tmp, "page.png")
        base = os.path.join(tmp, "page")
        _save_page_png(pix, png)
        subprocess.run(
            [exe, png, base, "-l", language, "--dpi", str(int(pix.xres) or OCR_DPI), "pdf"],
            check=True, capture_output=True, timeout=TESSERACT_TIMEOUT_S,
        )
        with open(base + ".pdf", "rb") as f:
            return f.read()


def tiff_to_searchable_pdf(data: bytes, *, language: str = "eng", ocr: bool = True) -> TiffPdfResult:
    """Convert TIFF bytes to PDF bytes. language: Tesseract language(s), e.g. "eng" or "eng+ara"."""
    if not data:
        raise TiffConversionError("The file is empty.")
    try:
        src = pymupdf.open(stream=data, filetype="tiff")
    except Exception as exc:
        raise TiffConversionError(f"Not a readable TIFF file: {type(exc).__name__}") from exc

    out = pymupdf.open()
    searchable = 0
    ocr_failed = False
    try:
        if src.page_count == 0:
            raise TiffConversionError("The TIFF has no pages.")
        for page in src:
            pix = _render(page)
            width, height = pix.width * 72 / pix.xres, pix.height * 72 / pix.yres
            page_pdf: bytes | None = None
            if ocr and not ocr_failed:
                try:
                    page_pdf = _tesseract_pdf(pix, language)
                except Exception as exc:  # tesseract / language missing or failed: keep going image-only
                    ocr_failed = True
                    logger.warning("TIFF to PDF: OCR unavailable (%s); pages are image-only", type(exc).__name__)
            if page_pdf:
                with pymupdf.open(stream=page_pdf, filetype="pdf") as one:
                    out.insert_pdf(one)
                searchable += 1
            else:
                new_page = out.new_page(width=width, height=height)
                new_page.insert_image(new_page.rect, pixmap=pix)
        return TiffPdfResult(out.tobytes(garbage=3, deflate=True), out.page_count, searchable)
    finally:
        out.close()
        src.close()

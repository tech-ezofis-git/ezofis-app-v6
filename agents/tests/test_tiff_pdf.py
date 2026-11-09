"""TIFF -> searchable PDF conversion (app/services/tiff_pdf.py) and its endpoint."""
from __future__ import annotations

import io
import shutil

import pymupdf
import pytest

from app.services.tiff_pdf import TiffConversionError, is_tiff, tiff_to_searchable_pdf

PIL = pytest.importorskip("PIL.Image")
HAS_TESSERACT = shutil.which("tesseract") is not None


def _page_png(text: str) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4
    page.insert_text((72, 140), text, fontsize=36)
    png = page.get_pixmap(dpi=200).tobytes("png")
    doc.close()
    return png


def _multipage_tiff(texts: list[str], mode: str = "L", compression: str = "tiff_lzw") -> bytes:
    frames = [PIL.open(io.BytesIO(_page_png(t))).convert(mode) for t in texts]
    buf = io.BytesIO()
    frames[0].save(buf, format="TIFF", save_all=True, append_images=frames[1:], compression=compression, dpi=(200, 200))
    return buf.getvalue()


def test_every_tiff_page_becomes_a_pdf_page():
    tiff = _multipage_tiff(["INVOICE 1001", "PAGE TWO", "PAGE THREE"])
    result = tiff_to_searchable_pdf(tiff, ocr=False)
    with pymupdf.open(stream=result.pdf, filetype="pdf") as pdf:
        assert pdf.page_count == 3 == result.pages
        assert result.searchable_pages == 0
        # A4 at 200 dpi in, A4 out (points), whatever the render dpi.
        assert abs(pdf[0].rect.width - 595) < 2 and abs(pdf[0].rect.height - 842) < 2


@pytest.mark.skipif(not HAS_TESSERACT, reason="tesseract is not installed")
def test_pdf_has_a_searchable_text_layer():
    tiff = _multipage_tiff(["INVOICE 1001", "TOTAL AMOUNT"], mode="1", compression="group4")  # fax style
    result = tiff_to_searchable_pdf(tiff)
    assert result.pages == 2 and result.searchable_pages == 2
    with pymupdf.open(stream=result.pdf, filetype="pdf") as pdf:
        assert "INVOICE" in pdf[0].get_text().upper()
        assert "TOTAL" in pdf[1].get_text().upper()


def test_bad_input_is_rejected():
    with pytest.raises(TiffConversionError):
        tiff_to_searchable_pdf(b"")
    with pytest.raises(TiffConversionError):
        tiff_to_searchable_pdf(b"%PDF-1.7 not a tiff")


def test_is_tiff_by_header_or_name():
    assert is_tiff(b"II*\x00rest")
    assert is_tiff(b"MM\x00*rest")
    assert is_tiff(b"????", "scan.TIF")
    assert not is_tiff(b"%PDF-1.7", "doc.pdf")


def test_endpoint_returns_pdf(client):
    # `client` (conftest.py) starts the app with a fake database, as CI has no Postgres.
    tiff = _multipage_tiff(["HELLO", "WORLD"])
    r = client.post("/api/agents/convert/tiff-to-pdf",
                    files={"file": ("scan.tiff", tiff, "image/tiff")}, data={"ocr": "false"})
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    assert r.headers["x-page-count"] == "2"
    assert r.content[:5] == b"%PDF-"
    assert 'filename="scan.pdf"' in r.headers["content-disposition"]

    bad = client.post("/api/agents/convert/tiff-to-pdf",
                      files={"file": ("doc.pdf", b"%PDF-1.7", "application/pdf")})
    assert bad.status_code == 400

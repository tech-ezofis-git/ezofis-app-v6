"""Server-side redaction: hidden text must be gone from the output file, not just covered."""

from __future__ import annotations

import io
import json

import pymupdf
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.pii_redact.api import router
from app.pii_redact.redactor import RedactionError, RedactionSpec, redact_document


def _pdf(lines: list[tuple[float, float, str]], metadata: dict | None = None) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    for x, y, text in lines:
        page.insert_text((x, y), text, fontsize=10)
    if metadata:
        doc.set_metadata(metadata)
    data = doc.tobytes()
    doc.close()
    return data


def _text(data: bytes) -> str:
    doc = pymupdf.open(stream=data, filetype="pdf")
    try:
        return "\n".join(page.get_text() for page in doc)
    finally:
        doc.close()


def _ocr_available() -> bool:
    try:
        return bool(pymupdf.get_tessdata())
    except Exception:
        return False


def test_known_values_and_patterns_are_removed_from_the_text():
    data = _pdf([
        (50, 100, "Account Holder: MR RAJAGOPALAN"),
        (50, 120, "Customer Id 123"),
        (50, 140, "Amount 1,123.45"),
        (50, 160, "PAN ABCDE1234F IFSC SBCD0012345"),
        (50, 180, "Mobile 9876543210 Email arun@example.com"),
    ])

    result = redact_document(data, "statement.pdf", "application/pdf",
                             RedactionSpec(values=["MR RAJAGOPALAN", "123"]))
    text = _text(result.content)

    assert result.content_type == "application/pdf"
    for hidden in ("RAJAGOPALAN", "ABCDE1234F", "SBCD0012345", "9876543210", "arun@example.com"):
        assert hidden not in text
    # Labels stay; a short id never hits part of an amount.
    for kept in ("Account Holder", "Customer Id", "1,123.45", "PAN", "IFSC"):
        assert kept in text
    assert result.redactions >= 6


def test_label_column_under_a_stacked_header():
    data = _pdf([
        (60, 100, "Scheme"), (300, 100, "Opening"), (300, 112, "Balance"),
        (400, 100, "Points"), (400, 112, "Accrued"),
        (60, 140, "Reward Plus 2018"), (300, 140, "1,456"), (400, 140, "0"),
        (60, 200, "REWARD POINTS STATEMENT FOR"),
        (300, 240, "Opening"), (300, 252, "Balance"),
        (60, 280, "Reward Plus 2019"), (300, 280, "525"), (400, 280, "163"),
    ])

    text = _text(redact_document(data, "s.pdf", None,
                                 RedactionSpec(labels=["Opening Balance"], patterns=False)).content)

    assert "1,456" not in text and "525" not in text
    for kept in ("Opening", "Balance", "Points", "Accrued", "163", "Reward Plus 2018"):
        assert kept in text


def test_statement_column_with_widely_spaced_rows_and_continuation_page():
    doc = pymupdf.open()
    first = doc.new_page(width=595, height=842)
    for x, y, text in [(60, 100, "Description"), (300, 100, "Deposit"), (400, 100, "Withdrawal"),
                       (500, 100, "Balance")]:
        first.insert_text((x, y), text, fontsize=10)
    # Transactions with three description lines each: values ~5 lines apart.
    y = 130
    for amount, balance in [("1,500.00", "112,953.65"), ("966.00", "110,487.65"), ("2,000.00", "109,523.14")]:
        first.insert_text((60, y), "ATM WITHDRAWAL SELF-SWITCH", fontsize=10)
        first.insert_text((60, y + 12), "AT NFS 04:54:54/916704002072", fontsize=10)
        first.insert_text((60, y + 24), "000000001500000/INR", fontsize=10)
        first.insert_text((410, y), amount, fontsize=10)
        first.insert_text((505, y), balance, fontsize=10)
        y += 60
    first.insert_text((400, y + 20), "Thank you for banking", fontsize=10)
    # Page 2 continues the table without repeating the header.
    second = doc.new_page(width=595, height=842)
    second.insert_text((60, 80), "POS PURCHASE", fontsize=10)
    second.insert_text((410, 80), "1,235.49", fontsize=10)
    second.insert_text((505, 80), "106,777.48", fontsize=10)
    data = doc.tobytes()
    doc.close()

    out = pymupdf.open(stream=redact_document(data, "s.pdf", None,
                                              RedactionSpec(labels=["Withdrawal"], patterns=False)).content,
                       filetype="pdf")
    page1, page2 = out[0].get_text(), out[1].get_text()

    for hidden in ("1,500.00", "966.00", "2,000.00"):
        assert hidden not in page1
    assert "1,235.49" not in page2
    # Other columns, the header and text under the table stay.
    for kept in ("Withdrawal", "112,953.65", "109,523.14", "ATM WITHDRAWAL", "Thank you for banking"):
        assert kept in page1
    assert "106,777.48" in page2 and "POS PURCHASE" in page2


def test_column_keeps_going_past_deposit_only_rows():
    lines = [(300, 100, "Deposit"), (400, 100, "Withdrawal"), (500, 100, "Balance")]
    y = 130
    for _ in range(4):  # four deposit-only rows: no Withdrawal value for ~10 lines
        lines += [(60, y, "IMPS CREDIT"), (305, y, "1,660.00"), (505, y, "117,805.36")]
        y += 30
    lines += [(60, y, "ATM WITHDRAWAL"), (410, y, "1,500.00"), (505, y, "116,305.36"),
              (60, y + 30, "POS PURCHASE"), (410, y + 30, "150.00"), (505, y + 30, "116,155.36"),
              (300, y + 60, "TOTAL"), (305, y + 60, "70,986.83"), (410, y + 60, "69,291.02")]

    text = _text(redact_document(_pdf(lines), "s.pdf", None,
                                 RedactionSpec(labels=["Withdrawal"], patterns=False)).content)

    for hidden in ("1,500.00", "150.00", "69,291.02"):
        assert hidden not in text
    for kept in ("1,660.00", "116,305.36", "70,986.83", "Withdrawal", "TOTAL"):
        assert kept in text


def test_label_inline_value_and_body_text():
    data = _pdf([
        (50, 100, "Opening Balance: 2,500"),
        (50, 140, "BALANCE FORWARD"),
        (50, 152, "SALARY CREDIT"),
    ])

    text = _text(redact_document(data, "s.pdf", None,
                                 RedactionSpec(labels=["Opening Balance", "Balance"], patterns=False)).content)

    assert "2,500" not in text
    assert "Opening Balance" in text
    # "Balance" inside body text is not a column header.
    assert "BALANCE FORWARD" in text and "SALARY CREDIT" in text


def test_metadata_is_scrubbed():
    data = _pdf([(50, 100, "hello")], metadata={"author": "MR RAJAGOPALAN", "title": "Statement"})

    result = redact_document(data, "s.pdf", None, RedactionSpec())
    doc = pymupdf.open(stream=result.content, filetype="pdf")

    assert "RAJAGOPALAN" not in json.dumps(doc.metadata)


def test_jpeg_comes_back_as_jpeg():
    src = pymupdf.open(stream=_pdf([(40, 60, "hello")]), filetype="pdf")
    jpg = src[0].get_pixmap(dpi=72).tobytes("jpg")
    src.close()

    result = redact_document(jpg, "photo.jpg", "image/jpeg", RedactionSpec(ocr=False))

    assert result.content_type == "image/jpeg"
    assert result.content[:2] == b"\xff\xd8"


def test_unsupported_type_fails_closed():
    with pytest.raises(RedactionError):
        redact_document(b"PK\x03\x04 not a pdf", "letter.docx", None, RedactionSpec())


@pytest.mark.skipif(not _ocr_available(), reason="Tesseract language data not installed")
def test_scanned_image_is_ocrd_and_pixels_removed():
    page_pdf = _pdf([(40, 60, "Passport No AB1234567"), (40, 90, "PAN ABCDE1234F")])
    src = pymupdf.open(stream=page_pdf, filetype="pdf")
    png = src[0].get_pixmap(dpi=200).tobytes("png")
    src.close()

    result = redact_document(png, "scan.png", "image/png",
                             RedactionSpec(values=["AB1234567"]))

    assert result.content_type == "image/png"
    assert result.ocr_pages == 1
    assert result.redactions >= 2
    # OCR the output again: the values must be unreadable now.
    out = pymupdf.open(stream=result.content, filetype="png")
    pdf = pymupdf.open("pdf", out.convert_to_pdf())
    page = pdf[0]
    again = page.get_text(textpage=page.get_textpage_ocr(language="eng", dpi=300, full=True))
    assert "AB1234567" not in again and "ABCDE1234F" not in again
    assert "Passport" in again


@pytest.mark.skipif(not _ocr_available(), reason="Tesseract language data not installed")
def test_photo_pdf_with_stray_text_is_ocrd():
    # A passport photo (JPEG) placed in a PDF, plus a few stray text items like converters add.
    src = pymupdf.open()
    card = src.new_page(width=420, height=260)
    card.draw_rect(card.rect, color=None, fill=(0.88, 0.93, 0.86))
    for x, y, text in [(20, 30, "Passport No AB1234567"), (20, 60, "Surname SHARMA"),
                       (20, 90, "Given Name PRIYA DEVI"), (20, 120, "Personal No 19900101123456789")]:
        card.insert_text((x, y), text, fontsize=13)
    card.insert_text((20, 200), "P<INDSHARMA<<PRIYA<DEVI<<<<<<<<<<<<<<<<", fontsize=13, fontname="cour")
    card.insert_text((20, 225), "AB12345674IND9001015F3001014<<<<<<<<<02", fontsize=13, fontname="cour")
    photo = card.get_pixmap(dpi=200).tobytes("jpg", jpg_quality=85)
    src.close()

    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_image(pymupdf.Rect(60, 200, 540, 497), stream=photo)
    for x, text in [(60, "Scanned"), (110, "with"), (140, "PhoneScan")]:
        page.insert_text((x, 820), text, fontsize=6)
    data = doc.tobytes()
    doc.close()

    result = redact_document(data, "AB1234567.pdf", "application/pdf",
                             RedactionSpec(values=["AB1234567", "PRIYA DEVI"]))

    assert result.ocr_pages == 1
    # Read the output the way a person would: render it and OCR the picture with Tesseract.
    pytesseract = pytest.importorskip("pytesseract")
    from PIL import Image
    png = pymupdf.open(stream=result.content, filetype="pdf")[0].get_pixmap(dpi=200).tobytes("png")
    again = pytesseract.image_to_string(Image.open(io.BytesIO(png)))
    for hidden in ("AB1234567", "PRIYA", "DEVI", "19900101123456789", "INDSHARMA"):
        assert hidden not in again
    for kept in ("Passport", "Surname", "Given Name"):
        assert kept in again


def test_patterns_across_split_ocr_lines_and_digit_lookalikes():
    from app.pii_redact.redactor import Word, _pattern_rects

    def word(text, x0, block):
        return Word(pymupdf.Rect(x0, 100, x0 + 60, 130), text, block, 0)

    # OCR put each group in its own block, and read the first 8 as "B".
    split = [word("B765", 80, 1), word("4321", 180, 2), word("0987", 280, 3)]
    rects = _pattern_rects([[w] for w in split])

    assert any(r.contains(split[0].rect) and r.contains(split[2].rect) for r in rects)


def test_dob_date_hidden_label_kept():
    text = _text(redact_document(_pdf([(50, 100, "DOB : 01/01/1990"),
                                       (50, 120, "Date of Birth 25 DEC 1981"),
                                       (50, 140, "Issue Date 12/09/2013")]),
                                 "card.pdf", None, RedactionSpec()).content)

    assert "01/01/1990" not in text and "25 DEC 1981" not in text
    assert "DOB" in text and "Date of Birth" in text
    assert "12/09/2013" in text  # not a birth date


@pytest.mark.skipif(not _ocr_available(), reason="Tesseract language data not installed")
def test_aadhaar_card_photo():
    src = pymupdf.open()
    card = src.new_page(width=520, height=440)
    card.draw_rect(card.rect, color=None, fill=(0.97, 0.97, 0.95))
    card.insert_text((120, 70), "Your Aadhaar No. :", fontsize=16)
    card.insert_text((80, 120), "8765  4321  0987", fontsize=36, fontname="hebo")
    card.insert_text((160, 250), "Government of India", fontsize=14)
    card.insert_text((170, 300), "RAVIKUMAR", fontsize=13)
    card.insert_text((170, 335), "DOB : 01/01/1990", fontsize=12)
    photo = card.get_pixmap(dpi=110).tobytes("jpg", jpg_quality=80)
    src.close()

    result = redact_document(photo, "aadhaar.jpg", "image/jpeg", RedactionSpec(values=["Ravikumar"]))

    assert result.content_type == "image/jpeg"
    pytesseract = pytest.importorskip("pytesseract")
    from PIL import Image
    again = pytesseract.image_to_string(Image.open(io.BytesIO(result.content)))
    compact = again.replace(" ", "")
    assert "876543210987" not in compact and "4321" not in again
    assert "RAVIKUMAR" not in again.upper() and "01/01/1990" not in again
    assert "Aadhaar" in again and "Government" in again and "DOB" in again


@pytest.mark.skipif(not _ocr_available(), reason="Tesseract language data not installed")
def test_aadhaar_letter_photo_with_big_number_on_dark_background():
    # A phone photo of the Aadhaar letter lying on a table: big bold number, lots of background.
    src = pymupdf.open()
    photo_page = src.new_page(width=1045, height=655)
    photo_page.draw_rect(photo_page.rect, color=None, fill=(0.30, 0.17, 0.10))
    for x in range(0, 1045, 23):
        photo_page.draw_line((x, 0), (x + 40, 655), color=(0.22, 0.12, 0.07), width=3)
    photo_page.draw_rect(pymupdf.Rect(300, 0, 760, 655), color=None, fill=(0.96, 0.96, 0.94))
    photo_page.insert_text((330, 40), "State: Tamil Nadu,", fontsize=11)
    photo_page.insert_text((370, 235), "Your Aadhaar No. :", fontsize=15)
    photo_page.insert_text((330, 290), "8765  4321  0987", fontsize=34, fontname="hebo")
    photo_page.insert_text((400, 420), "Government of India", fontsize=12)
    photo = photo_page.get_pixmap(dpi=96).tobytes("jpg", jpg_quality=85)
    src.close()

    # The extra Tesseract pass reads the big number and maps it back to page coordinates
    # (real photos, where PyMuPDF's own OCR misses it, can't be committed as fixtures).
    from app.pii_redact.redactor import _tesseract_words
    page = pymupdf.open("pdf", pymupdf.open(stream=photo, filetype="jpg").convert_to_pdf())[0]
    extra = [w for w in _tesseract_words(page, 1600, 3, 200_000) if w.text == "4321"]
    assert extra and abs(extra[0].rect.y1 / page.rect.height - 290 / 655) < 0.03

    result = redact_document(photo, "876543210987.jpeg", "image/jpeg", RedactionSpec())

    pytesseract = pytest.importorskip("pytesseract")
    from PIL import Image
    again = pytesseract.image_to_string(Image.open(io.BytesIO(result.content)))
    assert "4321" not in again and "876543210987" not in again.replace(" ", "")
    assert "Tamil Nadu" in again and "Government" in again


def test_route_returns_redacted_pdf():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    data = _pdf([(50, 100, "PAN ABCDE1234F")])

    ok = client.post("/api/pii/redact", files={"file": ("a.pdf", data, "application/pdf")},
                     data={"spec": json.dumps({"values": [], "labels": []})})
    bad = client.post("/api/pii/redact", files={"file": ("a.docx", b"xx", "application/msword")},
                      data={"spec": "{}"})

    assert ok.status_code == 200
    assert ok.headers["content-type"] == "application/pdf"
    assert int(ok.headers["x-pii-redactions"]) >= 1
    assert "ABCDE1234F" not in _text(ok.content)
    assert bad.status_code == 422

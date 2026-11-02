"""Server-side redaction of Word, Excel, CSV and text files: values must be gone from the file."""

from __future__ import annotations

import io

import pytest
from docx import Document
from openpyxl import Workbook, load_workbook

from app.pii_redact.redactor import RedactionError, RedactionSpec, redact_document


def _docx_text(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    parts = [p.text for p in doc.paragraphs]
    for table in doc.tables:
        for row in table.rows:
            parts += [cell.text for cell in row.cells]
    for section in doc.sections:
        parts += [p.text for p in section.header.paragraphs]
    return "\n".join(parts)


def test_docx_values_patterns_labels_and_properties():
    doc = Document()
    para = doc.add_paragraph()
    para.add_run("Account Holder: MR RAJAG")
    para.add_run("OPALAN")  # value split across two runs
    doc.add_paragraph("PAN ABCDE1234F, IFSC SBCD0012345")
    doc.add_paragraph("Opening Balance: 2,500")
    doc.sections[0].header.paragraphs[0].text = "Mobile 9876543210"
    table = doc.add_table(rows=3, cols=3)
    for c, text in enumerate(["Scheme", "Opening Balance", "Points"]):
        table.cell(0, c).text = text
    for c, text in enumerate(["Reward Plus 2018", "1,456", "0"]):
        table.cell(1, c).text = text
    for c, text in enumerate(["Customer Id", "123", ""]):
        table.cell(2, c).text = text
    doc.core_properties.author = "MR RAJAGOPALAN"
    buf = io.BytesIO()
    doc.save(buf)

    result = redact_document(buf.getvalue(), "statement.docx", None, RedactionSpec(
        values=["MR RAJAGOPALAN"], labels=["Opening Balance", "Customer Id"]))
    text = _docx_text(result.content)

    assert result.content_type.endswith("wordprocessingml.document")
    for hidden in ("RAJAG", "OPALAN", "ABCDE1234F", "SBCD0012345", "2,500", "9876543210", "1,456", "123"):
        assert hidden not in text
    for kept in ("Account Holder", "Opening Balance", "Points", "Reward Plus 2018", "Customer Id", "█"):
        assert kept in text
    assert Document(io.BytesIO(result.content)).core_properties.author == ""


def test_xlsx_column_under_label_values_and_properties():
    wb = Workbook()
    ws = wb.active
    ws.append(["Date", "Description", "Withdrawal", "Balance"])
    ws.append(["17 Jun 19", "ATM WITHDRAWAL", 1500.00, 52953.65])
    ws.append(["18 Jun 19", "IMPS CREDIT", None, 53953.65])
    ws.append(["19 Jun 19", "POS PURCHASE", 966.00, 52987.65])
    ws.append([])
    ws.append(["Customer", "MR RAJAGOPALAN"])
    ws.append(["Note", "PAN: ABCDE1234F"])
    wb.properties.creator = "MR RAJAGOPALAN"
    buf = io.BytesIO()
    wb.save(buf)

    result = redact_document(buf.getvalue(), "statement.xlsx", None, RedactionSpec(
        values=["MR RAJAGOPALAN"], labels=["Withdrawal"]))
    out = load_workbook(io.BytesIO(result.content))
    sheet = out.active
    cells = [str(c.value) for row in sheet.iter_rows() for c in row if c.value is not None]

    assert result.content_type.endswith("spreadsheetml.sheet")
    for hidden in ("1500", "966", "RAJAGOPALAN", "ABCDE1234F"):
        assert not any(hidden in c for c in cells)
    for kept in ("Withdrawal", "52953.65", "IMPS CREDIT", "Customer", "Note"):
        assert any(kept in c for c in cells)
    assert sheet["C3"].value is None  # empty cell stays empty
    # openpyxl writes its own name when the field is empty; the original author is gone.
    assert "RAJAGOPALAN" not in str(out.properties.creator)


def test_csv_and_text():
    csv_data = b"Date,Withdrawal,Balance\n17 Jun,1500.00,52953.65\n18 Jun,966.00,52987.65\n"
    csv_out = redact_document(csv_data, "s.csv", None, RedactionSpec(labels=["Withdrawal"])).content.decode()
    assert "1500.00" not in csv_out and "966.00" not in csv_out
    assert "52953.65" in csv_out and "Withdrawal" in csv_out

    txt_data = "Customer: MR RAJAGOPALAN\nAccount No: 12345678901\nThanks\n".encode()
    txt_out = redact_document(txt_data, "note.txt", None,
                              RedactionSpec(values=["MR RAJAGOPALAN"], labels=["Account No"])).content.decode()
    assert "RAJAGOPALAN" not in txt_out and "12345678901" not in txt_out
    assert "Customer:" in txt_out and "Account No:" in txt_out and "Thanks" in txt_out


def test_dob_in_text_file():
    out = redact_document(b"Name: X\nDOB: 01/01/1990\n", "a.txt", None, RedactionSpec()).content.decode()
    assert "01/01/1990" not in out and "DOB:" in out


def test_legacy_office_fails_closed():
    with pytest.raises(RedactionError, match="docx"):
        redact_document(b"\xd0\xcf\x11\xe0 old word file", "letter.doc", None, RedactionSpec())


def test_corrupt_docx_fails_closed():
    with pytest.raises(RedactionError):
        redact_document(b"not a zip", "broken.docx", None, RedactionSpec())

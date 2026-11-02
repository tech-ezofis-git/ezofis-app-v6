"""Redact Word (.docx), Excel (.xlsx), CSV and text files in their own format.

Sensitive characters are replaced with █ (spaces kept), so the file keeps its type and name and
the hidden text is gone from the file, not covered. Same rules as PDFs: known values (whole
words), built-in patterns, and labels (the value after "Label:", the cell beside a label, or the
column under a label in a header row).
"""

from __future__ import annotations

import csv
import io
import re

from docx import Document
from openpyxl import load_workbook

MASK = "█"
W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
INLINE_VALUE_MAX = 60
COLUMN_STOP_EMPTY_ROWS = 3

CONTENT_TYPES = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "csv": "text/csv",
    "txt": "text/plain",
}


def _words(value: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9]+", str(value or ""))


def _norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


class TextMasker:
    """Finds sensitive spans in a piece of text and masks them (length preserved)."""

    def __init__(self, values: list[str], labels: list[str], patterns: tuple, use_patterns: bool):
        self.value_res = []
        for value in values:
            parts = _words(value)
            if sum(len(p) for p in parts) < 2:
                continue
            body = r"[^A-Za-z0-9]{0,3}".join(re.escape(p) for p in parts)
            self.value_res.append(re.compile(rf"(?<![A-Za-z0-9]){body}(?![A-Za-z0-9])", re.IGNORECASE))
        self.patterns = [p for _, p in patterns] if use_patterns else []
        self.label_res = []
        self.label_norms = set()
        for label in labels:
            parts = _words(label)
            if not parts:
                continue
            self.label_norms.add(_norm(label))
            body = r"[^A-Za-z0-9]+".join(re.escape(p) for p in parts)
            # "Label: value" / "Label - value" → the value up to the end of the line or field.
            self.label_res.append(re.compile(
                rf"(?<![A-Za-z0-9]){body}\s*[:：\-–—=]\s*(?P<value>[^\r\n\t;|]{{1,{INLINE_VALUE_MAX}}})",
                re.IGNORECASE))

    def spans(self, text: str) -> list[tuple[int, int]]:
        found: list[tuple[int, int]] = []
        for regex in self.value_res + self.patterns:
            # Labelled patterns (DOB) cover only the value, not the label.
            group = "value" if "value" in regex.groupindex else 0
            found += [m.span(group) for m in regex.finditer(text)]
        for regex in self.label_res:
            for m in regex.finditer(text):
                value = m.group("value").rstrip()
                if re.search(r"[A-Za-z0-9]", value):
                    found.append((m.start("value"), m.start("value") + len(value)))
        return found

    def mask(self, text: str) -> tuple[str, int]:
        if not text:
            return text, 0
        spans = self.spans(text)
        if not spans:
            return text, 0
        chars = list(text)
        for start, end in spans:
            for i in range(start, end):
                if not chars[i].isspace():
                    chars[i] = MASK
        return "".join(chars), len(spans)

    def is_label(self, text: str) -> bool:
        return bool(text) and _norm(text) in self.label_norms


def _mask_all(text: str) -> str:
    return "".join(c if c.isspace() else MASK for c in str(text))


# --- Word --------------------------------------------------------------------------------------

def _paragraph_texts(element) -> list:
    """Every paragraph (w:p) inside an XML part: body, tables, text boxes, headers, notes."""
    return list(element.iter(f"{W_NS}p"))


def _mask_paragraph(paragraph, masker: TextMasker) -> int:
    texts = list(paragraph.iter(f"{W_NS}t"))
    if not texts:
        return 0
    full = "".join(t.text or "" for t in texts)
    masked, count = masker.mask(full)
    if not count:
        return 0
    offset = 0
    for t in texts:  # same length, so each run keeps its own share of the text
        length = len(t.text or "")
        t.text = masked[offset:offset + length]
        offset += length
    return count


def _mask_cell_xml(tc) -> bool:
    changed = False
    for t in tc.iter(f"{W_NS}t"):
        if t.text and t.text.strip():
            t.text = _mask_all(t.text)
            changed = True
    return changed


def _cell_text(tc) -> str:
    return "".join(t.text or "" for t in tc.iter(f"{W_NS}t"))


def _docx_table_labels(document, masker: TextMasker) -> int:
    count = 0
    for table in document.element.iter(f"{W_NS}tbl"):
        rows = [list(tr.iter(f"{W_NS}tc")) for tr in table.iter(f"{W_NS}tr")]
        for r, row in enumerate(rows):
            for c, tc in enumerate(row):
                if not masker.is_label(_cell_text(tc)):
                    continue
                if r == 0:  # header row: the column under it
                    for below in rows[1:]:
                        if c < len(below) and _mask_cell_xml(below[c]):
                            count += 1
                elif c + 1 < len(row) and _mask_cell_xml(row[c + 1]):  # key | value
                    count += 1
    return count


def redact_docx(data: bytes, masker: TextMasker) -> tuple[bytes, int]:
    document = Document(io.BytesIO(data))
    count = _docx_table_labels(document, masker)
    parts = [part for part in document.part.package.parts if hasattr(part, "_element")]
    for part in parts:
        for paragraph in _paragraph_texts(part._element):
            count += _mask_paragraph(paragraph, masker)
    props = document.core_properties
    for name in ("author", "last_modified_by", "title", "subject", "keywords", "comments", "category"):
        setattr(props, name, "")
    out = io.BytesIO()
    document.save(out)
    return out.getvalue(), count


# --- Excel -------------------------------------------------------------------------------------

def _cell_str(cell) -> str:
    return "" if cell.value is None else str(cell.value)


def redact_xlsx(data: bytes, masker: TextMasker) -> tuple[bytes, int]:
    workbook = load_workbook(io.BytesIO(data))
    count = 0
    for sheet in workbook.worksheets:
        masked_cells: set[tuple[int, int]] = set()

        def mask_cell(cell) -> None:
            nonlocal count
            if cell.value is None or (cell.row, cell.column) in masked_cells:
                return
            cell.value = _mask_all(_cell_str(cell))
            masked_cells.add((cell.row, cell.column))
            count += 1

        # Labels first: the column under a header label, or the cell beside a label.
        for row in sheet.iter_rows():
            for cell in row:
                if not masker.is_label(_cell_str(cell)):
                    continue
                below = sheet.cell(row=cell.row + 1, column=cell.column)
                if below.value is not None:
                    empty = 0
                    r = cell.row + 1
                    while r <= sheet.max_row and empty < COLUMN_STOP_EMPTY_ROWS:
                        target = sheet.cell(row=r, column=cell.column)
                        if target.value is None:
                            empty += 1
                        elif masker.is_label(_cell_str(target)):
                            break  # the next table's header
                        else:
                            empty = 0
                            mask_cell(target)
                        r += 1
                else:
                    beside = sheet.cell(row=cell.row, column=cell.column + 1)
                    if beside.value is not None:
                        mask_cell(beside)

        # Values, patterns and "Label: value" inside any cell.
        for row in sheet.iter_rows():
            for cell in row:
                if cell.value is None or (cell.row, cell.column) in masked_cells:
                    continue
                text = _cell_str(cell)
                masked, hits = masker.mask(text)
                if hits:
                    cell.value = masked
                    masked_cells.add((cell.row, cell.column))
                    count += hits
    props = workbook.properties
    for name in ("creator", "lastModifiedBy", "title", "subject", "keywords", "description", "category"):
        setattr(props, name, None)
    out = io.BytesIO()
    workbook.save(out)
    return out.getvalue(), count


# --- CSV and text ------------------------------------------------------------------------------

def _decode(data: bytes) -> tuple[str, str]:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return data.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    return data.decode("latin-1", errors="replace"), "latin-1"


def redact_text(data: bytes, masker: TextMasker) -> tuple[bytes, int]:
    text, encoding = _decode(data)
    masked, count = masker.mask(text)
    return masked.encode("utf-8" if encoding == "utf-8-sig" else encoding, errors="replace"), count


def redact_csv(data: bytes, masker: TextMasker) -> tuple[bytes, int]:
    text, encoding = _decode(data)
    try:
        dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    rows = list(csv.reader(io.StringIO(text), dialect))
    count = 0
    label_columns = {c for c, value in enumerate(rows[0]) if masker.is_label(value)} if rows else set()
    for r, row in enumerate(rows):
        for c, value in enumerate(row):
            if r > 0 and c in label_columns and value.strip():
                row[c] = _mask_all(value)
                count += 1
                continue
            masked, hits = masker.mask(value)
            if hits:
                row[c] = masked
                count += hits
    out = io.StringIO()
    csv.writer(out, dialect).writerows(rows)
    return out.getvalue().encode("utf-8" if encoding == "utf-8-sig" else encoding, errors="replace"), count


HANDLERS = {"docx": redact_docx, "xlsx": redact_xlsx, "csv": redact_csv, "txt": redact_text}

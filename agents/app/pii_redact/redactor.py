"""Find sensitive values on each page and burn them out of the file.

What is hidden:
- `values`: known values (the document's metadata for the folder's selected PII fields), matched
  as whole words so a short id like "123" never hits part of an amount.
- `labels`: extra sensitive labels ("Opening Balance"): the value written next to the label, or
  the values under it in the same table column. The label itself stays visible.
- built-in patterns (PAN, Aadhaar, IFSC, email, UPI, phone, account numbers, passport MRZ).

Scanned pages (no text layer) are OCR'd with Tesseract first. If OCR is unavailable for a page
that needs it, redaction fails instead of returning a partly redacted file.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Iterable, Optional

import pymupdf

from app.pii_redact import office

logger = logging.getLogger(__name__)

# Binary Office formats: no safe in-place redaction.
LEGACY_OFFICE = {"doc": "docx", "xls": "xlsx", "ppt": "pptx"}

# Same light grey as the viewer's covers.
FILL = (0.86, 0.86, 0.86)
PAD = 0.6  # points around each cover

IMAGE_TYPES = {"png": "png", "jpg": "jpeg", "jpeg": "jpeg", "bmp": "bmp", "gif": "gif",
               "tif": "tiff", "tiff": "tiff", "webp": "webp"}

PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("pan", re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")),
    ("aadhaar", re.compile(r"(?<!\d)\d{4}[ -]?\d{4}[ -]?\d{4}(?!\d)")),
    ("ifsc", re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")),
    ("email", re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")),
    ("upi", re.compile(r"\b[\w.-]{2,}@[A-Za-z]{2,}\b")),
    ("phone", re.compile(r"(?<!\d)(?:\+91[ -]?)?[6-9]\d{9}(?!\d)")),
    ("account", re.compile(r"(?<!\d)\d{9,18}(?!\d)")),
    ("mrz", re.compile(r"[A-Z0-9<]{2,}<<[A-Z0-9<]{5,}")),
    # A date written after a birth-date label ("DOB : 01/01/1990", "Date of Birth 25 DEC 1981").
    ("dob", re.compile(
        r"(?i)(?:\bD\.?O\.?B\b|\bdate\s+of\s+birth\b|\byear\s+of\s+birth\b|\bbirth\s+date\b)"
        r"[\s:/\-.]*(?P<value>\d{1,2}[\s/.\-]+(?:\d{1,2}|[A-Za-z]{3,9})[\s/.\-]+\d{2,4}|\d{4})")),
)

# OCR look-alikes inside mostly-digit words (pattern matching only; the file is not changed).
_DIGIT_LOOKALIKES = str.maketrans({"O": "0", "o": "0", "D": "0", "I": "1", "l": "1", "|": "1",
                                   "S": "5", "s": "5", "B": "8", "Z": "2", "z": "2"})


def _pattern_text(word: str) -> str:
    """Same length as the word. A misread number ("B765") is read as digits, but only when the
    whole word then is a number, so codes like IFSC "SBCD0012345" stay as they are."""
    digits = sum(c.isdigit() for c in word)
    if not digits or digits < len(word) * 0.6:
        return word
    translated = word.translate(_DIGIT_LOOKALIKES)
    return translated if re.fullmatch(r"[\d,./\-]+", translated) else word


class RedactionError(Exception):
    """The file could not be redacted safely (bad file, OCR unavailable)."""


@dataclass
class RedactionSpec:
    values: list[str] = field(default_factory=list)
    labels: list[str] = field(default_factory=list)
    patterns: bool = True
    ocr: bool = True


@dataclass
class Word:
    rect: pymupdf.Rect
    text: str
    block: int
    line: int

    @property
    def norm(self) -> str:
        return _norm(self.text)


@dataclass
class RedactionResult:
    content: bytes
    content_type: str
    redactions: int
    pages: int
    ocr_pages: int


def _norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def _tokens(value: str) -> list[str]:
    return [t for t in (_norm(part) for part in re.split(r"\s+", str(value or "").strip())) if t]


def _union(rects: Iterable[pymupdf.Rect]) -> pymupdf.Rect:
    out = pymupdf.Rect()
    for rect in rects:
        out |= rect
    return out


# --- page words -----------------------------------------------------------------------------

# Pages where pictures cover at least this share are OCR'd even if they carry some text
# (photo → PDF converters and scanners often add a few stray text items).
OCR_IMAGE_COVERAGE = 0.25
OCR_BLOCK_OFFSET = 100_000  # keeps OCR line keys apart from text-layer line keys
OCR_EXTRA_PASSES = ((1600, 3), (1600, 11))  # (page width px, Tesseract psm) for large print


def _image_coverage(page: pymupdf.Page) -> float:
    area = page.rect.width * page.rect.height
    if not area:
        return 0.0
    covered = 0.0
    for info in page.get_image_info():
        rect = pymupdf.Rect(info["bbox"]) & page.rect
        if not rect.is_empty:
            covered += rect.width * rect.height
    return min(1.0, covered / area)


def _page_words(page: pymupdf.Page, spec: RedactionSpec) -> tuple[list[Word], bool]:
    words = [Word(pymupdf.Rect(w[:4]), w[4], w[5], w[6]) for w in page.get_text("words")]
    if not spec.ocr or not page.get_images():
        return words, False
    if len(words) >= 3 and _image_coverage(page) < OCR_IMAGE_COVERAGE:
        return words, False
    # Scan / photo page: OCR it and keep any real text too.
    try:
        textpage = page.get_textpage_ocr(language="eng", dpi=300, full=True)
    except Exception as exc:  # tessdata missing, tesseract not installed
        raise RedactionError(f"OCR unavailable for a scanned page: {type(exc).__name__}") from exc
    ocr_words = [Word(pymupdf.Rect(w[:4]), w[4], w[5] + OCR_BLOCK_OFFSET, w[6])
                 for w in page.get_text("words", textpage=textpage)]
    # PyMuPDF's OCR misses big print (the Aadhaar number on a card photo), so read the page
    # once more with Tesseract directly. Duplicate words only add overlapping covers.
    for n, (width_px, psm) in enumerate(OCR_EXTRA_PASSES, start=2):
        ocr_words += _tesseract_words(page, width_px, psm, OCR_BLOCK_OFFSET * n)
    return words + ocr_words, True


def _tesseract_words(page: pymupdf.Page, width_px: int, psm: int, block_offset: int) -> list[Word]:
    try:
        import pytesseract
        from PIL import Image

        zoom = width_px / max(page.rect.width, 1)
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), colorspace=pymupdf.csRGB, alpha=False)
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        data = pytesseract.image_to_data(
            image, lang="eng", config=f"--psm {psm}", output_type=pytesseract.Output.DICT)
    except Exception as exc:  # the main OCR pass worked; a failed extra pass is not fatal
        logger.warning("Extra OCR pass failed: %s", type(exc).__name__)
        return []
    words: list[Word] = []
    for i, text in enumerate(data["text"]):
        if not text.strip():
            continue
        x, y, w, h = (data[k][i] / zoom for k in ("left", "top", "width", "height"))
        rect = pymupdf.Rect(page.rect.x0 + x, page.rect.y0 + y, page.rect.x0 + x + w, page.rect.y0 + y + h)
        block = block_offset + data["block_num"][i] * 1000 + data["par_num"][i]
        words.append(Word(rect, text.strip(), block, data["line_num"][i]))
    return words


def _lines(words: list[Word]) -> list[list[Word]]:
    grouped: dict[tuple[int, int], list[Word]] = {}
    for word in words:
        grouped.setdefault((word.block, word.line), []).append(word)
    lines = [sorted(ws, key=lambda w: w.rect.x0) for ws in grouped.values()]
    return sorted(lines, key=lambda ws: (ws[0].rect.y0, ws[0].rect.x0))


# --- known values and patterns --------------------------------------------------------------

def _one_edit_apart(a: str, b: str) -> bool:
    """At most one substituted, missing or extra character (OCR misreads)."""
    if abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        return sum(x != y for x, y in zip(a, b)) <= 1
    short, long_ = (a, b) if len(a) < len(b) else (b, a)
    return any(long_[:i] + long_[i + 1:] == short for i in range(len(long_)))


def _token_matches(word: str, token: str) -> bool:
    """Exact; a long value inside a longer OCR word (MRZ); or one OCR misread on long values.
    Short tokens (ids like "123") stay exact so they never hit part of an amount."""
    if not word or not token:
        return False
    if word == token:
        return True
    if len(token) >= 6 and token in word:
        return True
    return len(token) >= 8 and _one_edit_apart(word, token)


def _value_rects(lines: list[list[Word]], values: list[str]) -> list[pymupdf.Rect]:
    rects: list[pymupdf.Rect] = []
    for value in values:
        tokens = _tokens(value)
        if not tokens or sum(len(t) for t in tokens) < 2:
            continue
        joined = "".join(tokens)
        for line in lines:
            norms = [w.norm for w in line]
            for i in range(len(line)):
                # Word by word ("PRIYA" "DEVI")...
                if i + len(tokens) <= len(line) and all(
                        _token_matches(norms[i + j], token) for j, token in enumerate(tokens)):
                    rects.append(_union(w.rect for w in line[i:i + len(tokens)]))
                # ...or OCR glued the words together ("PRIYADEVI").
                elif len(tokens) > 1 and _token_matches(norms[i], joined):
                    rects.append(line[i].rect)
    return rects


def _is_mrz_line(line: list[Word]) -> bool:
    """Passport machine-readable line; OCR often reads some '<' fillers as K, L or «."""
    compact = "".join(w.text for w in line).upper().replace("«", "<")
    return compact.startswith("P<") or (compact.count("<") >= 3 and len(compact) >= 20)


def _visual_rows(words: list[Word]) -> list[list[Word]]:
    """Words at the same height, whatever OCR block / line they were put in (big, widely
    spaced numbers like an Aadhaar number are often split into separate OCR lines)."""
    rows: list[list[Word]] = []
    for word in sorted(words, key=lambda w: ((w.rect.y0 + w.rect.y1) / 2, w.rect.x0)):
        if rows and _same_row(rows[-1][0].rect, word.rect):
            rows[-1].append(word)
        else:
            rows.append([word])
    return [sorted(row, key=lambda w: w.rect.x0) for row in rows]


def _pattern_rects(lines: list[list[Word]]) -> list[pymupdf.Rect]:
    rects: list[pymupdf.Rect] = []
    words = [w for line in lines for w in line]
    for line in lines + _visual_rows(words):
        if _is_mrz_line(line):
            rects.append(_union(w.rect for w in line))  # the whole MRZ line
            continue
        text, spans = "", []
        for word in line:
            if text:
                text += " "
            spans.append((len(text), len(text) + len(word.text), word))
            text += _pattern_text(word.text)
        for _, pattern in PATTERNS:
            for match in pattern.finditer(text):
                # Labelled patterns (DOB) cover only the value, not the label.
                start, end = (match.span("value") if "value" in pattern.groupindex else match.span())
                hit = [w for s, e, w in spans if s < end and e > start]
                if hit:
                    rects.append(_union(w.rect for w in hit))
    return rects


# --- labels: value next to the label, or the column under it --------------------------------

def _same_row(a: pymupdf.Rect, b: pymupdf.Rect) -> bool:
    return abs((a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2) <= max(a.height, b.height) * 0.5


def _x_overlap(rect: pymupdf.Rect, x0: float, x1: float) -> float:
    return max(0.0, min(rect.x1, x1) - max(rect.x0, x0))


def _find_label_hits(words: list[Word], tokens: list[str]) -> list[list[Word]]:
    """Word runs spelling the label: on one line, or a header stacked over two lines."""
    hits: list[list[Word]] = []
    used: set[int] = set()
    for start in words:
        if id(start) in used or start.norm != tokens[0]:
            continue
        parts, current = [start], start
        for token in tokens[1:]:
            nxt = next((w for w in words
                        if id(w) not in used and w not in parts and w.norm == token and (
                            # side by side
                            (_same_row(current.rect, w.rect)
                             and -1 <= w.rect.x0 - current.rect.x1 <= max(4.0, current.rect.height * 1.5))
                            # stacked header line
                            or (-current.rect.height * 0.3 <= w.rect.y0 - current.rect.y1 <= current.rect.height * 1.2
                                and _x_overlap(w.rect, current.rect.x0 - 2, current.rect.x1 + 2) > 0))), None)
            if nxt is None:
                break
            parts.append(nxt)
            current = nxt
        if len(parts) == len(tokens):
            hits.append(parts)
            used.update(id(p) for p in parts)
    return hits


def _isolated(parts: list[Word], words: list[Word]) -> bool:
    """A header cell: no other word right next to the label on its lines."""
    for part in parts:
        gap = max(4.0, part.rect.height * 1.2)
        for w in words:
            if w in parts or not _same_row(w.rect, part.rect):
                continue
            if 0 <= part.rect.x0 - w.rect.x1 <= gap or 0 <= w.rect.x0 - part.rect.x1 <= gap:
                return False
    return True


# Statement rows have several description lines, so column values can sit far apart.
FIRST_VALUE_GAP_LINES = 6
NEXT_VALUE_GAP_LINES = 12


@dataclass
class Column:
    """A label's table column, reused on later pages that do not repeat the header."""
    x0: float
    x1: float
    line_h: float
    numeric: bool


def _has_digit(text: str) -> bool:
    return bool(re.search(r"\d", text))


def _column_rects(words: list[Word], col: Column, start_y: float, stop_tokens: set[str],
                  skip: list[Word], numeric_only: bool = False) -> tuple[list[pymupdf.Rect], bool]:
    """Values in [col.x0, col.x1] below start_y. Returns (rects, column is numeric).

    Gaps are measured across the whole page, not only this column: a column with empty cells
    (deposit-only rows) keeps going while the table's other columns still have rows.
    """
    below = sorted((w for w in words if w not in skip and w.rect.y0 >= start_y - col.line_h * 0.2),
                   key=lambda w: (w.rect.y0, w.rect.x0))
    rects: list[pymupdf.Rect] = []
    digit_values = text_values = 0
    last_bottom = start_y  # bottom of the last word seen anywhere below the header
    for w in below:
        max_gap = col.line_h * (FIRST_VALUE_GAP_LINES if not rects else NEXT_VALUE_GAP_LINES)
        if not numeric_only and w.rect.y0 - last_bottom > max_gap:
            break  # nothing on the page for a while: the table has ended
        last_bottom = max(last_bottom, w.rect.y1)
        if _x_overlap(w.rect, col.x0, col.x1) < w.rect.width * 0.3:
            continue  # another column
        if w.norm in stop_tokens:  # the next table's header
            break
        if not _has_digit(w.text):
            # A number column ends where plain text starts (text under the table).
            if numeric_only or (digit_values >= 1 and text_values == 0):
                if numeric_only:
                    continue
                break
            text_values += 1
        else:
            digit_values += 1
        rects.append(pymupdf.Rect(max(w.rect.x0, col.x0), w.rect.y0, min(w.rect.x1, col.x1), w.rect.y1))
        last_bottom = max(last_bottom, w.rect.y1)
    return rects, digit_values > 0 and text_values == 0


def _label_rects(words: list[Word], labels: list[str], page_width: float,
                 carry: Optional[dict[str, Column]] = None) -> list[pymupdf.Rect]:
    rects: list[pymupdf.Rect] = []
    all_tokens = [t for t in (_tokens(label) for label in labels) if t]
    stop_tokens = {t[0] for t in all_tokens}
    for tokens in all_tokens:
        label_key = " ".join(tokens)
        hits = _find_label_hits(words, tokens)
        if not hits and carry is not None and label_key in carry and carry[label_key].numeric:
            # Continuation page without the header: same column, numbers only.
            col_rects, _ = _column_rects(words, carry[label_key], 0.0, stop_tokens, [], numeric_only=True)
            rects += col_rects
            continue
        for parts in hits:
            last = max(parts, key=lambda p: p.rect.y0)
            header = _union(p.rect for p in parts)
            line_h = max(p.rect.height for p in parts)

            # 1) inline: "Label: value" / "Label 1,456" on the label's last line
            row = sorted((w for w in words if w not in parts and _same_row(w.rect, last.rect)
                          and w.rect.x0 >= last.rect.x1 - 1
                          and w.rect.x0 - last.rect.x1 <= page_width * 0.12), key=lambda w: w.rect.x0)
            saw_sep = str(last.text).rstrip().endswith((":", "-", "="))
            inline: list[Word] = []
            for w in row:
                if not inline and re.fullmatch(r"[:\-–—=]+", w.text.strip()):
                    saw_sep = True
                    continue
                if not inline:
                    # a neighbouring header ("Points Accrued") is not a value
                    if not saw_sep and not re.search(r"\d", w.text):
                        break
                    inline.append(w)
                    continue
                if w.rect.x0 - inline[-1].rect.x1 > max(4.0, line_h * 1.2):
                    break
                inline.append(w)
            if inline:
                rects.append(_union(w.rect for w in inline))
                continue

            # 2) column under a header cell (never under a label inside body text)
            if not _isolated(parts, words):
                continue
            tol = max(3.0, header.width * 0.25)
            col = Column(header.x0 - tol, header.x1 + tol, line_h, numeric=False)
            col_rects, numeric = _column_rects(words, col, header.y1, stop_tokens, parts)
            rects += col_rects
            if carry is not None and col_rects:
                col.numeric = numeric
                carry[label_key] = col
    return rects


# --- redaction --------------------------------------------------------------------------------

def _redact_doc(doc: pymupdf.Document, spec: RedactionSpec) -> tuple[int, int]:
    total = ocr_pages = 0
    carry: dict[str, Column] = {}  # label columns, for pages that do not repeat the header
    for page in doc:
        words, used_ocr = _page_words(page, spec)
        ocr_pages += int(used_ocr)
        lines = _lines(words)
        rects = _value_rects(lines, spec.values)
        if spec.patterns:
            rects += _pattern_rects(lines)
        if spec.labels:
            rects += _label_rects(words, spec.labels, page.rect.width, carry)
        for rect in rects:
            if rect.is_empty:
                continue
            page.add_redact_annot(rect + (-PAD, -PAD, PAD, PAD), fill=FILL)
            total += 1
        if rects:
            # Removes the text under each cover and blanks the image pixels under it.
            page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_PIXELS,
                                  graphics=pymupdf.PDF_REDACT_LINE_ART_NONE)
    return total, ocr_pages


def _scrub(doc: pymupdf.Document) -> None:
    """Drop metadata, attachments, scripts and form data that could carry the values."""
    doc.scrub(attached_files=True, clean_pages=False, embedded_files=True, hidden_text=False,
              javascript=True, metadata=True, redactions=False, remove_links=False,
              reset_fields=True, reset_responses=True, thumbnails=True, xml_metadata=True)


def redact_document(data: bytes, file_name: str, content_type: Optional[str],
                    spec: RedactionSpec) -> RedactionResult:
    """Redact a PDF, an image, a Word / Excel file or a CSV / text file, keeping its format."""
    ext = (file_name.rsplit(".", 1)[-1] if "." in file_name else "").lower()
    if ext in office.HANDLERS:
        masker = office.TextMasker(spec.values, spec.labels, PATTERNS, spec.patterns)
        try:
            content, count = office.HANDLERS[ext](data, masker)
        except Exception as exc:
            raise RedactionError(f"Could not open the {ext.upper()} file: {type(exc).__name__}") from exc
        return RedactionResult(content, office.CONTENT_TYPES[ext], count, 0, 0)
    if ext in LEGACY_OFFICE:
        raise RedactionError(f"Old .{ext} files cannot be redacted. Save it as .{LEGACY_OFFICE[ext]} and upload again.")
    is_pdf = ext == "pdf" or (content_type or "").lower() == "application/pdf" or data[:5] == b"%PDF-"
    image_type = IMAGE_TYPES.get(ext) or (
        (content_type or "").lower().split("/")[-1] if (content_type or "").lower().startswith("image/") else None)
    if not is_pdf and not image_type:
        raise RedactionError(f"Unsupported file type for redaction: {ext or content_type or 'unknown'}")

    try:
        if is_pdf:
            doc = pymupdf.open(stream=data, filetype="pdf")
        else:
            image_doc = pymupdf.open(stream=data, filetype=image_type)
            doc = pymupdf.open("pdf", image_doc.convert_to_pdf())
            image_doc.close()
    except RedactionError:
        raise
    except Exception as exc:
        raise RedactionError(f"Could not open the file: {type(exc).__name__}") from exc
    if doc.needs_pass:
        raise RedactionError("The file is password-protected.")

    try:
        redactions, ocr_pages = _redact_doc(doc, spec)
        pages = doc.page_count
        if is_pdf:
            _scrub(doc)
            return RedactionResult(doc.tobytes(garbage=4, deflate=True), "application/pdf",
                                   redactions, pages, ocr_pages)
        # Image in → image out, at the original pixel size; JPEG stays JPEG so the file keeps its
        # name and type. Other image types come back as PNG.
        page = doc[0]
        zoom = pymupdf.Pixmap(data).width / page.rect.width if page.rect.width else 1.0
        pixmap = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        if image_type == "jpeg":
            return RedactionResult(pixmap.tobytes("jpg", jpg_quality=92), "image/jpeg",
                                   redactions, pages, ocr_pages)
        return RedactionResult(pixmap.tobytes("png"), "image/png", redactions, pages, ocr_pages)
    finally:
        doc.close()

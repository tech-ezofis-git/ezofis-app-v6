"""Return nested form grids (PO / invoice line items) as JSON arrays."""
from __future__ import annotations

import ast
import json
import re
from typing import Any

from app.ap_skills.form_lines import decode_form_line_items

_LINE_ITEM_HINTS = (
    "lineitem",
    "lineitems",
    "poline",
    "invoiceline",
    "extractedline",
)
_SEMANTIC_LABELS = (
    ("line_no", "Line"),
    ("item_no", "Item"),
    ("description", "Description"),
    ("uom", "UOM"),
    ("qty", "Quantity"),
    ("price", "Unit Price"),
    ("amount", "Amount"),
)
_CONTROL_ID_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_-]{14,31}$")
_WORD_KEYS = frozenset(
    {
        "description",
        "qty",
        "quantity",
        "price",
        "amount",
        "uom",
        "item",
        "line",
        "lineno",
        "linenumber",
        "unitprice",
        "itemno",
        "partnumber",
        "sku",
        "materialdescription",
        "itemdescription",
    }
)


def _compact(value: str) -> str:
    return "".join(ch for ch in (value or "").lower() if ch.isalnum())


def is_line_item_key(key: str) -> bool:
    compact = _compact(key)
    return any(hint in compact for hint in _LINE_ITEM_HINTS)


def _is_control_id(key: str) -> bool:
    text = str(key or "").strip()
    if not text or " " in text or _compact(text) in _WORD_KEYS:
        return False
    if text.lower() in {label.lower() for _, label in _SEMANTIC_LABELS}:
        return False
    if not _CONTROL_ID_RE.fullmatch(text):
        return False
    return any(ch.isupper() for ch in text) and any(ch.islower() for ch in text)


def _looks_like_json_text(text: str) -> bool:
    stripped = (text or "").strip()
    return stripped[:1] in "[{"


def _parse_structured(value: Any) -> Any:
    if isinstance(value, (list, dict)):
        return value
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text or not _looks_like_json_text(text):
        return None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = None
    if isinstance(parsed, (list, dict)):
        return parsed
    # C# Dictionary<string,string> joins JSON objects with commas and drops [ ].
    if text.startswith("{") and "},{" in text.replace(" ", ""):
        try:
            wrapped = json.loads(f"[{text}]")
        except json.JSONDecodeError:
            wrapped = None
        if isinstance(wrapped, list):
            return wrapped
    try:
        parsed = ast.literal_eval(text)
    except (ValueError, SyntaxError, MemoryError):
        parsed = None
    if isinstance(parsed, (list, dict)):
        return parsed
    return None


def _display_line_row(row: dict[str, Any]) -> dict[str, Any]:
    named: dict[str, Any] = {}
    semantic = {key for key, _ in _SEMANTIC_LABELS}
    semantic_labels = {label for _, label in _SEMANTIC_LABELS}
    for key, value in row.items():
        if value in (None, "") or key in semantic or key in semantic_labels:
            continue
        if _is_control_id(str(key)):
            continue
        named[str(key)] = value
    for semantic_key, label in _SEMANTIC_LABELS:
        value = row.get(semantic_key)
        if value not in (None, "") and label not in named:
            named[label] = value
    if named:
        return named
    return {
        str(key): value
        for key, value in row.items()
        if value not in (None, "") and not _is_control_id(str(key))
    }


def _line_item_rows(value: Any) -> list[dict[str, Any]]:
    parsed = _parse_structured(value)
    source = parsed if parsed is not None else value
    decoded = decode_form_line_items(source, None)
    if decoded:
        return [_display_line_row(row) for row in decoded if isinstance(row, dict)]
    if isinstance(parsed, list):
        rows = [_display_line_row(row) for row in parsed if isinstance(row, dict)]
        return [row for row in rows if row]
    if isinstance(parsed, dict) and parsed:
        display = _display_line_row(parsed)
        return [display] if display else []
    return []


def _looks_like_form_grid(value: Any) -> bool:
    parsed = _parse_structured(value)
    rows = parsed if isinstance(parsed, list) else [parsed] if isinstance(parsed, dict) else []
    if not rows or not all(isinstance(row, dict) and row for row in rows):
        return False
    return any(_is_control_id(str(key)) for row in rows for key in row)


def structured_cell(value: Any, key: str = "") -> Any:
    """Return PO / invoice line grids as a JSON array, not a quoted string.

    A string that starts with `[` is one text cell on the report page. An array
    of objects is what the page renders as a table.
    """
    if value in (None, ""):
        return value
    parsed = _parse_structured(value)
    if is_line_item_key(key) or _looks_like_form_grid(value):
        rows = _line_item_rows(value)
        if rows:
            return rows
    if isinstance(parsed, (list, dict)):
        return parsed
    return value


def finish_structured_cells(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Rewrite PO / invoice line-item cells (and any nested JSON) onto every row."""
    out: list[dict[str, Any]] = []
    for row in rows or []:
        if not isinstance(row, dict):
            out.append(row)
            continue
        out.append({str(key): structured_cell(value, key=str(key)) for key, value in row.items()})
    return out

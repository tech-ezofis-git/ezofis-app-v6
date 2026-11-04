"""Pick Quote 1 / Quote 2 / Quote 3 form data for a PDF fill (no model call)."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from app.ftl.quote_estimator.quote_template import HST_RATE

_SKIP_TOP = frozenset(
    {
        "quote_2",
        "quote_3",
        "compare",
        "quote 2",
        "quote 3",
        "line_traceability",
    }
)
_SKIP_OVERLAY = frozenset({"status", "reason", "rules"})

_TYPE_ALIASES = {
    "1": 1,
    "q1": 1,
    "quote 1": 1,
    "main": 1,
    "base": 1,
    "2": 2,
    "q2": 2,
    "quote 2": 2,
    "opt": 2,
    "option": 2,
    "recommended": 2,
    "3": 3,
    "q3": 3,
    "quote 3": 3,
    "alt": 3,
    "alternate": 3,
}


def parse_quote_type(value: Any) -> int:
    if value is None or str(value).strip() == "":
        return 1
    token = re.sub(r"[\s_\-]+", " ", str(value).strip().lower())
    if token not in _TYPE_ALIASES:
        raise ValueError("quoteType must be Quote 1, Quote 2, or Quote 3.")
    return _TYPE_ALIASES[token]


def _norm_key(key: Any) -> str:
    return re.sub(r"[\s_]+", "_", str(key or "").strip().lower())


def _unprefix_variant(obj: Dict[str, Any], n: int) -> Dict[str, Any]:
    prefixes = (f"quote_{n} ", f"quote_{n}_", f"quote {n} ", f"quote {n}_")
    out: Dict[str, Any] = {}
    for key, value in obj.items():
        text = str(key)
        lower = text.lower()
        stripped = text
        for prefix in prefixes:
            if lower.startswith(prefix):
                stripped = text[len(prefix) :]
                break
        if stripped and _norm_key(stripped) not in _SKIP_OVERLAY:
            out[stripped] = value
    return out


def _variant_from(form_data: Dict[str, Any], explicit: Any, n: int) -> Optional[Dict[str, Any]]:
    if isinstance(explicit, dict) and explicit:
        return explicit
    for key, value in form_data.items():
        if _norm_key(key) == f"quote_{n}" and isinstance(value, dict):
            return value
    prefixed = {
        k: v
        for k, v in form_data.items()
        if str(k).lower().startswith(f"quote_{n} ") or str(k).lower().startswith(f"quote_{n}_")
    }
    return prefixed or None


def _skip_variant_key(key: Any) -> bool:
    nk = _norm_key(key)
    return nk in _SKIP_TOP or nk.startswith("quote_2") or nk.startswith("quote_3")


def _is_remarks_key(key: Any) -> bool:
    nk = _norm_key(key)
    return nk in {
        "remarks",
        "notes",
        "notes_remarks",
        "notes_and_remarks",
        "assumptions",
        "internal_notes",
        "release_status",
        "release_reasons",
        "held_items",
    } or nk.endswith("_remarks")


def _merge_field(dst: Dict[str, Any], key: Any, value: Any) -> None:
    """Empty Remarks/Notes must not wipe a value already copied from quote_result."""
    if _empty_value(value) and _is_remarks_key(key) and any(
        _is_remarks_key(existing) and not _empty_value(cell) for existing, cell in dst.items()
    ):
        return
    dst[key] = value


def _base_form(form_data: Dict[str, Any], quote_result: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    base: Dict[str, Any] = {}
    if isinstance(quote_result, dict):
        for key, value in quote_result.items():
            if not _skip_variant_key(key):
                base[key] = value
    for key, value in form_data.items():
        if _skip_variant_key(key):
            continue
        _merge_field(base, key, value)
    return base


def _empty_value(value: Any) -> bool:
    return value in (None, "", [], {})


def _is_compare_lines(value: Any) -> bool:
    if not isinstance(value, dict):
        return False
    return any(_norm_key(k) in ("added", "removed", "changed") for k in value)


def _line_rows(value: Any) -> list:
    if _is_compare_lines(value) or not isinstance(value, list):
        return []
    rows = []
    for row in value:
        if isinstance(row, dict) and any(
            not str(key).startswith("_") and not _empty_value(cell) for key, cell in row.items()
        ):
            rows.append(row)
    return rows


def variant_has_form_values(variant: Optional[Dict[str, Any]], n: int) -> bool:
    """True when this quote has real line items (not status/totals copied from Quote 1)."""
    if not isinstance(variant, dict) or not variant:
        return False
    overlay = _unprefix_variant(variant, n)
    for key, value in overlay.items():
        if _norm_key(key) in ("line_item", "line_items") and _line_rows(value):
            return True
    return False


def _order_from(obj: Dict[str, Any]) -> str:
    for key, value in obj.items():
        if _norm_key(key) in ("order_number", "estimate_number") and str(value or "").strip():
            return str(value).strip()
    return ""


def order_number_for_quote(merged: Dict[str, Any], variant: Optional[Dict[str, Any]], n: int) -> str:
    """Filename / Order Number for this quote: variant first, then Quote 1 plus -Qn."""
    overlay = _unprefix_variant(variant, n) if isinstance(variant, dict) else {}
    from_variant = _order_from(overlay)
    if from_variant:
        return from_variant
    base = _order_from(merged) or "ESTIMATE"
    if n == 1:
        return base
    token = re.sub(r"[\s_\-]+", "", base).upper()
    if token.endswith(f"Q{n}"):
        return base
    return f"{base}-Q{n}"


def _compact(key: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(key or "").lower())


def _amount(value: Any) -> Optional[float]:
    if isinstance(value, bool) or value in (None, ""):
        return None
    try:
        return float(str(value).replace(",", "").replace("$", "").strip())
    except ValueError:
        return None


def _keys_named(data: Dict[str, Any], names: Tuple[str, ...]) -> List[str]:
    return [key for key in data if _compact(key) in names]


def _first_amount(data: Dict[str, Any], names: Tuple[str, ...]) -> Optional[float]:
    """The first non-zero amount under any of these names, else the first amount found."""
    amounts = [_amount(data[key]) for key in _keys_named(data, names)]
    amounts = [value for value in amounts if value is not None]
    return next((value for value in amounts if value), amounts[0] if amounts else None)


def _line_amount(row: Dict[str, Any]) -> Optional[float]:
    fields = {_compact(key): cell for key, cell in row.items()}
    stored = _amount(fields.get("subtotal"))
    if stored is None:
        stored = _amount(fields.get("amount"))
    if stored is not None:
        return stored
    qty, price = _amount(fields.get("qty")), _amount(fields.get("price"))
    return None if qty is None or price is None else qty * price


_CONTACT_NAMES = ("contact", "contactname")
_EMAIL_IN_TEXT_RE = re.compile(r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}", re.IGNORECASE)
_EMPTY_BRACKETS_RE = re.compile(r"\(\s*\)|<\s*>|\[\s*\]")


def clean_contact_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    """A contact name must hold only the name: the model sometimes writes "Name (name@x.com)", which
    overflows the PDF's contact box. The email moves to a blank Email field; a stated one is kept."""
    out = dict(data)
    for key in _keys_named(out, _CONTACT_NAMES):
        text = out[key]
        match = _EMAIL_IN_TEXT_RE.search(text) if isinstance(text, str) else None
        if not match:
            continue
        name = _EMPTY_BRACKETS_RE.sub(" ", _EMAIL_IN_TEXT_RE.sub(" ", text))
        out[key] = re.sub(r"\s+", " ", name).strip(" ,;:-–—|")
        email_keys = _keys_named(out, ("email",)) or ["email" if key.islower() or "_" in key else "Email"]
        if not any(str(out.get(email_key) or "").strip() for email_key in email_keys):
            for email_key in email_keys:
                out[email_key] = match.group(0)
    return out


_LINE_NAMES = ("lineitem", "lineitems")
_FREIGHT_NAMES = ("freight", "freightestimate")
_HST_NAMES = ("hst",)


def reconcile_quote_totals(data: Dict[str, Any], *, recalculate_hst: bool = False) -> Dict[str, Any]:
    """Make the PDF's totals add up from its own line items.

    Saved form totals can't be trusted: calculated Total fields leave out freight, and Quote 2 / 3
    formulas can keep Quote 1's total. Total is always subtotal - discount + freight + HST. A saved
    HST is kept, because it already carries the freight. When no freight is saved, the freight that
    HST was charged on is worked back out, so the document shows what the customer is taxed on."""
    rows: List[Dict[str, Any]] = []
    for key in _keys_named(data, _LINE_NAMES):
        rows = _line_rows(data[key])
        if rows:
            break
    amounts = [_line_amount(row) for row in rows]
    if not amounts or any(value is None for value in amounts):
        return data
    subtotal = round(sum(amounts), 2)

    line_discount = any(
        (_amount(cell) or 0) > 0 for row in rows for key, cell in row.items() if _compact(key) == "discount"
    )
    discount = 0.0 if line_discount else max(0.0, _first_amount(data, ("discount",)) or 0.0)
    taxable = max(0.0, subtotal - discount)

    hst = None if recalculate_hst else _first_amount(data, _HST_NAMES)
    freight = _first_amount(data, _FREIGHT_NAMES) or 0.0
    if not freight and hst:
        implied = round(hst / HST_RATE - taxable)
        freight = float(implied) if implied >= 1 else 0.0
    if hst is None:
        hst = round((taxable + freight) * HST_RATE, 2)

    out = dict(data)
    for names, canonical, value in (
        (("subtotal",), ("Subtotal",), subtotal),
        (_HST_NAMES, ("HST",), hst),
        (("total",), ("Total",), round(taxable + freight + hst, 2)),
    ):
        for key in _keys_named(out, names) or canonical:
            out[key] = value
    if freight:
        for key in set(_keys_named(out, _FREIGHT_NAMES)) | {"Freight", "Freight Estimate"}:
            out[key] = freight
    return out


def form_data_for_quote_type(
    *,
    form_data: Optional[Dict[str, Any]] = None,
    quote_type: Any = None,
    quote_2: Optional[Dict[str, Any]] = None,
    quote_3: Optional[Dict[str, Any]] = None,
    quote_result: Optional[Dict[str, Any]] = None,
) -> Tuple[Optional[Dict[str, Any]], int]:
    """Return (template formData, 1|2|3). Quote 2/3 overlay unprefixed fields onto Quote 1.

    Missing / empty-line Quote 2 or 3 returns (None, n) so the caller can skip the PDF.
    Status GENERATED is not required — the UI may send a manually built quote_2.
    Totals copied from Quote 1 are not enough; that quote must have Line Item rows.
    """
    form = form_data if isinstance(form_data, dict) else {}
    n = parse_quote_type(quote_type)
    base = _base_form(form, quote_result)
    if n == 1:
        order = order_number_for_quote(base, None, 1)
        if order:
            base["Order Number"] = order
        return clean_contact_fields(reconcile_quote_totals(base)), 1
    explicit = quote_2 if n == 2 else quote_3
    variant = _variant_from(form, explicit, n)
    if not variant and isinstance(quote_result, dict):
        variant = _variant_from(quote_result, None, n)
    if not variant_has_form_values(variant, n):
        return None, n
    # Quote 1's freight is worked out first: a variant only carries the fields that changed.
    merged = reconcile_quote_totals(base)
    overlay = _unprefix_variant(variant, n)
    for key, value in overlay.items():
        _merge_field(merged, key, value)
    order = order_number_for_quote(merged, variant, n)
    merged["Order Number"] = order
    has_own_lines = any(_compact(key) in _LINE_NAMES for key in overlay)
    has_own_hst = any(_compact(key) in _HST_NAMES for key in overlay)
    return clean_contact_fields(reconcile_quote_totals(merged, recalculate_hst=has_own_lines and not has_own_hst)), n

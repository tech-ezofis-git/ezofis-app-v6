"""Column highlight contract for reportSpec.columns (UI pills)."""
from __future__ import annotations

from typing import Any, Optional

from app.models.report_agent import (
    ReportColumnOut,
    ReportSpec,
    ReportSpecColumn,
    ReportSpecHighlight,
    ReportSpecHighlightRule,
)

_HIGHLIGHT_OPS = {
    "eq",
    "neq",
    "contains",
    "notcontains",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "empty",
    "notempty",
}

_COLOR_IDS = {
    "gray",
    "green",
    "red",
    "orange",
    "yellow",
    "blue",
    "primary",
    "secondary",
    "tertiary",
    "purple",
    "violet",
    "indigo",
    "cyan",
    "teal",
    "pink",
    "bronze",
    "gold",
}

_COLOR_ALIASES = {
    "grey": "gray",
    "neutral": "gray",
    "success": "green",
    "error": "red",
    "danger": "red",
    "warning": "orange",
    "info": "blue",
}

HIGHLIGHT_PROMPT_SNIPPET = """
To highlight a column's values, add a "highlight" object to that column in reportSpec.columns:
"highlight": { "default": "<color id or null>", "rules": [ { "op": "...", "value": ..., "value2": ..., "compareField": "...", "color": "<color id>", "label": "..." } ] }
- Put highlight only on reportSpec.columns. Do not add it to Userdefined / Default / Agent palettes or reportPrompt.
- op: eq | neq | contains | notContains | gt | gte | lt | lte | between | empty | notEmpty
- gt/gte/lt/lte/between compare numerically (currency symbols and commas are ignored); text ops are case-insensitive.
- between uses value (min) and value2 (max).
- compareField: another column key to compare against instead of value (e.g. Total gt ALT_Total).
- label is optional; omit it to show the cell value itself.
- Rules are checked in order and the first match wins, so put the most specific rule first.
- default: color for values that match no rule; null leaves them gray.
- Omit "highlight" (or use null) for columns that need no color.
color must be exactly one of: gray, green, red, orange, yellow, blue, primary, secondary, tertiary, purple, violet, indigo, cyan, teal, pink, bronze, gold.
If unsure, use "gray". Return the id only, never a hex code.
""".strip()


def normalize_color_id(raw: Any) -> Optional[str]:
    text = str(raw or "").strip().lower()
    if not text:
        return None
    if "-" in text:
        text = text.split("-", 1)[0]
    text = _COLOR_ALIASES.get(text, text)
    return text if text in _COLOR_IDS else "gray"


def parse_highlight(raw: Any) -> Optional[ReportSpecHighlight]:
    if raw is None or raw is False:
        return None
    if not isinstance(raw, dict):
        return None
    rules_raw = raw.get("rules")
    if not isinstance(rules_raw, list) or not rules_raw:
        return None
    rules: list[ReportSpecHighlightRule] = []
    for item in rules_raw:
        if not isinstance(item, dict):
            continue
        op = str(item.get("op") or "").strip()
        color = normalize_color_id(item.get("color"))
        if not op or not color:
            continue
        op_norm = op if op in {"notContains", "notEmpty"} else op.lower()
        if op_norm.lower().replace("_", "") not in _HIGHLIGHT_OPS:
            continue
        if op_norm.lower() == "notcontains":
            op_norm = "notContains"
        elif op_norm.lower() == "notempty":
            op_norm = "notEmpty"
        compare = item.get("compareField") or item.get("compare_field")
        rules.append(
            ReportSpecHighlightRule(
                op=op_norm,
                color=color,
                value=item.get("value"),
                value2=item.get("value2"),
                compare_field=str(compare).strip() if compare else None,
                label=(str(item.get("label")).strip() or None) if item.get("label") is not None else None,
            )
        )
    if not rules:
        return None
    default_raw = raw.get("default")
    default = None if default_raw in (None, "", False) else normalize_color_id(default_raw)
    return ReportSpecHighlight(default=default, rules=rules)


def _hl(*, default: Optional[str], rules: list[dict[str, Any]]) -> ReportSpecHighlight:
    parsed = parse_highlight({"default": default, "rules": rules})
    if parsed is None:
        raise ValueError("invalid highlight recipe")
    return parsed


def recipe_highlight_for(col: ReportSpecColumn, *, selected_keys: Optional[set[str]] = None) -> Optional[ReportSpecHighlight]:
    """Deterministic pills for known agent columns. Does not invent RFQ form rules."""
    compact = "".join(ch for ch in (col.key or "").lower() if ch.isalnum())
    label = (col.label or "").lower()
    keys = selected_keys or set()

    if compact in {"agingbucket", "aging"} or "aging" in label:
        return _hl(
            default="gray",
            rules=[
                {"op": "eq", "value": "0-5", "color": "green"},
                {"op": "eq", "value": "6-15", "color": "yellow"},
                {"op": "eq", "value": "16-30", "color": "orange"},
                {"op": "eq", "value": "30+", "color": "red"},
            ],
        )
    if compact in {"slabucket", "sla"} or "sla" in label:
        return _hl(
            default="gray",
            rules=[
                {"op": "contains", "value": "within", "color": "green"},
                {"op": "contains", "value": "outside", "color": "red"},
            ],
        )
    if compact == "compare" or "mismatch" in label:
        return _hl(
            default="gray",
            rules=[
                {"op": "contains", "value": "mismatch", "color": "red"},
                {"op": "contains", "value": "partial", "color": "orange"},
                {"op": "contains", "value": "match", "color": "green"},
            ],
        )
    if compact == "matchedstatus" or "matched status" in label:
        return _hl(
            default="gray",
            rules=[
                {"op": "contains", "value": "mismatch", "color": "red"},
                {"op": "contains", "value": "unmatched", "color": "red"},
                {"op": "contains", "value": "partial", "color": "orange"},
                {"op": "contains", "value": "match", "color": "green"},
            ],
        )
    if compact in {"status", "matchedstatus"}:
        return _hl(
            default="gray",
            rules=[
                {"op": "eq", "value": "Approved", "color": "green"},
                {"op": "eq", "value": "Completed", "color": "green"},
                {"op": "eq", "value": "Rejected", "color": "red"},
                {"op": "eq", "value": "Failed", "color": "red"},
                {"op": "eq", "value": "Overdue", "color": "red"},
                {"op": "eq", "value": "Pending", "color": "orange"},
                {"op": "eq", "value": "On Hold", "color": "orange"},
                {"op": "eq", "value": "Open", "color": "blue"},
            ],
        )
    if compact in {"matcheditems", "excludeditems"}:
        empty_color = "red" if "matched" in compact else "yellow"
        empty_label = "None matched" if "matched" in compact else None
        rules: list[dict[str, Any]] = [{"op": "empty", "color": empty_color}]
        if empty_label:
            rules[0]["label"] = empty_label
        rules.append({"op": "notEmpty", "color": "green" if "matched" in compact else "yellow"})
        return _hl(default=None, rules=rules)
    if compact in {"alttotal", "opttotal", "quote2total", "quote3total"} and "total" in keys:
        return _hl(
            default=None,
            rules=[
                {"op": "lt", "compareField": "Total", "color": "green"},
                {"op": "gt", "compareField": "Total", "color": "red"},
            ],
        )
    if compact == "total":
        return _hl(
            default=None,
            rules=[
                {"op": "gte", "value": 50000, "color": "red"},
                {"op": "between", "value": 10000, "value2": 49999.99, "color": "orange"},
                {"op": "lt", "value": 10000, "color": "green"},
            ],
        )
    return None


def merge_column_highlights(spec: ReportSpec, previous: Optional[ReportSpec]) -> ReportSpec:
    """Keep client/generate highlight when align rebuilds columns."""
    if previous is None:
        return spec
    by_key = {c.key.lower(): c.highlight for c in previous.columns if c.highlight is not None}
    if not by_key:
        return spec
    updated = []
    changed = False
    for col in spec.columns:
        hl = by_key.get(col.key.lower())
        if hl is None or col.highlight is not None:
            updated.append(col)
            continue
        updated.append(col.model_copy(update={"highlight": hl}))
        changed = True
    if not changed:
        return spec
    return spec.model_copy(update={"columns": updated})


def apply_recipe_highlights(spec: ReportSpec) -> ReportSpec:
    """Fill highlight on reportSpec.columns when the client/model did not send one."""
    selected_keys = {c.key.lower() for c in spec.columns}
    updated: list[ReportSpecColumn] = []
    changed = False
    for col in spec.columns:
        if col.highlight is not None:
            updated.append(col)
            continue
        hl = recipe_highlight_for(col, selected_keys=selected_keys)
        if hl is None:
            updated.append(col)
            continue
        updated.append(col.model_copy(update={"highlight": hl}))
        changed = True
    if not changed:
        return spec
    return spec.model_copy(update={"columns": updated})


_VALUE_COLOR_HINTS = (
    ("approved", "green"),
    ("completed", "green"),
    ("complete", "green"),
    ("matched", "green"),
    ("within", "green"),
    ("0-5", "green"),
    ("rejected", "red"),
    ("failed", "red"),
    ("mismatch", "red"),
    ("unmatched", "red"),
    ("outside", "red"),
    ("overdue", "red"),
    ("cancelled", "red"),
    ("canceled", "red"),
    ("30+", "red"),
    ("pending", "orange"),
    ("hold", "orange"),
    ("partial", "orange"),
    ("16-30", "orange"),
    ("6-15", "yellow"),
    ("running", "blue"),
    ("progress", "blue"),
    ("open", "blue"),
    ("verifier", "blue"),
)
_FALLBACK_COLORS = ("blue", "orange", "yellow", "purple", "teal", "indigo", "cyan", "pink")
_STRUCTURAL_OPS = frozenset({"empty", "notempty", "notEmpty"})
_MAX_BOUND_VALUES = 12


def _cell_text(value: Any) -> str:
    if value in (None, ""):
        return ""
    return str(value).strip()


def _norm_text(value: Any) -> str:
    return _cell_text(value).lower()


def _distinct_column_values(rows: list[dict[str, Any]], key: str, *, limit: int = _MAX_BOUND_VALUES) -> list[str]:
    counts: dict[str, int] = {}
    seen: dict[str, str] = {}
    low = (key or "").lower()
    compact = "".join(ch for ch in low if ch.isalnum())
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        lower = {str(item).lower(): val for item, val in row.items()}
        text = _cell_text(lower.get(low))
        if not text and compact:
            for item_key, val in lower.items():
                if "".join(ch for ch in item_key if ch.isalnum()) == compact:
                    text = _cell_text(val)
                    if text:
                        break
        if not text:
            continue
        token = text.lower()
        if token not in seen:
            seen[token] = text
            counts[token] = 0
        counts[token] += 1
    ordered = sorted(seen.values(), key=lambda item: (-counts[item.lower()], item))
    return ordered[:limit]


def _recipe_color_for(value: str, rules: list[ReportSpecHighlightRule]) -> Optional[str]:
    text = _norm_text(value)
    for rule in rules or []:
        op = str(rule.op or "").lower()
        needle = _norm_text(rule.value)
        if not needle:
            continue
        if op == "eq" and needle == text:
            return rule.color
        if op in {"contains", "notcontains"} and needle in text:
            return rule.color
    return None


def _keyword_color(value: str) -> Optional[str]:
    text = _norm_text(value)
    for needle, color in _VALUE_COLOR_HINTS:
        if needle in text:
            return color
    return None


def bind_highlights_to_rows(
    columns: list[ReportColumnOut],
    rows: list[dict[str, Any]],
) -> list[ReportColumnOut]:
    """Replace canned highlight.eq values with distinct values actually in the rows."""
    out: list[ReportColumnOut] = []
    for col in columns or []:
        hl = col.highlight
        if hl is None or not hl.rules:
            out.append(col)
            continue
        structural = [
            rule
            for rule in hl.rules
            if (rule.op or "").lower() in _STRUCTURAL_OPS or rule.compare_field
        ]
        values = _distinct_column_values(rows, col.key)
        if not values:
            if structural:
                out.append(
                    col.model_copy(
                        update={"highlight": ReportSpecHighlight(default=hl.default, rules=structural)}
                    )
                )
            else:
                out.append(col.model_copy(update={"highlight": None}))
            continue
        rules = list(structural)
        used: set[str] = set()
        fallback_i = 0
        for value in values:
            token = _norm_text(value)
            if not token or token in used:
                continue
            used.add(token)
            color = _recipe_color_for(value, hl.rules) or _keyword_color(value)
            if not color:
                color = _FALLBACK_COLORS[fallback_i % len(_FALLBACK_COLORS)]
                fallback_i += 1
            rules.append(ReportSpecHighlightRule(op="eq", value=value, color=color))
        out.append(
            col.model_copy(
                update={"highlight": ReportSpecHighlight(default=hl.default or "gray", rules=rules)}
            )
        )
    return out


def column_outs(spec: ReportSpec) -> list[ReportColumnOut]:
    return [
        ReportColumnOut(key=c.key, label=c.label or c.key, highlight=c.highlight)
        for c in spec.columns
    ]


def column_outs_from_locked(locked_columns: list[dict[str, Any]], spec: ReportSpec) -> list[ReportColumnOut]:
    by_key = {c.key.lower(): c.highlight for c in spec.columns}
    out: list[ReportColumnOut] = []
    for item in locked_columns or []:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or "").strip()
        if not key:
            continue
        hl = by_key.get(key.lower()) or parse_highlight(item.get("highlight"))
        out.append(ReportColumnOut(key=key, label=str(item.get("label") or key), highlight=hl))
    return out

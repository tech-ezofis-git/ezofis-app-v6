"""Physical naming rules ported from v6api (FormIdNaming, EzfbColumnNaming, RepositorySqlHelper).

These decide which dynamic table/column names exist. Every name produced here is later
checked against information_schema before it is used in SQL, and is always emitted through
psycopg.sql.Identifier (never string-formatted).
"""

from __future__ import annotations

import re
import uuid

EZFB_SUFFIX_LENGTH = 8
_REPO_ITEMS_TABLE = re.compile(r"^items_[a-f0-9]{8}$", re.IGNORECASE)
_EZFB_TABLE = re.compile(r"^ezfb_[a-z0-9]{1,8}_items$")
_WF_SUFFIX = re.compile(r"^[a-f0-9]{8}$")

SYSTEM_COLUMNS = {
    "item_id", "created_at", "modified_at", "created_by", "modified_by",
    "is_deleted", "today_task", "is_marked", "validfrom", "validto",
}


def normalize_form_id(form_id: str) -> str:
    trimmed = form_id.strip()
    try:
        return str(uuid.UUID(trimmed))
    except ValueError:
        return trimmed


def ezfb_items_table(form_id: str) -> str:
    """dbo.ezfb_{first 8 alphanumerics of form id, lowercase}_items (FormIdNaming)."""
    compact = "".join(ch for ch in form_id if ch.isalnum())
    if not compact:
        raise ValueError(f"Invalid form id for ezfb table: {form_id!r}")
    name = f"ezfb_{compact[:EZFB_SUFFIX_LENGTH].lower()}_items"
    if not _EZFB_TABLE.match(name):
        raise ValueError(f"Invalid ezfb table name derived from form id: {form_id!r}")
    return name


def workflow_suffix(workflow_id: uuid.UUID) -> str:
    """workflow.process_form_{suffix}: first 8 hex chars of the workflow GUID (N format)."""
    suffix = workflow_id.hex[:EZFB_SUFFIX_LENGTH]
    assert _WF_SUFFIX.match(suffix)
    return suffix


def is_valid_repository_items_table(name: str) -> bool:
    return bool(_REPO_ITEMS_TABLE.match(name or ""))


def jsonid_to_column(json_id: str) -> str | None:
    safe = "".join(ch for ch in json_id if ch.isalnum() or ch in "_-")
    return safe or None


def label_to_column(label: str) -> str | None:
    """EzfbColumnNaming.ToColumnNameFromLabel: 'PO Number' -> 'PO_Number', 'G/L Account' -> 'GL_Account'."""
    if not label or not label.strip():
        return None
    out: list[str] = []
    last_underscore = False
    for ch in label.strip():
        if ch.isalnum():
            out.append(ch)
            last_underscore = False
        elif ch.isspace():
            if out and not last_underscore:
                out.append("_")
                last_underscore = True
    while out and out[-1] == "_":
        out.pop()
    if not out:
        return None
    cleaned = "".join(out)
    return "F_" + cleaned if cleaned[0].isdigit() else cleaned


def _alnum_lower(value: str) -> str:
    return "".join(ch for ch in value if ch.isalnum()).lower()


def resolve_ezfb_column(
    column_name: str | None, name: str | None, json_id: str | None, physical: set[str]
) -> str | None:
    """Dual-era resolver (EzfbColumnNaming.TryResolveEzfbColumn). Returns exact physical casing."""
    by_lower = {c.lower(): c for c in physical}

    def hit(candidate: str | None) -> str | None:
        return by_lower.get(candidate.lower()) if candidate else None

    if column_name and (found := hit(column_name.strip())):
        return found
    if name:
        if found := hit(name.strip()):
            return found
        if found := hit(label_to_column(name)):
            return found
    if json_id:
        if found := hit(json_id.strip()):
            return found
        base = jsonid_to_column(json_id.strip())
        if found := hit(base):
            return found
        if base and base[0].isdigit() and (found := hit("F_" + base)):
            return found
    # "Line Item" must still hit a physical "lineitem".
    normalized = {_alnum_lower(c): c for c in physical}
    for candidate in (name, label_to_column(name) if name else None, json_id):
        if candidate and (found := normalized.get(_alnum_lower(candidate))):
            return found
    return None

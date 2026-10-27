"""Run All Workflows / All Repositories reports from EZOFIS catalogs (no tenant SQL)."""
from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import date, datetime
from typing import Any, Optional

from app.data_import.ident import quote_ident
from app.global_search.schema import fetch_columns, find_table, pick_id_column, qualified, row_get
from app.models.report_agent import ReportColumnOut, ReportSpec
from app.report_agent.highlight import column_outs

VIRTUAL_CATALOG_TABLES = frozenset({"workflow_instances_all", "items_all"})


def is_virtual_catalog_table(table: Optional[str]) -> bool:
    return (table or "").lower() in VIRTUAL_CATALOG_TABLES


def _parse_date(value: Any) -> Optional[date]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _aging_bucket(when: Optional[date], today: Optional[date] = None) -> str:
    if when is None:
        return "Unknown"
    today = today or date.today()
    days = (today - when).days
    if days <= 5:
        return "0-5"
    if days <= 15:
        return "6-15"
    if days <= 30:
        return "16-30"
    return "30+"


def _sla_bucket(created: Optional[date], completed: Optional[date], today: Optional[date] = None) -> str:
    today = today or date.today()
    if completed is None:
        start = created or today
        days = (today - start).days
        return "Open" if days <= 5 else "Outside SLA"
    if created is None:
        return "Within SLA"
    days = (completed - created).days
    return "Within SLA" if days <= 5 else "Outside SLA"


def _col_outs(spec: ReportSpec) -> list[ReportColumnOut]:
    columns = column_outs(spec)
    if "repositor" not in (spec.report_type or "").lower():
        return columns
    have = {col.key.lower() for col in columns}
    extra: list[ReportColumnOut] = []
    if "itemid" not in have:
        extra.append(ReportColumnOut(key="itemId", label="Item Id"))
    if "repositoryid" not in have:
        extra.append(ReportColumnOut(key="repositoryId", label="Repository Id"))
    return columns + extra


def fill_filename_aliases(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        current = str(row.get("FileName") or row.get("File Name") or "").strip()
        if current:
            row["FileName"] = current
            row["File Name"] = current
            continue
        for key, value in row.items():
            compact = "".join(ch for ch in str(key).lower() if ch.isalnum())
            if compact not in {"filename", "originalfilename", "ifilename", "documentname"}:
                continue
            val = str(value or "").strip()
            if val:
                row["FileName"] = val
                row["File Name"] = val
                row["file_name"] = val
                break
    return rows


def _newest_first(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def _stamp(row: dict[str, Any]) -> str:
        if not isinstance(row, dict):
            return ""
        for key in (
            "CreatedAt",
            "createdAt",
            "created_at",
            "createdAtUtc",
            "CreatedAtUtc",
            "startedAtUtc",
            "StartedAtUtc",
        ):
            val = row.get(key)
            if isinstance(val, datetime):
                return val.isoformat()
            if isinstance(val, date):
                return val.isoformat()
            if val not in (None, ""):
                return str(val)
        return ""

    return sorted(rows, key=_stamp, reverse=True)


def _paginate(rows: list[dict[str, Any]], page: int, page_size: int) -> tuple[list[dict[str, Any]], int]:
    total = len(rows)
    start = max(0, (max(page, 1) - 1) * max(page_size, 1))
    return rows[start : start + max(page_size, 1)], total


def _keys(spec: ReportSpec) -> set[str]:
    out: set[str] = set()
    for col in spec.columns:
        raw = (col.key or "").strip()
        if not raw:
            continue
        out.add(raw.lower())
        out.add(_listing_compact(raw))
    return out


_ROW_ID_KEYS = frozenset(
    {
        "instanceid",
        "itemid",
        "id",
        "requestno",
        "stage",
        "startedby",
        "actedby",
        "startedbyid",
        "actedbyid",
        "filename",
        "createdby",
        "createdbyid",
        "createdat",
    }
)
_INSTANCE_DEFAULT_KEYS = frozenset(
    {
        "requestno",
        "id",
        "stage",
        "status",
        "startedby",
        "startedbyid",
        "actedby",
        "actedbyid",
        "workflowname",
        "workflowid",
        "instanceid",
        "itemid",
        "createdatutc",
    }
)
_LISTING_COMPACT = frozenset(
    {
        "requestno",
        "reqno",
        "referencenumber",
        "stage",
        "currentstage",
        "activity",
        "stepname",
        "status",
        "startedby",
        "startedbyid",
        "actedby",
        "actedbyid",
        "updatedby",
        "assignedto",
        "workflowname",
        "createdatutc",
        "createdat",
        "workflowid",
        "itemid",
        "instanceid",
        "id",
        "createdby",
        "createdbyid",
        "filename",
        "file_name",
        "repositoryname",
        "repository",
    }
)
_LISTING_OUTPUT_KEYS = frozenset(
    {
        "requestno",
        "stage",
        "status",
        "startedby",
        "startedbyid",
        "actedby",
        "actedbyid",
        "workflowname",
    }
)
_REPO_DEFAULT_KEYS = frozenset(
    {
        "itemid",
        "filename",
        "ifilename",
        "file_name",
        "repository_name",
        "repositoryname",
        "repository",
        "createdby",
        "createdbyid",
        "createdat",
        "status",
    }
)
_REPO_OUTPUT_KEYS = frozenset(
    {
        "filename",
        "ifilename",
        "file_name",
        "repository_name",
        "repositoryname",
        "repository",
        "createdby",
        "createdbyid",
        "createdat",
    }
)
_KEY_ALIAS_GROUPS = (
    frozenset({"repository", "repositoryname", "repository_name"}),
    frozenset({"ifilename", "filename", "file_name", "originalfilename"}),
    frozenset({"requestno", "reqno", "referencenumber"}),
    frozenset({"stage", "currentstage", "stepname"}),
    frozenset({"createdat", "createdatutc", "created_at"}),
    frozenset({"createdby", "created_by"}),
    frozenset({"createdbyid", "created_by_id"}),
)
_USER_NAME_KEYS = (
    "displayName",
    "displayname",
    "fullName",
    "full_name",
    "name",
    "userName",
    "username",
    "email",
)
_USER_NAME_ID_PAIRS = (
    ("startedBy", "startedById"),
    ("actedBy", "actedById"),
    ("CreatedBy", "CreatedById"),
    ("createdBy", "createdById"),
)
_USER_NAME_COMPACT = frozenset({"startedby", "actedby", "createdby"})
_USER_ID_COMPACT = frozenset({"startedbyid", "actedbyid", "createdbyid"})
_HYDRATE_USER_CONCURRENCY = 8
_WF_STATUS_LABELS = {
    0: "Not Started",
    1: "In Progress",
    2: "Completed",
    3: "Cancelled",
    4: "Rejected",
    5: "On Hold",
}
_HYDRATE_CONCURRENCY = 8


def _pick(row: dict[str, Any], *names: str) -> Any:
    if not isinstance(row, dict):
        return ""
    lower = {str(key).lower(): value for key, value in row.items()}
    for name in names:
        value = lower.get(name.lower())
        if isinstance(value, dict):
            nested = _pick(value, *names)
            if nested not in (None, ""):
                return nested
            continue
        if value not in (None, ""):
            return value
    nested_id = lower.get("id")
    if isinstance(nested_id, dict):
        return _pick(nested_id, *names)
    return ""


def _cell(value: Any, key: str = "") -> Any:
    if value in (None, ""):
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    from app.report_agent.json_cells import structured_cell

    return structured_cell(value, key=key)


def _has_row_ids(spec: ReportSpec) -> bool:
    return bool(_keys(spec) & _ROW_ID_KEYS)


def _is_guid(value: Any) -> bool:
    text = str(value or "").strip()
    if len(text) != 36 or text.count("-") != 4:
        return False
    hex_body = text.replace("-", "")
    return len(hex_body) == 32 and all(ch in "0123456789abcdefABCDEF" for ch in hex_body)


def _looks_like_user_id(value: Any) -> bool:
    if _is_guid(value):
        return True
    compact = _compact_id(value)
    return len(compact) == 32 and all(ch in "0123456789abcdef" for ch in compact)


def _split_user_ref(value: Any) -> tuple[str, str]:
    """Return (guid, name). A GUID never belongs in the name column."""
    text = str(value or "").strip()
    if not text:
        return "", ""
    if _looks_like_user_id(text):
        return text, ""
    return "", text


def _id_key_for_name(compact: str) -> str:
    return {
        "startedby": "startedById",
        "actedby": "actedById",
        "createdby": "CreatedById",
    }.get(compact, "")


def _canonical_user_name_key(compact: str) -> str:
    return {"startedby": "startedBy", "actedby": "actedBy", "createdby": "CreatedBy"}.get(compact, "")


def _set_user_id(row: dict[str, Any], id_key: str, uid: str) -> None:
    if not id_key or not uid:
        return
    current = row.get(id_key)
    if current in (None, "") or _looks_like_user_id(current) is False:
        row[id_key] = uid


def _split_user_fields_on_row(row: dict[str, Any]) -> None:
    """Move GUIDs out of *By name columns onto *ById so overlay/resolve can fill names."""
    if not isinstance(row, dict):
        return
    if not row.get("startedBy") and not row.get("startedById"):
        uid, name = _split_user_ref(_pick(row, "created_by", "createdBy"))
        if uid:
            row["startedById"] = uid
        if name:
            row["startedBy"] = name
    if not row.get("actedBy") and not row.get("actedById"):
        uid, name = _split_user_ref(
            _pick(row, "modified_by", "modifiedBy", "updated_by", "updatedBy")
        )
        if uid:
            row["actedById"] = uid
        if name:
            row["actedBy"] = name
    for key in list(row.keys()):
        compact = _listing_compact(str(key))
        if compact in _USER_NAME_COMPACT:
            uid, name = _split_user_ref(row.get(key))
            id_key = _id_key_for_name(compact)
            canon = _canonical_user_name_key(compact)
            if uid:
                _set_user_id(row, id_key, uid)
                row[key] = name
                if canon:
                    row[canon] = name
            elif canon and not row.get(canon):
                row[canon] = name
        elif compact in _USER_ID_COMPACT:
            uid, _ = _split_user_ref(row.get(key))
            if uid:
                row[key] = uid
                canon_id = _id_key_for_name(compact.replace("id", "")) or key
                if canon_id != key:
                    _set_user_id(row, canon_id, uid)
    for name_key, id_key in _USER_NAME_ID_PAIRS:
        uid, name = _split_user_ref(row.get(name_key))
        if uid:
            _set_user_id(row, id_key, uid)
            if not name:
                row[name_key] = ""
        id_uid, _ = _split_user_ref(row.get(id_key))
        if id_uid:
            row[id_key] = id_uid


def _user_display_name(row: dict[str, Any]) -> str:
    first = str(_pick(row, "firstName", "first_name") or "").strip()
    last = str(_pick(row, "lastName", "last_name") or "").strip()
    combined = f"{first} {last}".strip()
    named = str(_pick(row, *_USER_NAME_KEYS) or "").strip()
    if named and not _looks_like_user_id(named):
        return named
    if combined and not _looks_like_user_id(combined):
        return combined
    return ""


def _current_actor(row: dict[str, Any]) -> str:
    named = str(
        _pick(row, "updatedByName", "actedByName", "assignedToName", "currentActorName") or ""
    ).strip()
    if named and not _looks_like_user_id(named):
        return named
    current_id = str(_pick(row, "currentStepInstanceId", "current_step_instance_id") or "").strip()
    steps = row.get("stepInstances") or row.get("step_instances") or row.get("steps") or []
    if current_id and isinstance(steps, list):
        for step in steps:
            if not isinstance(step, dict):
                continue
            if str(_pick(step, "id") or "").strip() != current_id:
                continue
            actor = _pick(
                step,
                "assignedToUserId",
                "assignedTo",
                "actedBy",
                "updatedBy",
                "userId",
            )
            if actor not in (None, ""):
                return str(actor).strip()
    return str(
        _pick(row, "updatedBy", "updated_by", "actedBy", "acted_by", "assignedTo", "assigned_to") or ""
    ).strip()


def _status_label(value: Any) -> Any:
    if value in (None, ""):
        return ""
    if isinstance(value, str) and not value.strip().isdigit():
        return value
    try:
        number = int(value)
    except (TypeError, ValueError):
        return value
    return _WF_STATUS_LABELS.get(number, str(value))


def _current_stage(row: dict[str, Any]) -> str:
    named = str(
        _pick(row, "currentStepName", "currentStage", "current_stage", "stage", "activity") or ""
    ).strip()
    if named:
        return named
    current_id = str(_pick(row, "currentStepInstanceId", "current_step_instance_id") or "").strip()
    steps = row.get("stepInstances") or row.get("step_instances") or row.get("steps") or []
    if current_id and isinstance(steps, list):
        for step in steps:
            if not isinstance(step, dict):
                continue
            if str(_pick(step, "id") or "").strip() == current_id:
                return str(_pick(step, "stepName", "name", "activity", "stage") or "").strip()
    if isinstance(steps, list):
        for step in steps:
            if not isinstance(step, dict):
                continue
            status = step.get("status")
            if status in (1, "1", "InProgress", "inprogress", "In Progress"):
                return str(_pick(step, "stepName", "name", "activity", "stage") or "").strip()
    return str(_pick(row, "stage", "currentStage", "activity", "stepName") or "").strip()


def _compact_id(value: Any) -> str:
    return str(value or "").replace("-", "").lower()


def _sql_col(by_lower: dict[str, str], *names: str) -> str:
    for name in names:
        found = by_lower.get(name.lower())
        if found:
            return found
    want = {"".join(ch for ch in name.lower() if ch.isalnum()) for name in names}
    for live_low, live_orig in by_lower.items():
        if "".join(ch for ch in live_low if ch.isalnum()) in want:
            return live_orig
    return ""


def _needs_request_no(spec: ReportSpec) -> bool:
    return bool(_keys(spec) & {"requestno", "id"})


def _needs_stage(spec: ReportSpec) -> bool:
    return "stage" in _keys(spec)


def _request_no(row: dict[str, Any]) -> str:
    for name in (
        "requestNo",
        "request_no",
        "ReqNo",
        "requestNumber",
        "referenceNumber",
        "reference_number",
        "serialNumber",
        "ticketNo",
        "ticketNumber",
        "name",
        "title",
    ):
        value = _pick(row, name)
        if value in (None, ""):
            continue
        if _is_guid(value):
            continue
        if isinstance(value, int) and value < 100000 and name in {"id", "name"}:
            continue
        return str(value)
    return ""


def _listing_compact(key: str) -> str:
    return "".join(ch for ch in (key or "").lower() if ch.isalnum())


def _alias_wants(compact: str) -> set[str]:
    wants = {compact}
    for group in _KEY_ALIAS_GROUPS:
        if compact in group:
            wants |= set(group)
    return wants


def _value_from_row(source: dict[str, Any], key: str) -> Any:
    if not isinstance(source, dict) or not key:
        return ""
    lower = {str(item).lower(): value for item, value in source.items()}
    direct = lower.get(key.lower())
    if direct not in (None, ""):
        return direct
    wants = _alias_wants(_listing_compact(key))
    for item, value in source.items():
        if value in (None, ""):
            continue
        if _listing_compact(str(item)) in wants:
            return value
    return "" if direct is None else direct


def _named_label(item: dict[str, Any]) -> str:
    return str(
        _pick(
            item or {},
            "name",
            "Name",
            "repositoryName",
            "RepositoryName",
            "title",
            "Title",
        )
        or ""
    ).strip()


def _pick_file_name(row: dict[str, Any], *, depth: int = 0) -> str:
    if not isinstance(row, dict) or depth > 3:
        return ""
    preferred = _pick(
        row,
        "file_name",
        "fileName",
        "FileName",
        "originalFileName",
        "OriginalFileName",
        "original_file_name",
        "IFileName",
        "ifilename",
        "ifileName",
        "documentName",
        "DocumentName",
        "document_name",
    )
    text = str(preferred or "").strip()
    if text and not _looks_like_user_id(text):
        return text
    for nest in (
        "file",
        "File",
        "currentVersion",
        "CurrentVersion",
        "latestVersion",
        "LatestVersion",
        "document",
        "Document",
        "metadata",
        "Metadata",
        "item",
        "Item",
    ):
        nested = row.get(nest)
        if isinstance(nested, dict):
            found = _pick_file_name(nested, depth=depth + 1)
            if found:
                return found
    titled = str(_pick(row, "title", "Title", "name", "Name") or "").strip()
    if titled and not _looks_like_user_id(titled) and "." in titled:
        return titled
    nested_id = row.get("id") or row.get("Id")
    if isinstance(nested_id, dict):
        found = _pick_file_name(nested_id, depth=depth + 1)
        if found:
            return found
    return ""


def _is_listing_key(key: str) -> bool:
    return _listing_compact(key) in _LISTING_COMPACT


def has_form_columns(spec: ReportSpec) -> bool:
    """True when the spec asks for live form fields (Invoice Amount, today_task, ...)."""
    for col in list(spec.columns or []) + [
        c for c in (spec.userdefined_columns or []) if getattr(c, "selected", True)
    ]:
        formula = (getattr(col, "formula", None) or "").lower()
        if (getattr(col, "kind", None) or "").lower() == "agent":
            continue
        if any(token in formula for token in ("count(", "sum(", "avg(", "case ")):
            continue
        if _is_listing_key(getattr(col, "key", "") or ""):
            continue
        return True
    return False


def needs_listing_fields(spec: ReportSpec) -> bool:
    return bool(_keys(spec) & _LISTING_OUTPUT_KEYS)


def needs_repository_fields(spec: ReportSpec) -> bool:
    return bool(_keys(spec) & _REPO_OUTPUT_KEYS)


def wants_instance_execute(spec: ReportSpec, report_type: Optional[str] = None) -> bool:
    """Specified workflow/repository listings of instance fields should use EZOFIS, not form-table SQL.

    Mixed reports that also select form fields (Invoice Amount, today_task, ...) stay on
    form SQL so those values and form filters survive; listing fields are joined after.
    """
    rt = (report_type or spec.report_type or "").lower()
    keys = _keys(spec)
    if rt == "specific_workflow":
        if has_form_columns(spec):
            return False
        return bool(keys & _INSTANCE_DEFAULT_KEYS)
    if rt == "specific_repository":
        # The report page sends File Name together with groupBy and SUM/COUNT.
        # Those totals cannot share a row with each file, and the grouped query
        # returns nothing. A file name means return one row per file.
        if "filename" in keys:
            return True
        if has_form_columns(spec):
            return False
        return bool(keys & _REPO_DEFAULT_KEYS)
    return False


def _match_named(items: list[dict[str, Any]], want: str) -> list[dict[str, Any]]:
    needle = (want or "").strip().lower()
    if not needle:
        return list(items or [])
    exact = [
        item
        for item in items or []
        if _named_label(item).lower() == needle
        or str((item or {}).get("id") or "").strip().lower() == needle
    ]
    if exact:
        return exact
    return [
        item
        for item in items or []
        if needle in _named_label(item).lower() or _named_label(item).lower() in needle
    ]


def _normalize_instance(row: dict[str, Any], *, wf_id: str, wf_name: str) -> dict[str, Any]:
    created = _parse_date(
        _pick(row, "createdAtUtc", "created_at_utc", "startedAtUtc", "started_at_utc")
    )
    completed = _parse_date(_pick(row, "completedAtUtc", "completed_at_utc"))
    instance_id = _pick(row, "instanceId", "instance_id", "id")
    request_no = _request_no(row)
    stage = _current_stage(row)
    started_id, started_name = _split_user_ref(_pick(row, "startedBy", "started_by"))
    started_name = str(_pick(row, "startedByName", "started_by_name") or started_name).strip()
    if _looks_like_user_id(started_name):
        started_name = ""
    acted_raw = _current_actor(row) or _pick(row, "startedBy", "started_by")
    acted_id, acted_name = _split_user_ref(acted_raw)
    acted_name = str(
        _pick(row, "actedByName", "updatedByName", "assignedToName") or acted_name
    ).strip()
    if _looks_like_user_id(acted_name):
        acted_name = ""
    if not acted_id and not acted_name:
        acted_id = started_id
        acted_name = started_name
    return {
        "RequestNo": request_no,
        "requestNo": request_no,
        "id": request_no,
        "workflowId": _pick(row, "workflowId", "workflow_id") or wf_id,
        "itemId": _pick(
            row, "itemId", "item_id", "repositoryItemId", "repository_item_id", "formEntryId"
        ),
        "instanceId": instance_id,
        "workflowName": _pick(row, "workflowName", "workflow_name") or wf_name,
        "status": _status_label(_pick(row, "status")),
        "Stage": stage,
        "stage": stage,
        "startedBy": started_name,
        "startedById": started_id,
        "actedBy": acted_name,
        "actedById": acted_id,
        "createdAtUtc": created,
        "completedAtUtc": completed,
        "open": completed is None,
    }


def _shape_rows(spec: ReportSpec, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    keys = [c.key for c in spec.columns]
    if not keys:
        out = [dict(row) if isinstance(row, dict) else row for row in rows]
        for row in out:
            if isinstance(row, dict):
                _split_user_fields_on_row(row)
        return out
    shaped: list[dict[str, Any]] = []
    for row in rows:
        source = dict(row) if isinstance(row, dict) else {}
        _split_user_fields_on_row(source)
        lower = {str(key).lower(): value for key, value in source.items()}
        item: dict[str, Any] = {}
        for key in keys:
            value = _value_from_row(source, key)
            if value in (None, "") and key.lower() in {"id", "requestno"}:
                value = lower.get("requestno") or lower.get("id") or ""
            compact = _listing_compact(key)
            if compact in _USER_NAME_COMPACT:
                uid, name = _split_user_ref(value)
                id_key = _id_key_for_name(compact)
                if uid:
                    _set_user_id(item, id_key, uid)
                item[key] = _cell(name)
                canon = _canonical_user_name_key(compact)
                if canon:
                    item[canon] = item[key]
            elif compact in _USER_ID_COMPACT:
                uid, _ = _split_user_ref(value)
                if not uid:
                    uid = _split_user_ref(item.get(key))[0]
                item[key] = uid
                if compact == "actedbyid":
                    item["actedById"] = uid
                elif compact == "startedbyid":
                    item["startedById"] = uid
                else:
                    item["CreatedById"] = uid
            else:
                item[key] = _cell(value, key)
                if compact == "requestno":
                    item["RequestNo"] = item[key]
                    item["requestNo"] = item[key]
                elif compact == "stage":
                    item["Stage"] = item[key]
                    item["stage"] = item[key]
                elif compact in {"repositoryname", "repository"}:
                    item["Repository_Name"] = item[key]
                    item["Repository"] = item[key]
                elif compact in {"filename"}:
                    item["FileName"] = item[key]
                    item["File Name"] = item[key]
        if "repositor" in (spec.report_type or "").lower():
            for key in ("itemId", "repositoryId"):
                value = source.get(key)
                if value not in (None, ""):
                    item[key] = value
        _split_user_fields_on_row(item)
        shaped.append(item)
    return shaped


def _keep_valued_columns(
    spec: ReportSpec, rows: list[dict[str, Any]]
) -> tuple[ReportSpec, list[dict[str, Any]], list[ReportColumnOut]]:
    """Keep workflow fields that actually have values (RequestNo/Stage), drop empty form copies."""
    if not spec.columns or not rows:
        return spec, rows, _col_outs(spec)

    def _filled(col: Any) -> bool:
        for row in rows:
            if str(_value_from_row(row or {}, col.key) or "").strip():
                return True
        return False

    keep = [col for col in spec.columns if _filled(col)]
    if not keep:
        return spec, rows, _col_outs(spec)
    keep_keys = [col.key for col in keep]
    new_rows: list[dict[str, Any]] = []
    for row in rows:
        source = dict(row) if isinstance(row, dict) else {}
        _split_user_fields_on_row(source)
        item: dict[str, Any] = {}
        for key in keep_keys:
            item[key] = _value_from_row(source, key)
            compact = _listing_compact(key)
            if compact == "requestno":
                item["RequestNo"] = item[key]
                item["requestNo"] = item[key]
            elif compact == "stage":
                item["Stage"] = item[key]
                item["stage"] = item[key]
            elif compact in {"repositoryname", "repository"}:
                item["Repository_Name"] = item[key]
                item["Repository"] = item[key]
            elif compact in {"filename"}:
                item["FileName"] = item[key]
                item["File Name"] = item[key]
        _split_user_fields_on_row(item)
        new_rows.append(item)
    new_spec = spec.model_copy(update={"columns": keep})
    return new_spec, new_rows, _col_outs(new_spec)


def _merge_instance_detail(row: dict[str, Any], detail: dict[str, Any]) -> dict[str, Any]:
    merged = dict(row or {})
    for key, value in (detail or {}).items():
        if key in {"ok", "error", "error_type", "detail", "status_code"}:
            continue
        if value in (None, "", [], {}):
            continue
        current = merged.get(key)
        if current in (None, "", [], {}) or key in {
            "stepInstances",
            "step_instances",
            "currentStepInstanceId",
            "current_step_instance_id",
        }:
            merged[key] = value
    return merged


async def _hydrate_instance_details(
    ezofis: Any,
    *,
    tenant_id: str,
    workflow_id: str,
    rows: list[dict[str, Any]],
    spec: ReportSpec,
) -> list[dict[str, Any]]:
    """LIST /instances is a thin DTO; stage lives on GET /instances/{id}.stepInstances."""
    if not rows or not _needs_stage(spec):
        return rows
    getter = getattr(ezofis, "get_workflow_instance", None)
    if not callable(getter):
        return rows
    sem = asyncio.Semaphore(_HYDRATE_CONCURRENCY)

    async def _one(row: dict[str, Any]) -> dict[str, Any]:
        if _current_stage(row):
            return row
        inst_id = str(_pick(row, "instanceId", "instance_id", "id") or "").strip()
        if not inst_id:
            return row
        async with sem:
            try:
                detail = await getter(
                    tenant_id=tenant_id, workflow_id=workflow_id, instance_id=inst_id
                )
            except Exception:
                return row
        if not isinstance(detail, dict) or detail.get("ok") is False:
            return row
        return _merge_instance_detail(row, detail)

    return list(await asyncio.gather(*[_one(row) for row in rows]))


async def _sql_ticket_maps(
    db: Any, suffix: str, instance_ids: list[str]
) -> tuple[dict[str, str], dict[str, str], dict[str, str]]:
    """Map compact instance id → requestNo / stage / itemId from workflow_instances_* then mailbox."""
    req: dict[str, str] = {}
    stage: dict[str, str] = {}
    items: dict[str, str] = {}
    compact_ids = [_compact_id(item) for item in instance_ids if _compact_id(item)]
    if db is None or not suffix or not compact_ids:
        return req, stage, items

    async def _ingest(sql: str) -> None:
        rows = await db.fetch(sql, compact_ids)
        for row in rows or []:
            cid = _compact_id(row_get(row, "instance_id"))
            if not cid:
                continue
            number = str(row_get(row, "request_no") or "").strip()
            if number and not _is_guid(number) and cid not in req:
                req[cid] = number
            named = str(row_get(row, "stage") or "").strip()
            if named and cid not in stage:
                stage[cid] = named
            item = str(row_get(row, "item_id") or "").strip()
            if item and cid not in items:
                items[cid] = item

    located = await find_table(
        db,
        (f"workflow_instances_{suffix}", f"workflowinstances_{suffix}"),
        prefer_schemas=("workflow", "dbo", "public"),
    )
    if located:
        schema, table = located
        by_lower, _ = await fetch_columns(db, schema, table)
        id_col = pick_id_column(by_lower) or by_lower.get("id")
        ref_col = _sql_col(by_lower, "reference_number", "referencenumber")
        req_col = _sql_col(by_lower, "request_no", "requestno", "requestnumber", "request_number")
        stage_col = _sql_col(
            by_lower,
            "stage",
            "current_stage",
            "currentstage",
            "activity",
            "step_name",
            "current_step_name",
        )
        if id_col:
            parts = [f"CAST({quote_ident(id_col)} AS text) AS instance_id"]
            if ref_col and req_col and req_col != ref_col:
                parts.append(
                    f"COALESCE(NULLIF(TRIM(CAST({quote_ident(ref_col)} AS text)), ''), "
                    f"NULLIF(TRIM(CAST({quote_ident(req_col)} AS text)), '')) AS request_no"
                )
            elif ref_col:
                parts.append(f"CAST({quote_ident(ref_col)} AS text) AS request_no")
            elif req_col:
                parts.append(f"CAST({quote_ident(req_col)} AS text) AS request_no")
            if stage_col:
                parts.append(f"CAST({quote_ident(stage_col)} AS text) AS stage")
            item_col = _sql_col(
                by_lower,
                "item_id",
                "itemid",
                "form_entry_id",
                "formentryid",
                "repository_item_id",
            )
            if item_col:
                parts.append(f"CAST({quote_ident(item_col)} AS text) AS item_id")
            sql = (
                f"SELECT {', '.join(parts)} FROM {qualified(schema, table)} "
                f"WHERE lower(replace(CAST({quote_ident(id_col)} AS text), '-', '')) = ANY($1::text[])"
            )
            await _ingest(sql)

    for prefix in ("inbox", "sent", "completed"):
        located = await find_table(
            db,
            (f"{prefix}_{suffix}",),
            prefer_schemas=("workflow", "dbo", "public"),
        )
        if located is None:
            continue
        schema, table = located
        by_lower, _ = await fetch_columns(db, schema, table)
        inst_col = _sql_col(
            by_lower,
            "workflow_instance_id",
            "workflowinstanceid",
            "instanceid",
            "instance_id",
            "process_id",
            "processid",
        )
        ref_col = _sql_col(
            by_lower,
            "reference_number",
            "referencenumber",
            "request_no",
            "requestno",
            "requestnumber",
        )
        stage_col = _sql_col(by_lower, "stage", "current_stage", "currentstage", "activity", "step_name")
        if not inst_col:
            continue
        parts = [f"CAST({quote_ident(inst_col)} AS text) AS instance_id"]
        if ref_col:
            parts.append(f"CAST({quote_ident(ref_col)} AS text) AS request_no")
        if stage_col:
            parts.append(f"CAST({quote_ident(stage_col)} AS text) AS stage")
        if len(parts) == 1:
            continue
        sql = (
            f"SELECT {', '.join(parts)} FROM {qualified(schema, table)} "
            f"WHERE lower(replace(CAST({quote_ident(inst_col)} AS text), '-', '')) = ANY($1::text[])"
        )
        await _ingest(sql)
    return req, stage, items


async def _attach_sql_ticket_fields(
    db: Any, workflow_id: str, rows: list[dict[str, Any]], spec: ReportSpec
) -> list[dict[str, Any]]:
    """V6 requestNo is SQL reference_number (LIST/GET instance DTO does not include it)."""
    if db is None or not rows:
        return rows
    need_req = _needs_request_no(spec)
    need_stage = _needs_stage(spec)
    need_item = any(not _pick(row, "itemId", "item_id", "formEntryId") for row in rows)
    if not need_req and not need_stage and not need_item:
        return rows
    if (
        (not need_req or all(_request_no(row) for row in rows))
        and (not need_stage or all(_current_stage(row) for row in rows))
        and not need_item
    ):
        return rows
    suffix = _compact_id(workflow_id)[:8]
    if not suffix:
        return rows
    try:
        req_map, stage_map, item_map = await _sql_ticket_maps(
            db, suffix, [str(_pick(row, "instanceId", "instance_id", "id") or "") for row in rows]
        )
    except Exception:
        return rows
    if not req_map and not stage_map and not item_map:
        return rows
    out: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        compact = _compact_id(_pick(item, "instanceId", "instance_id", "id"))
        if need_req and not _request_no(item) and compact in req_map:
            item["requestNo"] = req_map[compact]
        if need_stage and not _current_stage(item) and compact in stage_map:
            item["stage"] = stage_map[compact]
        if compact in item_map and not _pick(item, "itemId", "item_id", "formEntryId"):
            item["itemId"] = item_map[compact]
        out.append(item)
    return out


async def _sql_item_instance_map(
    db: Any, suffix: str, item_ids: list[str]
) -> dict[str, str]:
    """Map compact form/repository item_id → compact workflow instance id."""
    mapping: dict[str, str] = {}
    compact_ids = [_compact_id(item) for item in item_ids if _compact_id(item)]
    if db is None or not suffix or not compact_ids:
        return mapping

    async def _ingest(sql: str) -> None:
        rows = await db.fetch(sql, compact_ids)
        for row in rows or []:
            item = _compact_id(row_get(row, "item_id"))
            inst = _compact_id(row_get(row, "instance_id"))
            if item and inst and item not in mapping:
                mapping[item] = inst

    for names in (
        (f"workflow_attachments_{suffix}", f"workflowattachments_{suffix}"),
        (f"workflow_instances_{suffix}", f"workflowinstances_{suffix}"),
        (f"inbox_{suffix}",),
        (f"sent_{suffix}",),
        (f"completed_{suffix}",),
    ):
        located = await find_table(db, names, prefer_schemas=("workflow", "dbo", "public"))
        if located is None:
            continue
        schema, table = located
        by_lower, _ = await fetch_columns(db, schema, table)
        item_col = _sql_col(
            by_lower,
            "item_id",
            "itemid",
            "form_entry_id",
            "formentryid",
            "repository_item_id",
            "repositoryitemid",
        )
        inst_col = _sql_col(
            by_lower,
            "workflow_instance_id",
            "workflowinstanceid",
            "instance_id",
            "instanceid",
            "id",
            "process_id",
            "processid",
        )
        if names[0].startswith("workflow_instances"):
            inst_col = pick_id_column(by_lower) or inst_col
        if not item_col or not inst_col or item_col == inst_col:
            continue
        sql = (
            f"SELECT CAST({quote_ident(item_col)} AS text) AS item_id, "
            f"CAST({quote_ident(inst_col)} AS text) AS instance_id "
            f"FROM {qualified(schema, table)} "
            f"WHERE lower(replace(CAST({quote_ident(item_col)} AS text), '-', '')) = ANY($1::text[])"
        )
        try:
            await _ingest(sql)
        except Exception:
            continue
        if mapping:
            break
    return mapping


async def execute_catalog_spec(
    ezofis: Any,
    spec: ReportSpec,
    *,
    tenant_id: str,
    report_type: str,
    page: int = 1,
    page_size: int = 25,
    workflow_name: Optional[str] = None,
    repository_name: Optional[str] = None,
    db: Any = None,
) -> Optional[tuple[list[ReportColumnOut], list[dict[str, Any]], int, list[str]]]:
    table = (spec.source_table or "").lower()
    rt = (report_type or spec.report_type or "").lower()
    if rt == "specific_workflow":
        if not wants_instance_execute(spec, rt):
            return None
        rows = await _workflow_rows(
            ezofis, spec, tenant_id, workflow_name=workflow_name, db=db
        )
        spec, rows, columns = _keep_valued_columns(spec, rows)
        rows = _newest_first(rows)
        page_rows, total = _paginate(rows, page, page_size)
        warnings = [f"Loaded live EZOFIS instances for '{workflow_name or spec.title}'."]
        if total == 0:
            warnings.append("EZOFIS returned no workflow instances for this workflow.")
        return (columns, page_rows, total, warnings)
    if rt == "all_workflows" or table == "workflow_instances_all":
        rows = await _workflow_rows(ezofis, spec, tenant_id, db=db)
        spec, rows, columns = _keep_valued_columns(spec, rows)
        rows = _newest_first(rows)
        page_rows, total = _paginate(rows, page, page_size)
        warnings = ["Counted live EZOFIS workflow instances across the tenant catalog."]
        if total == 0:
            warnings.append("EZOFIS returned no open workflow instances to count.")
        return (columns, page_rows, total, warnings)
    if rt == "specific_repository":
        if not wants_instance_execute(spec, rt):
            return None
        rows = await _repository_rows(
            ezofis, spec, tenant_id, repository_name=repository_name, db=db
        )
        rows = _newest_first(rows)
        page_rows, total = _paginate(rows, page, page_size)
        warnings = [f"Loaded live EZOFIS items for '{repository_name or spec.title}'."]
        if total == 0:
            warnings.append("EZOFIS returned no repository items for this folder.")
        return (_col_outs(spec), page_rows, total, warnings)
    if rt == "all_repositories" or table == "items_all":
        rows = await _repository_rows(ezofis, spec, tenant_id, db=db)
        rows = _newest_first(rows)
        page_rows, total = _paginate(rows, page, page_size)
        warnings = ["Counted live EZOFIS repository items across the tenant catalog."]
        if total == 0:
            warnings.append("EZOFIS returned no repository items to count.")
        return (_col_outs(spec), page_rows, total, warnings)
    return None


def _collect_user_ids(rows: list[dict[str, Any]]) -> list[str]:
    ids: list[str] = []
    seen: set[str] = set()
    keys = (
        "startedById",
        "actedById",
        "CreatedById",
        "createdById",
        "startedBy",
        "actedBy",
        "CreatedBy",
        "createdBy",
        "created_by",
        "modified_by",
        "updatedBy",
    )
    for row in rows:
        for key in keys:
            raw = _pick(row, key) if isinstance(row, dict) else ""
            if not _looks_like_user_id(raw):
                continue
            compact = _compact_id(raw)
            if compact in seen:
                continue
            seen.add(compact)
            ids.append(str(raw).strip())
    return ids


def _index_user_row(row: dict[str, Any], names: dict[str, str]) -> None:
    uid = str(_pick(row, "id", "Id", "userId", "user_id", "UserId") or "").strip()
    named = _user_display_name(row)
    if not uid or not named or _looks_like_user_id(named):
        return
    names[_compact_id(uid)] = named
    names[uid.lower()] = named


def _stamp_resolved_user_names(item: dict[str, Any], names: dict[str, str]) -> None:
    """Put the person name on every *By column. Leave the GUID on *ById only."""
    for key in list(item.keys()):
        compact = _listing_compact(str(key))
        if compact not in _USER_NAME_COMPACT:
            continue
        current = str(item.get(key) or "").strip()
        if current and not _looks_like_user_id(current):
            continue
        id_key = _id_key_for_name(compact)
        raw_id = item.get(id_key) or current
        lookup = names.get(_compact_id(raw_id)) if raw_id not in (None, "") else ""
        if lookup:
            item[key] = lookup
            canon = _canonical_user_name_key(compact)
            if canon:
                canon_now = str(item.get(canon) or "").strip()
                if not canon_now or _looks_like_user_id(canon_now):
                    item[canon] = lookup
        elif _looks_like_user_id(current):
            item[key] = ""


async def _sql_user_names(db: Any, user_ids: list[str]) -> dict[str, str]:
    names: dict[str, str] = {}
    compact_ids = [_compact_id(item) for item in user_ids if _compact_id(item)]
    if db is None or not compact_ids:
        return names
    located = await find_table(
        db,
        ("Users", "users", "AspNetUsers", "wuser", "WUser"),
        prefer_schemas=("dbo", "public", "identity", "auth"),
    )
    if located is None:
        return names
    schema, table = located
    by_lower, _ = await fetch_columns(db, schema, table)
    id_col = pick_id_column(by_lower) or _sql_col(by_lower, "id", "userid", "user_id")
    name_col = _sql_col(
        by_lower,
        "display_name",
        "displayname",
        "full_name",
        "fullname",
        "name",
        "user_name",
        "username",
        "email",
    )
    first_col = _sql_col(by_lower, "first_name", "firstname")
    last_col = _sql_col(by_lower, "last_name", "lastname")
    if not id_col or not (name_col or first_col):
        return names
    parts = [f"CAST({quote_ident(id_col)} AS text) AS user_id"]
    if name_col:
        parts.append(f"CAST({quote_ident(name_col)} AS text) AS display_name")
    if first_col:
        parts.append(f"CAST({quote_ident(first_col)} AS text) AS first_name")
    if last_col:
        parts.append(f"CAST({quote_ident(last_col)} AS text) AS last_name")
    sql = (
        f"SELECT {', '.join(parts)} FROM {qualified(schema, table)} "
        f"WHERE lower(replace(CAST({quote_ident(id_col)} AS text), '-', '')) = ANY($1::text[])"
    )
    try:
        rows = await db.fetch(sql, compact_ids)
    except Exception:
        return names
    for row in rows or []:
        _index_user_row(
            {
                "id": row_get(row, "user_id"),
                "displayName": row_get(row, "display_name"),
                "firstName": row_get(row, "first_name"),
                "lastName": row_get(row, "last_name"),
            },
            names,
        )
    return names


async def finish_user_columns(
    ezofis: Any,
    rows: list[dict[str, Any]],
    *,
    tenant_id: str,
    db: Any = None,
) -> list[dict[str, Any]]:
    """Last-mile: never return a user GUID in *By name columns."""
    prepared: list[dict[str, Any]] = []
    for row in rows or []:
        if not isinstance(row, dict):
            prepared.append(row)
            continue
        item = dict(row)
        _split_user_fields_on_row(item)
        prepared.append(item)
    try:
        prepared = await resolve_user_names(ezofis, prepared, tenant_id=tenant_id or "", db=db)
    except Exception:
        pass
    for row in prepared:
        if isinstance(row, dict):
            _split_user_fields_on_row(row)
    return prepared


async def resolve_user_names(
    ezofis: Any,
    rows: list[dict[str, Any]],
    *,
    tenant_id: str,
    db: Any = None,
) -> list[dict[str, Any]]:
    """Fill *By name columns from EZOFIS /Users (or tenant SQL); keep GUIDs on *ById."""
    if not rows:
        return rows
    prepared: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        _split_user_fields_on_row(item)
        prepared.append(item)
    want = _collect_user_ids(prepared)
    names: dict[str, str] = {}
    lister = getattr(ezofis, "list_users", None) if ezofis is not None else None
    if callable(lister) and want:
        try:
            listed = await lister(tenant_id)
            for item in listed or []:
                if isinstance(item, dict):
                    _index_user_row(item, names)
        except Exception:
            pass
    missing = [uid for uid in want if _compact_id(uid) not in names]
    getter = getattr(ezofis, "get_user", None) if ezofis is not None else None
    if callable(getter) and missing:
        sem = asyncio.Semaphore(_HYDRATE_USER_CONCURRENCY)

        async def _one(uid: str) -> None:
            async with sem:
                try:
                    detail = await getter(tenant_id=tenant_id, user_id=uid)
                except TypeError:
                    try:
                        detail = await getter(tenant_id, uid)
                    except Exception:
                        return
                except Exception:
                    return
            if isinstance(detail, dict):
                _index_user_row(detail, names)

        await asyncio.gather(*[_one(uid) for uid in missing])
    missing = [uid for uid in want if _compact_id(uid) not in names]
    if missing:
        try:
            names.update(await _sql_user_names(db, missing))
        except Exception:
            pass
    out: list[dict[str, Any]] = []
    for item in prepared:
        for name_key, id_key in _USER_NAME_ID_PAIRS:
            raw_id = item.get(id_key) or item.get(name_key)
            uid, already = _split_user_ref(raw_id)
            if uid and not item.get(id_key):
                item[id_key] = uid
            if already and not str(item.get(name_key) or "").strip():
                item[name_key] = already
            current_name = str(item.get(name_key) or "").strip()
            if current_name and not _looks_like_user_id(current_name):
                continue
            lookup = names.get(_compact_id(item.get(id_key) or uid))
            if lookup:
                item[name_key] = lookup
        _stamp_resolved_user_names(item, names)
        out.append(item)
    return out


async def _load_workflow_instances(
    ezofis: Any,
    spec: ReportSpec,
    tenant_id: str,
    *,
    workflow_name: Optional[str] = None,
    db: Any = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Normalized instance rows plus workflow ids (for SQL item→instance maps)."""
    if ezofis is None:
        return [], []
    listed = _match_named(await ezofis.list_workflows(tenant_id), workflow_name or "")

    async def _one(item: dict[str, Any]) -> tuple[list[dict[str, Any]], str]:
        wf_id = str((item or {}).get("id") or "").strip()
        wf_name = str((item or {}).get("name") or "").strip()
        if not wf_id:
            return [], ""
        instances = await ezofis.list_workflow_instances(tenant_id=tenant_id, workflow_id=wf_id)
        instances = await _hydrate_instance_details(
            ezofis,
            tenant_id=tenant_id,
            workflow_id=wf_id,
            rows=list(instances or []),
            spec=spec,
        )
        instances = await _attach_sql_ticket_fields(db, wf_id, instances, spec)
        return [_normalize_instance(row, wf_id=wf_id, wf_name=wf_name) for row in instances], wf_id

    batches = await asyncio.gather(*[_one(item) for item in listed or []], return_exceptions=True)
    records: list[dict[str, Any]] = []
    wf_ids: list[str] = []
    for batch in batches:
        if isinstance(batch, Exception):
            continue
        rows, wf_id = batch
        records.extend(rows)
        if wf_id:
            wf_ids.append(wf_id)
    records = await resolve_user_names(ezofis, records, tenant_id=tenant_id, db=db)
    return records, wf_ids


async def _workflow_rows(
    ezofis: Any,
    spec: ReportSpec,
    tenant_id: str,
    *,
    workflow_name: Optional[str] = None,
    db: Any = None,
) -> list[dict[str, Any]]:
    records, _wf_ids = await _load_workflow_instances(
        ezofis, spec, tenant_id, workflow_name=workflow_name, db=db
    )
    return _shape_rows(spec, _aggregate_workflow(spec, records))


def _form_row_ids(row: dict[str, Any]) -> list[str]:
    ids: list[str] = []
    seen: set[str] = set()
    for name in (
        "item_id",
        "itemId",
        "itemid",
        "workflow_instance_id",
        "workflowInstanceId",
        "instanceId",
        "instance_id",
        "id",
    ):
        raw = _pick(row, name)
        compact = _compact_id(raw)
        if not compact or compact in seen:
            continue
        if _is_guid(raw) or len(compact) >= 8 or str(raw).strip().isdigit():
            seen.add(compact)
            ids.append(compact)
    return ids


def _index_instances(
    instances: list[dict[str, Any]],
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    by_item: dict[str, dict[str, Any]] = {}
    by_inst: dict[str, dict[str, Any]] = {}
    for row in instances:
        inst_id = _compact_id(row.get("instanceId"))
        if inst_id:
            by_inst[inst_id] = row
        item_id = _compact_id(row.get("itemId"))
        if item_id:
            by_item[item_id] = row
    return by_item, by_inst


def _assign_listing_value(row: dict[str, Any], key: str, value: Any) -> bool:
    """Copy a listing field onto a form row. Names overwrite GUIDs left by form SQL."""
    if value in (None, ""):
        return False
    compact = _listing_compact(key)
    existing = row.get(key)
    if compact in _USER_NAME_COMPACT:
        if _looks_like_user_id(value):
            id_key = _id_key_for_name(compact)
            if id_key and row.get(id_key) in (None, ""):
                row[id_key] = _cell(value, id_key)
            return False
        if existing not in (None, "") and not _looks_like_user_id(existing):
            return False
        row[key] = _cell(value, key)
        return True
    if compact in _USER_ID_COMPACT:
        if existing not in (None, "") and _looks_like_user_id(existing):
            return False
        row[key] = _cell(value, key)
        return True
    if existing not in (None, ""):
        return False
    row[key] = _cell(value, key)
    return True


def _fill_listing_fields(row: dict[str, Any], inst: dict[str, Any], spec: ReportSpec) -> None:
    _split_user_fields_on_row(row)
    payload = {
        "RequestNo": inst.get("RequestNo") or inst.get("requestNo"),
        "requestNo": inst.get("requestNo") or inst.get("RequestNo"),
        "Stage": inst.get("Stage") or inst.get("stage"),
        "stage": inst.get("stage") or inst.get("Stage"),
        "status": inst.get("status"),
        "startedBy": inst.get("startedBy"),
        "startedById": inst.get("startedById"),
        "actedBy": inst.get("actedBy"),
        "actedById": inst.get("actedById"),
        "workflowName": inst.get("workflowName"),
        "workflowId": inst.get("workflowId"),
        "instanceId": inst.get("instanceId"),
        "itemId": inst.get("itemId"),
        "createdAtUtc": inst.get("createdAtUtc"),
    }
    for key, value in payload.items():
        _assign_listing_value(row, key, value)
    for col in spec.columns or []:
        key = col.key
        if str(row.get(key) or "").strip() and not _looks_like_user_id(row.get(key)):
            continue
        value = _pick(inst, key)
        if value in (None, "") and _listing_compact(key) == "requestno":
            value = inst.get("RequestNo") or inst.get("requestNo")
        elif value in (None, "") and _listing_compact(key) == "stage":
            value = inst.get("Stage") or inst.get("stage")
        if not _assign_listing_value(row, key, value):
            continue
        if _listing_compact(key) == "requestno":
            row["RequestNo"] = row[key]
            row["requestNo"] = row[key]
        elif _listing_compact(key) == "stage":
            row["Stage"] = row[key]
            row["stage"] = row[key]
        elif _listing_compact(key) in {"repositoryname", "repository"}:
            row["Repository_Name"] = row[key]
            row["Repository"] = row[key]
        elif _listing_compact(key) in {"filename"}:
            row["FileName"] = row[key]


def _copy_repository_fields(row: dict[str, Any], repo_row: dict[str, Any], spec: ReportSpec) -> None:
    payload = {
        "Repository_Name": repo_row.get("Repository_Name"),
        "Repository": repo_row.get("Repository_Name"),
        "FileName": repo_row.get("FileName"),
        "File Name": repo_row.get("FileName"),
        "FileVersion": repo_row.get("FileVersion"),
        "CreatedBy": repo_row.get("CreatedBy"),
        "CreatedById": repo_row.get("CreatedById"),
        "CreatedAt": repo_row.get("CreatedAt"),
        "Status": repo_row.get("Status"),
        "itemId": repo_row.get("itemId"),
        "repositoryId": repo_row.get("repositoryId"),
    }
    for key, value in payload.items():
        _assign_listing_value(row, key, value)
    for col in spec.columns or []:
        key = col.key
        compact = _listing_compact(key)
        if compact in {"repositoryname", "repository"}:
            value = repo_row.get("Repository_Name")
        elif compact in {"filename"}:
            value = repo_row.get("FileName")
        else:
            value = _value_from_row(repo_row, key)
        if not _assign_listing_value(row, key, value):
            continue
        if compact in {"repositoryname", "repository"}:
            row["Repository_Name"] = row[key]
            row["Repository"] = row[key]
        elif compact in {"filename"}:
            row["FileName"] = row[key]
            row["File Name"] = row[key]


async def attach_listing_fields_to_form_rows(
    ezofis: Any,
    spec: ReportSpec,
    rows: list[dict[str, Any]],
    *,
    tenant_id: str,
    workflow_name: Optional[str] = None,
    db: Any = None,
) -> list[dict[str, Any]]:
    """Copy RequestNo / Stage / Status / Acted by / Workflow onto form-table rows."""
    if not rows or not needs_listing_fields(spec):
        return rows
    instances: list[dict[str, Any]] = []
    wf_ids: list[str] = []
    try:
        instances, wf_ids = await _load_workflow_instances(
            ezofis, spec, tenant_id, workflow_name=workflow_name, db=db
        )
    except Exception:
        instances, wf_ids = [], []
    by_item, by_inst = _index_instances(instances)
    item_ids = [cid for row in rows for cid in _form_row_ids(row)]
    item_to_inst: dict[str, str] = {}
    for wf_id in wf_ids:
        suffix = _compact_id(wf_id)[:8]
        if not suffix:
            continue
        try:
            item_to_inst.update(await _sql_item_instance_map(db, suffix, item_ids))
        except Exception:
            continue
        if item_to_inst:
            break
    out: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        _split_user_fields_on_row(item)
        inst = None
        for cid in _form_row_ids(item):
            inst = by_item.get(cid) or by_inst.get(cid)
            if inst is None and cid in item_to_inst:
                inst = by_inst.get(item_to_inst[cid])
            if inst is not None:
                break
        if inst is not None:
            _fill_listing_fields(item, inst, spec)
        out.append(item)
    out = await resolve_user_names(ezofis, out, tenant_id=tenant_id, db=db)
    return _shape_rows(spec, out)


async def _sql_repository_records(
    db: Any,
    *,
    repository_id: str,
    repository_name: str,
    items_table: str = "",
) -> list[dict[str, Any]]:
    """Tenant items_* table when EZOFIS /repositories/{id}/items returns nothing."""
    compact = _compact_id(repository_id)
    named = (items_table or "").strip()
    if "." in named:
        named = named.split(".")[-1].strip('"')
    if db is None or not (compact or named):
        return []
    table_names: list[str] = []
    if named:
        table_names.append(named)
    if len(compact) >= 8:
        table_names.extend((f"items_{compact[:8]}", f"Items_{compact[:8]}"))
    if compact:
        table_names.append(f"items_{compact}")
    located = None
    try:
        located = await find_table(
            db, tuple(table_names), prefer_schemas=("repository", "dbo", "public")
        )
    except Exception:
        located = None
    if located is None:
        return []
    schema, table = located
    by_lower, _ = await fetch_columns(db, schema, table)
    id_col = pick_id_column(by_lower) or _sql_col(by_lower, "id", "itemid", "item_id")
    if not id_col:
        return []
    file_col = _sql_col(
        by_lower,
        "file_name",
        "filename",
        "original_file_name",
        "originalfilename",
        "ifilename",
        "document_name",
        "name",
        "title",
    )
    status_col = _sql_col(by_lower, "status")
    created_by_col = _sql_col(by_lower, "created_by", "createdby")
    created_at_col = _sql_col(
        by_lower, "created_at", "createdat", "created_at_utc", "createdatutc"
    )
    deleted_col = _sql_col(by_lower, "is_deleted", "isdeleted")
    parts = [f"CAST({quote_ident(id_col)} AS text) AS item_id"]
    if file_col:
        parts.append(f"CAST({quote_ident(file_col)} AS text) AS file_name")
    if status_col:
        parts.append(f"CAST({quote_ident(status_col)} AS text) AS status")
    if created_by_col:
        parts.append(f"CAST({quote_ident(created_by_col)} AS text) AS created_by")
    if created_at_col:
        parts.append(f"CAST({quote_ident(created_at_col)} AS text) AS created_at")
    sql = f"SELECT {', '.join(parts)} FROM {qualified(schema, table)}"
    if deleted_col:
        sql += f" WHERE COALESCE({quote_ident(deleted_col)}, false) IS NOT TRUE"
    if created_at_col:
        sql += f" ORDER BY {quote_ident(created_at_col)} DESC"
    try:
        rows = await db.fetch(sql)
    except Exception:
        return []
    out: list[dict[str, Any]] = []
    repo_name = (repository_name or "").strip()
    for row in rows or []:
        created_id, created_name = _split_user_ref(row_get(row, "created_by"))
        fname = str(
            row_get(row, "file_name")
            or row_get(row, "filename")
            or row_get(row, "ifilename")
            or row_get(row, "IFileName")
            or ""
        ).strip()
        if fname and _looks_like_user_id(fname):
            fname = ""
        record = {
            "itemId": row_get(row, "item_id"),
            "repositoryId": repository_id,
            "Repository_Name": repo_name,
            "Repository": repo_name,
            "FileName": fname,
            "File Name": fname,
            "CreatedBy": created_name,
            "CreatedById": created_id,
            "CreatedAt": _parse_date(row_get(row, "created_at")),
            "Status": row_get(row, "status"),
        }
        out.append(record)
    return out


async def _sql_item_file_names(
    db: Any, *, repository_id: str, item_ids: list[str]
) -> dict[str, str]:
    names: dict[str, str] = {}
    compact_ids = [_compact_id(item) for item in item_ids if _compact_id(item)]
    compact = _compact_id(repository_id)
    if db is None or not compact_ids:
        return names
    table_names: list[str] = []
    if len(compact) >= 8:
        table_names.extend((f"items_{compact[:8]}", f"Items_{compact[:8]}"))
    if compact:
        table_names.append(f"items_{compact}")
    located = None
    if table_names:
        located = await find_table(db, tuple(table_names), prefer_schemas=("repository", "dbo", "public"))
    if located is None:
        return names
    schema, table = located
    by_lower, _ = await fetch_columns(db, schema, table)
    id_col = pick_id_column(by_lower) or _sql_col(by_lower, "id", "itemid", "item_id")
    file_col = _sql_col(
        by_lower,
        "file_name",
        "filename",
        "original_file_name",
        "originalfilename",
        "ifilename",
        "document_name",
        "name",
        "title",
    )
    if not id_col or not file_col:
        return names
    sql = (
        f"SELECT CAST({quote_ident(id_col)} AS text) AS item_id, "
        f"CAST({quote_ident(file_col)} AS text) AS file_name "
        f"FROM {qualified(schema, table)} "
        f"WHERE lower(replace(CAST({quote_ident(id_col)} AS text), '-', '')) = ANY($1::text[])"
    )
    try:
        rows = await db.fetch(sql, compact_ids)
    except Exception:
        return names
    for row in rows or []:
        item = _compact_id(row_get(row, "item_id"))
        fname = str(row_get(row, "file_name") or "").strip()
        if item and fname and not _looks_like_user_id(fname):
            names[item] = fname
    return names


async def _repository_item_records(
    ezofis: Any,
    spec: ReportSpec,
    tenant_id: str,
    *,
    repository_name: Optional[str] = None,
    db: Any = None,
) -> list[dict[str, Any]]:
    listed = _match_named(await ezofis.list_repositories(tenant_id), repository_name or "")
    fallback_name = (repository_name or "").strip()

    async def _one(item: dict[str, Any]) -> list[dict[str, Any]]:
        repo_id = str((item or {}).get("id") or (item or {}).get("Id") or "").strip()
        repo_name = _named_label(item) or fallback_name
        if not repo_id:
            return []
        docs = await ezofis.list_repository_items(tenant_id=tenant_id, repository_id=repo_id)
        if not docs and db is not None:
            return await _sql_repository_records(
                db, repository_id=repo_id, repository_name=repo_name
            )
        out: list[dict[str, Any]] = []
        missing: list[dict[str, Any]] = []
        for row in docs or []:
            created_id, created_name = _split_user_ref(
                _pick(row, "createdBy", "CreatedBy", "created_by")
            )
            created_name = str(_pick(row, "createdByName", "CreatedByName") or created_name).strip()
            if _looks_like_user_id(created_name):
                created_name = ""
            fname = _pick_file_name(row)
            record = {
                "itemId": _pick(row, "itemId", "item_id", "id", "Id"),
                "repositoryId": repo_id,
                "Repository_Name": repo_name,
                "Repository": repo_name,
                "FileName": fname,
                "File Name": fname,
                "FileVersion": _pick(row, "fileVersion", "FileVersion", "version"),
                "CreatedBy": created_name,
                "CreatedById": created_id,
                "CreatedAt": _parse_date(
                    _pick(row, "createdAt", "CreatedAt", "documentDate", "createdAtUtc", "created_at")
                ),
                "Status": _pick(row, "status", "Status"),
            }
            if not str(record.get("itemId") or "").strip() or isinstance(record.get("itemId"), dict):
                record["itemId"] = str(_pick(row, "itemId", "item_id") or "").strip()
            out.append(record)
            if not str(record.get("FileName") or "").strip():
                missing.append(record)
        if missing and db is not None:
            names = await _sql_item_file_names(
                db,
                repository_id=repo_id,
                item_ids=[str(row.get("itemId") or "") for row in missing],
            )
            for record in missing:
                fname = names.get(_compact_id(record.get("itemId")))
                if fname:
                    record["FileName"] = fname
                    record["File Name"] = fname
        return out

    batches = await asyncio.gather(*[_one(item) for item in listed or []], return_exceptions=True)
    records: list[dict[str, Any]] = []
    for batch in batches:
        if isinstance(batch, Exception):
            continue
        records.extend(batch)
    if not records and db is not None and fallback_name:
        try:
            records = await _sql_repository_by_name(db, fallback_name)
        except Exception:
            records = records or []
    if fallback_name:
        for row in records:
            if not str(row.get("Repository_Name") or "").strip():
                row["Repository_Name"] = fallback_name
                row["Repository"] = fallback_name
    return await resolve_user_names(ezofis, records, tenant_id=tenant_id, db=db)


async def _sql_repository_by_name(db: Any, repository_name: str) -> list[dict[str, Any]]:
    """Read folder rows from ItemsTableName when the EZOFIS item list is empty."""
    want = (repository_name or "").strip()
    if db is None or not want:
        return []
    located = await find_table(
        db,
        ("Repositories", "repositories", "wrepository"),
        prefer_schemas=("repository", "dbo", "public"),
    )
    if located is None:
        return []
    schema, table = located
    by_lower, _ = await fetch_columns(db, schema, table)
    id_col = _sql_col(by_lower, "id")
    name_col = _sql_col(by_lower, "name")
    items_col = _sql_col(by_lower, "itemstablename", "items_table_name", "items_table")
    if not name_col:
        return []
    select = [f"CAST({quote_ident(name_col)} AS text) AS name"]
    if id_col:
        select.insert(0, f"CAST({quote_ident(id_col)} AS text) AS id")
    if items_col:
        select.append(f"CAST({quote_ident(items_col)} AS text) AS items_table")
    sql = (
        f"SELECT {', '.join(select)} FROM {qualified(schema, table)} "
        f"WHERE lower(CAST({quote_ident(name_col)} AS text)) = lower($1)"
    )
    try:
        found = await db.fetch(sql, want)
    except Exception:
        return []
    records: list[dict[str, Any]] = []
    for row in found or []:
        repo_id = str(row_get(row, "id") or "")
        repo_name = str(row_get(row, "name") or want)
        items_table = str(row_get(row, "items_table") or "")
        records.extend(
            await _sql_repository_records(
                db,
                repository_id=repo_id,
                repository_name=repo_name,
                items_table=items_table,
            )
        )
    return records


async def _repository_rows(
    ezofis: Any,
    spec: ReportSpec,
    tenant_id: str,
    *,
    repository_name: Optional[str] = None,
    db: Any = None,
) -> list[dict[str, Any]]:
    records = await _repository_item_records(
        ezofis, spec, tenant_id, repository_name=repository_name, db=db
    )
    return _shape_rows(spec, _aggregate_repository(spec, records))


async def attach_repository_fields_to_form_rows(
    ezofis: Any,
    spec: ReportSpec,
    rows: list[dict[str, Any]],
    *,
    tenant_id: str,
    repository_name: Optional[str] = None,
    workflow_name: Optional[str] = None,
    db: Any = None,
) -> list[dict[str, Any]]:
    """Copy Repository / File Name onto form or items-table rows."""
    if not rows or not needs_repository_fields(spec):
        return rows
    want = (repository_name or "").strip() or (workflow_name or "").strip()
    try:
        records = await _repository_item_records(
            ezofis, spec, tenant_id, repository_name=want or None, db=db
        )
    except Exception:
        records = []
    by_item: dict[str, dict[str, Any]] = {}
    for record in records:
        item_id = _compact_id(record.get("itemId"))
        if item_id and item_id not in by_item:
            by_item[item_id] = record
    out: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        _split_user_fields_on_row(item)
        repo_row = None
        for cid in _form_row_ids(item):
            repo_row = by_item.get(cid)
            if repo_row is not None:
                break
        if repo_row is not None:
            _copy_repository_fields(item, repo_row, spec)
        elif want and not str(_value_from_row(item, "Repository_Name") or "").strip():
            item["Repository_Name"] = want
            item["Repository"] = want
        out.append(item)
    out = await resolve_user_names(ezofis, out, tenant_id=tenant_id, db=db)
    return _shape_rows(spec, out)


def _workflow_detail_rows(spec: ReportSpec, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    keys = _keys(spec)
    out: list[dict[str, Any]] = []
    for row in records:
        if "aging_bucket" in keys and not row.get("open"):
            continue
        if "processed_count" in keys and row.get("open"):
            continue
        if "inbox_count" in keys and not row.get("open"):
            continue
        item = dict(row)
        item["Aging_Bucket"] = _aging_bucket(row.get("createdAtUtc"))
        item["Sla_Bucket"] = _sla_bucket(row.get("createdAtUtc"), row.get("completedAtUtc"))
        item["Request_Count"] = 1
        item["Inbox_Count"] = 1 if row.get("open") else 0
        item["Processed_Count"] = 0 if row.get("open") else 1
        out.append(item)
    return out


def _aggregate_workflow(spec: ReportSpec, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if _has_row_ids(spec):
        return _workflow_detail_rows(spec, records)
    keys = _keys(spec)
    wf_ids: dict[str, Any] = {}
    for row in records:
        name = str(row.get("workflowName") or "")
        if name and row.get("workflowId") and name not in wf_ids:
            wf_ids[name] = row.get("workflowId")
    if "aging_bucket" in keys:
        buckets: dict[tuple[str, str], int] = defaultdict(int)
        for row in records:
            if not row.get("open"):
                continue
            buckets[(_aging_bucket(row.get("createdAtUtc")), str(row.get("workflowName") or ""))] += 1
        out = []
        for (bucket, workflow), count in sorted(buckets.items(), key=lambda item: (-item[1], item[0][0], item[0][1])):
            out.append(
                {
                    "Aging_Bucket": bucket,
                    "workflowName": workflow,
                    "workflowId": wf_ids.get(workflow, ""),
                    "Request_Count": count,
                }
            )
        return out
    if "sla_bucket" in keys:
        buckets: dict[tuple[str, str], int] = defaultdict(int)
        for row in records:
            buckets[(_sla_bucket(row.get("createdAtUtc"), row.get("completedAtUtc")), str(row.get("workflowName") or ""))] += 1
        out = []
        for (bucket, workflow), count in sorted(buckets.items(), key=lambda item: (-item[1], item[0][0], item[0][1])):
            out.append(
                {
                    "Sla_Bucket": bucket,
                    "workflowName": workflow,
                    "workflowId": wf_ids.get(workflow, ""),
                    "Request_Count": count,
                }
            )
        return out
    if "processed_count" in keys:
        buckets: dict[str, int] = defaultdict(int)
        for row in records:
            if row.get("open"):
                continue
            buckets[str(row.get("workflowName") or "")] += 1
        return [
            {
                "workflowName": name,
                "workflowId": wf_ids.get(name, ""),
                "Processed_Count": count,
            }
            for name, count in sorted(buckets.items(), key=lambda item: (-item[1], item[0]))
        ]
    buckets: dict[tuple[str, str], int] = defaultdict(int)
    for row in records:
        if not row.get("open"):
            continue
        buckets[(str(row.get("workflowName") or ""), str(row.get("status") or ""))] += 1
    return [
        {
            "workflowName": wf,
            "workflowId": wf_ids.get(wf, ""),
            "status": status,
            "Inbox_Count": count,
        }
        for (wf, status), count in sorted(buckets.items(), key=lambda item: (-item[1], item[0][0], item[0][1]))
    ]


def _repository_detail_rows(spec: ReportSpec, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in records:
        item = dict(row)
        item["Aging_Bucket"] = _aging_bucket(row.get("CreatedAt"))
        item["Request_Count"] = 1
        item["Document_Count"] = 1
        item["Version_Count"] = 1
        out.append(item)
    return out


def _aggregate_repository(spec: ReportSpec, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if _has_row_ids(spec):
        return _repository_detail_rows(spec, records)
    keys = _keys(spec)
    if "aging_bucket" in keys:
        buckets: dict[tuple[str, str], int] = defaultdict(int)
        for row in records:
            buckets[(_aging_bucket(row.get("CreatedAt")), str(row.get("Repository_Name") or ""))] += 1
        return [
            {"Aging_Bucket": bucket, "Repository_Name": repo, "Request_Count": count}
            for (bucket, repo), count in sorted(buckets.items(), key=lambda item: (-item[1], item[0][0], item[0][1]))
        ]
    if "version_count" in keys:
        buckets: dict[tuple[str, str], int] = defaultdict(int)
        for row in records:
            buckets[(str(row.get("Repository_Name") or ""), str(row.get("FileName") or ""))] += 1
        return [
            {"Repository_Name": repo, "FileName": name, "Version_Count": count}
            for (repo, name), count in sorted(buckets.items(), key=lambda item: (-item[1], item[0][0], item[0][1]))
        ]
    buckets: dict[tuple[str, str], int] = defaultdict(int)
    for row in records:
        buckets[(str(row.get("Repository_Name") or ""), str(row.get("Status") or ""))] += 1
    return [
        {"Repository_Name": repo, "Status": status, "Document_Count": count}
        for (repo, status), count in sorted(buckets.items(), key=lambda item: (-item[1], item[0][0], item[0][1]))
    ]

"""Run All Workflows / All Repositories reports from EZOFIS catalogs (no tenant SQL)."""
from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import date, datetime, timezone
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


def _parse_datetime(value: Any) -> Optional[datetime]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _format_duration(start: Optional[datetime], end: Optional[datetime]) -> str:
    if start is None or end is None:
        return ""
    delta = end - start
    if delta.total_seconds() < 0:
        return ""
    days = delta.days
    hours = delta.seconds // 3600
    if days and hours:
        return f"{days} day(s) {hours} hour(s)"
    if days:
        return f"{days} day(s)"
    if hours:
        return f"{hours} hour(s)"
    minutes = delta.seconds // 60
    return f"{minutes} minute(s)" if minutes else "0 minute(s)"


def _days_open_value(
    created: Any,
    *,
    completed: Any = None,
    last_action_on: Any = None,
    status: Any = None,
    today: Optional[date] = None,
) -> Any:
    start = _parse_date(created)
    if start is None:
        return ""
    today = today or date.today()
    status_text = str(status or "").strip().lower()
    end: Optional[date] = None
    if status_text in {"completed", "cancelled", "rejected"}:
        end = _parse_date(completed) or _parse_date(last_action_on)
    if end is None:
        end = today
    return max(0, (end - start).days)


def _apply_v5_timeline_fields(rows: list[dict[str, Any]], spec: ReportSpec) -> None:
    want = _keys(spec)
    if not want & {"duration", "daysopen", "lastactionon"}:
        return
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        created = row.get("createdAtUtc") or row.get("CreatedAt") or row.get("created_at")
        last_on = row.get("lastActionOn") or row.get("last_action_on")
        completed = row.get("completedAtUtc") or row.get("completed_at_utc")
        status = row.get("status")
        if "lastactionon" in want and not str(last_on or "").strip():
            fallback = (
                completed
                or row.get("updatedAtUtc")
                or row.get("updated_at_utc")
                or row.get("ModifiedAt")
                or row.get("modified_at")
            )
            if fallback not in (None, ""):
                row["lastActionOn"] = fallback
                last_on = fallback
        if "duration" in want and not str(row.get("duration") or "").strip():
            start_dt = _parse_datetime(created)
            end_dt = _parse_datetime(last_on) or _parse_datetime(completed)
            row["duration"] = _format_duration(start_dt, end_dt)
        if "daysopen" in want and row.get("daysOpen") in (None, ""):
            row["daysOpen"] = _days_open_value(
                created,
                completed=completed,
                last_action_on=last_on,
                status=status,
            )


_MAILBOX_LISTING_ALIASES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("request_no", ("reference_number", "referencenumber", "request_no", "requestno", "requestnumber")),
    ("stage", ("stage", "current_stage", "currentstage", "step_name", "current_step_name", "stepname")),
    (
        "last_action",
        (
            "last_action",
            "lastaction",
            "last_activity",
            "lastactivity",
            "activity",
            "action_name",
            "action",
        ),
    ),
    (
        "last_action_by",
        (
            "last_action_by",
            "lastactionby",
            "last_activity_by",
            "lastactivityby",
            "activity_user_email",
        ),
    ),
    (
        "last_action_on",
        (
            "last_action_on",
            "lastactionon",
            "last_activity_at_utc",
            "lastactivityatutc",
            "updated_at_utc",
            "updatedatutc",
            "modified_at_utc",
            "modifiedatutc",
            "activity_at_utc",
        ),
    ),
    ("status", ("status", "instance_status", "instancestatus")),
    (
        "started_by",
        (
            "started_by",
            "startedby",
            "created_by",
            "createdby",
            "transaction_created_by_email",
            "created_by_name",
        ),
    ),
    (
        "acted_by",
        (
            "updated_by",
            "updatedby",
            "acted_by",
            "actedby",
            "assigned_to",
            "assignedto",
            "activity_user_email",
        ),
    ),
    ("workflow_id", ("workflow_id", "workflowid", "wworkflowid")),
    ("workflow_name", ("workflow_name", "workflowname")),
    ("created_at", ("created_at_utc", "createdatutc", "created_at", "createdat", "started_at")),
)


def _sql_select_parts_for_mailbox(by_lower: dict[str, str], skip_cols: set[str]) -> list[str]:
    parts: list[str] = []
    for alias, candidates in _MAILBOX_LISTING_ALIASES:
        col = _sql_col(by_lower, *candidates)
        if col and col not in skip_cols:
            parts.append(f"CAST({quote_ident(col)} AS text) AS {alias}")
    return parts


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
        "lastaction",
        "lastactionby",
        "lastactionon",
        "duration",
        "daysopen",
        "response",
        "slaresponse",
        "resolution",
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
        "lastaction",
        "lastactionby",
        "lastactionon",
        "duration",
        "daysopen",
        "response",
        "slaresponse",
        "resolution",
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
        "lastaction",
        "lastactionby",
        "lastactionon",
        "duration",
        "daysopen",
        "response",
        "slaresponse",
        "resolution",
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
        "lastaction",
        "lastactionby",
        "lastactionon",
        "duration",
        "daysopen",
        "response",
        "slaresponse",
        "resolution",
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
        "lastaction",
        "lastactionby",
        "lastactionon",
        "duration",
        "daysopen",
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
        "lastaction",
        "lastactionby",
        "lastactionon",
        "duration",
        "daysopen",
    }
)


def _repo_timeline_fields(
    *,
    status: Any = None,
    last_action: Any = None,
    modified_by: Any = None,
    modified_at: Any = None,
) -> dict[str, Any]:
    """Map repository item touch metadata onto workflow-style timeline keys."""
    last_action_text = str(last_action or status or "").strip()
    mod_id, mod_name = _split_user_ref(modified_by)
    return {
        "lastAction": last_action_text,
        "lastActionBy": mod_name,
        "lastActionById": mod_id,
        "lastActionOn": modified_at,
    }
_KEY_ALIAS_GROUPS = (
    frozenset({"repository", "repositoryname", "repository_name"}),
    frozenset({"ifilename", "filename", "file_name", "originalfilename"}),
    frozenset({"requestno", "reqno", "referencenumber"}),
    frozenset({"stage", "currentstage", "stepname"}),
    frozenset({"lastaction", "last_action", "activity"}),
    frozenset({"lastactionon", "lastactivityatutc", "last_activity_at_utc"}),
    frozenset({"response", "slaresponse", "sla_response", "responsestatus"}),
    frozenset({"resolution", "resolutionstatus"}),
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
_USER_NAME_COMPACT = frozenset({"startedby", "actedby", "createdby", "lastactionby"})
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
        "lastactionby": "lastActionById",
    }.get(compact, "")


def _canonical_user_name_key(compact: str) -> str:
    return {
        "startedby": "startedBy",
        "actedby": "actedBy",
        "createdby": "CreatedBy",
        "lastactionby": "lastActionBy",
    }.get(compact, "")


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


def _last_action_label(row: dict[str, Any]) -> str:
    return str(
        _pick(
            row,
            "lastAction",
            "last_action",
            "LastAction",
            "activity",
            "actionName",
            "action_name",
            "lastActivity",
            "last_activity",
        )
        or ""
    ).strip()


def _current_stage(row: dict[str, Any]) -> str:
    named = str(
        _pick(row, "currentStepName", "currentStage", "current_stage", "stage") or ""
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
    return str(_pick(row, "stage", "currentStage", "stepName") or "").strip()


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


def _sql_id_in_clause(columns: list[str]) -> str:
    """Match a form row id against mailbox item_id and/or form_entry_id."""
    parts = [
        f"lower(replace(CAST({quote_ident(col)} AS text), '-', '')) = ANY($1::text[])"
        for col in columns
        if col
    ]
    return " OR ".join(parts) if parts else "FALSE"


def _mailbox_item_columns(by_lower: dict[str, str]) -> tuple[str, str]:
    """Repository item_id column and optional form_entry_id (both may exist)."""
    item_col = _sql_col(
        by_lower,
        "item_id",
        "itemid",
        "repository_item_id",
        "repositoryitemid",
    )
    form_col = _sql_col(by_lower, "form_entry_id", "formentryid")
    if not item_col and form_col:
        item_col = form_col
        form_col = ""
    if form_col and form_col == item_col:
        form_col = ""
    return item_col, form_col


def _listing_keys_from_sql_row(row: Any) -> list[str]:
    keys: list[str] = []
    for name in ("item_id", "form_entry_id"):
        compact = _compact_id(row_get(row, name))
        if compact and compact not in keys:
            keys.append(compact)
    return keys


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
    last_action = _last_action_label(row)
    last_by_id, last_by_name = _split_user_ref(
        _pick(row, "lastActionBy", "last_action_by", "activity_user_email", "lastActivityBy")
    )
    last_on = _pick(
        row,
        "lastActionOn",
        "last_action_on",
        "lastActivityAtUtc",
        "last_activity_at_utc",
        "updatedAtUtc",
        "updated_at_utc",
    )
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
        "lastAction": last_action,
        "lastActionBy": last_by_name,
        "lastActionOn": last_on,
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
            value = _value_from_row(row or {}, col.key)
            if isinstance(value, bool) or value == 0:
                return True
            if str(value or "").strip():
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
            "step_name",
            "current_step_name",
            "stepname",
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
        stage_col = _sql_col(
            by_lower, "stage", "current_stage", "currentstage", "step_name", "current_step_name"
        )
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
            inst = _compact_id(row_get(row, "instance_id"))
            if not inst:
                continue
            for key in _listing_keys_from_sql_row(row):
                if key not in mapping:
                    mapping[key] = inst

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
        item_col, form_col = _mailbox_item_columns(by_lower)
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
        select_form = (
            f", CAST({quote_ident(form_col)} AS text) AS form_entry_id" if form_col else ""
        )
        sql = (
            f"SELECT CAST({quote_ident(item_col)} AS text) AS item_id, "
            f"CAST({quote_ident(inst_col)} AS text) AS instance_id{select_form} "
            f"FROM {qualified(schema, table)} "
            f"WHERE {_sql_id_in_clause([item_col, form_col])}"
        )
        try:
            await _ingest(sql)
        except Exception:
            continue
        if mapping:
            break
    return mapping


def _merge_listing(existing: Optional[dict[str, Any]], incoming: dict[str, Any]) -> dict[str, Any]:
    if not existing:
        return dict(incoming)
    merged = dict(existing)
    for key, value in incoming.items():
        if merged.get(key) in (None, "") and value not in (None, ""):
            merged[key] = value
    return merged


_COMPLETED_LISTING_KEYS = (
    "RequestNo",
    "requestNo",
    "Stage",
    "stage",
    "status",
    "startedBy",
    "startedById",
    "actedBy",
    "actedById",
    "instanceId",
    "workflowName",
    "workflowId",
    "createdAtUtc",
    "itemId",
)


def _merge_listing_completed(
    existing: Optional[dict[str, Any]], incoming: dict[str, Any]
) -> dict[str, Any]:
    """Completed mailbox wins over inbox for status and people on the same form row."""
    merged = _merge_listing(existing, incoming)
    for key in _COMPLETED_LISTING_KEYS:
        value = incoming.get(key)
        if value not in (None, ""):
            merged[key] = value
    if str(incoming.get("status") or "").strip() == "Completed":
        merged["status"] = "Completed"
    return merged


def _instance_ids_for_completed_lookup(
    instances: list[dict[str, Any]],
    item_to_inst: dict[str, str],
    sql_by_item: dict[str, dict[str, Any]],
) -> list[str]:
    ids: list[str] = []
    seen: set[str] = set()
    for row in instances:
        cid = _compact_id((row or {}).get("instanceId"))
        if cid and cid not in seen:
            seen.add(cid)
            ids.append(str(row.get("instanceId") or cid))
    for inst in item_to_inst.values():
        cid = _compact_id(inst)
        if cid and cid not in seen:
            seen.add(cid)
            ids.append(inst)
    for listing in sql_by_item.values():
        cid = _compact_id((listing or {}).get("instanceId"))
        if cid and cid not in seen:
            seen.add(cid)
            ids.append(str(listing.get("instanceId") or cid))
    return ids


def _apply_completed_person_fields(
    item: dict[str, Any],
    *,
    inst: Optional[dict[str, Any]],
    sql_listing: Optional[dict[str, Any]],
    completed_person: dict[str, dict[str, str]],
) -> None:
    inst_id = _compact_id(
        item.get("instanceId")
        or (inst or {}).get("instanceId")
        or (sql_listing or {}).get("instanceId")
    )
    if not inst_id:
        return
    person = completed_person.get(inst_id)
    if not person:
        return
    if _person_missing(item):
        for key in ("startedBy", "startedById", "actedBy", "actedById"):
            _assign_listing_value(item, key, person.get(key))
    status = str(item.get("status") or "").strip()
    if status in ("", "Cancelled", "Rejected") or (
        sql_listing and str(sql_listing.get("status") or "").strip() == "Completed"
    ):
        _assign_listing_value(item, "status", "Completed")


def _listing_from_sql_row(row: Any, workflow_name: str) -> dict[str, Any]:
    request_no = str(row_get(row, "request_no") or "").strip()
    stage = str(row_get(row, "stage") or "").strip()
    last_action = str(row_get(row, "last_action") or "").strip()
    started_id, started_name = _split_user_ref(row_get(row, "started_by"))
    acted_id, acted_name = _split_user_ref(row_get(row, "acted_by"))
    last_by_id, last_by_name = _split_user_ref(row_get(row, "last_action_by"))
    if not acted_id and not acted_name:
        acted_id, acted_name = started_id, started_name
    return {
        "RequestNo": request_no,
        "requestNo": request_no,
        "Stage": stage,
        "stage": stage,
        "lastAction": last_action,
        "lastActionBy": last_by_name,
        "lastActionById": last_by_id,
        "lastActionOn": row_get(row, "last_action_on"),
        "status": _status_label(row_get(row, "status")),
        "startedBy": started_name,
        "startedById": started_id,
        "actedBy": acted_name,
        "actedById": acted_id,
        "workflowName": workflow_name or str(row_get(row, "workflow_name") or "").strip(),
        "workflowId": str(row_get(row, "workflow_id") or "").strip(),
        "instanceId": str(row_get(row, "instance_id") or "").strip(),
        "itemId": str(row_get(row, "item_id") or "").strip(),
        "createdAtUtc": row_get(row, "created_at"),
    }


async def _sql_workflow_ids(db: Any, workflow_name: str) -> list[str]:
    """Resolve a workflow id from the tenant Workflows table when EZOFIS did not."""
    needle = (workflow_name or "").strip().lower()
    if db is None or not needle:
        return []
    located = await find_table(
        db,
        ("Workflows", "workflows", "wworkflow", "wworkflows"),
        prefer_schemas=("workflow", "dbo", "public"),
    )
    if located is None:
        return []
    schema, table = located
    by_lower, _ = await fetch_columns(db, schema, table)
    id_col = pick_id_column(by_lower) or _sql_col(by_lower, "id", "workflowid", "wworkflowid")
    name_col = _sql_col(by_lower, "name", "workflowname", "workflow_name")
    if not id_col or not name_col:
        return []
    sql = (
        f"SELECT CAST({quote_ident(id_col)} AS text) AS id, "
        f"CAST({quote_ident(name_col)} AS text) AS name "
        f"FROM {qualified(schema, table)}"
    )
    try:
        rows = await db.fetch(sql)
    except Exception:
        return []
    exact: list[str] = []
    partial: list[str] = []
    for row in rows or []:
        name = str(row_get(row, "name") or "").strip()
        wid = str(row_get(row, "id") or "").strip()
        if not wid or not name:
            continue
        if name.lower() == needle:
            exact.append(wid)
        elif needle in name.lower():
            partial.append(wid)
    return exact or partial


async def _sql_listing_by_items(
    db: Any, suffix: str, item_ids: list[str], workflow_name: str
) -> dict[str, dict[str, Any]]:
    """Map compact form item id → Request No, Stage, and user ids from workflow SQL."""
    found: dict[str, dict[str, Any]] = {}
    compact_ids = [_compact_id(item) for item in item_ids if _compact_id(item)]
    if db is None or not suffix or not compact_ids:
        return found

    async def _ingest(sql: str, default_status: str = "", *, from_completed: bool = False) -> None:
        rows = await db.fetch(sql, compact_ids)
        for row in rows or []:
            listing = _listing_from_sql_row(row, workflow_name)
            if default_status and not str(listing.get("status") or "").strip():
                listing["status"] = default_status
            form_key = _compact_id(row_get(row, "form_entry_id"))
            if form_key:
                listing["itemId"] = str(row_get(row, "form_entry_id") or "").strip() or listing.get(
                    "itemId"
                )
            merge = _merge_listing_completed if from_completed else _merge_listing
            for key in _listing_keys_from_sql_row(row):
                found[key] = merge(found.get(key), listing)
            if form_key and form_key not in _listing_keys_from_sql_row(row):
                found[form_key] = merge(found.get(form_key), listing)

    for names in (
        (f"inbox_{suffix}",),
        (f"sent_{suffix}",),
        (f"completed_{suffix}",),
        (f"workflow_instances_{suffix}", f"workflowinstances_{suffix}"),
    ):
        located = await find_table(db, names, prefer_schemas=("workflow", "dbo", "public"))
        if located is None:
            continue
        schema, table = located
        by_lower, _ = await fetch_columns(db, schema, table)
        item_col, form_col = _mailbox_item_columns(by_lower)
        if names[0].startswith("workflow_instances"):
            inst_col = pick_id_column(by_lower) or _sql_col(by_lower, "id")
        else:
            inst_col = _sql_col(
                by_lower,
                "workflow_instance_id",
                "workflowinstanceid",
                "instance_id",
                "instanceid",
                "process_id",
                "processid",
            )
        if not item_col or not inst_col or item_col == inst_col:
            continue
        skip_cols = {item_col, inst_col, form_col}
        parts = [
            f"CAST({quote_ident(item_col)} AS text) AS item_id",
            f"CAST({quote_ident(inst_col)} AS text) AS instance_id",
        ]
        if form_col:
            parts.append(f"CAST({quote_ident(form_col)} AS text) AS form_entry_id")
        parts.extend(_sql_select_parts_for_mailbox(by_lower, skip_cols))
        sql = (
            f"SELECT {', '.join(parts)} FROM {qualified(schema, table)} "
            f"WHERE {_sql_id_in_clause([item_col, form_col])}"
        )
        default_status = ""
        from_completed = table.startswith("completed")
        if from_completed:
            default_status = "Completed"
        elif table.startswith("inbox") or table.startswith("sent"):
            default_status = "In Progress"
        try:
            await _ingest(sql, default_status, from_completed=from_completed)
        except Exception:
            continue
    return found


async def _sql_listing_by_instances(
    db: Any, suffix: str, instance_ids: list[str], workflow_name: str
) -> dict[str, dict[str, Any]]:
    """Map compact workflow instance id → listing fields from mailbox / instance tables."""
    found: dict[str, dict[str, Any]] = {}
    compact_ids = [_compact_id(item) for item in instance_ids if _compact_id(item)]
    if db is None or not suffix or not compact_ids:
        return found

    async def _ingest(sql: str, default_status: str = "", *, from_completed: bool = False) -> None:
        rows = await db.fetch(sql, compact_ids)
        for row in rows or []:
            listing = _listing_from_sql_row(row, workflow_name)
            if default_status and not str(listing.get("status") or "").strip():
                listing["status"] = default_status
            inst_key = _compact_id(row_get(row, "instance_id"))
            if not inst_key:
                continue
            merge = _merge_listing_completed if from_completed else _merge_listing
            found[inst_key] = merge(found.get(inst_key), listing)

    for names in (
        (f"inbox_{suffix}",),
        (f"sent_{suffix}",),
        (f"completed_{suffix}",),
        (f"workflow_instances_{suffix}", f"workflowinstances_{suffix}"),
    ):
        located = await find_table(db, names, prefer_schemas=("workflow", "dbo", "public"))
        if located is None:
            continue
        schema, table = located
        by_lower, _ = await fetch_columns(db, schema, table)
        if names[0].startswith("workflow_instances"):
            inst_col = pick_id_column(by_lower) or _sql_col(by_lower, "id")
        else:
            inst_col = _sql_col(
                by_lower,
                "workflow_instance_id",
                "workflowinstanceid",
                "instance_id",
                "instanceid",
                "process_id",
                "processid",
            )
        if not inst_col:
            continue
        skip_cols = {inst_col}
        parts = [f"CAST({quote_ident(inst_col)} AS text) AS instance_id"]
        parts.extend(_sql_select_parts_for_mailbox(by_lower, skip_cols))
        if len(parts) == 1:
            continue
        sql = (
            f"SELECT {', '.join(parts)} FROM {qualified(schema, table)} "
            f"WHERE lower(replace(CAST({quote_ident(inst_col)} AS text), '-', '')) = ANY($1::text[])"
        )
        default_status = ""
        from_completed = table.startswith("completed")
        if from_completed:
            default_status = "Completed"
        elif table.startswith("inbox") or table.startswith("sent"):
            default_status = "In Progress"
        try:
            await _ingest(sql, default_status, from_completed=from_completed)
        except Exception:
            continue
    return found


async def _sql_lookup_last_activity_by_instance(
    db: Any, instance_ids: list[str]
) -> dict[str, Any]:
    """WorkflowInstanceLookup.LastActivityAtUtc when mailbox rows omit last action time."""
    compact_ids = [_compact_id(item) for item in instance_ids if _compact_id(item)]
    if db is None or not compact_ids:
        return {}
    located = await find_table(
        db,
        ("WorkflowInstanceLookup", "workflowinstancelookup"),
        prefer_schemas=("workflow", "dbo", "public"),
    )
    if located is None:
        return {}
    schema, table = located
    by_lower, _ = await fetch_columns(db, schema, table)
    inst_col = _sql_col(
        by_lower,
        "workflow_instance_id",
        "workflowinstanceid",
        "instance_id",
        "instanceid",
    )
    ts_col = _sql_col(
        by_lower,
        "lastactivityatutc",
        "last_activity_at_utc",
        "LastActivityAtUtc",
        "last_action_on",
        "lastactionon",
    )
    if not inst_col or not ts_col:
        return {}
    sql = (
        f"SELECT lower(replace(CAST({quote_ident(inst_col)} AS text), '-', '')) AS instance_id, "
        f"CAST({quote_ident(ts_col)} AS text) AS last_action_on "
        f"FROM {qualified(schema, table)} "
        f"WHERE lower(replace(CAST({quote_ident(inst_col)} AS text), '-', '')) = ANY($1::text[])"
    )
    try:
        rows = await db.fetch(sql, compact_ids)
    except Exception:
        return {}
    out: dict[str, Any] = {}
    for row in rows or []:
        inst = _compact_id(row_get(row, "instance_id"))
        stamp = row_get(row, "last_action_on")
        if inst and stamp not in (None, "") and inst not in out:
            out[inst] = stamp
    return out


def _overlay_last_activity_lookup(row: dict[str, Any], lookup: dict[str, Any]) -> None:
    if str(row.get("lastActionOn") or "").strip():
        return
    inst = _compact_id(row.get("instanceId") or row.get("instance_id"))
    if not inst:
        return
    stamp = lookup.get(inst)
    if stamp not in (None, ""):
        row["lastActionOn"] = stamp


def _format_sla_cell(status: Any, deadline: Any = None) -> str:
    """Keep one cell: status, or status plus deadline when both exist."""
    if isinstance(status, bool):
        status_text = "Met" if status else "Missed"
    else:
        status_text = str(status or "").strip()
        if status_text in {"1", "true", "True"}:
            status_text = "Met"
        elif status_text in {"0", "false", "False"}:
            status_text = "Missed"
    deadline_text = str(deadline or "").strip()
    if status_text and deadline_text:
        return f"{status_text} ({deadline_text})"
    return status_text or deadline_text


def _overlay_sla_lookup(row: dict[str, Any], lookup: dict[str, dict[str, Any]]) -> None:
    inst = _compact_id(row.get("instanceId") or row.get("instance_id"))
    if not inst:
        return
    sla = lookup.get(inst) or {}
    text = str(sla.get("slaResponse") or sla.get("response") or "").strip()
    if text:
        if not str(row.get("response") or "").strip():
            row["response"] = text
        if not str(row.get("slaResponse") or "").strip():
            row["slaResponse"] = text
    if not str(row.get("resolution") or "").strip() and sla.get("resolution"):
        row["resolution"] = sla["resolution"]


async def _sql_lookup_sla_by_instance(
    db: Any, instance_ids: list[str], *, suffix: str = ""
) -> dict[str, dict[str, Any]]:
    """SLA Response / Resolution from WorkflowInstanceLookup, then workflow_instance_slas_*."""
    compact_ids = [_compact_id(item) for item in instance_ids if _compact_id(item)]
    found: dict[str, dict[str, Any]] = {}
    if db is None or not compact_ids:
        return found

    async def _ingest(located: Optional[tuple[str, str]]) -> None:
        if located is None:
            return
        schema, table = located
        by_lower, _ = await fetch_columns(db, schema, table)
        inst_col = _sql_col(
            by_lower,
            "workflow_instance_id",
            "workflowinstanceid",
            "instance_id",
            "instanceid",
        )
        if not inst_col:
            return
        response_col = _sql_col(
            by_lower,
            "response",
            "responsestatus",
            "response_status",
            "sla_response",
            "slaresponse",
            "ResponseStatus",
        )
        response_due = _sql_col(
            by_lower,
            "responsedeadline",
            "response_deadline",
            "ResponseDeadline",
        )
        resolution_col = _sql_col(
            by_lower,
            "resolutionstatus",
            "resolution_status",
            "resolution",
            "ResolutionStatus",
        )
        resolution_due = _sql_col(
            by_lower,
            "resolutiondeadline",
            "resolution_deadline",
            "ResolutionDeadline",
        )
        if not response_col and not resolution_col and not response_due and not resolution_due:
            return
        parts = [
            f"lower(replace(CAST({quote_ident(inst_col)} AS text), '-', '')) AS instance_id"
        ]
        if response_col:
            parts.append(f"CAST({quote_ident(response_col)} AS text) AS response_status")
        if response_due:
            parts.append(f"CAST({quote_ident(response_due)} AS text) AS response_deadline")
        if resolution_col:
            parts.append(f"CAST({quote_ident(resolution_col)} AS text) AS resolution_status")
        if resolution_due:
            parts.append(f"CAST({quote_ident(resolution_due)} AS text) AS resolution_deadline")
        sql = (
            f"SELECT {', '.join(parts)} FROM {qualified(schema, table)} "
            f"WHERE lower(replace(CAST({quote_ident(inst_col)} AS text), '-', '')) = ANY($1::text[])"
        )
        try:
            rows = await db.fetch(sql, compact_ids)
        except Exception:
            return
        for row in rows or []:
            inst = _compact_id(row_get(row, "instance_id"))
            if not inst:
                continue
            current = found.setdefault(inst, {})
            response = _format_sla_cell(
                row_get(row, "response_status"), row_get(row, "response_deadline")
            )
            resolution = _format_sla_cell(
                row_get(row, "resolution_status"), row_get(row, "resolution_deadline")
            )
            if response:
                if not current.get("response"):
                    current["response"] = response
                if not current.get("slaResponse"):
                    current["slaResponse"] = response
            if resolution and not current.get("resolution"):
                current["resolution"] = resolution

    located = await find_table(
        db,
        ("WorkflowInstanceLookup", "workflowinstancelookup"),
        prefer_schemas=("workflow", "dbo", "public"),
    )
    await _ingest(located)
    if suffix:
        sla_table = await find_table(
            db,
            (f"workflow_instance_slas_{suffix}", f"workflowinstanceslas_{suffix}"),
            prefer_schemas=("workflow", "dbo", "public"),
        )
        await _ingest(sla_table)
    return found


async def _sql_completed_rows_missing_from_form(
    db: Any, suffix: str, workflow_name: str, existing_row_keys: set[str], existing_request_nos: set[str]
) -> list[dict[str, Any]]:
    """Completed requests with no matching form row (same keys as form+workflow rows)."""
    if db is None or not suffix:
        return []
    located = await find_table(
        db, (f"completed_{suffix}",), prefer_schemas=("workflow", "dbo", "public")
    )
    if located is None:
        return []
    schema, table = located
    by_lower, _ = await fetch_columns(db, schema, table)
    item_col, form_col = _mailbox_item_columns(by_lower)
    inst_col = _sql_col(
        by_lower,
        "workflow_instance_id",
        "workflowinstanceid",
        "instance_id",
        "instanceid",
    )
    if not item_col or not inst_col:
        return []
    skip_cols = {item_col, inst_col, form_col}
    parts = [
        f"CAST({quote_ident(item_col)} AS text) AS item_id",
        f"CAST({quote_ident(inst_col)} AS text) AS instance_id",
    ]
    if form_col:
        parts.append(f"CAST({quote_ident(form_col)} AS text) AS form_entry_id")
    parts.extend(_sql_select_parts_for_mailbox(by_lower, skip_cols))
    sql = f"SELECT {', '.join(parts)} FROM {qualified(schema, table)}"
    try:
        rows = await db.fetch(sql)
    except Exception:
        return []
    extras: list[dict[str, Any]] = []
    for row in rows or []:
        listing = _listing_from_sql_row(row, workflow_name)
        listing["status"] = "Completed"
        req = str(listing.get("RequestNo") or "").strip()
        if req and req in existing_request_nos:
            continue
        form_key = _compact_id(row_get(row, "form_entry_id"))
        item_key = _compact_id(row_get(row, "item_id"))
        anchor = form_key or item_key
        if not anchor:
            continue
        if anchor in existing_row_keys or form_key in existing_row_keys or item_key in existing_row_keys:
            continue
        display_id = str(row_get(row, "form_entry_id") or row_get(row, "item_id") or "").strip()
        if display_id:
            listing["itemId"] = display_id
        extras.append(listing)
    return extras


def _person_missing(row: dict[str, Any]) -> bool:
    """True when Started by or Acted by has neither a name nor an id."""

    def _present(name_key: str, id_key: str) -> bool:
        return bool(str(row.get(name_key) or "").strip() or str(row.get(id_key) or "").strip())

    return not _present("startedBy", "startedById") or not _present("actedBy", "actedById")


async def _sql_completed_person_by_instance(
    db: Any, suffix: str, instance_ids: list[str]
) -> dict[str, dict[str, str]]:
    """Started by and Acted by for a finished request, keyed by instance id.

    The instance no longer carries a person after it leaves the inbox.
    completed_<workflow> still has the starter and the last actor.
    """
    found: dict[str, dict[str, str]] = {}
    compact_ids = [_compact_id(item) for item in instance_ids if _compact_id(item)]
    if db is None or not suffix or not compact_ids:
        return found
    located = await find_table(
        db, (f"completed_{suffix}",), prefer_schemas=("workflow", "dbo", "public")
    )
    if located is None:
        return found
    schema, table = located
    by_lower, _ = await fetch_columns(db, schema, table)
    inst_col = _sql_col(
        by_lower,
        "workflow_instance_id",
        "workflowinstanceid",
        "instance_id",
        "instanceid",
    )
    if not inst_col:
        return found
    started_col = _sql_col(
        by_lower,
        "transaction_created_by_email",
        "created_by_name",
        "transaction_created_by",
        "started_by",
        "startedby",
    )
    acted_col = _sql_col(
        by_lower,
        "activity_user_email",
        "user_id",
        "assigned_to_user_id",
    )
    parts = [f"CAST({quote_ident(inst_col)} AS text) AS instance_id"]
    if started_col:
        parts.append(f"CAST({quote_ident(started_col)} AS text) AS started_by")
    if acted_col and acted_col != started_col:
        parts.append(f"CAST({quote_ident(acted_col)} AS text) AS acted_by")
    sql = (
        f"SELECT {', '.join(parts)} FROM {qualified(schema, table)} "
        f"WHERE lower(replace(CAST({quote_ident(inst_col)} AS text), '-', '')) = ANY($1::text[])"
    )
    try:
        rows = await db.fetch(sql, compact_ids)
    except Exception:
        return found
    for row in rows or []:
        inst = _compact_id(row_get(row, "instance_id"))
        if not inst:
            continue
        started_id, started_name = _split_user_ref(row_get(row, "started_by"))
        acted_id, acted_name = _split_user_ref(row_get(row, "acted_by"))
        if not acted_id and not acted_name:
            acted_id, acted_name = started_id, started_name
        if not any((started_id, started_name, acted_id, acted_name)):
            continue
        found[inst] = {
            "startedBy": started_name,
            "startedById": started_id,
            "actedBy": acted_name,
            "actedById": acted_id,
        }
    return found


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
    force_instance: bool = False,
) -> Optional[tuple[list[ReportColumnOut], list[dict[str, Any]], int, list[str]]]:
    table = (spec.source_table or "").lower()
    rt = (report_type or spec.report_type or "").lower()
    if rt == "specific_workflow":
        if not force_instance and not wants_instance_execute(spec, rt):
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
        "lastActionBy",
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
    records, wf_ids = await _load_workflow_instances(
        ezofis, spec, tenant_id, workflow_name=workflow_name, db=db
    )
    aggregated = _aggregate_workflow(spec, records)
    want_listing = needs_listing_fields(spec)
    if db is not None and wf_ids and want_listing:
        inst_ids = [
            str(_pick(row, "instanceId", "instance_id", "id") or "")
            for row in aggregated
            if isinstance(row, dict)
        ]
        lookup_activity: dict[str, Any] = {}
        lookup_sla: dict[str, dict[str, Any]] = {}
        for wf_id in wf_ids:
            suffix = _compact_id(wf_id)[:8]
            if not suffix:
                continue
            try:
                by_inst = await _sql_listing_by_instances(
                    db, suffix, inst_ids, workflow_name or ""
                )
            except Exception:
                by_inst = {}
            try:
                lookup_activity.update(
                    await _sql_lookup_last_activity_by_instance(db, inst_ids)
                )
            except Exception:
                pass
            try:
                lookup_sla.update(
                    await _sql_lookup_sla_by_instance(db, inst_ids, suffix=suffix)
                )
            except Exception:
                pass
            for row in aggregated:
                if not isinstance(row, dict):
                    continue
                inst_key = _compact_id(row.get("instanceId") or row.get("instance_id"))
                listing = by_inst.get(inst_key) if inst_key else None
                if listing:
                    _fill_listing_fields(row, listing, spec)
                _overlay_last_activity_lookup(row, lookup_activity)
                _overlay_sla_lookup(row, lookup_sla)
            if by_inst:
                break
        if not lookup_activity:
            try:
                lookup_activity = await _sql_lookup_last_activity_by_instance(db, inst_ids)
            except Exception:
                lookup_activity = {}
            for row in aggregated:
                if isinstance(row, dict):
                    _overlay_last_activity_lookup(row, lookup_activity)
        if not lookup_sla:
            try:
                lookup_sla = await _sql_lookup_sla_by_instance(db, inst_ids)
            except Exception:
                lookup_sla = {}
            for row in aggregated:
                if isinstance(row, dict):
                    _overlay_sla_lookup(row, lookup_sla)
    _apply_v5_timeline_fields(aggregated, spec)
    return _shape_rows(spec, aggregated)


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
        "lastAction": inst.get("lastAction"),
        "lastActionBy": inst.get("lastActionBy"),
        "lastActionOn": inst.get("lastActionOn"),
        "completedAtUtc": inst.get("completedAtUtc"),
        "response": inst.get("response") or inst.get("slaResponse"),
        "slaResponse": inst.get("slaResponse") or inst.get("response"),
        "resolution": inst.get("resolution"),
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
        elif value in (None, "") and _listing_compact(key) == "lastaction":
            value = inst.get("lastAction")
        elif value in (None, "") and _listing_compact(key) == "lastactionby":
            value = inst.get("lastActionBy")
        elif value in (None, "") and _listing_compact(key) == "lastactionon":
            value = inst.get("lastActionOn")
        elif value in (None, "") and _listing_compact(key) in {"response", "slaresponse"}:
            value = inst.get("response") or inst.get("slaResponse")
        elif value in (None, "") and _listing_compact(key) == "resolution":
            value = inst.get("resolution")
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
        "lastAction": repo_row.get("lastAction"),
        "lastActionBy": repo_row.get("lastActionBy"),
        "lastActionOn": repo_row.get("lastActionOn"),
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
        elif compact == "lastaction":
            value = repo_row.get("lastAction")
        elif compact == "lastactionby":
            value = repo_row.get("lastActionBy")
        elif compact == "lastactionon":
            value = repo_row.get("lastActionOn")
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
    if not wf_ids and workflow_name:
        try:
            wf_ids = await _sql_workflow_ids(db, workflow_name)
        except Exception:
            wf_ids = []
    item_to_inst: dict[str, str] = {}
    sql_by_item: dict[str, dict[str, Any]] = {}
    sql_by_inst: dict[str, dict[str, Any]] = {}
    for wf_id in wf_ids:
        suffix = _compact_id(wf_id)[:8]
        if not suffix:
            continue
        try:
            item_to_inst.update(await _sql_item_instance_map(db, suffix, item_ids))
        except Exception:
            pass
        try:
            listed = await _sql_listing_by_items(db, suffix, item_ids, workflow_name or "")
        except Exception:
            listed = {}
        for key, value in listed.items():
            sql_by_item[key] = _merge_listing(sql_by_item.get(key), value)
        if item_to_inst and sql_by_item:
            break
    existing_keys: set[str] = set()
    existing_req: set[str] = set()
    for row in rows:
        for cid in _form_row_ids(row):
            existing_keys.add(cid)
        req = str(row.get("RequestNo") or row.get("requestNo") or "").strip()
        if req:
            existing_req.add(req)
    extra_listings: list[dict[str, Any]] = []
    for wf_id in wf_ids:
        suffix = _compact_id(wf_id)[:8]
        if not suffix:
            continue
        try:
            added = await _sql_completed_rows_missing_from_form(
                db, suffix, workflow_name or "", existing_keys, existing_req
            )
        except Exception:
            continue
        for listing in added:
            req = str(listing.get("RequestNo") or "").strip()
            if req:
                existing_req.add(req)
            iid = _compact_id(listing.get("itemId"))
            if iid:
                existing_keys.add(iid)
            extra_listings.append(listing)
    completed_person: dict[str, dict[str, str]] = {}
    lookup_inst_ids = _instance_ids_for_completed_lookup(instances, item_to_inst, sql_by_item)
    for listing in extra_listings:
        iid = _compact_id(listing.get("instanceId"))
        if iid and str(listing.get("instanceId") or iid) not in {
            _compact_id(x) for x in lookup_inst_ids
        }:
            lookup_inst_ids.append(str(listing.get("instanceId") or iid))
    for wf_id in wf_ids:
        suffix = _compact_id(wf_id)[:8]
        if not suffix:
            continue
        try:
            completed_person.update(
                await _sql_completed_person_by_instance(db, suffix, lookup_inst_ids)
            )
        except Exception:
            continue
    lookup_activity: dict[str, Any] = {}
    lookup_sla: dict[str, dict[str, Any]] = {}
    if db is not None and lookup_inst_ids:
        try:
            lookup_activity = await _sql_lookup_last_activity_by_instance(db, lookup_inst_ids)
        except Exception:
            lookup_activity = {}
        for wf_id in wf_ids:
            suffix = _compact_id(wf_id)[:8]
            if not suffix:
                continue
            try:
                sql_by_inst = await _sql_listing_by_instances(
                    db, suffix, lookup_inst_ids, workflow_name or ""
                )
            except Exception:
                sql_by_inst = {}
            try:
                lookup_sla.update(
                    await _sql_lookup_sla_by_instance(db, lookup_inst_ids, suffix=suffix)
                )
            except Exception:
                pass
            if sql_by_inst:
                break
        if not lookup_sla:
            try:
                lookup_sla = await _sql_lookup_sla_by_instance(db, lookup_inst_ids)
            except Exception:
                lookup_sla = {}
    out: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        _split_user_fields_on_row(item)
        inst = None
        sql_listing = None
        for cid in _form_row_ids(item):
            if inst is None:
                inst = by_item.get(cid) or by_inst.get(cid)
                if inst is None and cid in item_to_inst:
                    inst = by_inst.get(item_to_inst[cid])
            if sql_listing is None and cid in sql_by_item:
                sql_listing = sql_by_item[cid]
        if inst is not None:
            _fill_listing_fields(item, inst, spec)
        if sql_listing is not None:
            _fill_listing_fields(item, sql_listing, spec)
        inst_key = _compact_id(
            item.get("instanceId")
            or item.get("instance_id")
            or (item_to_inst.get(_compact_id(item.get("itemId") or item.get("item_id"))) if item_to_inst else "")
        )
        inst_listing = sql_by_inst.get(inst_key) if inst_key else None
        if inst_listing is not None:
            _fill_listing_fields(item, inst_listing, spec)
        _apply_completed_person_fields(
            item, inst=inst, sql_listing=sql_listing, completed_person=completed_person
        )
        _overlay_last_activity_lookup(item, lookup_activity)
        _overlay_sla_lookup(item, lookup_sla)
        out.append(item)
    for listing in extra_listings:
        item = dict(listing)
        _fill_listing_fields(item, listing, spec)
        inst_key = _compact_id(item.get("instanceId"))
        inst_listing = sql_by_inst.get(inst_key) if inst_key else None
        if inst_listing is not None:
            _fill_listing_fields(item, inst_listing, spec)
        _apply_completed_person_fields(
            item, inst=None, sql_listing=listing, completed_person=completed_person
        )
        _overlay_last_activity_lookup(item, lookup_activity)
        _overlay_sla_lookup(item, lookup_sla)
        out.append(item)
    _apply_v5_timeline_fields(out, spec)
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
    modified_by_col = _sql_col(
        by_lower, "modified_by", "modifiedby", "updated_by", "updatedby"
    )
    modified_at_col = _sql_col(
        by_lower,
        "modified_at",
        "modifiedat",
        "modified_at_utc",
        "modifiedatutc",
        "updated_at",
        "updatedat",
        "updated_at_utc",
        "updatedatutc",
    )
    last_action_col = _sql_col(by_lower, "last_action", "lastaction", "action")
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
    if modified_by_col:
        parts.append(f"CAST({quote_ident(modified_by_col)} AS text) AS modified_by")
    if modified_at_col:
        parts.append(f"CAST({quote_ident(modified_at_col)} AS text) AS modified_at")
    if last_action_col:
        parts.append(f"CAST({quote_ident(last_action_col)} AS text) AS last_action")
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
        record.update(
            _repo_timeline_fields(
                status=row_get(row, "status"),
                last_action=row_get(row, "last_action"),
                modified_by=row_get(row, "modified_by"),
                modified_at=row_get(row, "modified_at"),
            )
        )
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
            record.update(
                _repo_timeline_fields(
                    status=_pick(row, "status", "Status"),
                    last_action=_pick(row, "lastAction", "last_action", "LastAction"),
                    modified_by=_pick(
                        row,
                        "modifiedBy",
                        "ModifiedBy",
                        "modified_by",
                        "updatedBy",
                        "UpdatedBy",
                        "updated_by",
                    ),
                    modified_at=_pick(
                        row,
                        "modifiedAt",
                        "ModifiedAt",
                        "modified_at",
                        "modifiedAtUtc",
                        "updatedAt",
                        "UpdatedAt",
                        "updated_at",
                        "updatedAtUtc",
                    ),
                )
            )
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
    _apply_v5_timeline_fields(records, spec)
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
    _apply_v5_timeline_fields(out, spec)
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

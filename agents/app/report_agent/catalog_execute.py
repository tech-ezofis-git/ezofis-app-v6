"""Run All Workflows / All Repositories reports from EZOFIS catalogs (no tenant SQL)."""
from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import date, datetime
from typing import Any, Optional

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
    return column_outs(spec)


def _paginate(rows: list[dict[str, Any]], page: int, page_size: int) -> tuple[list[dict[str, Any]], int]:
    total = len(rows)
    start = max(0, (max(page, 1) - 1) * max(page_size, 1))
    return rows[start : start + max(page_size, 1)], total


def _keys(spec: ReportSpec) -> set[str]:
    return {c.key.lower() for c in spec.columns}


_ROW_ID_KEYS = frozenset({"instanceid", "itemid", "id"})


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


def _cell(value: Any) -> Any:
    if value in (None, ""):
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (int, float, bool, str)):
        return value
    return str(value)


def _has_row_ids(spec: ReportSpec) -> bool:
    return bool(_keys(spec) & _ROW_ID_KEYS)


def _shape_rows(spec: ReportSpec, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    keys = [c.key for c in spec.columns]
    if not keys:
        return rows
    shaped: list[dict[str, Any]] = []
    for row in rows:
        lower = {str(key).lower(): value for key, value in (row or {}).items()}
        shaped.append({key: _cell(lower.get(key.lower(), "")) for key in keys})
    return shaped


async def execute_catalog_spec(
    ezofis: Any,
    spec: ReportSpec,
    *,
    tenant_id: str,
    report_type: str,
    page: int = 1,
    page_size: int = 25,
) -> Optional[tuple[list[ReportColumnOut], list[dict[str, Any]], int, list[str]]]:
    table = (spec.source_table or "").lower()
    if report_type == "all_workflows" or table == "workflow_instances_all":
        rows = await _workflow_rows(ezofis, spec, tenant_id)
        page_rows, total = _paginate(rows, page, page_size)
        warnings = ["Counted live EZOFIS workflow instances across the tenant catalog."]
        if total == 0:
            warnings.append("EZOFIS returned no open workflow instances to count.")
        return (_col_outs(spec), page_rows, total, warnings)
    if report_type == "all_repositories" or table == "items_all":
        rows = await _repository_rows(ezofis, spec, tenant_id)
        page_rows, total = _paginate(rows, page, page_size)
        warnings = ["Counted live EZOFIS repository items across the tenant catalog."]
        if total == 0:
            warnings.append("EZOFIS returned no repository items to count.")
        return (_col_outs(spec), page_rows, total, warnings)
    return None


async def _workflow_rows(ezofis: Any, spec: ReportSpec, tenant_id: str) -> list[dict[str, Any]]:
    listed = await ezofis.list_workflows(tenant_id)

    async def _one(item: dict[str, Any]) -> list[dict[str, Any]]:
        wf_id = str((item or {}).get("id") or "").strip()
        wf_name = str((item or {}).get("name") or "").strip()
        if not wf_id:
            return []
        instances = await ezofis.list_workflow_instances(tenant_id=tenant_id, workflow_id=wf_id)
        out: list[dict[str, Any]] = []
        for row in instances or []:
            created = _parse_date(
                _pick(row, "createdAtUtc", "created_at_utc", "startedAtUtc", "started_at_utc")
            )
            completed = _parse_date(_pick(row, "completedAtUtc", "completed_at_utc"))
            instance_id = _pick(row, "instanceId", "instance_id", "id")
            out.append(
                {
                    "id": _pick(row, "requestNo", "ReqNo", "name", "id") or instance_id,
                    "workflowId": _pick(row, "workflowId", "workflow_id") or wf_id,
                    "itemId": _pick(
                        row, "itemId", "item_id", "repositoryItemId", "repository_item_id", "formEntryId"
                    ),
                    "instanceId": instance_id,
                    "workflowName": _pick(row, "workflowName", "workflow_name") or wf_name,
                    "status": _pick(row, "status"),
                    "startedBy": _pick(row, "startedBy", "started_by", "actedBy"),
                    "createdAtUtc": created,
                    "completedAtUtc": completed,
                    "open": completed is None,
                }
            )
        return out

    batches = await asyncio.gather(*[_one(item) for item in listed or []], return_exceptions=True)
    records: list[dict[str, Any]] = []
    for batch in batches:
        if isinstance(batch, Exception):
            continue
        records.extend(batch)
    return _shape_rows(spec, _aggregate_workflow(spec, records))


async def _repository_rows(ezofis: Any, spec: ReportSpec, tenant_id: str) -> list[dict[str, Any]]:
    listed = await ezofis.list_repositories(tenant_id)

    async def _one(item: dict[str, Any]) -> list[dict[str, Any]]:
        repo_id = str((item or {}).get("id") or "").strip()
        repo_name = str((item or {}).get("name") or "").strip()
        if not repo_id:
            return []
        docs = await ezofis.list_repository_items(tenant_id=tenant_id, repository_id=repo_id)
        out: list[dict[str, Any]] = []
        for row in docs or []:
            out.append(
                {
                    "itemId": _pick(row, "itemId", "item_id", "id"),
                    "Repository_Name": repo_name,
                    "FileName": _pick(row, "fileName", "FileName"),
                    "FileVersion": _pick(row, "fileVersion", "FileVersion"),
                    "CreatedBy": _pick(row, "createdBy", "CreatedBy"),
                    "CreatedAt": _parse_date(
                        _pick(row, "createdAt", "CreatedAt", "documentDate", "createdAtUtc")
                    ),
                    "Status": _pick(row, "status", "Status"),
                }
            )
        return out

    batches = await asyncio.gather(*[_one(item) for item in listed or []], return_exceptions=True)
    records: list[dict[str, Any]] = []
    for batch in batches:
        if isinstance(batch, Exception):
            continue
        records.extend(batch)
    return _shape_rows(spec, _aggregate_repository(spec, records))


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

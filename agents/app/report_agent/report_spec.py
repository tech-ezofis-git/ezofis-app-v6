"""Client-facing short reportSpec helpers (Phase 1 UI + Phase 2 input)."""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from app.models.report_agent import (
    ReportSpec,
    ReportSpecColumn,
    ReportSpecFilter,
    ReportSpecSort,
)
from app.report_agent.definition_lock import parse_definition_json
from app.report_agent.metadata_service import DatabaseSchema
from app.report_agent.schema_scope import SchemaTableSlice, preferred_fact_table


def available_columns_from_tables(tables: list[SchemaTableSlice], *, limit: int = 80) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for table in tables:
        for col in table.columns or []:
            key = (col.name or "").strip()
            if not key:
                continue
            low = key.lower()
            if low in seen:
                continue
            seen.add(low)
            names.append(key)
            if len(names) >= limit:
                return names
    return names


def _label_from_key(key: str) -> str:
    text = re.sub(r"[_\-]+", " ", (key or "").strip())
    text = re.sub(r"\s+", " ", text).strip()
    return text.title() if text else "Column"


_AGENT_KEY_HINTS = {
    "request_count",
    "inbox_count",
    "processed_count",
    "document_count",
    "pending_count",
    "version_count",
    "aging_bucket",
    "sla_bucket",
    "outstanding_amount",
    "pending_amount",
    "total_amount",
    "count",
    "sum",
    "avg",
    "average",
}
_NUMERIC_TYPES = ("int", "numeric", "decimal", "float", "double", "money", "real", "number")
_WORKFLOW_DEFAULTS: tuple[tuple[tuple[str, ...], str, str], ...] = (
    (("id", "requestno", "reqno", "request_no", "req_no", "name"), "id", "Req No"),
    (("stage", "currentstage", "activity", "activity_name", "step"), "stage", "Stage"),
    (("status",), "status", "Status"),
    (("startedby", "actedby", "acted_by", "assignedto", "assigned_to"), "startedBy", "Acted by"),
    (("workflowname", "workflow_name"), "workflowName", "Workflow"),
    (("createdatutc", "created_at_utc", "createdat", "created_at"), "createdAtUtc", "Created At"),
)
_REPO_DEFAULTS: tuple[tuple[tuple[str, ...], str, str], ...] = (
    (("repository_name", "repositoryname"), "Repository_Name", "Repository"),
    (("filename", "file_name"), "FileName", "File Name"),
    (("status",), "Status", "Status"),
    (("createdby", "created_by"), "CreatedBy", "Created By"),
    (("createdat", "created_at"), "CreatedAt", "Created At"),
)


def _parse_columns(raw_items: Any) -> list[ReportSpecColumn]:
    columns: list[ReportSpecColumn] = []
    for item in raw_items or []:
        if isinstance(item, str):
            key = item.strip()
            if not key:
                continue
            columns.append(ReportSpecColumn(key=key, label=_label_from_key(key)))
            continue
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or item.get("field") or "").strip()
        if not key:
            continue
        formula = item.get("formula") or item.get("expression")
        columns.append(
            ReportSpecColumn(
                key=key,
                label=str(item.get("label") or _label_from_key(key)).strip() or key,
                formula=(str(formula).strip() if formula else None),
                editable=bool(item.get("editable", True)),
                kind=(str(item.get("kind")).strip() or None) if item.get("kind") else None,
                selected=bool(item.get("selected", True)),
            )
        )
    return columns


def _is_agent_column(col: ReportSpecColumn) -> bool:
    if (col.kind or "").lower() == "agent":
        return True
    formula = (col.formula or "").lower()
    if any(token in formula for token in ("count(", "sum(", "avg(", "average(", "case ")):
        return True
    compact = re.sub(r"[^a-z0-9]", "", (col.key or "").lower())
    return compact in {re.sub(r"[^a-z0-9]", "", k) for k in _AGENT_KEY_HINTS}


def _lookup_alias(lower_map: dict[str, str], aliases: tuple[str, ...]) -> Optional[str]:
    for alias in aliases:
        hit = lower_map.get(alias.lower())
        if hit:
            return hit
    return None


def _default_defs_for(report_type: Optional[str]) -> tuple[tuple[tuple[str, ...], str, str], ...]:
    return _REPO_DEFAULTS if "repositor" in (report_type or "").lower() else _WORKFLOW_DEFAULTS


def _is_default_key(key: str, report_type: Optional[str] = None) -> bool:
    compact = re.sub(r"[^a-z0-9]", "", (key or "").lower())
    for aliases, canonical, _label in _default_defs_for(report_type):
        names = aliases + (canonical,)
        if compact in {re.sub(r"[^a-z0-9]", "", n) for n in names}:
            return True
    return False


def _is_form_or_repository_table(table: SchemaTableSlice) -> bool:
    """Userdefined columns come only from ezfb_* form tables and repository item tables."""
    name = (table.table or "").lower()
    if name in {"workflow_instances_all", "items_all"}:
        return False
    if name.startswith("ezfb_") and "_items" in name:
        return True
    if name.startswith("items_"):
        return True
    return False


def _dump_column(col: ReportSpecColumn) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "key": col.key,
        "label": col.label or _label_from_key(col.key),
        "selected": bool(col.selected),
    }
    if col.formula:
        payload["formula"] = col.formula
    if col.kind:
        payload["kind"] = col.kind
    return payload


def report_spec_to_prompt_json(
    spec: ReportSpec,
    *,
    workflow_name: Optional[str] = None,
    repository_name: Optional[str] = None,
) -> dict[str, Any]:
    """Client-facing generate-prompt JSON the UI can edit before Run."""
    userdefined = list(spec.userdefined_columns or [])
    defaults = list(spec.default_columns or [])
    agents = list(spec.agent_columns or [])
    if not (userdefined or defaults or agents):
        for col in spec.columns:
            if _is_agent_column(col):
                agents.append(col.model_copy(update={"kind": "agent", "selected": True}))
            elif _is_default_key(col.key, spec.report_type):
                defaults.append(col.model_copy(update={"kind": "default", "selected": True}))
            else:
                userdefined.append(col.model_copy(update={"kind": "userdefined", "selected": True}))
    formulas = [
        {"key": c.key, "expression": c.formula}
        for c in (agents + userdefined + defaults + list(spec.columns or []))
        if c.formula
    ]
    seen_formula: set[str] = set()
    unique_formulas = []
    for item in formulas:
        low = item["key"].lower()
        if low in seen_formula:
            continue
        seen_formula.add(low)
        unique_formulas.append(item)
    selected = [
        c.key
        for c in (defaults + userdefined + agents)
        if c.selected
    ] or [c.key for c in spec.columns]
    payload: dict[str, Any] = {
        "title": spec.title,
        "Objective": spec.objective or spec.title,
        "reportType": spec.report_type,
        "Userdefined Columns": [_dump_column(c) for c in userdefined],
        "Default columns": [_dump_column(c) for c in defaults],
        "Agent generated columns": [_dump_column(c) for c in agents],
        "Formula": unique_formulas,
        "Sort": (
            {"field": spec.sort.field, "direction": spec.sort.direction}
            if spec.sort and spec.sort.field
            else None
        ),
        "columns": selected,
        "groupBy": list(spec.group_by or []),
        "filters": [
            {"field": f.field, "op": f.op, "value": f.value, "editable": f.editable}
            for f in spec.filters
        ],
        "schemaTables": list(spec.schema_tables or []),
        "sourceSchema": spec.source_schema,
        "sourceTable": spec.source_table,
    }
    if workflow_name:
        payload["workflowName"] = workflow_name
    if repository_name:
        payload["repositoryName"] = repository_name
    if spec.warnings:
        payload["warnings"] = list(spec.warnings)
    return payload


def attach_column_palettes(
    spec: ReportSpec,
    *,
    tables: Optional[list[SchemaTableSlice]] = None,
    schema_tables: Optional[list[str]] = None,
) -> ReportSpec:
    """Split live fields into default / userdefined / agent palettes for the UI."""
    tables = tables or []
    type_by_key: dict[str, str] = {}
    live: list[str] = list(spec.available_columns or [])
    for table in tables:
        for col in table.columns or []:
            name = (col.name or "").strip()
            if not name:
                continue
            type_by_key[name.lower()] = (col.type or "").lower()
            if name.lower() not in {c.lower() for c in live}:
                live.append(name)
    lower_map = {c.lower(): c for c in live}
    selected_map = {c.key.lower(): c for c in spec.columns}

    report_type = (spec.report_type or "").lower()
    is_repo = "repositor" in report_type
    default_defs = _REPO_DEFAULTS if is_repo else _WORKFLOW_DEFAULTS

    defaults: list[ReportSpecColumn] = []
    default_keys: set[str] = set()
    for aliases, canonical, label in default_defs:
        live_key = _lookup_alias(lower_map, aliases) or (
            lower_map.get(canonical.lower()) if canonical.lower() in lower_map else None
        )
        key = live_key or canonical
        existing = selected_map.get(key.lower())
        defaults.append(
            ReportSpecColumn(
                key=key,
                label=(existing.label if existing and existing.label else label),
                formula=existing.formula if existing else None,
                editable=True,
                kind="default",
                selected=existing is not None,
            )
        )
        default_keys.add(key.lower())
        for alias in aliases:
            default_keys.add(alias.lower())

    agents: list[ReportSpecColumn] = []
    agent_keys: set[str] = set()
    for col in spec.columns:
        if not _is_agent_column(col):
            continue
        agents.append(
            col.model_copy(update={"kind": "agent", "selected": True, "editable": True})
        )
        agent_keys.add(col.key.lower())

    count_key = "Document_Count" if is_repo else "Request_Count"
    count_label = "Documents" if is_repo else "Count"
    if not any("count(" in (c.formula or "").lower() for c in agents):
        existing = selected_map.get(count_key.lower())
        agents.append(
            ReportSpecColumn(
                key=count_key,
                label=count_label,
                formula="COUNT(*)",
                editable=True,
                kind="agent",
                selected=existing is not None,
            )
        )
        agent_keys.add(count_key.lower())

    numeric_keys = [
        name
        for name in live
        if any(token in type_by_key.get(name.lower(), "") for token in _NUMERIC_TYPES)
    ]
    for name in numeric_keys[:6]:
        for fn, suffix, label_prefix in (("SUM", "Sum", "Sum"), ("AVG", "Avg", "Avg")):
            key = f"{suffix}_{name}"
            if key.lower() in agent_keys:
                continue
            existing = selected_map.get(key.lower())
            agents.append(
                ReportSpecColumn(
                    key=key,
                    label=existing.label if existing and existing.label else f"{label_prefix} {_label_from_key(name)}",
                    formula=existing.formula if existing else f"{fn}({name})",
                    editable=True,
                    kind="agent",
                    selected=existing is not None,
                )
            )
            agent_keys.add(key.lower())

    userdefined: list[ReportSpecColumn] = []
    used = default_keys | agent_keys
    form_repo_names: list[str] = []
    seen_form: set[str] = set()
    for table in tables:
        if not _is_form_or_repository_table(table):
            continue
        for col in table.columns or []:
            name = (col.name or "").strip()
            if not name or name.lower() in seen_form:
                continue
            seen_form.add(name.lower())
            form_repo_names.append(name)
    for name in form_repo_names:
        if name.lower() in used:
            continue
        existing = selected_map.get(name.lower())
        userdefined.append(
            ReportSpecColumn(
                key=name,
                label=(existing.label if existing and existing.label else _label_from_key(name)),
                formula=existing.formula if existing else None,
                editable=True,
                kind="userdefined",
                selected=existing is not None and not _is_agent_column(existing),
            )
        )
        used.add(name.lower())
    source = (spec.source_table or "").lower()
    allow_selected_form_fallback = source.startswith("ezfb_") or (
        source.startswith("items_") and source != "items_all"
    )
    if allow_selected_form_fallback:
        for col in spec.columns:
            if col.key.lower() in used:
                continue
            if _is_agent_column(col) or _is_default_key(col.key, spec.report_type):
                continue
            userdefined.append(
                col.model_copy(update={"kind": "userdefined", "selected": True, "editable": True})
            )
            used.add(col.key.lower())

    selected_columns = [
        c.model_copy(update={"selected": True})
        for c in (defaults + userdefined + agents)
        if c.selected
    ]
    if not selected_columns:
        selected_columns = list(spec.columns)

    tables_out = list(schema_tables or spec.schema_tables or [])
    if not tables_out:
        for table in tables:
            prefix = f"{table.schema_name}." if table.schema_name else ""
            tables_out.append(f"{prefix}{table.table}")

    return spec.model_copy(
        update={
            "columns": selected_columns,
            "default_columns": defaults,
            "userdefined_columns": userdefined,
            "agent_columns": agents,
            "schema_tables": tables_out,
            "available_columns": live or spec.available_columns,
        }
    )


def apply_selected_columns(spec: ReportSpec) -> ReportSpec:
    buckets = list(spec.default_columns or []) + list(spec.userdefined_columns or []) + list(
        spec.agent_columns or []
    )
    if not buckets:
        return spec
    selected = [c.model_copy(update={"selected": True}) for c in buckets if c.selected]
    if not selected:
        selected = [c.model_copy(update={"selected": True}) for c in spec.columns]
    return spec.model_copy(update={"columns": selected})


def spec_from_prompt_json(raw: str, *, report_type: Optional[str] = None) -> Optional[ReportSpec]:
    text = (raw or "").strip()
    if not text.startswith("{"):
        return None
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        try:
            payload = parse_definition_json(text)
        except ValueError:
            return None
    if not isinstance(payload, dict):
        return None
    return normalize_report_spec(payload, report_type=report_type)


def normalize_report_spec(
    raw: Any,
    *,
    report_type: Optional[str] = None,
    description: str = "",
    available_columns: Optional[list[str]] = None,
    warnings: Optional[list[str]] = None,
) -> ReportSpec:
    data: dict[str, Any] = {}
    if isinstance(raw, ReportSpec):
        data = raw.model_dump(by_alias=True)
    elif isinstance(raw, dict):
        data = dict(raw)
    elif isinstance(raw, str) and raw.strip():
        try:
            data = parse_definition_json(raw)
        except ValueError:
            data = {"objective": raw.strip()}

    title = str(data.get("title") or description or "Report").strip() or "Report"
    objective = str(
        data.get("objective") or data.get("Objective") or description or title
    ).strip()

    userdefined = _parse_columns(
        data.get("userdefinedColumns")
        or data.get("userdefined_columns")
        or data.get("Userdefined Columns")
        or []
    )
    defaults = _parse_columns(
        data.get("defaultColumns")
        or data.get("default_columns")
        or data.get("Default columns")
        or []
    )
    agents = _parse_columns(
        data.get("agentColumns")
        or data.get("agent_columns")
        or data.get("Agent generated columns")
        or []
    )
    for col in userdefined:
        if not col.kind:
            col.kind = "userdefined"
    for col in defaults:
        if not col.kind:
            col.kind = "default"
    for col in agents:
        if not col.kind:
            col.kind = "agent"

    formula_items = data.get("Formula") or data.get("formula") or []
    formula_map: dict[str, str] = {}
    if isinstance(formula_items, str) and formula_items.strip():
        formula_map["_"] = formula_items.strip()
    elif isinstance(formula_items, dict):
        key = str(formula_items.get("key") or "").strip()
        expr = str(formula_items.get("expression") or formula_items.get("formula") or "").strip()
        if key and expr:
            formula_map[key.lower()] = expr
    elif isinstance(formula_items, list):
        for item in formula_items:
            if not isinstance(item, dict):
                continue
            key = str(item.get("key") or "").strip()
            expr = str(item.get("expression") or item.get("formula") or "").strip()
            if key and expr:
                formula_map[key.lower()] = expr
    for col in agents + userdefined + defaults:
        if not col.formula and col.key.lower() in formula_map:
            col.formula = formula_map[col.key.lower()]

    columns = _parse_columns(data.get("columns") or [])
    if columns and all(isinstance(item, str) for item in (data.get("columns") or []) if item):
        palette = {c.key.lower(): c for c in defaults + userdefined + agents}
        resolved: list[ReportSpecColumn] = []
        for col in columns:
            hit = palette.get(col.key.lower())
            resolved.append(hit.model_copy(update={"selected": True}) if hit else col)
        columns = resolved
    if not columns:
        columns = [c for c in (defaults + userdefined + agents) if c.selected]

    filters: list[ReportSpecFilter] = []
    for item in data.get("filters") or []:
        if not isinstance(item, dict):
            continue
        field = str(item.get("field") or item.get("key") or "").strip()
        if not field:
            continue
        filters.append(
            ReportSpecFilter(
                field=field,
                op=str(item.get("op") or "eq").strip() or "eq",
                value=item.get("value"),
                editable=bool(item.get("editable", True)),
            )
        )

    group_by = [
        str(g).strip()
        for g in (data.get("groupBy") or data.get("group_by") or [])
        if str(g).strip()
    ]

    sort = None
    sort_raw = data.get("sort") or data.get("Sort")
    if isinstance(sort_raw, dict) and sort_raw.get("field"):
        sort = ReportSpecSort(
            field=str(sort_raw.get("field")).strip(),
            direction=str(sort_raw.get("direction") or "asc").strip().lower() or "asc",
        )

    avail = available_columns
    if avail is None:
        avail = [str(c).strip() for c in (data.get("availableColumns") or data.get("available_columns") or []) if str(c).strip()]

    warn = list(warnings or [])
    for w in data.get("warnings") or []:
        text = str(w).strip()
        if text and text not in warn:
            warn.append(text)

    if not columns and description:
        # very light fallback: use words that look like field names from description
        pass

    schema_tables = [
        str(t).strip()
        for t in (data.get("schemaTables") or data.get("schema_tables") or [])
        if str(t).strip()
    ]
    return ReportSpec(
        title=title,
        objective=objective,
        report_type=str(data.get("reportType") or data.get("report_type") or report_type or "").strip() or None,
        columns=columns,
        filters=filters,
        group_by=group_by,
        sort=sort,
        available_columns=avail or [],
        source_schema=str(data.get("sourceSchema") or data.get("source_schema") or "").strip() or None,
        source_table=str(data.get("sourceTable") or data.get("source_table") or "").strip() or None,
        userdefined_columns=userdefined,
        default_columns=defaults,
        agent_columns=agents,
        schema_tables=schema_tables,
        warnings=warn,
    )


def parse_report_spec_json(raw: str) -> ReportSpec:
    payload = parse_definition_json(raw)
    return normalize_report_spec(payload)


def fallback_report_spec(
    *,
    description: str,
    report_type: str,
    tables: list[SchemaTableSlice],
    warnings: Optional[list[str]] = None,
) -> ReportSpec:
    from app.report_agent.report_catalog import match_report_intent, spec_from_intent

    avail = available_columns_from_tables(tables)
    preferred = preferred_fact_table(tables)
    return spec_from_intent(
        intent=match_report_intent(description, report_type=report_type),
        description=description,
        report_type=report_type,
        available_columns=avail,
        source_schema=(preferred.schema_name if preferred else None),
        source_table=(preferred.table if preferred else None),
        warnings=warnings,
    )


def report_spec_to_prompt(
    spec: ReportSpec,
    *,
    workflow_name: Optional[str] = None,
    repository_name: Optional[str] = None,
) -> str:
    """Build the generate-prompt JSON the UI edits before Run."""
    return json.dumps(
        report_spec_to_prompt_json(
            spec,
            workflow_name=workflow_name,
            repository_name=repository_name,
        ),
        indent=2,
        ensure_ascii=False,
    )


def enrich_spec_with_schema(
    spec: ReportSpec,
    schema: DatabaseSchema,
    tables: list[SchemaTableSlice],
) -> ReportSpec:
    """Drop unknown columns when possible; keep formulas; fill availableColumns."""
    avail = available_columns_from_tables(tables)
    lower = {c.lower(): c for c in avail}
    # also allow any schema column name as available
    for col in getattr(schema, "all_columns", []) or []:
        name = getattr(col, "column", None) or getattr(col, "name", None) or ""
        if name and name.lower() not in lower:
            lower[name.lower()] = name
            avail.append(name)

    def _match_name(key: str) -> Optional[str]:
        if not key:
            return None
        hit = lower.get(key.lower())
        if hit:
            return hit
        needle = re.sub(r"[^a-z0-9]", "", key.lower())
        if len(needle) < 3:
            return None
        for low, real in lower.items():
            compact = re.sub(r"[^a-z0-9]", "", low)
            if needle == compact or needle in compact or compact in needle:
                return real
        return None

    virtual = (spec.source_table or "").lower() in {"workflow_instances_all", "items_all"}
    kept: list[ReportSpecColumn] = []
    warnings = list(spec.warnings or [])
    for col in spec.columns:
        if col.formula:
            kept.append(col)
            continue
        hit = _match_name(col.key)
        if hit:
            kept.append(ReportSpecColumn(key=hit, label=col.label or _label_from_key(hit), formula=None, editable=col.editable))
        elif virtual:
            kept.append(col)
        else:
            warnings.append(f"Column '{col.key}' not found in schema slice; dropped from short prompt.")
    if not kept and avail:
        kept = [ReportSpecColumn(key=a, label=_label_from_key(a)) for a in avail[:6]]

    filters: list[ReportSpecFilter] = []
    for f in spec.filters:
        hit = _match_name(f.field)
        if hit:
            filters.append(ReportSpecFilter(field=hit, op=f.op, value=f.value, editable=f.editable))
        elif virtual:
            filters.append(f)
        else:
            warnings.append(f"Filter field '{f.field}' not found in schema slice; dropped.")

    group_by = []
    formula_keys = {c.key.lower() for c in kept if c.formula}
    for g in spec.group_by:
        hit = _match_name(g)
        if hit:
            group_by.append(hit)
        elif g.lower() in formula_keys or virtual:
            group_by.append(g)

    sort = spec.sort
    if sort and sort.field:
        formula_keys = {c.key.lower() for c in kept if c.formula}
        hit = _match_name(sort.field)
        if hit:
            sort = ReportSpecSort(field=hit, direction=sort.direction)
        elif sort.field.lower() not in formula_keys:
            warnings.append(f"Sort field '{sort.field}' not found; cleared.")
            sort = None

    preferred = preferred_fact_table(tables)
    source_table = spec.source_table
    source_schema = spec.source_schema
    if not source_table and preferred:
        source_schema = preferred.schema_name
        source_table = preferred.table
    elif source_table:
        resolved = schema.resolve_table(source_schema, source_table) if hasattr(schema, "resolve_table") else None
        if resolved:
            source_schema, source_table = resolved

    return ReportSpec(
        title=spec.title,
        objective=spec.objective,
        report_type=spec.report_type,
        columns=kept,
        filters=filters,
        group_by=group_by,
        sort=sort,
        available_columns=avail[:80],
        source_schema=source_schema,
        source_table=source_table,
        userdefined_columns=list(spec.userdefined_columns or []),
        default_columns=list(spec.default_columns or []),
        agent_columns=list(spec.agent_columns or []),
        schema_tables=list(spec.schema_tables or []),
        warnings=warnings,
    )

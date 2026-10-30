"""Report Agent v2 spec -> the V6 "report AI definition" format.

V6 keeps AI-built reports in reporting."ReportAiDefinitions" (ReportAiDefinitionService): a
ReportPrompt (the generate-prompt JSON text) and a ReportSpecJson in the shape of the
orchestrator's existing ReportSpec model (app/models/report_agent.py). Both are produced here
with that same model and app.report_agent.report_spec.report_spec_to_prompt, so v2 rows look
exactly like the ones the existing report agent saves.

v2's executable spec travels along under AGENT_SPEC_KEY; the existing ReportSpec model and the
.NET side both ignore unknown keys.
"""

from __future__ import annotations

from app.models.report_agent import ReportSpec as AiReportSpec
from app.models.report_agent import ReportSpecColumn, ReportSpecFilter, ReportSpecSort
from app.report_agent.report_spec import report_spec_to_prompt
from app.report_agent_v2.domain.compiler import CompiledQuery
from app.report_agent_v2.domain.source_catalog import SourceCatalog
from app.report_agent_v2.domain.spec import Condition, Derived, Measure, OutputColumn, ReportSpec

AGENT_SPEC_KEY = "agentSpec"

_OP_TEXT = {
    "equals": "=", "notEquals": "!=", "gt": ">", "gte": ">=", "lt": "<", "lte": "<=",
    "contains": "contains", "notContains": "does not contain", "startsWith": "starts with",
    "endsWith": "ends with", "in": "in", "notIn": "not in", "isEmpty": "is empty", "isNotEmpty": "is not empty",
}
# Existing ReportSpecFilter ops (eq/ne/...) as used by the existing report agent.
_FILTER_OP = {"equals": "eq", "notEquals": "ne", "gt": "gt", "gte": "gte", "lt": "lt", "lte": "lte",
              "contains": "contains", "notContains": "not_contains", "startsWith": "starts_with",
              "endsWith": "ends_with", "in": "in", "notIn": "not_in", "isEmpty": "is_null", "isNotEmpty": "is_not_null"}


def report_type(catalog: SourceCatalog) -> str:
    return "specific_workflow" if catalog.source_type == "Workflow" else "specific_repository"


class _Labels:
    def __init__(self, spec: ReportSpec, catalog: SourceCatalog) -> None:
        self._map = {fid: f.label for fid, f in catalog.fields.items()}
        self._map.update({d.id: d.label for d in spec.derived})
        self._map.update({m.id: m.label for m in spec.measures})

    def __call__(self, ref: str | None) -> str:
        return self._map.get(ref or "", ref or "")


def _condition_text(c: Condition, label: _Labels) -> str:
    op = _OP_TEXT.get(c.op, c.op)
    if c.op in ("isEmpty", "isNotEmpty"):
        return f"{label(c.ref)} {op}"
    value = ", ".join(c.values) if c.values else (c.value or "")
    return f"{label(c.ref)} {op} {value}".strip()


def _derived_formula(d: Derived, label: _Labels) -> str:
    args = [label(a.ref) if a.ref else (str(a.number) if a.number is not None else repr(a.text)) for a in d.args
            if a.ref or a.number is not None or a.text is not None]
    if d.op == "bucket":
        ranges = [f"<= {e}: {lbl}" for e, lbl in zip(d.edges, d.labels)] + ([f"else: {d.labels[-1]}"] if d.labels else [])
        return f"BUCKET({', '.join(args)}; {'; '.join(ranges)})"
    if d.op == "if" and d.condition is not None:
        return f"IF({_condition_text(d.condition, label)}, {', '.join(args)})"
    symbol = {"add": " + ", "sub": " - ", "mul": " * ", "div": " / "}.get(d.op)
    if symbol:
        return symbol.join(args)
    return f"{d.op.upper()}({', '.join(args)})"


def _measure_formula(m: Measure, label: _Labels) -> str:
    text = f"{m.fn.upper()}({label(m.of) if m.of else '*'})"
    if m.where:
        text += " WHERE " + " AND ".join(_condition_text(c, label) for c in m.where)
    return text


# Wizard filter ops (the existing ReportSpecFilter vocabulary) -> v2 condition ops.
_UI_FILTER_OP = {
    "eq": "equals", "=": "equals", "equals": "equals",
    "ne": "notEquals", "neq": "notEquals", "!=": "notEquals", "notequals": "notEquals",
    "gt": "gt", ">": "gt", "gte": "gte", ">=": "gte", "lt": "lt", "<": "lt", "lte": "lte", "<=": "lte",
    "contains": "contains", "not_contains": "notContains", "starts_with": "startsWith", "ends_with": "endsWith",
    "in": "in", "not_in": "notIn",
    "is_null": "isEmpty", "is_empty": "isEmpty", "not_null": "isNotEmpty", "is_not_null": "isNotEmpty",
}


def _as_text(value: object) -> str:
    return "" if value is None else (str(value).lower() if isinstance(value, bool) else str(value))


def apply_ui_edits(
    spec: ReportSpec, ui: dict | None, catalog: SourceCatalog, compiled: CompiledQuery
) -> tuple[ReportSpec, list[str]]:
    """Apply the wizard's edits on a reportSpec (V6 format) to the executable v2 spec.

    `compiled` is the unedited spec compiled against `catalog`: its column keys are the keys the
    reportSpec columns carry. Applied: selected columns (order + labels), filters, title and
    objective. Columns or filter fields the spec does not know are ignored (with a warning), so a
    reportSpec can never reference anything the compiler has not already validated.
    """
    if not isinstance(ui, dict):
        return spec, []
    warnings: list[str] = []
    update: dict = {}

    columns = ui.get("columns")
    if isinstance(columns, list) and columns:
        by_key = {c.key: c for c in compiled.columns}
        picked = []
        for col in columns:
            if not isinstance(col, dict) or col.get("selected") is False:
                continue
            meta = by_key.get(str(col.get("key") or ""))
            if meta is None:
                continue
            picked.append(OutputColumn(ref=meta.ref, label=(str(col.get("label") or "").strip() or meta.label)))
        if picked:
            update["columns"] = picked

    filters = ui.get("filters")
    if isinstance(filters, list):
        # A field may be sent as an id or a label; ids win, then derived/measure labels, then catalog labels.
        refs: dict[str, str] = {f.label.lower(): fid for fid, f in catalog.fields.items()}
        refs.update({m.label.lower(): m.id for m in spec.measures})
        refs.update({d.label.lower(): d.id for d in spec.derived})
        refs.update({c.key.lower(): c.ref for c in compiled.columns})
        known = set(catalog.fields) | {d.id for d in spec.derived} | {m.id for m in spec.measures}
        conditions: list[Condition] = []
        for item in filters:
            if not isinstance(item, dict):
                continue
            field = str(item.get("field") or "").strip()
            ref = field if field in known else refs.get(field.lower())
            op_name = str(item.get("op") or "eq").strip().lower()
            value = item.get("value")
            if not ref:
                warnings.append(f"Filter on '{field}' was ignored: the report has no such field.")
                continue
            if op_name == "between":
                bounds = value if isinstance(value, list) else [v for v in _as_text(value).replace(" and ", ",").split(",")]
                bounds = [_as_text(b).strip() for b in bounds if _as_text(b).strip()]
                if len(bounds) == 2:
                    conditions += [Condition(ref=ref, op="gte", value=bounds[0]), Condition(ref=ref, op="lte", value=bounds[1])]
                else:
                    warnings.append(f"Filter on '{field}' was ignored: 'between' needs two values.")
                continue
            op = _UI_FILTER_OP.get(op_name)
            if op is None:
                warnings.append(f"Filter on '{field}' was ignored: unsupported operator '{op_name}'.")
                continue
            if isinstance(value, list):
                conditions.append(Condition(ref=ref, op=op, values=[_as_text(v) for v in value]))
            else:
                conditions.append(Condition(ref=ref, op=op, value=None if op in ("isEmpty", "isNotEmpty") else _as_text(value)))
        update["filters"] = conditions

    if str(ui.get("title") or "").strip():
        update["title"] = str(ui["title"]).strip()
    if str(ui.get("objective") or "").strip():
        update["description"] = str(ui["objective"]).strip()
    return (spec.model_copy(update=update) if update else spec), warnings


def _keep_highlights(spec_json: dict, ui: dict | None) -> None:
    """Carry the wizard's column highlight rules (keyed by column key) into a rebuilt ReportSpecJson."""
    if not isinstance(ui, dict):
        return
    # Keyed by the column's key and by its (possibly edited) label: a renamed column gets a new key.
    rules = {
        str(name): col["highlight"]
        for lst in ("columns", "defaultColumns", "agentColumns", "userdefinedColumns")
        for col in (ui.get(lst) or [])
        if isinstance(col, dict) and col.get("highlight")
        for name in (col.get("key"), col.get("label"))
        if name
    }
    if not rules:
        return
    for lst in ("columns", "defaultColumns", "agentColumns", "userdefinedColumns"):
        for col in spec_json.get(lst) or []:
            if col.get("key") in rules:
                col["highlight"] = rules[col["key"]]


def build_ai_spec(
    spec: ReportSpec,
    compiled: CompiledQuery,
    catalog: SourceCatalog,
    *,
    prompt: str,
    warnings: list[str],
    spec_version: int | None = None,
    ui_spec: dict | None = None,
) -> tuple[dict, str]:
    """Return (ReportSpecJson dict, ReportPrompt text) in the V6 report AI definition format.

    `ui_spec`: the reportSpec the wizard sent; its column highlight rules are kept.
    """
    label = _Labels(spec, catalog)
    formulas = {d.id: _derived_formula(d, label) for d in spec.derived}
    formulas.update({m.id: _measure_formula(m, label) for m in spec.measures})

    columns, defaults, agents = [], [], []
    for col in compiled.columns:
        if col.role == "link":  # hidden row ids, not report columns
            continue
        is_agent = col.ref in formulas
        column = ReportSpecColumn(
            key=col.key, label=col.label, formula=formulas.get(col.ref), editable=True,
            kind="agent" if is_agent else "default", selected=True,
        )
        columns.append(column)
        (agents if is_agent else defaults).append(column)

    order = spec.order_by[0] if spec.order_by else None
    rtype = report_type(catalog)
    ai = AiReportSpec(
        title=spec.title,
        objective=spec.description,
        user_prompt=prompt,
        report_type=rtype,
        columns=columns,
        filters=[
            ReportSpecFilter(field=label(f.ref), op=_FILTER_OP.get(f.op, f.op),
                             value=list(f.values) if f.values else f.value, editable=True)
            for f in spec.filters
        ],
        group_by=[label(ref) for ref in spec.group_by],
        sort=ReportSpecSort(field=label(order.ref), direction=order.direction) if order else None,
        available_columns=[f.label for f in catalog.fields.values()],
        source_schema=catalog.items_schema,
        source_table=catalog.items_table,
        userdefined_columns=[],
        default_columns=defaults,
        agent_columns=agents,
        schema_tables=[f"{catalog.items_schema}.{catalog.items_table}"],
        warnings=list(dict.fromkeys(list(warnings) + [f"Assumption: {a}" for a in spec.assumptions])),
    )
    workflow_name = catalog.source_name if rtype == "specific_workflow" else None
    repository_name = catalog.source_name if rtype == "specific_repository" else None
    prompt_text = report_spec_to_prompt(ai, workflow_name=workflow_name, repository_name=repository_name, user_prompt=prompt)

    spec_json = ai.model_dump(by_alias=True, mode="json")
    _keep_highlights(spec_json, ui_spec)
    spec_json[AGENT_SPEC_KEY] = {
        "engine": "report-agent-v2",
        "specVersion": spec_version,
        "sourceType": catalog.source_type,
        "sourceId": str(catalog.source_id),
        "sourceFormId": catalog.form_id,
        "assumptions": spec.assumptions,
        "spec": spec.dump(),
    }
    return spec_json, prompt_text


def build_system_ai_spec(template) -> tuple[dict, str]:
    """(ReportSpecJson, ReportPrompt) for a default report (system_reports.Template): same V6 format, no agent spec."""
    columns = [ReportSpecColumn(key=c.label, label=c.label, editable=False, kind="default", selected=True) for c in template.columns]
    ai = AiReportSpec(
        title=template.name,
        objective=template.description,
        user_prompt=template.name,
        report_type=template.report_type,
        columns=columns,
        default_columns=columns,
        available_columns=[c.label for c in template.columns],
        warnings=[],
    )
    prompt_text = report_spec_to_prompt(ai, user_prompt=template.name)
    spec_json = ai.model_dump(by_alias=True, mode="json")
    spec_json[AGENT_SPEC_KEY] = {"engine": "report-agent-v2", "kind": "system", "template": template.key,
                                 "windowDays": template.window_days}
    return spec_json, prompt_text

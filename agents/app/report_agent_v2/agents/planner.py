"""LLM planner: natural-language request + field catalog -> ReportSpec JSON.

Uses the orchestrator's shared LLMAdapter with the same model selection as the in-process
Report Agent (app/report_agent/service.py): the tenant's catalog model for agent "report",
then its fallback chain, else the adapter's process-wide default (Test Console / LLM_MODEL).
The JSON schema is given in the prompt and the reply is validated by ReportSpec, so a
malformed reply goes through the normal repair round. The planner never sees data rows,
credentials or tokens — only the field catalog (ids, labels, types) of the chosen source.

The planner is an interface so tests (and offline environments) can inject a stub.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Protocol

from app.catalog.tenant_llm import apply_tenant_agent_llm
from app.llm.adapter import LLMAdapter, LLMAdapterError
from app.report_agent_v2.domain.spec import LLM_OUTPUT_SCHEMA
from app.report_agent_v2.errors import UpstreamError

logger = logging.getLogger(__name__)

AGENT_SLUG = "report"  # same catalog model selection as the existing Report Agent

SYSTEM_PROMPT = """You design business reports for a workflow automation platform. You receive a user's \
request and the field catalog of ONE data source (a workflow's form plus workflow system fields, or a \
document folder). You return a report specification as JSON matching the provided schema. You never write SQL.

How the specification works
- References ("ref", "of", "groupBy", column refs) may point to: a catalog field "id", a "derived" id, or \
(only in columns, orderBy and filters) a "measures" id. Use catalog ids exactly as given. Never invent fields.
- derived: per-row calculated values, evaluated in order; each may use catalog ids and EARLIER derived ids.
  ops: add/sub/mul/div (numbers), coalesce, round(value, digits), days_since(date) = days from the run date \
to the date, days_between(start, end), bucket(number) with integer "edges" and len(edges)+1 "labels" \
(value <= edges[0] -> labels[0], ... , above the last edge -> last label), if(condition, then, else), date_part(date, "day"|"week"|"month"|"quarter"|"year") = a sortable period label such as 2026-03 (dataType text).
  Each arg sets exactly one of ref / number / text; the others are null.
- filters: row conditions combined with AND. Date values may be YYYY-MM-DD, "today", "today-30", "today+7".
  Add a filter ONLY for a value the user states ("status Approved", "last 30 days", "amount over 1000"). "Filter by X, Y" without values means the user wants to filter on those fields in the report screen: include X and Y as columns and add NO filter for them. Never guess or default a filter value.
- groupBy + measures produce one row per group. In a grouped report every non-measure column must be in \
groupBy. A measure's "where" conditions make it conditional, e.g. SUM(outstanding) only where \
aging_bucket = "31-60" — use this to spread buckets or statuses across columns.
- Without groupBy and measures the report lists one row per record.
- columns: the output columns in display order, each with a clear business label.
- totals: true when a grand-total row is meaningful (sums and counts).

Judgment
- Prefer real fields over assumptions. If the request needs data the catalog does not have (for example a \
due date or payments), use the closest available field (invoice date, submission date "sys.submitted_at", \
request raised date) or derive it (e.g. due date unavailable -> age from invoice date), and state every \
such substitution in "assumptions" in plain language.
- Outstanding balance: invoice amount minus paid amount when a paid/payment field exists; otherwise the \
invoice amount of records that are not paid/completed/rejected, using a status field or "sys.request_status". \
Say which in assumptions.
- Text fields may hold numbers or dates; you may use them in numeric/date operations (they are converted safely).
- Keep it focused: only the columns the request needs. ids for derived values and measures: short snake_case.
- If the request cannot be met at all from this catalog, still return the closest useful report and explain \
the gap in assumptions.

Short or vague requests
Users often type only a few words ("AP aging", "invoice summary", "pending requests"). Never ask a question \
back: build the standard business layout below for that kind of report, and list every choice you made in \
"assumptions" so the user can refine it.
- Aging (aging, ageing, overdue, outstanding, past due): one row per supplier/vendor/customer field (if none \
exists, a single total row); columns Current (not yet due), 1-30, 31-60, 61-90 and 90+ days past the due date \
(no due date -> invoice date, then "sys.submitted_at"), each the SUM of the outstanding amount, plus an \
invoice count and a Total; totals true; order by Total desc.
- Summary / "by X" / totals: group by X (or the most meaningful category field, e.g. supplier, status, \
department); count of records plus SUM of the main amount field; totals true.
- List / register / details / "all X": one row per record with the key business fields (identifier, party, \
dates, amounts, status; at most 8 columns), newest first. Request No, Stage, Created By, Action By, Created At \
and Modified At are added to every list report automatically: do not add them yourself.
- Monthly / weekly / yearly / trend / "per month": derive date_part(<main date field>, "month") (or week, quarter, year), group by it with a record count (plus SUM of the main amount if there is one), order by it asc.
- Status / pipeline / pending / stage: group by "sys.request_status" or "sys.current_stage" with a record count \
(and SUM of the main amount if there is one).
- Never use file-upload or line-item fields as columns or groups."""


class ReportPlanner(Protocol):
    async def plan(self, request: dict, catalog_view: list[dict], feedback: list[str] | None, history: list) -> tuple[dict, list, str | None]:
        """Return (raw spec dict, updated message history, model used)."""


_OUTPUT_INSTRUCTIONS = (
    "\n\nArguments\n- \"args\" holds ONLY the arguments the op takes: days_since 1, bucket 1, round 1-2, "
    "days_between 2, date_part 2 (date ref, then the part as text), if 2 (then, else), add/sub/mul/div 2+, "
    "coalesce 1+. Never pad args with null entries.\n"
    "- Each arg sets exactly one of ref / number / text; the other two are null.\n"
    "- Every arg of one op has the same kind of value (do not mix dates and amounts in coalesce).\n"
    "- bucket: edges are the UPPER bounds of each range, so labels has one more entry than edges.\n"
    "\nExample (AP aging; FIELD ids are placeholders for real catalog ids):\n"
    '{"derived":['
    '{"id":"age_days","label":"Days Past Due","dataType":"number","op":"days_since",'
    '"args":[{"ref":"DUE_DATE_FIELD","number":null,"text":null}],"edges":[],"labels":[],"condition":null},'
    '{"id":"amount","label":"Amount","dataType":"number","op":"coalesce",'
    '"args":[{"ref":"AMOUNT_FIELD","number":null,"text":null},{"ref":null,"number":0,"text":null}],"edges":[],"labels":[],"condition":null},'
    '{"id":"aging_bucket","label":"Aging Bucket","dataType":"text","op":"bucket",'
    '"args":[{"ref":"age_days","number":null,"text":null}],"edges":[0,30,60,90],'
    '"labels":["Current","1-30","31-60","61-90","90+"],"condition":null}],'
    '"groupBy":["SUPPLIER_FIELD"],"measures":['
    '{"id":"amt_1_30","label":"1-30 Days","fn":"sum","of":"amount","where":[{"ref":"aging_bucket","op":"equals","value":"1-30","values":[]}]},'
    '{"id":"amt_total","label":"Total","fn":"sum","of":"amount","where":[]}],'
    '"columns":[{"ref":"SUPPLIER_FIELD","label":"Supplier"},{"ref":"amt_1_30","label":"1-30 Days"},{"ref":"amt_total","label":"Total"}]}\n'
    "\nOutput format\n- Reply with ONE JSON object and nothing else (no prose, no code fences).\n"
    "- It must validate against this JSON Schema:\n" + json.dumps(LLM_OUTPUT_SCHEMA, separators=(",", ":"))
)


def _parse_json_object(text: str) -> dict | None:
    raw = (text or "").strip()
    fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", raw, flags=re.DOTALL)
    if fence:
        raw = fence.group(1)
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        payload = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


class OrchestratorLLMPlanner:
    def __init__(self, llm: LLMAdapter, catalog_store: Any | None) -> None:
        self._llm = llm
        self._catalog_store = catalog_store

    async def _model_chain(self, tenant_id: str | None) -> list[dict[str, Any]]:
        """[primary, *fallbacks] chat_completion overrides, as ReportAgentService._resolve_llm_presets."""
        if not tenant_id or self._catalog_store is None:
            return [{}]
        resolved = await apply_tenant_agent_llm(self._catalog_store, tenant_id, AGENT_SLUG)
        primary = {k: v for k, v in (resolved.get("overrides") or {}).items() if v is not None}
        fallbacks = list(resolved.get("fallback_chain") or [])
        if not fallbacks and resolved.get("fallback_overrides"):
            fallbacks = [resolved["fallback_overrides"]]
        if primary:
            fallbacks = [f for f in fallbacks if f.get("model") != primary.get("model")]
        return [primary, *fallbacks]

    async def plan(self, request: dict, catalog_view: list[dict], feedback: list[str] | None, history: list) -> tuple[dict, list, str | None]:
        messages = list(history)
        if not messages:
            messages.append({"role": "system", "content": SYSTEM_PROMPT + _OUTPUT_INSTRUCTIONS})
            messages.append(
                {
                    "role": "user",
                    "content": (
                        "<source>\n" + json.dumps({k: request[k] for k in ("sourceType", "sourceName", "formName")}, default=str)
                        + "\n</source>\n<field_catalog>\n" + json.dumps(catalog_view, ensure_ascii=False)
                        + "\n</field_catalog>\n<report_request>\n" + request["prompt"] + "\n</report_request>"
                        + (f"\n<preferred_title>{request['name']}</preferred_title>" if request.get("name") else "")
                    ),
                }
            )
        else:
            messages.append(
                {
                    "role": "user",
                    "content": "The specification failed validation against the live schema. Fix these problems and "
                    "return the complete corrected specification as one JSON object:\n- " + "\n- ".join(feedback or []),
                }
            )

        result: dict | None = None
        model: str | None = None
        for i, overrides in enumerate(await self._model_chain(request.get("tenantId"))):
            try:
                result = await self._llm.chat_completion(messages, **overrides)
            except LLMAdapterError as exc:
                logger.warning("report_agent_v2_llm_failed", extra={"attempt": i + 1, "model": overrides.get("model"), "error": str(exc)[:200]})
                continue
            model = overrides.get("model") or self._llm.describe().get("model")
            break
        if result is None:
            raise UpstreamError("The report agent's language model is currently unavailable.")

        text = str(result.get("content") or "")
        messages.append({"role": "assistant", "content": text})
        raw = _parse_json_object(text)
        if raw is None:
            # Not JSON at all: hand back an empty spec so ReportSpec validation drives a repair round.
            logger.info("report_agent_v2_llm_non_json_reply")
            raw = {}
        return raw, messages, model

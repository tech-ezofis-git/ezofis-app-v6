"""Ask the LLM which invoice lines belong to which PO lines.

Quantity, price, and amount stay numeric. This only returns indexes.
If the call fails, the caller keeps the name match.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

from app.ap_skills.types import ApContext, line_description

logger = logging.getLogger("orchestrator.ap.line_pair")

_SYSTEM = """You pair invoice lines to purchase-order lines.
A part code and a product name are the same item when they refer to one product.
Several invoice lines are one kit when the PO line lists those pieces.
When a description is blank, pair a line from its quantity, price, and amount.
Return JSON only:
{"pairs":[{"invoice_index":0,"po_index":0}],"kits":[{"po_index":0,"invoice_indexes":[0,1]}]}
Use 0-based indexes. Put a kit only in kits, not also in pairs.
Leave both lists empty when nothing matches. Do not invent lines."""


def parse_line_pairs(payload: Any, *, invoice_count: int, po_count: int) -> Optional[dict[str, Any]]:
    if not isinstance(payload, dict):
        return None
    invoice_to_po: dict[int, int] = {}
    for row in payload.get("pairs") or []:
        if not isinstance(row, dict):
            continue
        inv = _index(row.get("invoice_index"), invoice_count)
        po = _index(row.get("po_index"), po_count)
        if inv is None or po is None or inv in invoice_to_po:
            continue
        invoice_to_po[inv] = po
    kits: dict[int, list[int]] = {}
    used = set(invoice_to_po)
    for row in payload.get("kits") or []:
        if not isinstance(row, dict):
            continue
        po = _index(row.get("po_index"), po_count)
        if po is None:
            continue
        chosen: list[int] = []
        for raw in row.get("invoice_indexes") or []:
            inv = _index(raw, invoice_count)
            if inv is None or inv in used or inv in chosen:
                continue
            chosen.append(inv)
        if len(chosen) >= 2:
            kits[po] = chosen
            used.update(chosen)
    if not invoice_to_po and not kits:
        return None
    return {"invoice_to_po": invoice_to_po, "kits": kits}


async def pair_lines_with_llm(
    ctx: ApContext,
    invoice_lines: list[dict[str, Any]],
    po_lines: list[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    if ctx.llm is None or not invoice_lines or not po_lines:
        return None
    user = json.dumps(
        {
            "invoice_lines": [_brief(index, line) for index, line in enumerate(invoice_lines)],
            "po_lines": [_brief(index, line) for index, line in enumerate(po_lines)],
        },
        ensure_ascii=False,
    )
    try:
        from app.catalog.tenant_llm import chat_completion_with_fallbacks, job_fallback_chain

        result = await chat_completion_with_fallbacks(
            ctx.llm,
            [
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": user[:12000]},
            ],
            primary=ctx.llm_overrides or {},
            fallbacks=job_fallback_chain(ctx.document_job) or (
                [ctx.llm_fallback_overrides]
                if isinstance(ctx.llm_fallback_overrides, dict)
                else list(ctx.llm_fallback_overrides or [])
            ),
        )
        content = (result or {}).get("content") or ""
        start = content.find("{")
        end = content.rfind("}")
        if start < 0 or end <= start:
            return None
        return parse_line_pairs(
            json.loads(content[start : end + 1]),
            invoice_count=len(invoice_lines),
            po_count=len(po_lines),
        )
    except Exception:
        logger.warning("ap_line_pair_llm_failed")
        return None


def _brief(index: int, line: dict[str, Any]) -> dict[str, Any]:
    from app.ap_skills.types import field_number

    return {
        "index": index,
        "description": line_description(line),
        "qty": field_number(line, "qty", "quantity", "Quantity"),
        "price": field_number(line, "price", "rate", "unit_price", "Unit Cost"),
        "amount": field_number(line, "amount", "line_amount", "Extended"),
    }


def _index(value: Any, count: int) -> Optional[int]:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    if 0 <= number < count:
        return number
    return None

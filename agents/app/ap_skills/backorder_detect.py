"""backorder_detect — invoice qty vs PO qty (short-ship). Skipped unless tenant-enabled."""
from __future__ import annotations

from app.ap_skills.name_embedder import embedder_from
from app.ap_skills.types import (
    ApContext,
    ApSkillError,
    ApSkillResult,
    component_in_description,
    field_number,
    invoice_from,
    kit_components,
    line_description,
    match_lines_by_description,
)

SKILL_ID = "backorder_detect"


def _qty(line: dict) -> float:
    value = field_number(line, "qty", "quantity")
    return float(value) if value is not None else 0.0


def _description(line: dict) -> str:
    return line_description(line)


def _pairs_for_po_lines(
    po_lines: list[dict],
    inv_lines: list[dict],
    stored_pairs: dict,
) -> list[int | None]:
    """One invoice index per PO line. A kit uses the first piece only as the anchor."""
    chosen = [None] * len(po_lines)
    used: set[int] = set()
    for raw_po, raw_indexes in (stored_pairs.get("kits") or {}).items():
        try:
            po_index = int(raw_po)
        except (TypeError, ValueError):
            continue
        if not 0 <= po_index < len(po_lines):
            continue
        indexes = [int(index) for index in raw_indexes if 0 <= int(index) < len(inv_lines)]
        if len(indexes) < 2:
            continue
        if all(_qty(inv_lines[index]) + 1e-9 >= _qty(po_lines[po_index]) for index in indexes):
            chosen[po_index] = indexes[0]
            used.update(indexes)
    for raw_inv, raw_po in (stored_pairs.get("invoice_to_po") or {}).items():
        try:
            inv_index = int(raw_inv)
            po_index = int(raw_po)
        except (TypeError, ValueError):
            continue
        if inv_index in used or not 0 <= inv_index < len(inv_lines) or not 0 <= po_index < len(po_lines):
            continue
        if chosen[po_index] is None:
            chosen[po_index] = inv_index
            used.add(inv_index)
    return chosen


def _kit_invoice_indexes(po_line: dict, inv_lines: list[dict], used: set[int]) -> list[int] | None:
    """Invoice lines that are the pieces of one kit PO line, or None if incomplete."""
    components = kit_components(_description(po_line))
    if len(components) < 2:
        return None
    chosen: list[int] = []
    taken = set(used)
    for component in components:
        found = None
        for index, line in enumerate(inv_lines):
            if index in taken:
                continue
            if component_in_description(component, _description(line)):
                found = index
                break
        if found is None:
            return None
        taken.add(found)
        chosen.append(found)
    return chosen


async def run(ctx: ApContext) -> ApSkillResult:
    po_match = ctx.artifacts.get("po_match")
    if not isinstance(po_match, dict) or not po_match:
        raise ApSkillError(
            "backorder_detect requires a stored po_match artifact. Run po_match first."
        )
    if po_match.get("decision") == "NOT_MATCHED" or not po_match.get("po"):
        return ApSkillResult(
            skill_id=SKILL_ID,
            data={
                "detected": False,
                "missing_qty_by_item": [],
                "recommendation": "NO_ACTION",
                "reason": "No established PO match; back-order check skipped.",
            },
        )

    invoice = invoice_from(ctx)
    raw_inv_lines = invoice.get("line_items") if isinstance(invoice.get("line_items"), list) else []
    inv_lines = [line for line in raw_inv_lines if isinstance(line, dict)]
    po = po_match.get("po") or {}
    raw_po_lines = po.get("lines") if isinstance(po.get("lines"), list) else []
    po_lines = [line for line in raw_po_lines if isinstance(line, dict)]

    embedder = embedder_from(ctx)
    stored_pairs = po_match.get("line_pairs") if isinstance(po_match.get("line_pairs"), dict) else None
    if stored_pairs and (stored_pairs.get("invoice_to_po") or stored_pairs.get("kits")):
        matched_indexes = _pairs_for_po_lines(po_lines, inv_lines, stored_pairs)
    else:
        if embedder is not None:
            await embedder.warm(
                [_description(line) for line in po_lines] + [_description(line) for line in inv_lines]
            )
        matched_indexes = match_lines_by_description(
            po_lines,
            inv_lines,
            describe=_description,
            score_fn=embedder.score if embedder is not None else None,
        )

    used_invoice_indexes = {index for index in matched_indexes if index is not None}
    missing = []
    for position, (po_line, inv_index) in enumerate(zip(po_lines, matched_indexes)):
        po_qty = _qty(po_line)
        if inv_index is None:
            kit_indexes = _kit_invoice_indexes(po_line, inv_lines, used_invoice_indexes)
            if kit_indexes is not None and all(_qty(inv_lines[index]) + 1e-9 >= po_qty for index in kit_indexes):
                used_invoice_indexes.update(kit_indexes)
                continue
            # Code-review finding #17: a PO line with no matching invoice
            # line at all is a distinct case from a line that's present
            # but short — flagged `missing_line` rather than silently
            # treated as an invoice_qty of 0 indistinguishable from a
            # genuine (data-confirmed) zero-quantity short-ship.
            # (ultrareview fix: only when po_qty > 0 — a PO line with no
            # quantity at all, or an explicit 0, has nothing outstanding
            # regardless of whether an invoice line was matched to it, and
            # must not be counted as a backorder.)
            if po_qty <= 0:
                continue
            missing.append(
                {
                    "po_line_id": po_line.get("id") or str(position),
                    "description": _description(po_line),
                    "po_qty": po_qty,
                    "invoice_qty": None,
                    "remaining": po_qty,
                    "missing_line": True,
                    "reason": "NO_MATCHING_INVOICE_LINE",
                }
            )
            continue
        inv_qty = _qty(inv_lines[inv_index])
        remaining = round(po_qty - inv_qty, 4)
        if remaining > 0:
            missing.append(
                {
                    "po_line_id": po_line.get("id") or str(position),
                    "description": _description(po_line),
                    "po_qty": po_qty,
                    "invoice_qty": inv_qty,
                    "remaining": remaining,
                    "missing_line": False,
                    "reason": "SHORT_SHIP",
                }
            )

    detected = bool(missing)
    return ApSkillResult(
        skill_id=SKILL_ID,
        data={
            "detected": detected,
            "missing_qty_by_item": missing,
            "recommendation": "WAIT_FOR_BALANCE" if detected else "NO_ACTION",
            "reason": (
                f"{len(missing)} PO line(s) still short."
                if detected
                else "Invoice covers PO quantities."
            ),
        },
    )

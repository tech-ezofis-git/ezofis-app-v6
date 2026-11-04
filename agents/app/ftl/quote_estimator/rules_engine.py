"""
FTL Stage 2 rulebook data layer: loads the versioned JSON extracted from FTL's
"AI Estimating Knowledge Base — Stage 2" workbook and "Qualification Rulebook — Stage 2" document
(data/rulebook/*.json — see scripts/build_rulebook_data.py for how they were generated from the
source .xlsx) and exposes small, targeted lookup/citation helpers used by agent.py's post-
processing pipeline.

This module is a DATA layer, not a general rule interpreter — it does not try to parse the 48
Decision Rules' free-text trigger/action columns into executable logic generically (that would be
guessing at intent from prose, the exact failure mode this whole rulebook exists to eliminate).
Instead, agent.py has one targeted enforcement function per high-value, unambiguous rule (safety
gear, WRG gating, governor tension companions, the OL100/programming-tool/freight/universal-door
CRITICAL conflicts) and each of those functions calls into this module only to fetch the exact
product/price/citation text, never to re-derive the rule itself.

Golden rule, straight from the rulebook: "If any trigger is true, the agent may summarize the issue
but must not invent the missing selection, SKU, price or quantity." Every conflict in conflicts.json
stays OPEN here — nothing in this module silently picks a winner between two competing values.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "rulebook")


def _load(name: str) -> List[Dict[str, Any]]:
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_optional(name: str, default: Any) -> Any:
    """Tables FTL added in workbook v1.1 (Pricing Control, 3 Quote Logic, inFlow snapshot, version
    metadata). Optional so an older copy of the rulebook still loads."""
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


PRODUCT_MASTER: List[Dict[str, Any]] = _load("product_master.json")
DECISION_RULES: List[Dict[str, Any]] = _load("decision_rules.json")
REQUIRED_INPUTS: List[Dict[str, Any]] = _load("required_inputs.json")
TECHNICAL_LIMITS: List[Dict[str, Any]] = _load("technical_limits.json")
REVIEW_TRIGGERS: List[Dict[str, Any]] = _load("review_triggers.json")
CONFLICTS: List[Dict[str, Any]] = _load("conflicts.json")
TRAINING_EXAMPLES: List[Dict[str, Any]] = _load("training_examples.json")
SOURCE_REGISTER: List[Dict[str, Any]] = _load("source_register.json")
PRICING_CONTROL: List[Dict[str, Any]] = _load_optional("pricing_control.json", [])
QUOTE_LOGIC: List[Dict[str, Any]] = _load_optional("quote_logic.json", [])
INFLOW_SNAPSHOT: Dict[str, Any] = _load_optional("inflow_snapshot.json", {})
RULEBOOK_META: Dict[str, Any] = _load_optional("rulebook_meta.json", {})
FTL_OVERRIDES: Dict[str, Any] = _load_optional("ftl_overrides.json", {})


def _upsert(rows: List[Dict[str, Any]], key: str, new_rows: Any) -> None:
    """Merge hand-maintained FTL override rows over a generated table, matching on `key`."""
    index = {r.get(key): i for i, r in enumerate(rows)}
    for new_row in new_rows or []:
        row_key = new_row.get(key)
        if row_key in index:
            rows[index[row_key]] = {**rows[index[row_key]], **new_row}
        else:
            rows.append(dict(new_row))
            index[row_key] = len(rows) - 1


# ftl_overrides.json = written FTL rules that sit ABOVE the generated v1.1 tables in the source
# hierarchy. Applied before any lookup table below is built.
_upsert(DECISION_RULES, "rule_id", FTL_OVERRIDES.get("decision_rules"))
_upsert(REVIEW_TRIGGERS, "trigger_id", FTL_OVERRIDES.get("review_triggers"))
_upsert(SOURCE_REGISTER, "source_id", FTL_OVERRIDES.get("source_register"))


def overrides_applied() -> List[str]:
    """Ids of the written FTL overrides layered over the generated rulebook."""
    return [o.get("id") for o in FTL_OVERRIDES.get("overrides") or []]

# Price book overlay — FTL's Contractor Price Book (.docx) layered on the Stage 2 Product Master.
# product_master.json goes stale when FTL publishes a new price list; the overlay is generated from
# the price book (app/ftl/qualifier/price_book.py) and wins wherever both describe an item. Rows the
# price book doesn't list stay as the Product Master has them. No overlay file => behaviour unchanged.
def _load_overlay() -> Dict[str, Any]:
    path = os.path.join(DATA_DIR, "price_book_overlay.json")
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


PRICE_BOOK: Dict[str, Any] = _load_overlay()


def rulebook_status() -> Dict[str, int]:
    """Row counts of every loaded rulebook table."""
    return {
        "product_master": len(PRODUCT_MASTER),
        "decision_rules": len(DECISION_RULES),
        "required_inputs": len(REQUIRED_INPUTS),
        "technical_limits": len(TECHNICAL_LIMITS),
        "review_triggers": len(REVIEW_TRIGGERS),
        "conflicts": len(CONFLICTS),
        "training_examples": len(TRAINING_EXAMPLES),
        "source_register": len(SOURCE_REGISTER),
        "price_book_rows": len(PRICE_BOOK.get("rows") or []),
        "pricing_control": len(PRICING_CONTROL),
        "quote_logic": len(QUOTE_LOGIC),
        "inflow_items": len(INFLOW_SNAPSHOT.get("items") or []),
    }


def rulebook_version() -> str:
    """e.g. 'v1.1 (2026-10-16)' — stamped on every quote so a reviewer can see which rulebook
    revision produced it."""
    version = RULEBOOK_META.get("version")
    date = RULEBOOK_META.get("date")
    if version and date:
        return f"v{version} ({date})"
    return f"v{version}" if version else "unversioned"


_ALIAS_TO_CANONICAL: Dict[str, str] = {}

_PRICE_BOOK_FAMILY_TO_MASTER = {
    "door_operator": "Door System",
    "door_tools": "Door System",
    "panel_adaptor": "Door System",
    "clutch": "Door System",
    "roller_guide": "Roller Guides",
    "governor": "Governors",
    "car_safety": "Safety Gear",
}


def _apply_price_book() -> None:
    rows = PRICE_BOOK.get("rows") or []
    if not rows:
        return
    source = PRICE_BOOK.get("source", "price book")
    position = {p.get("ftl_product_code"): i for i, p in enumerate(PRODUCT_MASTER)}
    for row in rows:
        code = row["code"]
        aliases = list(row.get("aliases") or [])
        idx = position.get(code)
        if idx is None:
            for alias in aliases:
                if alias in position:
                    idx = position[alias]
                    break
        if idx is not None:
            old = PRODUCT_MASTER[idx]
            new = dict(old)
            old_code = old.get("ftl_product_code")
            new["ftl_product_code"] = code
            old_price = old.get("price_cad")
            new["price_cad"] = row["price_cad"]
            if old_price is not None and abs(float(old_price) - float(row["price_cad"])) > 0.005:
                new["price_book_previous_price_cad"] = old_price
            new["source"] = source
            if aliases:
                new["aliases"] = aliases
            PRODUCT_MASTER[idx] = new
            position.pop(old_code, None)
            position[code] = idx
        else:
            PRODUCT_MASTER.append(
                {
                    "family": _PRICE_BOOK_FAMILY_TO_MASTER.get(row.get("family"), "Door System"),
                    "type": row.get("type") or "",
                    "oem": row.get("oem") or "ALL",
                    "ftl_product_code": code,
                    "description": row.get("description") or code,
                    "hand": row.get("hand") or "N/A",
                    "width_in": row.get("width_in"),
                    "uom": "pair" if row.get("family") == "car_safety" else "each",
                    "price_cad": row["price_cad"],
                    "automation_status": "HOLD" if row.get("family") == "car_safety" else "CONDITIONAL",
                    "quantity_basis": "Per price book",
                    "companion_selection_rule": (
                        "Never auto-add; engineering selection required"
                        if row.get("family") == "car_safety"
                        else "Add only when scope calls for it"
                    ),
                    "source": source,
                    "notes_issue": "Added from the price book; not in the Stage 2 Product Master.",
                    "aliases": aliases,
                }
            )
            position[code] = len(PRODUCT_MASTER) - 1
        for alias in aliases:
            _ALIAS_TO_CANONICAL[alias] = code

    for product in PRODUCT_MASTER:
        if product.get("ftl_product_code") == "SGV2_DOOR_TOOLS" and "I-001" in (PRICE_BOOK.get("resolves_conflicts") or {}):
            product["notes_issue"] = "I-001 resolved: " + PRICE_BOOK["resolves_conflicts"]["I-001"]


_apply_price_book()

# inFlow layer — FTL v1.1 (2026-10-16): live inFlow pricing is the commercial authority; workbook and
# price-book prices are snapshots. inflow_snapshot.json is a dated copy of the inFlow product list, so
# it sits ABOVE both the Product Master and the price book. A product with no exact inFlow record keeps
# its price-book / Product Master price and is labelled as such (price_source).
INFLOW_SOURCE_LABEL = f"inFlow snapshot {INFLOW_SNAPSHOT.get('snapshot_date') or 'undated'}"
PRICE_BOOK_SOURCE_LABEL = f"FTL Contractor Price Book {PRICE_BOOK.get('revision') or ''}".strip()
MASTER_SOURCE_LABEL = f"Stage 2 Product Master {rulebook_version()}"

_INFLOW_BY_NAME: Dict[str, Dict[str, Any]] = {
    (item.get("product_name") or "").strip(): item
    for item in (INFLOW_SNAPSHOT.get("items") or [])
    if item.get("product_name")
}
# Product Master codes whose inFlow ProductName is spelled differently and not given in the sheet.
_INFLOW_NAME_FALLBACKS = {
    "WRG_MOTION_GEAR80": "WRG80_CAR",
    "WRG_MOTION_GEAR100": "WRG100_CAR",
    "WRG_MOTION_GEAR125": "WRG125_CAR",
    "WRG_MOTION_GEAR150": "WRG150_CAR",
    "WRG_MOTION_GEAR200": "WRG200_CAR",
    "WRG_MOTION_GEAR300": "WRG300_CAR",
    # inFlow records the remote-control / remote+encoder OL35 as _LH; the unhanded Product Master
    # row prices identically (hand stays unconfirmed — I-007 — this is a PRICE lookup only).
    "WG_OL35_GOVERNOR_RC": "WG_OL35_GOVERNOR_RC_LH",
    "WG_OL35_GOVERNOR_RE": "WG_OL35_GOVERNOR_RE_LH",
}


def inflow_item_for(code: str, row: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """The inFlow snapshot record for a Product Master code, or None. Exact-name matching only (plus
    the documented fallbacks above) — never fuzzy."""
    if not code:
        return None
    candidates = [code]
    if row:
        if row.get("inflow_product_name"):
            candidates.insert(0, str(row["inflow_product_name"]).strip())
        candidates.extend(row.get("aliases") or [])
    if code in _INFLOW_NAME_FALLBACKS:
        candidates.append(_INFLOW_NAME_FALLBACKS[code])
    for candidate in candidates:
        hit = _INFLOW_BY_NAME.get(str(candidate).strip())
        if hit:
            return hit
    return None


def _apply_inflow_snapshot() -> None:
    if not _INFLOW_BY_NAME:
        return
    for i, product in enumerate(PRODUCT_MASTER):
        item = inflow_item_for(product.get("ftl_product_code"), product)
        new = dict(product)
        if item and item.get("price_cad") is not None and item.get("active", True):
            old_price = product.get("price_cad")
            if old_price is not None and abs(float(old_price) - float(item["price_cad"])) > 0.005:
                new["price_before_inflow_cad"] = old_price
            new["price_cad"] = float(item["price_cad"])
            new["price_source"] = INFLOW_SOURCE_LABEL
            new["price_source_kind"] = "inflow"
            new["inflow_sku"] = item.get("sku") or product.get("inflow_sku")
            new["inflow_product_name"] = item.get("product_name")
            new["inflow_item_type"] = item.get("item_type")
        else:
            is_book = (product.get("source") or "").startswith("FTL Contractor Price Book")
            new["price_source"] = PRICE_BOOK_SOURCE_LABEL if is_book else MASTER_SOURCE_LABEL
            new["price_source_kind"] = "price_book" if is_book else "master"
        PRODUCT_MASTER[i] = new


_apply_inflow_snapshot()


def price_source_for(code: str) -> Optional[str]:
    row = product_master_row(code)
    return row.get("price_source") if row else None


_CONFLICTS_BY_ID: Dict[str, Dict[str, Any]] = {c["issue_id"]: c for c in CONFLICTS if c.get("issue_id")}
_TRIGGERS_BY_ID: Dict[str, Dict[str, Any]] = {t["trigger_id"]: t for t in REVIEW_TRIGGERS if t.get("trigger_id")}
_RULES_BY_ID: Dict[str, Dict[str, Any]] = {r["rule_id"]: r for r in DECISION_RULES if r.get("rule_id")}
_PRODUCT_BY_CODE: Dict[str, Dict[str, Any]] = {
    p["ftl_product_code"]: p for p in PRODUCT_MASTER if p.get("ftl_product_code")
}


# Codes FTL renamed or merged in workbook v1.1. Exact-match only, like the price-book aliases.
_ALIAS_TO_CANONICAL.update(
    {
        "OL35_TENSION_SHEAVE_SWINGARM": "WG_OL35_TENSION_SHEAVE_SWINGARM",
        "WG_OL100_GOVERNOR_RE_LH/RH": "WG_OL100_GOVERNOR_RE_LH",
    }
)


def canonical_code(code: str) -> str:
    """Current code when `code` is an old spelling the price book or workbook v1.1 renamed. A universal
    car door panel given by its long legacy price-list string becomes its Product Master code.
    Otherwise `code` unchanged. Exact-match only — never fuzzy."""
    hit = _ALIAS_TO_CANONICAL.get(code)
    if hit:
        return hit
    if isinstance(code, str) and "UNIVERSAL_CAR_DOOR" in code:
        row = universal_panel_row_from_text(code)
        if row:
            return row["ftl_product_code"]
    return code


def all_known_codes() -> set:
    """Every code the price book defines, plus the old codes it replaced."""
    codes = {row["code"] for row in (PRICE_BOOK.get("rows") or [])}
    codes.update(_ALIAS_TO_CANONICAL)
    return codes


def price_book_resolution(issue_id: str) -> Optional[str]:
    return (PRICE_BOOK.get("resolves_conflicts") or {}).get(issue_id)


def cite_conflict(issue_id: str) -> str:
    """Renders a Controlled Conflict Register entry as a citation string suitable for an
    `assumptions`/`note` field — always includes the safe interim rule and who owns the decision,
    so a human reader never has to go dig up the rulebook to know what to do next. An entry the
    price book has since settled is rendered as RESOLVED."""
    c = _CONFLICTS_BY_ID.get(issue_id)
    if not c:
        return f"[{issue_id}] (conflict register entry not found — check data/rulebook/conflicts.json)"
    resolution = price_book_resolution(issue_id)
    if resolution:
        return (
            f"[{issue_id}, RESOLVED by {PRICE_BOOK.get('source', 'price book')}] "
            f"{c.get('issue')} — {resolution}"
        )
    return (
        f"[{issue_id}, {c.get('priority')}/{c.get('status')}] {c.get('issue')} — safe interim rule: "
        f"{c.get('safe_interim_rule')} (decision needed from: {c.get('decision_needed')})"
    )


def cite_trigger(trigger_id: str) -> str:
    t = _TRIGGERS_BY_ID.get(trigger_id)
    if not t:
        return f"[{trigger_id}] (review trigger not found — check data/rulebook/review_triggers.json)"
    return (
        f"[{trigger_id}, {t.get('severity')}] {t.get('condition')} — {t.get('agent_response')}. "
        f"Required resolution: {t.get('required_resolution')}"
    )


def cite_rule(rule_id: str) -> str:
    r = _RULES_BY_ID.get(rule_id)
    if not r:
        return f"[{rule_id}] (decision rule not found — check data/rulebook/decision_rules.json)"
    return f"[{rule_id}] {r.get('trigger_spec_says')} -> {r.get('agent_action')} ({r.get('rule_status')})"


def product_master_row(code: str) -> Optional[Dict[str, Any]]:
    return _PRODUCT_BY_CODE.get(code) or _PRODUCT_BY_CODE.get(_ALIAS_TO_CANONICAL.get(code, ""))


def governor_tension_companion(size: str) -> Optional[Dict[str, Any]]:
    """size: '35' or '100'. Returns the tension/swingarm product-master row for that governor
    family (WG_OL35_TENSION_SHEAVE_SWINGARM / TBD_OL100_TENSION_ASSEMBLY) — the separate tension
    line every OL governor requires (GOV-003, Aug 2026 JR/Francine rule, reaffirmed in v1.1).
    OL35's row is a REQUIRED COMPANION; OL100's is HOLD in v1.1 (I-006: no canonical inFlow SKU
    yet) — it is still returned so the estimate carries the line, flagged for review rather than
    silently dropped."""
    for p in PRODUCT_MASTER:
        if p.get("family") != "Governors":
            continue
        code = (p.get("ftl_product_code") or "").upper()
        if "TENSION" not in code and "SWINGARM" not in code:
            continue
        if p.get("automation_status") not in ("REQUIRED COMPANION", "HOLD"):
            continue
        if size == "35" and "OL35" in code:
            return p
        if size == "100" and "OL100" in code:
            return p
    return None


def safety_gear_row() -> Optional[Dict[str, Any]]:
    for p in PRODUCT_MASTER:
        if p.get("family") == "Safety Gear":
            return p
    return None


def wrg_row(size_token: str) -> Optional[Dict[str, Any]]:
    """size_token like 'WRG150HD', 'WRG80', matched against product_master's `type` column."""
    for p in PRODUCT_MASTER:
        if p.get("family") == "Roller Guides" and (p.get("type") or "").upper() == size_token.upper():
            return p
    return None


def door_tools_row() -> Optional[Dict[str, Any]]:
    return product_master_row("SGV2_DOOR_TOOLS")


def detector_row() -> Optional[Dict[str, Any]]:
    return product_master_row("FS_VISIONPLUS_3D_CAR_DOOR_DET")


def detector_power_supply_row() -> Optional[Dict[str, Any]]:
    return product_master_row("VISIONPLUS_POWERSUPPLY")


def universal_door_panel_rows() -> List[Dict[str, Any]]:
    return [p for p in PRODUCT_MASTER if "Universal Car Door" in (p.get("type") or "")]


_ADAPTOR_OEM_CODES = {"GAL": "GAL", "MAC": "MAC", "DOVER": "DOV", "DOV": "DOV"}
DEFAULT_ADAPTOR_OEM = "GAL"  # FTL default (F. Lewis 2026-10-21): GAL because it's most common


def panel_adaptor_row(door_type: str, width: Any, oem: str = DEFAULT_ADAPTOR_OEM, hand: str = "L") -> Optional[Dict[str, Any]]:
    """The Product Master row for the OEM panel adaptor SGV2(<1S|2T|2C>)_DP_<OEM><width>_<LH|RH>, or None
    when none is stocked (e.g. 1S 48 in, 2T 36 in, an OTIS adaptor). Exact code only — never a near match."""
    try:
        w = int(float(width))
    except (TypeError, ValueError):
        return None
    code_oem = _ADAPTOR_OEM_CODES.get(str(oem or "").upper())
    if not code_oem or str(door_type or "").upper() not in ("1S", "2T", "2C"):
        return None
    side = "LH" if str(hand or "L").upper().startswith("L") else "RH"
    return product_master_row(f"SGV2({door_type.upper()})_DP_{code_oem}{w}_{side}")


def universal_panel_row(door_type: str, width: Any) -> Optional[Dict[str, Any]]:
    """Product Master row for a universal car door panel of `door_type` (1S/2C/2T) at 84 in."""
    try:
        w = int(float(width))
    except (TypeError, ValueError):
        return None
    prefix = f"{door_type.upper()}_"
    needle = f"- {w} X 84"
    for p in PRODUCT_MASTER:
        code = p.get("ftl_product_code") or ""
        if code.startswith(prefix) and "UNIVERSAL_CAR_DOOR_PANEL" in code and needle in code:
            return p
    return None


def universal_panel_row_from_text(text: str) -> Optional[Dict[str, Any]]:
    m = re.match(
        r"\s*(1S|2C|2T)_[A-Z0-9_]*UNIVERSAL_CAR_DOOR[A-Z0-9_]*\s*-\s*(\d+)\s*X\s*(\d+)",
        text or "",
        re.IGNORECASE,
    )
    if not m or int(m.group(3)) != 84:
        return None
    return universal_panel_row(m.group(1), m.group(2))


def resolve_master_row(code: str) -> Optional[Dict[str, Any]]:
    """Exact-code Product Master lookup with documented fallbacks only — never fuzzy."""
    if not code:
        return None
    row = product_master_row(code)
    if row:
        return row
    row = product_master_row(code + "/RH")
    if row:
        return row
    row = universal_panel_row_from_text(code)
    if row:
        return row
    stripped = re.sub(r"_(LH|RH)$", "", code, flags=re.IGNORECASE)
    if stripped != code:
        row = (
            product_master_row(stripped)
            or product_master_row(stripped + "_LH/RH")
            or product_master_row(stripped + "_LH")
        )
        if row:
            return row
    return None

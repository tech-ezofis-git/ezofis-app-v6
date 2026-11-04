"""Default panel adaptor on Quote 1 and the matching universal car door on Quote 2.

FTL's written rule (rulebook/ftl_overrides.json, amends DOOR-005, DOOR-006 and RT-004).
"""
from __future__ import annotations

import copy
from pathlib import Path

import pytest

from app.ftl.quote_estimator import agent, rules_engine
from app.ftl.quote_estimator import quote_controls as qc
from app.ftl.quote_estimator import quote_variants as qv

SILENT = (
    "## Email\nFrom: a\nSubject: tender\n\n"
    "Please quote the SGV2 door operators for two elevators at 10 Example Street. Ship to Toronto, ON.\n"
)
OP_1S42 = ("SGV2_DOOR_OP_1S42_L", 2, 4955.28)
UNIVERSAL_1S42 = "1S_T1_UNIVERSAL_CAR_DOOR_PANEL - 42 X 84"
ADAPTOR_1S42 = "SGV2(1S)_PANEL_ADAPTOR_GAL42_LH"


def _line(category, code, qty, price):
    return {
        "product_code": code,
        "description": code,
        "category": category,
        "qty": qty,
        "unit_price": price,
        "origin": "SPEC",
    }


def _draft(ops, extra=()):
    lines = [_line("door_operator", code, qty, price) for code, qty, price in ops]
    count = sum(qty for _code, qty, _price in ops)
    lines += [
        _line("clutch", "SGV2_CLUTCH_G.M.D._L", count, 1161.94),
        _line("other", "SGV2_CAR_DOOR_RESTRICTOR", count, 0),
        _line("door_tools", "SGV2_DOOR_TOOLS", 1, 698.5),
    ]
    return {
        "customer_name": "Test Elevator Co.",
        "contact_name": "Pat Example",
        "contact_phone": "905-555-0100",
        "billing_address": "1 Main St, Toronto, ON",
        "shipping_address": "1 Main St, Toronto, ON",
        "project_name": "Default adaptor",
        "line_items": lines + list(extra),
    }


def _cats(quote):
    return [it["category"] for it in quote["line_items"]]


def _codes(quote, category):
    return [(it["product_code"], it["qty"]) for it in quote["line_items"] if it["category"] == category]


def _signature(quote):
    return sorted((it["category"], it["product_code"], it["qty"]) for it in quote["line_items"])


def test_overrides_are_layered_over_the_rulebook():
    assert rules_engine.overrides_applied() == ["OVR-2026-10-21-PANEL"]
    door_006 = rules_engine.cite_rule("DOOR-006")
    assert "DEFAULT to" in door_006 and "GAL" in door_006 and "operator's width" in door_006
    assert "adaptors" in rules_engine.cite_rule("DOOR-005")
    assert "no stocked adaptor" in rules_engine.cite_trigger("RT-004")


def test_panel_adaptor_row_uses_exact_codes_only():
    assert rules_engine.panel_adaptor_row("1S", 42, "GAL", "L")["ftl_product_code"] == ADAPTOR_1S42
    assert rules_engine.panel_adaptor_row("2T", 48, "GAL", "L")["ftl_product_code"] == "SGV2(2T)_PANEL_ADAPTOR_GAL48_LH"
    assert rules_engine.panel_adaptor_row("1S", 48) is None
    assert rules_engine.panel_adaptor_row("1S", 42, "OTIS") is None


def test_silent_rfq_gets_the_default_adaptor_below_the_operator():
    quote = agent.postprocess_quote(_draft([OP_1S42]), SILENT)
    assert _cats(quote)[:2] == ["door_operator", "panel_adaptor"]
    assert _codes(quote, "panel_adaptor") == [(ADAPTOR_1S42, 2)]
    adaptor = quote["line_items"][1]
    assert adaptor["unit_price"] == 264.32
    assert "DEFAULT adaptor" in adaptor["note"]
    assert adaptor["needs_engineering_review"]
    assert "car_door_panel" not in _cats(quote)
    assert "door_protective_device" not in _cats(quote)
    assert quote["release_status"].startswith("REVIEW")


def test_quote_2_swaps_the_adaptor_for_the_universal_door():
    quote = agent.postprocess_quote(_draft([OP_1S42]), SILENT)
    variants = qv.derive_variants(quote, SILENT)
    assert variants[0]["status"] == qv.STATUS_GENERATED
    quote_2 = variants[0]["result"]
    assert _cats(quote_2)[:2] == ["door_operator", "car_door_panel"]
    assert _codes(quote_2, "car_door_panel") == [(UNIVERSAL_1S42, 2)]
    assert "panel_adaptor" not in _cats(quote_2)
    assert _codes(quote_2, "door_protective_device") == [("FS_VISIONPLUS_3D_CAR_DOOR_DET", 2)]
    assert not any(h["item"] == qc.DEFAULT_ADAPTOR_HOLD_ITEM for h in quote_2["held_items"])
    assert variants[1]["status"] == qv.STATUS_NO_THIRD
    assert "car_door_panel" not in _cats(quote)


def test_guessed_2t_door_becomes_default_adaptor_and_two_panels_on_quote_2():
    guess = _line("car_door_panel", "2T_UNIVERSAL_CAR_DOOR_PANEL - 48 X 84 (2-DOOR/SET)", 4, 2161.6)
    quote = agent.postprocess_quote(_draft([("SGV2_DOOR_OP_2T48_L", 2, 5252.08)], extra=[guess]), SILENT)
    assert _codes(quote, "panel_adaptor") == [("SGV2(2T)_PANEL_ADAPTOR_GAL48_LH", 2)]
    assert "car_door_panel" not in _cats(quote)
    quote_2 = qv.derive_recommended(quote, SILENT)["result"]
    assert _codes(quote_2, "car_door_panel") == [("2T_UNIVERSAL_CAR_DOOR_PANEL - 48 X 84 (2-DOOR/SET)", 4)]


def test_every_draft_gives_the_same_quotes():
    panel = _line("car_door_panel", UNIVERSAL_1S42, 2, 1797.6)
    detector = _line("door_protective_device", "FS_VISIONPLUS_3D_CAR_DOOR_DET", 2, 1295)
    wrong_adaptor = _line("panel_adaptor", "SGV2(1S)_PANEL_ADAPTOR_MAC36_RH", 2, 264.32)
    outs = [
        agent.postprocess_quote(_draft([OP_1S42], extra=extra), SILENT)
        for extra in ([], [panel], [panel, detector], [wrong_adaptor])
    ]
    assert all(_signature(out) == _signature(outs[0]) for out in outs)
    quote_2s = [_signature(qv.derive_recommended(out, SILENT)["result"]) for out in outs]
    assert all(sig == quote_2s[0] for sig in quote_2s)


def test_postprocessing_twice_changes_nothing():
    first = agent.postprocess_quote(_draft([OP_1S42]), SILENT)
    again = agent.postprocess_quote(copy.deepcopy(first), SILENT)
    assert _signature(again) == _signature(first)
    assert len(again["held_items"]) == len(first["held_items"])


def test_stated_stocked_oem_beats_the_default():
    text = "## Email\nFrom: a\nSubject: t\n\nReplace the SGV2 door operator. The existing MAC car doors remain.\n"
    quote = agent.postprocess_quote(_draft([("SGV2_DOOR_OP_1S42_L", 1, 4955.28)]), text)
    assert _codes(quote, "panel_adaptor") == [("SGV2(1S)_PANEL_ADAPTOR_MAC42_LH", 1)]
    assert not any(qc.is_default_adaptor(it) for it in quote["line_items"])


def test_unstocked_oem_is_held_not_guessed():
    text = "## Email\nFrom: a\nSubject: t\n\nReplace the SGV2 door operator. Retain the existing Otis car doors.\n"
    quote = agent.postprocess_quote(_draft([("SGV2_DOOR_OP_1S42_L", 1, 4955.28)]), text)
    assert not _codes(quote, "panel_adaptor")
    assert any(h["item"] == "Car door panel adaptor" and h["level"] == "HOLD" for h in quote["held_items"])


def test_gal_landing_locks_are_not_the_car_door_oem():
    assert qc.adaptor_oem_from_text("Convert the landing locks to GAL. Existing car doors remain.") == (None, [], "")


def test_operator_size_without_a_stocked_adaptor_is_held():
    quote = agent.postprocess_quote(_draft([("SGV2_DOOR_OP_1S48_L", 1, 5000.0)]), SILENT)
    assert not _codes(quote, "panel_adaptor")
    assert any(
        h["item"] in ("Car door panel adaptor", "Car doors — new universal doors vs retained doors")
        for h in quote["held_items"]
    )


def test_spec_that_replaces_the_doors_keeps_the_universal_door():
    text = "## Email\nFrom: a\nSubject: t\n\nReplace the SGV2 door operator. Provide new car doors.\n"
    door = _line("car_door_panel", UNIVERSAL_1S42, 1, 1797.6)
    quote = agent.postprocess_quote(_draft([("SGV2_DOOR_OP_1S42_L", 1, 4955.28)], extra=[door]), text)
    assert _codes(quote, "car_door_panel")
    assert not _codes(quote, "panel_adaptor")


def test_replacement_only_as_alternate_keeps_adaptor_on_quote_1():
    text = (
        "## Email\nFrom: a\nSubject: t\n\nBase bid: retain the existing car doors. "
        "Alternate: supply new universal car doors. Replace the SGV2 door operator.\n"
    )
    quote = agent.postprocess_quote(_draft([("SGV2_DOOR_OP_1S42_L", 1, 4955.28)]), text)
    assert _codes(quote, "panel_adaptor")
    assert qv.derive_alternate(quote, None, text)["status"] == qv.STATUS_GENERATED


def test_order_panel_lines_is_idempotent():
    items = [
        _line("door_operator", "SGV2_DOOR_OP_1S42_L", 1, 1),
        _line("clutch", "SGV2_CLUTCH_G.M.D._L", 1, 1),
        _line("panel_adaptor", ADAPTOR_1S42, 1, 1),
    ]
    ordered = qc.order_panel_lines(items)
    assert [it["category"] for it in ordered] == ["door_operator", "panel_adaptor", "clutch"]
    assert qc.order_panel_lines(ordered) == ordered


@pytest.mark.parametrize(
    "path",
    [
        "skills/ftl_quote_estimator/SKILL.md",
        "app/ftl/quote_estimator/skill_store.py",
    ],
)
def test_skill_text_carries_the_rule(path):
    text = (Path(__file__).resolve().parents[1] / path).read_text(encoding="utf-8")
    assert "## Default panel adaptor and the universal door" in text

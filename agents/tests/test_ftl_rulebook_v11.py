"""FTL rulebook v1.1: data, the inFlow price layer and renamed product codes."""
from __future__ import annotations

import os

import pytest

from app.ftl.quote_estimator import agent, rules_engine
from app.ftl.quote_estimator import quote_controls as qc


def _line(category, code, qty, price):
    return {
        "product_code": code,
        "description": code,
        "category": category,
        "qty": qty,
        "unit_price": price,
    }


def test_rulebook_version_and_tables_load():
    assert rules_engine.rulebook_version() == "v1.1 (2026-10-16)"
    status = rules_engine.rulebook_status()
    assert status["decision_rules"] == 64
    assert status["review_triggers"] == 18
    assert status["pricing_control"] > 0
    assert status["quote_logic"] > 0
    assert status["inflow_items"] > 0


@pytest.mark.parametrize("rule_id", ["QUOTE-001", "QUOTE-002", "QUOTE-003", "QUOTE-004", "COMM-006", "COMM-007"])
def test_rules_cited_by_the_code_exist(rule_id):
    assert "not found" not in rules_engine.cite_rule(rule_id)


def test_rt_017_is_found_for_the_2c_2t_price_hold():
    assert "not found" not in rules_engine.cite_trigger("RT-017")


@pytest.mark.parametrize(
    "code, price",
    [
        ("1S_T1_UNIVERSAL_CAR_DOOR_PANEL - 42 X 84", 1797.6),
        ("2C_UNIVERSAL_CAR_DOOR_PANEL - 42 X 84 (2-DOOR/SET)", 1705.2),
        ("WG_OL35_GOVERNOR_MT", 2007.6),
        ("WG_OL35_GOVERNOR_RC", 2654.4),
        ("WG_OL35_TENSION_SHEAVE_SWINGARM", 1849.0),
    ],
)
def test_inflow_snapshot_sets_the_price(code, price):
    row = rules_engine.product_master_row(code)
    assert row["price_cad"] == price
    assert row["price_source_kind"] == "inflow"
    assert rules_engine.price_source_for(code) == rules_engine.INFLOW_SOURCE_LABEL


def test_product_without_inflow_record_keeps_a_labelled_price():
    row = rules_engine.product_master_row("TBD_OL100_TENSION_ASSEMBLY")
    assert row["price_source_kind"] in ("master", "price_book")


@pytest.mark.parametrize(
    "old, new",
    [
        ("OL35_TENSION_SHEAVE_SWINGARM", "WG_OL35_TENSION_SHEAVE_SWINGARM"),
        ("WG_OL100_GOVERNOR_RE_LH/RH", "WG_OL100_GOVERNOR_RE_LH"),
    ],
)
def test_renamed_codes_still_resolve(old, new):
    assert rules_engine.canonical_code(old) == new
    assert rules_engine.resolve_master_row(old)["ftl_product_code"] == new


def test_tension_companions_for_both_governor_sizes():
    assert rules_engine.governor_tension_companion("35")["ftl_product_code"] == "WG_OL35_TENSION_SHEAVE_SWINGARM"
    assert rules_engine.governor_tension_companion("100")["ftl_product_code"] == "TBD_OL100_TENSION_ASSEMBLY"


def test_old_companion_code_is_not_counted_or_added_twice():
    quote = {
        "line_items": [
            _line("governor", "WG_OL35_GOVERNOR_RC", 4, 2654.4),
            _line("governor", "OL35_TENSION_SHEAVE_SWINGARM", 4, 1649.0),
        ],
        "assumptions": [],
    }
    lines = agent._enforce_governor_tension_companions(quote)["line_items"]
    companions = [
        it
        for it in lines
        if rules_engine.canonical_code(it["product_code"]) == "WG_OL35_TENSION_SHEAVE_SWINGARM"
    ]
    assert len(companions) == 1
    assert companions[0]["qty"] == 4


def test_per_panel_price_is_not_halved_again():
    code = "2C_UNIVERSAL_CAR_DOOR_PANEL - 42 X 84 (2-DOOR/SET)"
    items = [_line("car_door_panel", code, 2, 1705.2)]
    agent._autocorrect_panel_prices(items, [])
    assert items[0]["unit_price"] == 1705.2

    quote = qc.apply_inflow_price_authority({"line_items": items, "assumptions": []})
    line = quote["line_items"][0]
    assert line["unit_price"] == 1705.2
    assert line["qty"] == 2
    assert line["needs_engineering_review"] is True


def test_customer_tracker_is_not_shipped():
    assert not os.path.exists(os.path.join(rules_engine.DATA_DIR, "rfq_quote_tracker.json"))

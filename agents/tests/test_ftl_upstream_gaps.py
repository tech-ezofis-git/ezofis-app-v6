"""FTL behaviour brought in from the standalone Qualifier and Quote Estimator repos.

Customer scope in the Qualifier, the spec's elevator count, unread attachments, and the v1.1
restriction, OL100, safety and roller guide controls. All data here is made up.
"""
from __future__ import annotations

from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import pytest

from app.agents.ftl_qualifier_agent import FtlQualifierAgent
from app.ftl.qualifier import extract as qualifier_extract
from app.ftl.qualifier import quote_alignment as qa
from app.ftl.quote_estimator import agent, rules_engine
from app.ftl.quote_estimator import extract as estimator_extract

CANDIDATE = (
    "## Email\nFrom: buyer@example.com\nSubject: Fw: RFQ - Example Residence\nDate: x\n\n"
    "Good day,\n\nElevators\n\n"
    "  *   2 elevators - New geared traction machine; overhead, 1:1, 5 hoist ropes\n"
    "  *   18 stops, 18 front openings per car\n\n"
    "Roller Guides\n\n"
    "  *   2 sets ELSCO or Wittur car roller guides, 6 in min rollers, top and bottom (s.5.3)\n"
    "  *   2 sets cwt roller guides, 3 in min neoprene rollers, top and bottom (s.4.2)\n\n"
    "Car Door Operators & Car Door Equipment\n\n"
    "  *   Refurbishment parts kit for 2 existing GAL operators (s.5.4) ( not required from FTL)\n"
    "  *   2 new GAL car door tracks, rollers, skates/clutches and gate switches (s.5.6) ( not required from FTL)\n"
    "  *   2 CEDES CabSafe 2D/3D door detection systems (s.5.5) ( Can you get this?)\n\n"
    "## Detected structure signal: modernization_3section\n\n"
    "## Elevator count / door openings (from the spec) - AUTHORITATIVE\n"
    "Modernize 2 elevator(s) at 1 Example Street Toronto, ON.\n"
    "1. Retain existing stops outlined in the table below:\n"
    "Car Front Door Openings Total Front Rear Door Total Rear\nOpenings Openings Openings\n"
    "1 B,G,2-17 18 n/a 0\n2 B,G,2-17 18 n/a 0\n\n"
    "## Targeted technical subsections (from the spec)\n### Door Protective Device\n"
    "Provide new two dimensional (2D) and three dimensional (3D) combination infrared door detection systems "
    "on every car door. Provide a CEDES CabSafe system or equivalent.\n"
)
SPEC = (
    "Number of Elevators\n1. Modernize 2 elevator(s) at 1 Example Street.\n"
    "Openings and Stops\nCar Front Rear\n1 18 0\n2 18 0\n1.1. Next clause\n"
)


def _item(text, category, ref=None):
    return {"item": text, "category": category, "match": "exact", "catalog_ref": ref, "note": ""}


def _decision(items):
    return {
        "qualify": "qualify",
        "project_type": "modernization",
        "matched_items": items,
        "excluded_items": [],
        "flags": [],
        "reasoning": "model reasoning",
        "confidence": 0.8,
    }


def _by_cat(decision, category):
    return [e for e in decision["matched_items"] if e.get("estimator_category") == category]


def test_qualifier_drops_items_not_required_from_ftl():
    out = qa.align_with_estimator(
        _decision(
            [
                _item("Door operators", "door operator", "SGV2_DOOR_OP_1S42_L"),
                _item("Car door clutches", "clutch", "SGV2_CLUTCH_G.M.D._L"),
            ]
        ),
        CANDIDATE,
    )
    assert not _by_cat(out, qa.DOOR_OPERATOR)
    assert not _by_cat(out, qa.CLUTCH)
    assert not _by_cat(out, qa.DOOR_TOOLS)
    assert not _by_cat(out, qa.RESTRICTOR)
    assert sum("not required from FTL" in e.get("reason", "") for e in out["excluded_items"]) >= 2


def test_qualifier_keeps_operator_without_an_exclusion():
    out = qa.align_with_estimator(
        _decision([_item("Door operators", "door operator", "SGV2_DOOR_OP_1S42_L")]),
        "## Email\nplain request, no exclusions\n",
    )
    assert _by_cat(out, qa.DOOR_OPERATOR)


def test_qualifier_adds_one_detector_per_car_door():
    out = qa.align_with_estimator(_decision([_item("Governor", "governor", "WG_OL35_GOVERNOR_RC")]), CANDIDATE)
    detectors = _by_cat(out, qa.DETECTOR)
    assert len(detectors) == 1
    assert detectors[0]["estimator_qty"] == 2
    assert detectors[0]["catalog_ref"] == qa.DETECTOR_CODE


def test_qualifier_roller_guides_follow_the_customers_sets():
    both = _decision(
        [
            _item("Car roller guides, 6 in", "roller guide", "WRG_MOTION_GEAR150"),
            _item("Counterweight roller guides, 3 in", "roller guide", "WRG_MOTION_GEAR80"),
        ]
    )
    out = qa.align_with_estimator(both, CANDIDATE)
    assert sorted(e["estimator_qty"] for e in _by_cat(out, qa.ROLLER_GUIDE)) == [8, 8]

    three_sets = CANDIDATE.replace("2 sets ELSCO or Wittur car roller guides", "3 sets car roller guides")
    out = qa.align_with_estimator(
        _decision([_item("Car roller guides", "roller guide", "WRG_MOTION_GEAR150")]), three_sets
    )
    assert _by_cat(out, qa.ROLLER_GUIDE)[0]["estimator_qty"] == 12


def test_door_safety_retainers_are_not_car_safeties():
    entry = _item("door safety retainers", "safety")
    assert qa.classify(entry) != qa.CAR_SAFETY


@pytest.mark.parametrize("module", [qualifier_extract, estimator_extract])
def test_elevator_count_reaches_the_model(module):
    candidate = module.build_candidate_text(SPEC)
    assert candidate["elevator_count_statement"].startswith("Modernize 2 elevator(s)")
    assert "1 18 0" in candidate["elevator_count_statement"]
    rendered = module.render_candidate_text_for_model(candidate)
    assert "## Elevator count / door openings" in rendered


@pytest.mark.parametrize("module", [qualifier_extract, estimator_extract])
def test_spec_without_elevator_clause_adds_nothing(module):
    candidate = module.build_candidate_text("Replace the door operator.")
    assert candidate["elevator_count_statement"] == ""
    assert "## Elevator count" not in module.render_candidate_text_for_model(candidate)


@pytest.mark.parametrize("module", [qualifier_extract, estimator_extract])
def test_short_form_device_count_is_found(module):
    assert "No. of Devices" in module._find_device_count_summary("Building Bank No. of Devices 4 Elevator 1")


@pytest.mark.parametrize("module", [qualifier_extract, estimator_extract])
def test_long_email_body_is_kept(module):
    body = "x" * 10000 + " scope line at the end"
    rendered = module.render_candidate_text_for_model(
        module.build_candidate_text("short spec"),
        email_meta={"from": "a", "subject": "s", "date": "d", "body_text": body},
    )
    assert "scope line at the end" in rendered


async def test_qualifier_lists_attachments_it_did_not_read(monkeypatch):
    message = MIMEMultipart()
    message["From"] = "buyer@example.com"
    message["Subject"] = "RFQ"
    message.attach(MIMEText("Please quote the door operators."))
    photo = MIMEImage(b"\x89PNG" + b"0" * 300000, _subtype="png")
    photo.add_header("Content-Disposition", "attachment", filename="survey-1.png")
    sheet = MIMEText("a,b")
    sheet.add_header("Content-Disposition", "attachment", filename="schedule.xlsx")
    message.attach(photo)
    message.attach(sheet)

    async def fake_text(self, filename, content):
        return "text from the spec attachment"

    monkeypatch.setattr(FtlQualifierAgent, "_text_from_attachment", fake_text)
    bare = FtlQualifierAgent.__new__(FtlQualifierAgent)
    rendered, _meta, _ext = await bare._build_candidate_from_bytes(message.as_bytes(), "rfq.eml")
    assert estimator_extract.UNREAD_ATTACHMENTS_MARKER in rendered
    assert estimator_extract.has_unread_attachments(rendered) == ["schedule.xlsx"]


def test_restriction_line_uses_ftl_wording():
    quote = {
        "line_items": [
            {"product_code": "SGV2_DOOR_OP_1S42_L", "category": "door_operator", "qty": 2, "unit_price": 1},
            {
                "product_code": "SGV2_CAR_DOOR_RESTRICTOR",
                "description": "Car Door Restrictor (Bundled)",
                "category": "other",
                "qty": 2,
                "unit_price": 0,
            },
        ]
    }
    line = next(
        it
        for it in agent._enforce_door_restrictor_bundling(quote)["line_items"]
        if it["product_code"] == "SGV2_CAR_DOOR_RESTRICTOR"
    )
    assert line["description"] == "SGV2 Car Door Restriction Function - Included"
    assert line["qty"] == 2
    assert line["subtotal_override"] == 0


def test_ol100_governor_and_tension_line_are_held():
    quote = {
        "line_items": [{"product_code": "WG_OL100_GOVERNOR_RE_LH", "category": "governor", "qty": 1, "unit_price": 14400}],
        "assumptions": [],
    }
    out = agent._enforce_governor_tension_companions(quote)
    tension = next(it for it in out["line_items"] if it["product_code"] == "TBD_OL100_TENSION_ASSEMBLY")
    assert tension["hold"] is True
    assert any(h["item"] == "OL100 governor + separate tension line" for h in out["held_items"])


def test_ol35_tension_line_is_not_held():
    quote = {
        "line_items": [{"product_code": "WG_OL35_GOVERNOR_RC", "category": "governor", "qty": 1, "unit_price": 2654.4}],
        "assumptions": [],
    }
    out = agent._enforce_governor_tension_companions(quote)
    tension = next(it for it in out["line_items"] if it["product_code"] == "WG_OL35_TENSION_SHEAVE_SWINGARM")
    assert tension["hold"] is False
    assert not out.get("held_items")


def test_car_safety_is_removed_and_held():
    quote = {
        "line_items": [{"product_code": "CSGB03_CAR_SAFETIES", "category": "car_safety", "qty": 2, "unit_price": 5591.6}],
        "assumptions": [],
    }
    out = agent._enforce_safety_gear_block(quote)
    assert out["line_items"] == []
    held = [h for h in out["held_items"] if h["item"] == "Car safeties"]
    assert len(held) == 1
    assert "Fmax" in held[0]["needed"]
    assert any("HOLD - TECHNICAL REVIEW REQUIRED" in text for text in out["assumptions"])


def _both_guides():
    return {
        "line_items": [
            {
                "product_code": "WRG_MOTION_GEAR150",
                "description": "Car roller guide",
                "category": "roller_guide",
                "qty": 8,
                "unit_price": 1,
            },
            {
                "product_code": "WRG_MOTION_GEAR80",
                "description": "Counterweight (CWT) roller guide",
                "category": "roller_guide",
                "qty": 8,
                "unit_price": 1,
            },
        ],
        "assumptions": [],
    }


def test_both_guide_sets_called_out_are_not_flagged():
    out = agent._enforce_wrg_gating(_both_guides(), CANDIDATE)
    assert any("T-006 satisfied" in text for text in out["assumptions"])
    assert not any("REVIEW — this estimate has both" in text for text in out["assumptions"])


def test_product_master_code_is_not_called_fabricated():
    code = "FS_VISIONPLUS_3D_CAR_DOOR_DET"
    assert rules_engine.product_master_row(code)
    quote = {
        "line_items": [
            {
                "product_code": code,
                "description": "Detector",
                "category": "door_protective_device",
                "qty": 1,
                "unit_price": 1295,
            }
        ],
        "assumptions": [],
    }
    note = agent.postprocess_quote(quote, "## Email\nProvide a 3D door-edge detector.\n")
    line = next(it for it in note["line_items"] if it["product_code"] == code)
    assert "fabricated" not in str(line.get("note") or "").lower()


@pytest.mark.parametrize(
    "marker",
    [
        "## FTL rules v1.1 — binding",
        "## Default panel adaptor and the universal door",
        "## Step 4 — bundled items and standard quantities (FTL rulebook v1.1)",
        "If the RFQ is silent, follow the default",
    ],
)
@pytest.mark.parametrize("path", ["skills/ftl_quote_estimator/SKILL.md", "app/ftl/quote_estimator/skill_store.py"])
def test_skill_text_has_the_v11_rules(path, marker):
    text = (Path(__file__).resolve().parents[1] / path).read_text(encoding="utf-8")
    assert marker in text

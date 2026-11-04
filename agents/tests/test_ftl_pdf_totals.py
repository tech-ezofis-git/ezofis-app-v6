"""Quote PDF totals must add up from the quote's own lines. All data here is made up."""
from __future__ import annotations

import base64
import io

import pdfplumber

from app.agents.ftl_quote_estimator_agent import render_pdf_from_template
from app.ftl.quote_estimator.quote_select import (
    clean_contact_fields,
    form_data_for_quote_type,
    reconcile_quote_totals,
)

Q1_LINES = [
    {"Product": "SGV2_DOOR_OP_1S42_L", "Qty": 1, "Price": 4955.28, "Subtotal": 4955.28},
    {"Product": "SGV2(1S)_PANEL_ADAPTOR_GAL42_LH", "Qty": 1, "Price": 264.32, "Subtotal": 264.32},
    {"Product": "SGV2_CLUTCH_G.M.D._L", "Qty": 1, "Price": 1161.94, "Subtotal": 1161.94},
    {"Product": "SGV2_DOOR_TOOLS", "Qty": 1, "Price": 698.5, "Subtotal": 698.5},
    {"Product": "SGV2_CAR_DOOR_RESTRICTOR", "Qty": 1, "Price": 0, "Subtotal": 0},
]
Q2_LINES = [
    {"Product": "SGV2_DOOR_OP_1S42_L", "Qty": 1, "Price": 4955.28, "Subtotal": 4955.28},
    {"Product": "1S_T1_UNIVERSAL_CAR_DOOR_PANEL - 42 X 84", "Qty": 1, "Price": 1797.6, "Subtotal": 1797.6},
    {"Product": "SGV2_CLUTCH_G.M.D._L", "Qty": 1, "Price": 1161.94, "Subtotal": 1161.94},
    {"Product": "SGV2_DOOR_TOOLS", "Qty": 1, "Price": 698.5, "Subtotal": 698.5},
    {"Product": "SGV2_CAR_DOOR_RESTRICTOR", "Qty": 1, "Price": 0, "Subtotal": 0},
    {"Product": "FS_VISIONPLUS_3D_CAR_DOOR_DET", "Qty": 1, "Price": 1295, "Subtotal": 1295},
]


def _form(**extra):
    # A saved calculated Total leaves out freight, and Quote 2 keeps Quote 1's total.
    return {
        "Order Number": "EST-900001",
        "Line Item": Q1_LINES,
        "Subtotal": 7080.04,
        "Freight": 375,
        "HST": 969.16,
        "Total": 8049.2,
        "quote_2 Line Item": Q2_LINES,
        "quote_2 Subtotal": 9908.32,
        "quote_2 HST": 1336.83,
        "quote_2 Total": 8049.2,
        **extra,
    }


def test_quote_1_total_includes_freight():
    data, n = form_data_for_quote_type(form_data=_form(), quote_type="quote_1")
    assert n == 1
    assert data["Total"] == 8424.2
    assert data["HST"] == 969.16
    assert data["Freight"] == 375
    assert data["Freight Estimate"] == 375


def test_quote_2_uses_its_own_total_and_quote_1_freight():
    data, n = form_data_for_quote_type(form_data=_form(), quote_type="quote_2")
    assert n == 2
    assert data["Subtotal"] == 9908.32
    assert data["HST"] == 1336.83
    assert data["Freight"] == 375
    assert data["Total"] == 11620.15


def test_api_style_form_with_section_copied_to_canonical_keys():
    form = _form()
    form.update({"Line Item": Q2_LINES, "Subtotal": 9908.32, "HST": 1336.83, "Total": 8049.2})
    data, _n = form_data_for_quote_type(form_data=form, quote_type="quote_2")
    assert data["Total"] == 11620.15


def test_freight_missing_from_the_form_is_recovered_from_hst():
    form = _form()
    del form["Freight"]
    quote_1, _n = form_data_for_quote_type(form_data=form, quote_type="quote_1")
    quote_2, _n = form_data_for_quote_type(form_data=form, quote_type="quote_2")
    assert quote_1["Freight"] == 375
    assert quote_1["Total"] == 8424.2
    assert quote_2["Freight"] == 375
    assert quote_2["Total"] == 11620.15


def test_no_freight_means_no_invented_freight():
    data = reconcile_quote_totals({"Line Item": Q1_LINES, "HST": 920.41, "Total": 1})
    assert "Freight" not in data
    assert data["Total"] == 8000.45


def test_variant_lines_without_hst_get_hst_recalculated():
    form = _form()
    del form["quote_2 HST"]
    data, _n = form_data_for_quote_type(form_data=form, quote_type="quote_2")
    assert data["HST"] == 1336.83
    assert data["Total"] == 11620.15


def test_quote_level_discount_is_taken_off():
    data = reconcile_quote_totals({"Line Item": Q1_LINES, "Discount": 80.04, "Total": 1})
    assert data["HST"] == 910.0
    assert data["Total"] == 7910.0


def test_line_discount_is_not_taken_off_twice():
    rows = [{"Product": "A", "Qty": 1, "Price": 100, "Discount": 10, "Subtotal": 90}]
    data = reconcile_quote_totals({"Line Item": rows, "Discount": 10, "Total": 1})
    assert data["Subtotal"] == 90
    assert data["Total"] == 101.7


def test_no_priced_lines_leaves_data_alone():
    form = {"Line Item": [{"Product": "A"}], "Total": 50}
    assert reconcile_quote_totals(form) == form


def _pdf_text(result):
    with pdfplumber.open(io.BytesIO(base64.b64decode(result["pdf_base64"]))) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def _template(*rows):
    return {
        "basePdf": {"width": 210, "height": 297, "padding": [0, 0, 0, 0]},
        "schemas": [
            [
                {
                    "name": "Totals",
                    "type": "container",
                    "position": {"x": 100, "y": 20},
                    "width": 90,
                    "height": 40,
                    "children": list(rows),
                }
            ]
        ],
    }


SUBTOTAL_ROW = {"name": "Subtotal", "type": "key_value", "label": "Subtotal", "dataKey": "Subtotal"}
HST_ROW = {"name": "HST", "type": "key_value", "label": "HST", "dataKey": "HST"}
TOTAL_ROW = {"name": "Total", "type": "key_value", "label": "TOTAL (CAD)", "dataKey": "Total"}


def test_pdf_adds_a_freight_row_the_template_does_not_have():
    data, _n = form_data_for_quote_type(form_data=_form(), quote_type="quote_2")
    text = _pdf_text(render_pdf_from_template(_template(SUBTOTAL_ROW, HST_ROW, TOTAL_ROW), data))
    assert "Freight $375.00" in text
    assert "11,620.15" in text
    assert "8,049.20" not in text
    assert text.index("Freight") < text.index("HST")


def test_pdf_keeps_the_templates_own_freight_row():
    row = {"name": "Ship", "type": "key_value", "label": "Shipping", "dataKey": "Freight Estimate", "hideIfZero": True}
    data, _n = form_data_for_quote_type(form_data=_form(), quote_type="quote_1")
    text = _pdf_text(render_pdf_from_template(_template(SUBTOTAL_ROW, row, HST_ROW, TOTAL_ROW), data))
    assert "Shipping $375.00" in text
    assert "Freight" not in text


def test_pdf_without_freight_has_no_freight_row():
    data = reconcile_quote_totals({"Line Item": Q1_LINES, "HST": 920.41, "Total": 1})
    text = _pdf_text(render_pdf_from_template(_template(SUBTOTAL_ROW, HST_ROW, TOTAL_ROW), data))
    assert "Freight" not in text
    assert "8,000.45" in text


def test_email_moves_out_of_the_contact_name():
    out = clean_contact_fields({"Contact": "Test Estimating Team (bids@example.com)", "Email": ""})
    assert out["Contact"] == "Test Estimating Team"
    assert out["Email"] == "bids@example.com"


def test_email_already_stated_is_kept():
    out = clean_contact_fields({"contact_name": "Pat Example <pat@example.com>", "email": "office@example.com"})
    assert out["contact_name"] == "Pat Example"
    assert out["email"] == "office@example.com"


def test_contact_without_an_email_is_untouched():
    data = {"Contact": "Pat Example (Estimating)", "Email": "pat@example.com"}
    assert clean_contact_fields(data) == data


def test_contact_with_only_an_email_becomes_the_email():
    out = clean_contact_fields({"Contact": "pat@example.com"})
    assert out["Contact"] == ""
    assert out["Email"] == "pat@example.com"


def test_pdf_form_data_has_a_clean_contact():
    form = _form(Contact="Test Estimating Team (bids@example.com)")
    quote_1, _n = form_data_for_quote_type(form_data=form, quote_type="quote_1")
    quote_2, _n = form_data_for_quote_type(form_data=form, quote_type="quote_2")
    assert quote_1["Contact"] == quote_2["Contact"] == "Test Estimating Team"
    assert quote_1["Email"] == quote_2["Email"] == "bids@example.com"

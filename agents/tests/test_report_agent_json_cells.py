import json

from app.report_agent.json_cells import finish_structured_cells, structured_cell

_PO_LINE_JSON = (
    '[{"2z2Rh5MpXEaiHSaWlMThr":"1","eEpfRP5JIbS8aFle8J615":"NET-RTR-220",'
    '"ZpY63z5PRSjClud4PDpKV":"Network Edge Router","hy5p0sTmR4l7MkX5sWIuE":"EA",'
    '"eewd3Jx-Kx1ub1ZcjBt7L":"2","STqVWjmFqexaezHTRAkFG":"250","gRh9236whOB_ri9TtFaKq":"500"},'
    '{"2z2Rh5MpXEaiHSaWlMThr":"2","eEpfRP5JIbS8aFle8J615":"NET-SW-140",'
    '"ZpY63z5PRSjClud4PDpKV":"Managed Network Switch","hy5p0sTmR4l7MkX5sWIuE":"EA",'
    '"eewd3Jx-Kx1ub1ZcjBt7L":"3","STqVWjmFqexaezHTRAkFG":"300","gRh9236whOB_ri9TtFaKq":"900"}]'
)


def test_po_line_item_cell_is_json_array_not_comma_separated():
    cell = structured_cell(_PO_LINE_JSON, key="PO_Line_Item")
    assert isinstance(cell, list)
    assert cell[0]["Description"] == "Network Edge Router"
    assert cell[0]["Quantity"] == "2"
    assert cell[1]["Amount"] == "900"


def test_joined_json_objects_are_wrapped_back_into_an_array():
    joined = _PO_LINE_JSON.strip()[1:-1]
    cell = structured_cell(joined, key="Invoice_Line_Item")
    assert isinstance(cell, list)
    assert len(cell) == 2
    assert cell[1]["Description"] == "Managed Network Switch"


def test_native_list_of_dicts_is_json_array():
    cell = structured_cell(
        [{"Description": "Widget", "Quantity": 1, "Amount": 10}],
        key="Line Item",
    )
    assert cell == [{"Description": "Widget", "Quantity": 1, "Amount": 10}]


def test_finish_structured_cells_rewrites_po_and_invoice_columns():
    rows = finish_structured_cells(
        [
            {
                "Supplier": "Acme",
                "PO_Line_Item": json.loads(_PO_LINE_JSON),
                "Invoice_Line_Item": _PO_LINE_JSON,
            }
        ]
    )
    po = rows[0]["PO_Line_Item"]
    invoice = rows[0]["Invoice_Line_Item"]
    assert isinstance(po, list)
    assert isinstance(invoice, list)
    assert po[0]["Description"] == "Network Edge Router"
    assert invoice[1]["Description"] == "Managed Network Switch"
    assert rows[0]["Supplier"] == "Acme"


def test_python_repr_list_is_recovered_as_json():
    raw = str(json.loads(_PO_LINE_JSON))
    cell = structured_cell(raw, key="PO Line Item")
    assert isinstance(cell, list)
    assert cell[0]["Description"] == "Network Edge Router"


def test_plain_text_cells_stay_plain_text():
    assert structured_cell("REQ-138", key="RequestNo") == "REQ-138"
    assert structured_cell(1250, key="Invoice_Amount") == 1250

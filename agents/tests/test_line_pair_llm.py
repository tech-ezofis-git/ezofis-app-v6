from app.ap_skills.line_pair_llm import _brief, parse_line_pairs


def test_parse_line_pairs_keeps_a_code_match_and_a_kit():
    parsed = parse_line_pairs(
        {
            "pairs": [{"invoice_index": 0, "po_index": 1}],
            "kits": [{"po_index": 0, "invoice_indexes": [1, 2, 3, 4]}],
        },
        invoice_count=5,
        po_count=2,
    )
    assert parsed["invoice_to_po"] == {0: 1}
    assert parsed["kits"] == {0: [1, 2, 3, 4]}


def test_brief_includes_price_and_amount():
    brief = _brief(0, {"description": "Headset", "qty": 6, "price": 96, "amount": 576})
    assert brief == {"index": 0, "description": "Headset", "qty": 6.0, "price": 96.0, "amount": 576.0}


def test_parse_line_pairs_rejects_indexes_outside_the_lists():
    assert parse_line_pairs(
        {"pairs": [{"invoice_index": 9, "po_index": 0}], "kits": []},
        invoice_count=2,
        po_count=1,
    ) is None

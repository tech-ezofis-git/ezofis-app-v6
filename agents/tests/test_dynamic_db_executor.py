"""Master upsert in the form-sync executor: find the existing row by its code, never blank fields."""
from psycopg2 import sql

from app.services.dynamic_db_executor import execute_form_sync_transaction


def _render(query) -> str:
    """psycopg2 sql.Composable -> text without a live connection (identifiers double-quoted)."""
    if isinstance(query, sql.Composed):
        return "".join(_render(part) for part in query.seq)
    if isinstance(query, sql.Identifier):
        return ".".join(f'"{s}"' for s in query.strings)
    if isinstance(query, sql.Placeholder):
        return "%s"
    if isinstance(query, sql.SQL):
        return query.string
    return str(query)

SOURCE_SCHEMA = {
    "table_name": "ezfb_src_items",
    "physical_columns": {c: "text" for c in ("item_id", "Product_Code", "created_at", "modified_at", "is_deleted")},
}
TARGET_SCHEMA = {
    "table_name": "ezfb_mf_items",
    "physical_columns": {
        c: "text"
        for c in (
            "item_id", "Material_Code", "Material", "Colour", "Long_Text", "Version",
            "created_at", "modified_at", "is_deleted",
        )
    },
}


class FakeCursor:
    """Answers the master lookup from ``rows`` (item_id -> column values), records every statement."""

    def __init__(self, rows):
        self.rows = rows
        self.statements = []
        self._result = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, query, params=None):
        text = _render(query)
        params = list(params or [])
        self.statements.append((text, params))
        if text.startswith("SELECT item_id::text FROM"):
            column = text.split("regexp_replace(")[1].split("::text")[0].strip('"')
            wanted = params[0]
            hit = next(
                (item_id for item_id, row in self.rows.items()
                 if " ".join(str(row.get(column) or "").split()).lower() == wanted),
                None,
            )
            self._result = (hit,) if hit else None
        elif "RETURNING item_id::text" in text:
            self._result = ("new-id",)
        else:
            self._result = None

    def fetchone(self):
        return self._result


class FakeConn:
    status = 0
    autocommit = False

    def __init__(self, rows):
        self.cursor_obj = FakeCursor(rows)

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        pass

    def rollback(self):
        pass


def _run(rows, plan):
    conn = FakeConn(rows)
    result = execute_form_sync_transaction(
        conn=conn,
        source_schema=SOURCE_SCHEMA,
        target_schema=TARGET_SCHEMA,
        source_record_data={"Product_Code": "PMC228"},
        target_records_plan=plan,
    )
    return result, conn.cursor_obj.statements


def _master_writes(statements):
    return [(s, p) for s, p in statements if '"ezfb_mf_items"' in s and not s.startswith("SELECT")]


def test_code_in_the_wrong_column_still_updates_the_existing_row():
    # The LLM keyed the row on Material (a description column) with the product code.
    rows = {"c40d4c09": {"Material_Code": "PMC228", "Material": "PP"}}
    result, statements = _run(rows, [{
        "match_criteria": {"Material": "PMC228"},
        "fields": {"Material": "PMC228", "Colour": "Black"},
    }])

    assert result["target_records"][0]["action"] == "updated"
    assert result["target_records"][0]["target_id"] == "c40d4c09"
    (update, params), = _master_writes(statements)
    assert update.startswith("UPDATE")
    # The code is not copied into the description column it was mis-mapped to.
    assert '"Material" = %s' not in update
    assert "Black" in params


def test_code_column_match_ignores_case_and_whitespace():
    rows = {"e319a8a3": {"Material_Code": "BTL-001"}}
    result, _ = _run(rows, [{
        "match_criteria": {"Material_Code": " btl-001\n"},
        "fields": {"Material_Code": "BTL-001", "Colour": "Opaque White"},
    }])

    assert result["target_records"][0]["action"] == "updated"
    assert result["target_records"][0]["target_id"] == "e319a8a3"


def test_code_in_fields_wins_over_a_descriptive_match_criteria():
    rows = {"e319a8a3": {"Material_Code": "BTL-001", "Material": "HDPE"}}
    result, _ = _run(rows, [{
        "match_criteria": {"Material": "Bottle"},
        "fields": {"Material_Code": "BTL-001", "Colour": "Opaque White"},
    }])

    assert result["target_records"][0]["target_id"] == "e319a8a3"


def test_update_never_blanks_existing_values():
    rows = {"e319a8a3": {"Material_Code": "BTL-001", "Long_Text": "NPR details", "Version": "0"}}
    _, statements = _run(rows, [{
        "match_criteria": {"Material_Code": "BTL-001"},
        "fields": {"Material_Code": "BTL-001", "Long_Text": "", "Version": "null", "Colour": "  "},
    }])

    (update, _), = _master_writes(statements)
    assert '"Long_Text"' not in update
    assert '"Version"' not in update
    assert '"Colour"' not in update


def test_inserts_only_when_no_row_has_the_code():
    rows = {"c40d4c09": {"Material_Code": "PMC228"}}
    result, statements = _run(rows, [{
        "match_criteria": {"Material_Code": "PMC999"},
        "fields": {"Material_Code": "PMC999", "Colour": "Black", "Long_Text": ""},
    }])

    assert result["target_records"][0]["action"] == "inserted"
    (insert, _), = _master_writes(statements)
    assert insert.startswith("INSERT")
    assert '"Long_Text"' not in insert

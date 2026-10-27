from app.report_agent.catalog_execute import fill_filename_aliases
from app.report_agent.definition_lock import definition_from_table
from app.report_agent.metadata_service import ColumnMeta, DatabaseSchema


def _schema() -> DatabaseSchema:
    cols = [
        ColumnMeta("repository", "items_a6169a5c", name, "text")
        for name in ("file_name", "created_by", "created_at_utc", "PONumber")
    ]
    schema = DatabaseSchema()
    schema.tables = [("repository", "items_a6169a5c")]
    schema.columns_by_table[("repository", "items_a6169a5c")] = cols
    return schema


def test_folder_file_name_uses_items_file_name_column():
    locked = definition_from_table(
        _schema(),
        "repository",
        "items_a6169a5c",
        report_type="specific_repository",
        column_hints=["File Name", "Created At"],
    )
    by_key = {col["key"]: col["source"] for col in locked["columns"]}
    assert by_key["File Name"] == "t.file_name"
    assert by_key["Created At"] == "t.created_at_utc"


def test_named_folder_does_not_use_another_items_table():
    from app.report_agent.report_types import get_report_type
    from app.report_agent.schema_scope import preferred_fact_table, scope_schema

    schema = DatabaseSchema()
    schema.tables = [
        ("repository", "items_1c3f505c"),
        ("repository", "items_a6169a5c"),
    ]
    schema.columns_by_table = {
        ("repository", "items_1c3f505c"): [
            ColumnMeta("repository", "items_1c3f505c", "file_name", "text"),
        ],
        ("repository", "items_a6169a5c"): [
            ColumnMeta("repository", "items_a6169a5c", "file_name", "text"),
        ],
    }
    schema.table_to_workflow = {
        "items_1c3f505c": "Sample Test",
        "items_a6169a5c": "Accounts Payable",
    }
    tables = scope_schema(
        schema,
        get_report_type("specific_repository"),
        repository_name="Accounts Payable",
    )
    assert [table.table for table in tables] == ["items_a6169a5c"]
    preferred = preferred_fact_table(tables, report_type="specific_repository")
    assert preferred is not None
    assert preferred.table == "items_a6169a5c"


def test_empty_ezofis_folder_list_reads_items_file_name(monkeypatch):
    import asyncio

    from app.report_agent import catalog_execute as cat

    class _Db:
        async def fetch(self, sql, *args):
            if "Repositories" in sql or "ItemsTableName" in sql:
                return [
                    {
                        "id": "a6169a5c-1468-4fb5-90a9-220082a89f2a",
                        "name": "Accounts Payable",
                        "items_table": "items_a6169a5c",
                    }
                ]
            return [
                {
                    "item_id": "item-1",
                    "file_name": "INV-2026-3005.pdf",
                    "created_by": "e1eb37d9-0a3b-400d-9eef-21aa92f1b3fd",
                    "created_at": "2026-10-27T05:39:20+00:00",
                    "status": "",
                }
            ]

    class _Ez:
        async def list_repositories(self, tenant_id):
            return []

        async def list_users(self, tenant_id):
            return []

    async def _find_table(db, names, prefer_schemas=()):
        if "Repositories" in names:
            return ("repository", "Repositories")
        return ("repository", "items_a6169a5c")

    async def _fetch_columns(db, schema, table):
        if table == "Repositories":
            return (
                {"id": "Id", "name": "Name", "itemstablename": "ItemsTableName"},
                {},
            )
        return (
            {
                "id": "id",
                "file_name": "file_name",
                "created_by": "created_by",
                "created_at_utc": "created_at_utc",
                "status": "status",
                "is_deleted": "is_deleted",
            },
            {},
        )

    monkeypatch.setattr(cat, "find_table", _find_table)
    monkeypatch.setattr(cat, "fetch_columns", _fetch_columns)
    rows = asyncio.run(
        cat._repository_item_records(
            _Ez(),
            None,
            "tenant",
            repository_name="Accounts Payable",
            db=_Db(),
        )
    )
    assert rows[0]["File Name"] == "INV-2026-3005.pdf"
    assert rows[0]["FileName"] == "INV-2026-3005.pdf"
    assert rows[0]["itemId"] == "item-1"
    assert rows[0]["repositoryId"] == "a6169a5c-1468-4fb5-90a9-220082a89f2a"


def test_folder_rows_keep_item_and_repository_ids():
    from app.models.report_agent import ReportSpec, ReportSpecColumn
    from app.report_agent.catalog_execute import _shape_rows

    spec = ReportSpec(
        title="Folder Summary",
        report_type="specific_repository",
        columns=[
            ReportSpecColumn(key="File Name", label="File Name"),
            ReportSpecColumn(key="created_by", label="Created By"),
        ],
    )
    shaped = _shape_rows(
        spec,
        [
            {
                "File Name": "INV-2026-3005.pdf",
                "created_by": "RAJA",
                "itemId": "item-1",
                "repositoryId": "a6169a5c-1468-4fb5-90a9-220082a89f2a",
            }
        ],
    )
    assert shaped[0]["itemId"] == "item-1"
    assert shaped[0]["repositoryId"] == "a6169a5c-1468-4fb5-90a9-220082a89f2a"


def test_file_name_alias_is_copied_onto_the_report_column():
    rows = fill_filename_aliases([{"file_name": "INV-2026-3005.pdf", "PONumber": "PO-30005"}])
    assert rows[0]["File Name"] == "INV-2026-3005.pdf"
    assert rows[0]["FileName"] == "INV-2026-3005.pdf"

import pytest

from app.report_agent.catalog_execute import resolve_user_names

_USER = "e1eb37d9-0a3b-400d-9eef-21aa92f1b3fd"


class _Users:
    async def list_users(self, tenant_id):
        return [{"userId": _USER, "firstName": "Raahina", "lastName": "K"}]

    async def get_user(self, *, tenant_id, user_id):
        return {}


@pytest.mark.asyncio
async def test_created_by_and_acted_by_show_names_not_ids():
    rows = await resolve_user_names(
        _Users(),
        [{"actedBy": _USER, "created_by": _USER, "Invoice_No": "INV-2026-3005"}],
        tenant_id="tenant-1",
    )
    row = rows[0]
    assert row["actedBy"] == "Raahina K"
    assert row["created_by"] == "Raahina K"
    assert row["CreatedBy"] == "Raahina K"
    assert row["actedById"] == _USER
    assert row["CreatedById"] == _USER
    assert row["Invoice_No"] == "INV-2026-3005"

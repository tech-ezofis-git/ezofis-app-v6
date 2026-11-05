"""End-to-end: HTTP -> middleware -> agents -> real PostgreSQL (v6api schema replica).

The LLM is replaced by a stub returning the spec the model is expected to produce for the AP
aging prompt, so these tests pin down everything the service itself is responsible for.
"""

from __future__ import annotations

import copy
import json
import uuid

import httpx
import psycopg
import pytest
from fastapi import FastAPI
from psycopg import errors as pg_errors

from app.report_agent_v2 import MOUNT_PATH
from app.report_agent_v2.config import Settings
from app.report_agent_v2.db.connstr import npgsql_to_conninfo
from app.report_agent_v2.db.pools import read_only_transaction
from app.report_agent_v2.factory import create_app
from tests.report_agent_v2.conftest import SIGNING_KEY, TEST_PG, World, make_token

pytestmark = pytest.mark.skipif(not TEST_PG, reason="REPORT_AGENT_TEST_PG not set")

AP_PROMPT = (
    "Generate an Accounts Payable Aging Report showing outstanding invoices grouped by supplier, "
    "with aging buckets of 0-30, 31-60, 61-90, and over 90 days."
)


def _cond(ref, op, value=None, values=None):
    return {"ref": ref, "op": op, "value": value, "values": values or []}


def _arg(ref=None, number=None, text=None):
    return {"ref": ref, "number": number, "text": text}


def _derived(id_, label, dtype, op, args, edges=None, labels=None, condition=None):
    return {"id": id_, "label": label, "dataType": dtype, "op": op, "args": args,
            "edges": edges or [], "labels": labels or [], "condition": condition}


def _bucket_measure(id_, label):
    return {"id": f"b_{id_.replace('-', '_').replace('+', 'plus')}", "label": label, "fn": "sum", "of": "outstanding",
            "where": [_cond("aging_bucket", "equals", id_)]}


AP_AGING_SPEC = {
    "title": "Accounts Payable Aging",
    "description": "Outstanding invoice balances by supplier and days past due.",
    "derived": [
        _derived("paid_or_zero", "Paid", "number", "coalesce", [_arg(ref="paid1"), _arg(number=0)]),
        _derived("outstanding", "Outstanding", "number", "sub", [_arg(ref="aB3xY9"), _arg(ref="paid_or_zero")]),
        _derived("days_overdue", "Days Overdue", "number", "days_since", [_arg(ref="due1")]),
        _derived("aging_bucket", "Aging Bucket", "text", "bucket", [_arg(ref="days_overdue")],
                 edges=[30, 60, 90], labels=["0-30", "31-60", "61-90", "90+"]),
    ],
    "filters": [_cond("outstanding", "gt", "0")],
    "groupBy": ["supplier"],
    "measures": [
        {"id": "invoice_count", "label": "Invoices", "fn": "count", "of": None, "where": []},
        _bucket_measure("0-30", "0-30 Days"),
        _bucket_measure("31-60", "31-60 Days"),
        _bucket_measure("61-90", "61-90 Days"),
        _bucket_measure("90+", "Over 90 Days"),
        {"id": "total_outstanding", "label": "Total Outstanding", "fn": "sum", "of": "outstanding", "where": []},
    ],
    "columns": [
        {"ref": "supplier", "label": "Supplier"},
        {"ref": "invoice_count", "label": "Invoices"},
        {"ref": "b_0_30", "label": "0-30 Days"},
        {"ref": "b_31_60", "label": "31-60 Days"},
        {"ref": "b_61_90", "label": "61-90 Days"},
        {"ref": "b_90plus", "label": "Over 90 Days"},
        {"ref": "total_outstanding", "label": "Total Outstanding"},
    ],
    "orderBy": [{"ref": "total_outstanding", "direction": "desc"}],
    "limit": None,
    "totals": True,
    "assumptions": ["No payments table exists; outstanding = Invoice Amount - Paid Amount."],
}


class StubPlanner:
    def __init__(self, responses: list[dict]) -> None:
        self.responses = list(responses)
        self.feedback: list = []
        self.catalog_seen: list = []

    async def plan(self, request, catalog_view, feedback, history):
        self.feedback.append(feedback)
        self.catalog_seen = catalog_view
        return copy.deepcopy(self.responses.pop(0)), history + [request["prompt"]], "stub"


@pytest.fixture
async def make_client(world: World):
    clients = []

    async def factory(planner: StubPlanner | None = None) -> httpx.AsyncClient:
        settings = Settings(REPORT_AGENT_CATALOG_CONNECTION_STRING=world.catalog_cs, REPORT_AGENT_EZOFIS_AUTH_SIGNING_KEY=SIGNING_KEY)
        app = create_app(settings, planner=planner or StubPlanner([AP_AGING_SPEC] * 5))
        await app.state.pools.open()
        # Served the way the orchestrator serves it: mounted under MOUNT_PATH.
        host = FastAPI()
        host.mount(MOUNT_PATH, app)
        client = httpx.AsyncClient(transport=httpx.ASGITransport(app=host), base_url="http://test")
        clients.append((client, app))
        return client

    yield factory
    for client, app in clients:
        await client.aclose()
        await app.state.pools.close()


def _h(world: World, user: uuid.UUID, tenant: uuid.UUID | None = None, role: str = "TenantUser", header_tenant=None) -> dict:
    tenant = tenant or world.tenant_a
    headers = {"Authorization": f"Bearer {make_token(user, tenant, role=role)}"}
    headers["X-Tenant-Id"] = str(header_tenant or tenant)
    return headers


async def _create(client, world, planner_body=None, **body) -> dict:
    payload = {"prompt": AP_PROMPT, "sourceType": "Workflow", "workflowName": "Accounts Payable",
               "visibility": "Selected Users", "sharedUsers": [str(world.shared)], **body}
    r = await client.post("/api/report-agent-v2/definitions", json=payload, headers=_h(world, world.owner))
    assert r.status_code == 201, r.text
    return r.json()


# --- definition + execution -----------------------------------------------------------------------

async def test_ap_aging_end_to_end(world, make_client):
    planner = StubPlanner([AP_AGING_SPEC])
    client = await make_client(planner)
    created = await _create(client, world)

    # The agent only ever saw real, resolved fields — layout controls and unresolvable names are dropped.
    ids = {f["id"] for f in planner.catalog_seen}
    assert {"invoiceNo", "supplier", "aB3xY9", "paid1", "due1", "sys.request_no", "sys.current_stage"} <= ids
    assert "sec1" not in ids
    assert created["specVersion"] == 1 and created["status"] == "Draft"

    r = await client.post(f"/api/report-agent-v2/reports/{created['reportId']}/execute",
                          json={"asOfDate": "2026-10-29"}, headers=_h(world, world.owner))
    assert r.status_code == 200, r.text
    result = r.json()
    rows = {row["Supplier"]: row for row in result["rows"]}
    assert [row["Supplier"] for row in result["rows"]] == ["Acme", "Beta", "Gamma"]
    # Acme: 12,500.00-2,500 (14 days) + 5,000 (70 days)
    assert rows["Acme"] == {"Supplier": "Acme", "Invoices": 2, "0-30 Days": 10000, "31-60 Days": None,
                            "61-90 Days": 5000, "Over 90 Days": None, "Total Outstanding": 15000}
    # Beta: INV-3 fully paid and INV-6 'N/A' excluded; 2026-02-30 clamped to Feb 28 -> 90+
    assert rows["Beta"]["Over 90 Days"] == 4200 and rows["Beta"]["Invoices"] == 2
    # Gamma: soft-deleted INV-7 and draft INV-9 excluded; dd/mm/yyyy parsed
    assert rows["Gamma"]["31-60 Days"] == 700 and rows["Gamma"]["Invoices"] == 1
    assert result["totals"]["Total Outstanding"] == 19900 and result["totals"]["Supplier"] == "Total"
    assert result["columns"][6]["calc"] == "Sum"

    # Saved as a V6 report AI definition (existing ReportSpec keys + agentSpec), with a run recorded.
    tenant_db = next(p.split("=")[1] for p in npgsql_to_conninfo(
        (await _tenant_cs(world))).split() if p.startswith("dbname"))
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}") as conn:
        rtype, spec_json, prompt_json, runs = conn.execute(
            'SELECT "ReportType", "ReportSpecJson", "ReportPrompt", "Runs" FROM reporting."ReportAiDefinitions" WHERE "Id" = %s',
            (created["reportId"],)).fetchone()
        saved = json.loads(spec_json)
        assert rtype == "specific_workflow" and runs == 1
        assert {"title", "objective", "userPrompt", "reportType", "columns", "defaultColumns", "agentColumns",
                "schemaTables", "agentSpec"} <= saved.keys()
        assert json.loads(prompt_json)["Userprompt"] == AP_PROMPT
        assert conn.execute('SELECT "Prompt" FROM reporting."ReportAgentSpecs" WHERE "ReportId" = %s',
                            (created["reportId"],)).fetchone()[0] == AP_PROMPT


async def _tenant_cs(world: World) -> str:
    async with await psycopg.AsyncConnection.connect(npgsql_to_conninfo(world.catalog_cs)) as conn:
        cur = await conn.execute('SELECT "ConnectionString" FROM catalog."Tenants" WHERE "Id" = %s', (world.tenant_a,))
        return (await cur.fetchone())[0]


async def test_invalid_spec_is_repaired_with_validation_feedback(world, make_client):
    broken = copy.deepcopy(AP_AGING_SPEC)
    broken["derived"][1]["args"][0]["ref"] = "invoice_total"  # not in catalog
    planner = StubPlanner([broken, AP_AGING_SPEC])
    client = await make_client(planner)
    created = await _create(client, world)
    assert created["attempts"] == 2
    assert any("unknown reference 'invoice_total'" in msg for msg in planner.feedback[1])


async def test_regenerate_creates_new_version_and_runtime_filter(world, make_client):
    client = await make_client(StubPlanner([AP_AGING_SPEC, AP_AGING_SPEC]))
    created = await _create(client, world)
    r = await client.put(f"/api/report-agent-v2/definitions/{created['reportId']}", json={}, headers=_h(world, world.owner))
    assert r.status_code == 200 and r.json()["specVersion"] == 2
    r = await client.post(
        f"/api/report-agent-v2/reports/{created['reportId']}/execute",
        json={"asOfDate": "2026-10-29", "filters": [_cond("supplier", "equals", "acme")]},
        headers=_h(world, world.owner),
    )
    assert [row["Supplier"] for row in r.json()["rows"]] == ["Acme"]


# --- security --------------------------------------------------------------------------------------

async def test_authentication_is_required(world, make_client):
    client = await make_client()
    r = await client.post("/api/report-agent-v2/definitions", json={})
    assert r.status_code == 401
    bad = {"Authorization": "Bearer " + make_token(world.owner, world.tenant_a, key="wrong-key-0123456789-0123456789-xx"),
           "X-Tenant-Id": str(world.tenant_a)}
    assert (await client.get("/api/report-agent-v2/sources/workflows", headers=bad)).status_code == 401


async def test_frontend_tenant_header_is_not_trusted(world, make_client):
    client = await make_client()
    # Tenant-A user, token for A, asks for tenant B's data via the header.
    r = await client.get("/api/report-agent-v2/sources/workflows",
                         headers=_h(world, world.owner, header_tenant=world.tenant_b))
    assert r.status_code == 403
    # Tenant-B user cannot open a tenant-A report even with a forged id.
    created = await _create(client, world)
    r = await client.post(f"/api/report-agent-v2/reports/{created['reportId']}/execute", json={},
                          headers=_h(world, world.user_b, tenant=world.tenant_b))
    assert r.status_code == 404


async def test_unknown_user_in_tenant_is_rejected(world, make_client):
    client = await make_client()
    r = await client.get("/api/report-agent-v2/sources/workflows", headers=_h(world, uuid.uuid4()))
    assert r.status_code == 403


async def test_report_sharing_rules(world, make_client):
    client = await make_client(StubPlanner([AP_AGING_SPEC] * 3))
    created = await _create(client, world)
    url = f"/api/report-agent-v2/reports/{created['reportId']}/execute"
    assert (await client.post(url, json={}, headers=_h(world, world.shared))).status_code == 200
    assert (await client.post(url, json={}, headers=_h(world, world.outsider))).status_code == 404
    r = await client.put(f"/api/report-agent-v2/definitions/{created['reportId']}", json={}, headers=_h(world, world.shared))
    assert r.status_code == 403
    # Admin role in the token alone is not enough: the outsider's DB role is TenantUser.
    r = await client.post(url, json={}, headers=_h(world, world.outsider, role="Admin"))
    assert r.status_code == 404
    r = await client.post(url, json={}, headers=_h(world, world.admin, role="Admin"))
    assert r.status_code == 200


async def test_hostile_filter_values_are_inert(world, make_client):
    client = await make_client()
    created = await _create(client, world)
    r = await client.post(
        f"/api/report-agent-v2/reports/{created['reportId']}/execute",
        json={"filters": [_cond("supplier", "equals", "x'; DROP TABLE users.\"Users\"; --")]},
        headers=_h(world, world.owner),
    )
    assert r.status_code == 200 and r.json()["rowCount"] == 0
    r = await client.post(
        f"/api/report-agent-v2/reports/{created['reportId']}/execute",
        json={"filters": [_cond('e."Supplier" OR 1=1', "isNotEmpty")]},
        headers=_h(world, world.owner),
    )
    assert r.status_code == 400


async def test_read_only_transaction_blocks_writes(world):
    conninfo = npgsql_to_conninfo(await _tenant_cs(world))
    async with await psycopg.AsyncConnection.connect(conninfo, autocommit=True) as conn:
        with pytest.raises(pg_errors.ReadOnlySqlTransaction):
            async with read_only_transaction(conn, 5000):
                await conn.execute('DELETE FROM users."Users"')


ACTIVE_REQUESTS_SPEC = {
    "title": "Active requests and stages", "description": "Open AP requests with their current stage.",
    "derived": [], "groupBy": [], "measures": [], "limit": None, "totals": False, "assumptions": [],
    "filters": [_cond("sys.request_status", "notIn", values=["Completed", "Cancelled"])],
    "columns": [
        {"ref": "sys.request_no", "label": "Request No"},
        {"ref": "invoiceNo", "label": "Invoice No"},
        {"ref": "sys.request_status", "label": "Status"},
        {"ref": "sys.current_stage", "label": "Current Stage"},
        {"ref": "sys.last_action_by", "label": "Last Action By"},
    ],
    "orderBy": [{"ref": "sys.request_no", "direction": "asc"}],
}


async def test_workflow_system_fields_join_instances_and_inbox(world, make_client):
    client = await make_client(StubPlanner([ACTIVE_REQUESTS_SPEC]))
    created = await _create(client, world, prompt="Show active requests and their current approval stage")
    r = await client.post(f"/api/report-agent-v2/reports/{created['reportId']}/execute", json={}, headers=_h(world, world.owner))
    assert r.status_code == 200, r.text
    rows = r.json()["rows"]
    assert "INV-3" not in {row["Invoice No"] for row in rows}  # Completed
    assert "INV-9" not in {row["Invoice No"] for row in rows}  # never entered the workflow
    first = rows[0]
    assert first["Request No"].startswith("AP-") and first["Current Stage"] == "Finance Approval"
    assert first["Last Action By"] == "Kenneth" and first["Status"] in {"Pending", "Running"}


# --- preview, then save separately -----------------------------------------------------------------

async def test_preview_then_save_stores_exactly_the_previewed_spec(world, make_client):
    planner = StubPlanner([AP_AGING_SPEC])  # one generation only: save must not call the LLM
    client = await make_client(planner)
    src = {"sourceType": "Workflow", "workflowName": "Accounts Payable"}
    r = await client.post("/api/report-agent-v2/definitions/preview", json={"prompt": AP_PROMPT, **src},
                          headers=_h(world, world.owner))
    assert r.status_code == 200, r.text
    preview = r.json()

    r = await client.post("/api/report-agent-v2/definitions/save",
                          json={"prompt": AP_PROMPT, "reportSpec": preview["reportSpec"], "name": "AP aging",
                                "visibility": "Selected Users", "sharedUsers": [str(world.shared)], **src},
                          headers=_h(world, world.owner))
    assert r.status_code == 201, r.text
    saved = r.json()
    assert saved["name"] == "AP aging" and saved["specVersion"] == 1 and saved["reportType"] == "specific_workflow"
    assert saved["reportSpec"]["agentSpec"]["spec"] == preview["reportSpec"]["agentSpec"]["spec"]
    assert len(planner.feedback) == 1

    r = await client.post(f"/api/report-agent-v2/reports/{saved['id']}/execute", json={"asOfDate": "2026-10-29"},
                          headers=_h(world, world.owner))
    assert r.status_code == 200 and r.json()["rowCount"] == len(preview["preview"]["rows"])

    # Overwrite the same report (owner) -> version 2; anyone else may not.
    r = await client.post("/api/report-agent-v2/definitions/save",
                          json={"id": saved["id"], "prompt": AP_PROMPT, "reportSpec": preview["reportSpec"], **src},
                          headers=_h(world, world.owner))
    assert r.status_code == 201 and r.json()["specVersion"] == 2 and r.json()["name"] == "AP aging"
    r = await client.post("/api/report-agent-v2/definitions/save",
                          json={"id": saved["id"], "prompt": AP_PROMPT, "reportSpec": preview["reportSpec"], **src},
                          headers=_h(world, world.shared))
    assert r.status_code == 403  # shared user can view, not overwrite
    r = await client.post("/api/report-agent-v2/definitions/save",
                          json={"id": saved["id"], "prompt": AP_PROMPT, "reportSpec": preview["reportSpec"], **src},
                          headers=_h(world, world.outsider))
    assert r.status_code == 404  # not shared with them: the report does not exist for them


async def test_save_rejects_missing_or_tampered_spec(world, make_client):
    client = await make_client()
    src = {"sourceType": "Workflow", "workflowName": "Accounts Payable", "prompt": AP_PROMPT}
    r = await client.post("/api/report-agent-v2/definitions/save", json={**src, "reportSpec": {"title": "x"}},
                          headers=_h(world, world.owner))
    assert r.status_code == 400
    bad = copy.deepcopy(AP_AGING_SPEC)
    bad["columns"].append({"ref": 'e."Supplier"; DROP TABLE x; --', "label": "x"})
    r = await client.post("/api/report-agent-v2/definitions/save", json={**src, "agentSpec": bad},
                          headers=_h(world, world.owner))
    assert r.status_code == 422 and r.json()["details"]  # rejected by the compiler, never executed


# --- default reports -------------------------------------------------------------------------------

async def test_default_reports_install_once_and_execute(world, make_client):
    client = await make_client()
    admin = _h(world, world.admin, role="Admin")
    assert (await client.post("/api/report-agent-v2/defaults/install", headers=_h(world, world.owner))).status_code == 403

    r = await client.post("/api/report-agent-v2/defaults/install", headers=admin)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["installed"] == 6 and body["alreadyPresent"] == 0
    again = (await client.post("/api/report-agent-v2/defaults/install", headers=admin)).json()
    assert again["installed"] == 0 and again["alreadyPresent"] == 6
    assert {x["id"] for x in again["reports"]} == {x["id"] for x in body["reports"]}

    listing = (await client.get("/api/report-agent-v2/defaults", headers=admin)).json()
    assert all(d["installed"] for d in listing) and len(listing) == 6

    ids = {x["key"]: x["id"] for x in body["reports"]}
    for key, report_id in ids.items():
        r = await client.post(f"/api/report-agent-v2/reports/{report_id}/execute", json={"asOfDate": "2026-10-29"}, headers=admin)
        assert r.status_code == 200, (key, r.text)
        assert r.json()["defaultReport"] == key

    pending = (await client.post(f"/api/report-agent-v2/reports/{ids['pending_workflow_requests']}/execute", json={},
                                 headers=admin)).json()
    assert pending["rowCount"] >= 1 and {c["label"] for c in pending["columns"]} >= {"Workflow", "Request No", "Days Pending"}

    d = (await client.get(f"/api/report-agent-v2/definitions/{ids['user_login_security']}", headers=admin)).json()
    assert d["reportSpec"]["agentSpec"]["kind"] == "system" and d["status"] == "Published" and d["visibility"] == "Private"
    # Private: a regular user cannot see tenant-wide login/security data.
    r = await client.post(f"/api/report-agent-v2/reports/{ids['user_login_security']}/execute", json={},
                          headers=_h(world, world.outsider))
    assert r.status_code == 404
    r = await client.post(f"/api/report-agent-v2/reports/{ids['pending_workflow_requests']}/execute",
                          json={"filters": [{"ref": "x", "op": "equals", "value": "1", "values": []}]}, headers=admin)
    assert r.status_code == 400
    r = await client.put(f"/api/report-agent-v2/definitions/{ids['pending_workflow_requests']}", json={}, headers=admin)
    assert r.status_code == 409


# --- list saved reports, then run one with only its id ---------------------------------------------

async def test_list_reports_then_execute_by_id_only(world, make_client):
    client = await make_client()
    created = await _create(client, world)  # owner's agent report, shared with world.shared
    admin = _h(world, world.admin, role="Admin")
    await client.post("/api/report-agent-v2/defaults/install", headers=admin)

    owner_list = (await client.get("/api/report-agent-v2/reports", headers=_h(world, world.owner))).json()
    # (the test databases are shared by the whole session, so earlier tests' reports are listed too)
    item = next(i for i in owner_list["items"] if i["id"] == created["id"])
    assert item["kind"] == "agent" and item["executable"] and item["canEdit"]
    assert all(i["kind"] == "agent" for i in owner_list["items"])  # Private defaults are not visible to a regular user

    shared_list = (await client.get("/api/report-agent-v2/reports", headers=_h(world, world.shared))).json()
    assert not next(i for i in shared_list["items"] if i["id"] == created["id"])["canEdit"]
    assert (await client.get("/api/report-agent-v2/reports", headers=_h(world, world.outsider))).json()["total"] == 0

    admin_list = (await client.get("/api/report-agent-v2/reports", headers=admin)).json()
    assert admin_list["total"] >= owner_list["total"] + 6
    defaults = (await client.get("/api/report-agent-v2/reports?kind=default&pageSize=2", headers=admin)).json()
    assert defaults["total"] == 6 and len(defaults["items"]) == 2 and all(i["kind"] == "default" for i in defaults["items"])
    found = (await client.get("/api/report-agent-v2/reports", params={"search": "pending"}, headers=admin)).json()
    pending_item = next(i for i in found["items"] if i["name"] == "Pending Workflow Requests")  # search covers name + description
    assert all("pending" in (i["name"] + i["description"]).lower() for i in found["items"])

    # Click -> run with only the id: GET (no body) and POST with no body both work.
    r = await client.get(f"/api/report-agent-v2/reports/{item['id']}/execute", headers=_h(world, world.owner))
    assert r.status_code == 200 and r.json()["rowCount"] > 0
    r = await client.post(f"/api/report-agent-v2/reports/{item['id']}/execute", headers=_h(world, world.shared))
    assert r.status_code == 200
    r = await client.get(f"/api/report-agent-v2/reports/{pending_item['id']}/execute", params={"limit": 1}, headers=admin)
    assert r.status_code == 200 and r.json()["defaultReport"] == "pending_workflow_requests" and r.json()["rowCount"] <= 1
    r = await client.get(f"/api/report-agent-v2/reports/{item['id']}/execute", headers=_h(world, world.outsider))
    assert r.status_code == 404


# --- ticket columns: Request No, Stage, Created By, Action By, Created At, Modified At ------------

LIST_SPEC = {
    "title": "AP invoice register", "description": "All invoices", "derived": [], "filters": [], "groupBy": [],
    "measures": [], "columns": [{"ref": "invoiceNo", "label": "Invoice No"}, {"ref": "supplier", "label": "Supplier"}],
    "orderBy": [], "limit": None, "totals": False, "assumptions": [],
}


async def test_list_reports_always_show_ticket_columns_with_emails(world, make_client):
    client = await make_client(StubPlanner([LIST_SPEC, AP_AGING_SPEC]))
    src = {"sourceType": "Workflow", "workflowName": "Accounts Payable"}
    r = await client.post("/api/report-agent-v2/definitions/preview", json={"prompt": "list all invoices", **src},
                          headers=_h(world, world.owner))
    assert r.status_code == 200, r.text
    labels = [c["label"] for c in r.json()["preview"]["columns"]]
    assert labels[:3] == ["Request No", "Invoice No", "Supplier"]
    assert {"Stage", "Created By", "Action By", "Created At"} <= set(labels)
    rows = r.json()["preview"]["rows"]
    assert rows and all(row["Created By"] == "owner@a.example.com" for row in rows)  # user id resolved to email
    assert all(row["Action By"] == "Kenneth" for row in rows)  # no email columns in this schema -> name fallback
    assert all(not str(row["Created By"]).count("-") == 4 for row in rows)  # never a raw uuid

    # Grouped totals have no single ticket per row: no ticket columns added.
    r = await client.post("/api/report-agent-v2/definitions/preview", json={"prompt": AP_PROMPT, **src},
                          headers=_h(world, world.owner))
    assert "Created By" not in [c["label"] for c in r.json()["preview"]["columns"]]


async def test_pending_default_report_shows_creator_email(world, make_client):
    client = await make_client()
    admin = _h(world, world.admin, role="Admin")
    ids = {x["key"]: x["id"] for x in (await client.post("/api/report-agent-v2/defaults/install", headers=admin)).json()["reports"]}
    r = await client.get(f"/api/report-agent-v2/reports/{ids['pending_workflow_requests']}/execute", headers=admin)
    body = r.json()
    assert [c["label"] for c in body["columns"]] == [
        "Workflow", "Request No", "Status", "Stage", "Priority", "Raised By", "Raised On",
        "Pending With", "Pending Since", "With User For", "Last Acted On", "Last Acted Stage", "First Actioner",
        "Response Due", "Response Time (Hrs)", "Response Status", "Resolution Due", "Resolution Time (Hrs)",
        "Resolution Status", "Escalated", "Days Pending", "Open For", "Month"]
    assert all(row["Open For"] and row["Month"] for row in body["rows"])
    assert body["rows"] and all(row["Raised By"] == "owner@a.example.com" for row in body["rows"])
    # Status and Stage carry the template's built-in pills.
    spec = (await client.get(f"/api/report-agent-v2/definitions/{ids['pending_workflow_requests']}", headers=admin)).json()["reportSpec"]
    hl = {c["key"]: c["highlight"] for c in spec["columns"] if c.get("highlight")}
    assert {r["value"]: r["color"] for r in hl["Status"]["rules"]} == {"Running": "blue", "Pending": "orange", "Paused": "gray"}
    assert hl["Stage"]["default"] == "purple" and not hl["Stage"]["rules"]


# --- wizard round trip: preview, edit, re-preview without LLM, save with highlight + status ----

async def test_edited_spec_is_rerun_without_llm_and_saved_with_highlights(world, make_client):
    planner = StubPlanner([LIST_SPEC])  # exactly one generation for the whole round trip
    client = await make_client(planner)
    src = {"sourceType": "Workflow", "workflowName": "Accounts Payable"}
    first = (await client.post("/api/report-agent-v2/definitions/preview", json={"prompt": "list all invoices", **src},
                               headers=_h(world, world.owner))).json()
    ui = copy.deepcopy(first["reportSpec"])
    keys = [c["key"] for c in ui["columns"]]
    assert "Supplier" in keys and "Invoice No" in keys

    # The user drops "Supplier", renames "Invoice No", adds a filter and a highlight, retitles.
    ui["columns"] = [c for c in ui["columns"] if c["key"] != "Supplier"]
    for c in ui["columns"]:
        if c["key"] == "Invoice No":
            c["label"] = "Invoice #"
            c["highlight"] = {"default": None, "rules": [{"color": "red", "op": "eq", "value": "INV-1"}]}
    ui["filters"] = [{"field": "Supplier", "op": "eq", "value": "Acme", "editable": True}]
    ui["title"] = "Acme invoices"

    r = await client.post("/api/report-agent-v2/definitions/preview", json={"reportSpec": ui, **src},
                          headers=_h(world, world.owner))
    assert r.status_code == 200, r.text
    edited = r.json()
    labels = [c["label"] for c in edited["preview"]["columns"]]
    assert "Supplier" not in labels and "Invoice #" in labels
    assert edited["preview"]["rows"] and all(row["Request No"] for row in edited["preview"]["rows"])
    assert edited["title"] == "Acme invoices"
    assert len(planner.feedback) == 1  # no second LLM call

    r = await client.post("/api/report-agent-v2/definitions/save",
                          json={"prompt": "list all invoices", "reportSpec": ui, "status": "Published", **src},
                          headers=_h(world, world.owner))
    assert r.status_code == 201, r.text
    saved = r.json()
    assert saved["status"] == "Published" and saved["name"] == "Acme invoices"
    col = next(c for c in saved["reportSpec"]["columns"] if c["key"] == "Invoice #")
    assert col["highlight"]["rules"][0]["color"] == "red"
    assert saved["reportSpec"]["filters"][0]["field"] == "Supplier"
    run = (await client.get(f"/api/report-agent-v2/reports/{saved['id']}/execute", headers=_h(world, world.owner))).json()
    assert run["rowCount"] == edited["preview"]["rowCount"]


async def test_preview_needs_prompt_or_spec_and_ignores_unknown_ui_refs(world, make_client):
    client = await make_client(StubPlanner([LIST_SPEC]))
    src = {"sourceType": "Workflow", "workflowName": "Accounts Payable"}
    r = await client.post("/api/report-agent-v2/definitions/preview", json=src, headers=_h(world, world.owner))
    assert r.status_code == 400
    first = (await client.post("/api/report-agent-v2/definitions/preview", json={"prompt": "list all invoices", **src},
                               headers=_h(world, world.owner))).json()
    ui = copy.deepcopy(first["reportSpec"])
    ui["columns"].append({"key": 'x"; DROP TABLE y; --', "label": "evil", "selected": True})
    ui["filters"] = [{"field": "no such field", "op": "eq", "value": "1"}]
    r = await client.post("/api/report-agent-v2/definitions/preview", json={"reportSpec": ui, **src},
                          headers=_h(world, world.owner))
    assert r.status_code == 200
    body = r.json()
    assert "evil" not in [c["label"] for c in body["preview"]["columns"]]
    assert any("no such field" in w for w in body["warnings"])


# --- row links, highlights on default reports, Action By fallback ------------------------------

async def test_list_rows_carry_hidden_request_links_but_grouped_rows_do_not(world, make_client):
    client = await make_client(StubPlanner([LIST_SPEC, AP_AGING_SPEC]))
    src = {"sourceType": "Workflow", "workflowName": "Accounts Payable"}
    body = (await client.post("/api/report-agent-v2/definitions/preview", json={"prompt": "list all invoices", **src},
                              headers=_h(world, world.owner))).json()
    labels = [c["label"] for c in body["preview"]["columns"]]
    assert "instanceId" not in labels and "workflowId" not in labels  # hidden, not columns
    assert "instanceId" not in [c["key"] for c in body["reportSpec"]["columns"]]
    rows = body["preview"]["rows"]
    assert rows and all(r["instanceId"] and r["workflowId"] == str(world.workflow_id) for r in rows)
    grouped = (await client.post("/api/report-agent-v2/definitions/preview", json={"prompt": AP_PROMPT, **src},
                                 headers=_h(world, world.owner))).json()
    assert all("instanceId" not in r for r in grouped["preview"]["rows"])


async def test_default_report_highlights_and_action_by_fallback(world, make_client):
    client = await make_client()
    admin = _h(world, world.admin, role="Admin")
    ids = {x["key"]: x["id"] for x in (await client.post("/api/report-agent-v2/defaults/install", headers=admin)).json()["reports"]}
    pending_id = ids["pending_workflow_requests"]
    run = (await client.get(f"/api/report-agent-v2/reports/{pending_id}/execute", headers=admin)).json()
    assert run["rows"] and all(r["instanceId"] and r["workflowId"] for r in run["rows"])
    # No transaction table here: Pending With falls back to the latest inbox row's user (every request has one).
    assert all(r["Pending With"] for r in run["rows"])

    rule = {"rules": [{"color": "red", "op": "gt", "value": 30, "label": "Overdue"}], "default": None}
    r = await client.put(f"/api/report-agent-v2/definitions/{pending_id}/highlights",
                         json={"columns": {"Days Pending": rule, "No Such Column": rule}}, headers=admin)
    assert r.status_code == 200, r.text
    col = next(c for c in r.json()["reportSpec"]["columns"] if c["key"] == "Days Pending")
    assert col["highlight"]["rules"][0]["color"] == "red"
    saved = (await client.get(f"/api/report-agent-v2/definitions/{pending_id}", headers=admin)).json()
    assert next(c for c in saved["reportSpec"]["columns"] if c["key"] == "Days Pending")["highlight"]
    # Clearing works; a user who can't manage it is refused.
    r = await client.put(f"/api/report-agent-v2/definitions/{pending_id}/highlights",
                         json={"columns": {"Days Pending": None}}, headers=admin)
    assert next(c for c in r.json()["reportSpec"]["columns"] if c["key"] == "Days Pending")["highlight"] is None
    r = await client.put(f"/api/report-agent-v2/definitions/{pending_id}/highlights",
                         json={"columns": {"Days Pending": rule}}, headers=_h(world, world.owner))
    assert r.status_code == 404  # private default report: not visible to a regular user


async def test_document_activity_and_credit_column_order(world, make_client):
    from app.report_agent_v2.domain.system_reports import TEMPLATES

    assert [c.label for c in TEMPLATES["document_recent_activity"].columns if c.role != "link"][:4] == [
        "Document", "Repository", "Updated On", "Activity"]
    assert [c.label for c in TEMPLATES["ai_credit_consumption"].columns if c.role != "link"][:3] == [
        "Request No", "Source", "Agent"]
    assert "Runs" not in [c.label for c in TEMPLATES["ai_credit_consumption"].columns]


async def test_default_report_spec_follows_template_and_keeps_highlights(world, make_client):
    client = await make_client()
    admin = _h(world, world.admin, role="Admin")
    ids = {x["key"]: x["id"] for x in (await client.post("/api/report-agent-v2/defaults/install", headers=admin)).json()["reports"]}
    rid = ids["ai_credit_consumption"]
    # Simulate a report installed from an older template: different columns, one highlighted.
    stale = {"title": "AI Credit Consumption", "columns": [
        {"key": "Agent", "label": "Agent", "highlight": {"rules": [{"color": "red", "op": "eq", "value": "x"}]}},
        {"key": "Old Column", "label": "Old Column"}],
        "agentSpec": {"kind": "system", "template": "ai_credit_consumption"}}
    tenant_db = next(p.split("=")[1] for p in npgsql_to_conninfo((await _tenant_cs(world))).split() if p.startswith("dbname"))
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}") as conn:
        conn.execute('UPDATE reporting."ReportAiDefinitions" SET "ReportSpecJson" = %s WHERE "Id" = %s',
                     (json.dumps(stale), rid))
    spec = (await client.get(f"/api/report-agent-v2/definitions/{rid}", headers=admin)).json()["reportSpec"]
    keys = [c["key"] for c in spec["columns"]]
    assert keys[0] == "Request No" and "Old Column" not in keys
    assert next(c for c in spec["columns"] if c["key"] == "Agent")["highlight"]["rules"][0]["color"] == "red"


async def test_document_activity_names_what_was_done(world):
    """History rows hold the values *before* each change; the report compares them with the next state."""
    from datetime import date as _date

    from app.report_agent_v2.domain.executor import run_compiled as _run, shape_result as _shape
    from app.report_agent_v2.domain.system_reports import compile_system_report

    tenant_db = next(p.split("=")[1] for p in npgsql_to_conninfo((await _tenant_cs(world))).split() if p.startswith("dbname"))
    repo, item, gone, fresh = uuid.uuid4(), uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS repository")
        conn.execute('CREATE TABLE IF NOT EXISTS repository."Repositories" ("Id" uuid, "TenantId" uuid, "Name" text, "ItemsTableName" text, "IsDeleted" boolean)')
        conn.execute('CREATE TABLE IF NOT EXISTS repository."RepositoryFields" ("RepositoryId" uuid, "Name" text, "SqlColumnName" text)')
        conn.execute("""CREATE TABLE IF NOT EXISTS repository.items_d0c0ffee (id uuid, folder_id uuid, file_name text, file_type text,
                        created_at_utc timestamptz, created_by uuid, modified_by uuid, is_deleted boolean, "Supplier" text, "Lines" text)""")
        conn.execute("""CREATE TABLE IF NOT EXISTS repository.items_d0c0ffee_history (id uuid, folder_id uuid, file_name text, file_type text,
                        created_at_utc timestamptz, created_by uuid, modified_by uuid, is_deleted boolean, "Supplier" text, "Lines" text,
                        history_id bigint, history_operation text, history_recorded_at timestamptz)""")
        # inv.pdf came in from the upload & index screen: its stage row points to the item.
        conn.execute("CREATE TABLE IF NOT EXISTS repository.items_d0c0ffee_stage (id uuid, promoted_item_id uuid)")
        conn.execute("INSERT INTO repository.items_d0c0ffee_stage VALUES (%s,%s)", (uuid.uuid4(), item))
        conn.execute('INSERT INTO repository."Repositories" VALUES (%s,%s,%s,%s,false)', (repo, world.tenant_a, "Invoices", "items_d0c0ffee"))
        conn.execute('INSERT INTO repository."RepositoryFields" VALUES (%s,%s,%s)', (repo, "Supplier Name", "Supplier"))
        conn.execute("INSERT INTO repository.items_d0c0ffee VALUES (%s,NULL,'inv.pdf','application/pdf','2026-10-20',%s,%s,false,'Acme','[1, 2]')",
                     (item, world.owner, world.owner))
        rows = [  # (history_id, op, at, Supplier, Lines) -- values BEFORE the change
            (1, "U", "2026-10-21", None, "[1, 2]"),       # -> Supplier set (next state: history 2)
            (2, "U", "2026-10-22", "Acme", "[1,2]"),      # -> only JSON spacing differs from current -> no change
        ]
        for hid, op, at, sup, lines in rows:
            conn.execute("INSERT INTO repository.items_d0c0ffee_history VALUES (%s,NULL,'inv.pdf','application/pdf','2026-10-20',%s,%s,false,%s,%s,%s,%s,%s)",
                         (item, world.owner, world.owner, sup, lines, hid, op, at))
        conn.execute("INSERT INTO repository.items_d0c0ffee_history VALUES (%s,NULL,'old.pdf','application/pdf','2026-10-01',%s,%s,false,NULL,NULL,3,'D','2026-10-23')",
                     (gone, world.owner, world.owner))
        # new.pdf: uploaded straight into the folder, then its empty index fields filled for the first time.
        conn.execute("INSERT INTO repository.items_d0c0ffee VALUES (%s,NULL,'new.pdf','application/pdf','2026-10-24',%s,%s,false,'Beta','[3]')",
                     (fresh, world.owner, world.owner))
        conn.execute("INSERT INTO repository.items_d0c0ffee_history VALUES (%s,NULL,'new.pdf','application/pdf','2026-10-24',%s,%s,false,NULL,NULL,4,'U','2026-10-25')",
                     (fresh, world.owner, world.owner))
    async with await psycopg.AsyncConnection.connect(npgsql_to_conninfo(await _tenant_cs(world)).replace("password=x", f"password={dict(p.split('=', 1) for p in TEST_PG.split()).get('password', 'x')}"), autocommit=True) as aconn:
        compiled = await compile_system_report(aconn, world.tenant_a, "document_recent_activity", as_of=_date(2026, 10, 29), limit=50)
        _, out, _ = _shape(compiled.columns, await _run(aconn, compiled, 30000))
    by_when = {(r["Document"], str(r["Updated On"])[:10]): r for r in out}
    assert "Folder" not in out[0] and "Action By" in out[0]
    assert by_when[("inv.pdf", "2026-10-20")]["Activity"] == "Archived"
    assert by_when[("new.pdf", "2026-10-24")]["Activity"] == "Uploaded"
    assert by_when[("new.pdf", "2026-10-25")]["Activity"] == "Indexed"
    edit = by_when[("inv.pdf", "2026-10-21")]
    assert edit["Activity"] == "Index updated" and edit["Details"] == "Supplier Name: - -> Acme"
    assert by_when[("inv.pdf", "2026-10-22")]["Activity"] == "Saved (no changes)"
    assert by_when[("old.pdf", "2026-10-23")]["Activity"] == "Deleted"
    assert all(r["itemId"] and r["repositoryId"] == str(repo) for r in out if r["Document"] == "inv.pdf")


async def test_credit_report_includes_v6_billing_credits(world, make_client):
    """AI summary / OCR / intelligent upload credits come from the V6 billing ledger in the catalog DB
    (dbo."creditTransaction_MMyy"); AP agent charges there are skipped (they are in ap_credit_ledger)."""
    from datetime import datetime as _dt
    from datetime import timezone as _tz

    now = _dt.now(_tz.utc)
    table = f"creditTransaction_{now:%m%y}"
    async with await psycopg.AsyncConnection.connect(npgsql_to_conninfo(world.catalog_cs), autocommit=True) as conn:
        await conn.execute("CREATE SCHEMA IF NOT EXISTS dbo")
        await conn.execute(f'''CREATE TABLE IF NOT EXISTS dbo."{table}" ("id" integer GENERATED ALWAYS AS IDENTITY,
            "tenantId" uuid NOT NULL, "activityType" varchar(100), "subActivityType" varchar(100), "credit" integer,
            "remarks" varchar(500), "identifyTable" varchar(100), "createdAt" timestamptz, "isDeleted" boolean)''')
        await conn.execute(f'ALTER TABLE dbo."{table}" ADD COLUMN IF NOT EXISTS "identifyTable" varchar(100)')
        repo, summary_item = uuid.uuid4(), uuid.uuid4()
        rows = [
            (world.tenant_a, "Document Summary", "DocumentSummary", 1, f"AI summary for item {summary_item}",
             f"repository.items/{repo}/{summary_item}", False),
            (world.tenant_a, "OCR Agent", "AI OCR", 1, "OCR: scan.pdf", f"repository.items/{repo}", False),
            # the upload screen OCRs a working copy and saves the file without the _vN suffix
            (world.tenant_a, "OCR Agent", "AI OCR", 1, "OCR: Scan_v3.pdf", "repository.items", False),
            (world.tenant_a, "Intelligent Upload", "DocumentClassification", 1, "Intelligent upload a.pdf", "repository.items", False),
            (world.tenant_a, "AP_AGENT", "po_match", 1, "INV-1", "repository.items", False),  # in ap_credit_ledger already
            (world.tenant_a, "OCR Agent", "AI OCR", 1, "OCR: deleted.pdf", "repository.items", True),  # soft-deleted
            (world.tenant_b, "OCR Agent", "AI OCR", 5, "OCR: other.pdf", "repository.items", False),  # other tenant
        ]
        for tid, act, sub, credit, remarks, identify, deleted in rows:
            await conn.execute(
                f'INSERT INTO dbo."{table}" ("tenantId","activityType","subActivityType","credit","remarks","identifyTable","createdAt","isDeleted") '
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)", (tid, act, sub, credit, remarks, identify, now, deleted))

    # The tenant's own AP ledger, so the report merges both ledgers.
    tenant_db = next(p.split("=")[1] for p in npgsql_to_conninfo(await _tenant_cs(world)).split() if p.startswith("dbname"))
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS public.ap_credit_ledger (id uuid DEFAULT gen_random_uuid(), run_id uuid,
                        tenant_id text, skill_id text, credits int, identify text, status text, created_at timestamptz)""")
        conn.execute("INSERT INTO public.ap_credit_ledger (tenant_id, skill_id, credits, identify, status, created_at) "
                     "VALUES (%s, 'po_match', 1, 'INV-9', 'failed', %s)", (str(world.tenant_a), now))
        # A folder holding the OCR'd and summarized files (a.pdf is in no folder: no link).
        conn.execute("CREATE SCHEMA IF NOT EXISTS repository")
        conn.execute('CREATE TABLE IF NOT EXISTS repository."Repositories" ("Id" uuid, "TenantId" uuid, "Name" text, "ItemsTableName" text, "IsDeleted" boolean)')
        conn.execute("CREATE TABLE IF NOT EXISTS repository.items_c0ffee01 (id uuid, file_name text, created_at_utc timestamptz)")
        conn.execute('INSERT INTO repository."Repositories" VALUES (%s,%s,%s,%s,false)', (repo, world.tenant_a, "Receipts", "items_c0ffee01"))
        conn.execute("INSERT INTO repository.items_c0ffee01 VALUES (%s,'scan.pdf',%s), (%s,'summary.pdf',%s)",
                     (uuid.uuid4(), now, summary_item, now))

    client = await make_client()
    admin = _h(world, world.admin, role="Admin")
    ids = {x["key"]: x["id"] for x in (await client.post("/api/report-agent-v2/defaults/install", headers=admin)).json()["reports"]}
    run = (await client.get(f"/api/report-agent-v2/reports/{ids['ai_credit_consumption']}/execute", headers=admin)).json()
    ap = next(r for r in run["rows"] if r["Request No"] == "INV-9")
    assert ap["Agent"] == "PO Match" and ap["Billing Status"] == "Not charged (billing call failed)"
    billing = {(r["Agent"], r["Request No"]): r for r in run["rows"] if r["Billing Status"] == "Charged"}
    ocr = billing[("OCR Agent", "scan.pdf")]
    assert ocr["Credits"] == 2 and "Runs" not in ocr and ocr["Source"] == "Receipts"
    assert ocr["repositoryId"] == str(repo) and ocr["itemId"]
    summary = billing[("Document Summary", "summary.pdf")]
    assert summary["itemId"] == str(summary_item) and summary["repositoryId"] == str(repo)
    upload = billing[("Intelligent Upload", "a.pdf")]
    assert upload["Credits"] == 1 and upload["itemId"] is None
    assert not any(k[0] == "AP_AGENT" or k[1] in ("deleted.pdf", "other.pdf") for k in billing)
    assert run["totals"]["Credits"] >= 4


async def test_pending_with_lists_open_transaction_assignees(world, make_client):
    """Pending With = users / groups of the request's open transactions (action_status 0, not END), as in their Inbox.
    Runs last: it adds a transaction table, which the other pending-report tests do not expect."""
    tenant_db = next(p.split("=")[1] for p in npgsql_to_conninfo((await _tenant_cs(world))).split() if p.startswith("dbname"))
    group = uuid.uuid4()
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
        inst = conn.execute("SELECT id FROM workflow.workflow_instances_b05ed64d WHERE status IN (0, 1, 2) "
                            "ORDER BY reference_number LIMIT 1").fetchone()[0]
        conn.execute('CREATE TABLE IF NOT EXISTS users."Groups" ("Id" uuid, "Name" text)')
        conn.execute('INSERT INTO users."Groups" VALUES (%s, %s)', (group, "Finance Team"))
        conn.execute("""CREATE TABLE workflow.transaction_b05ed64d (workflow_instance_id uuid, action_status int,
                        activity_user_id uuid, activity_group_id uuid, stage_type text, is_deleted boolean)""")
        conn.execute("INSERT INTO workflow.transaction_b05ed64d VALUES "
                     "(%s, 0, %s, NULL, 'APPROVAL', false), "  # open, a user
                     "(%s, 0, NULL, %s, 'APPROVAL', false), "  # open, a group
                     "(%s, 1, %s, NULL, 'APPROVAL', false), "  # already acted on
                     "(%s, 0, %s, NULL, 'END', false)",        # end stage
                     (inst, world.shared, inst, group, inst, world.outsider, inst, world.admin))
    try:
        client = await make_client()
        admin = _h(world, world.admin, role="Admin")
        ids = {x["key"]: x["id"] for x in (await client.post("/api/report-agent-v2/defaults/install", headers=admin)).json()["reports"]}
        run = (await client.get(f"/api/report-agent-v2/reports/{ids['pending_workflow_requests']}/execute", headers=admin)).json()
        row = next(r for r in run["rows"] if r["instanceId"] == str(inst))
        assert row["Pending With"] == "Finance Team, shared@a.example.com"
        assert row["Raised By"] == "owner@a.example.com"
    finally:
        with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
            conn.execute("DROP TABLE IF EXISTS workflow.transaction_b05ed64d")


async def test_admin_list_installs_missing_default_reports(world, make_client):
    """A new tenant needs no /defaults/install: the first Admin list creates the defaults it never had."""
    from app.report_agent_v2.domain.system_reports import TEMPLATES

    tenant_db = next(p.split("=")[1] for p in npgsql_to_conninfo((await _tenant_cs(world))).split() if p.startswith("dbname"))
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
        conn.execute("""DELETE FROM reporting."ReportAiDefinitions" WHERE "SessionId" LIKE 'default:%%'""")
    client = await make_client()

    # A plain user's list installs nothing (and would not show these private reports anyway).
    user_list = (await client.get("/api/report-agent-v2/reports?kind=default", headers=_h(world, world.owner))).json()
    assert user_list["total"] == 0

    admin = _h(world, world.admin, role="Admin")
    first = (await client.get("/api/report-agent-v2/reports?kind=default", headers=admin)).json()
    assert first["total"] == len(TEMPLATES)
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
        owners = {r[0] for r in conn.execute(
            """SELECT "OwnerUserId" FROM reporting."ReportAiDefinitions" WHERE "SessionId" LIKE 'default:%%'""").fetchall()}
        assert owners == {world.admin}
        # A default deleted on purpose stays deleted.
        conn.execute("""UPDATE reporting."ReportAiDefinitions" SET "IsDeleted" = true WHERE "SessionId" = 'default:ai_credit_consumption'""")
    again = (await client.get("/api/report-agent-v2/reports?kind=default", headers=admin)).json()
    assert again["total"] == len(TEMPLATES) - 1
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
        conn.execute("""UPDATE reporting."ReportAiDefinitions" SET "IsDeleted" = false WHERE "SessionId" = 'default:ai_credit_consumption'""")


async def test_sla_report_lists_each_sla_event(world):
    """One row per SLA timer: request, raised by, stage, result, escalated to (user email or stage name) and
    who was notified (workflow.sla_notification_outbox)."""
    from datetime import date as _date

    from app.report_agent_v2.domain.executor import run_compiled as _run, shape_result as _shape
    from app.report_agent_v2.domain.system_reports import compile_system_report

    tenant_db = next(p.split("=")[1] for p in npgsql_to_conninfo((await _tenant_cs(world))).split() if p.startswith("dbname"))
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
        inst, ref = conn.execute("SELECT id, reference_number FROM workflow.workflow_instances_b05ed64d "
                                 "ORDER BY reference_number LIMIT 1").fetchone()
        conn.execute("ALTER TABLE workflow.workflow_instances_b05ed64d ADD COLUMN IF NOT EXISTS started_by uuid")
        conn.execute("UPDATE workflow.workflow_instances_b05ed64d SET started_by = %s WHERE id = %s", (world.owner, inst))
        conn.execute("""CREATE TABLE workflow.transaction_b05ed64d (id int, stage_name text, activity_id text,
                        workflow_instance_id uuid, action_status int, created_at timestamptz)""")
        conn.execute("INSERT INTO workflow.transaction_b05ed64d VALUES "
                     "(10, 'Finance Approval', 'act-1', %s, 0, now()), "         # the request is waiting here now
                     "(11, 'Manager Review', 'act-2', NULL, 1, now() - interval '1 day')", (inst,))
        conn.execute("""CREATE TABLE workflow.sla_timers (id bigint PRIMARY KEY, workflow_id uuid, workflow_instance_id uuid,
                        scope varchar(16), transaction_id int, rule_id text, status smallint, outcome text,
                        due_at_utc timestamptz, created_at_utc timestamptz)""")
        conn.execute("CREATE TABLE workflow.sla_notification_outbox (id bigint PRIMARY KEY, timer_id bigint, status smallint, address text)")
        rows = [  # (id, scope, transaction, status, outcome, due)
            (1, "response", 10, 1, f"queued 1 email(s); reassigned to {world.shared}", "2026-10-21"),
            (2, "response", 10, 1, "queued 1 email(s); moved to stage act-2", "2026-10-22"),
            (3, "response", 10, 2, "ticket was already acted on", "2026-10-23"),
            (4, "resolution", 0, 0, None, "2026-10-24"),
            (5, "response", 10, 2, "SLA rule was removed", "2026-10-25"),
            (6, "adv-response", 11, 2, "skipped: due 2026-10-26 10:00 UTC, more than 60 min ago", "2026-10-26"),
        ]
        for tid, scope, txid, st, outcome, due in rows:
            conn.execute("INSERT INTO workflow.sla_timers VALUES (%s,%s,%s,%s,%s,'r1',%s,%s,%s,'2026-10-20')",
                         (tid, world.workflow_id, inst, scope, txid, st, outcome, due))
        conn.execute("INSERT INTO workflow.sla_notification_outbox VALUES "
                     "(1,1,1,'owner@a.example.com'), (2,1,2,'shared@a.example.com'), (3,2,1,'owner@a.example.com')")
    try:
        async with await psycopg.AsyncConnection.connect(npgsql_to_conninfo(await _tenant_cs(world)).replace("password=x", f"password={dict(p.split('=', 1) for p in TEST_PG.split()).get('password', 'x')}"), autocommit=True) as aconn:
            compiled = await compile_system_report(aconn, world.tenant_a, "workflow_sla_compliance", as_of=_date(2026, 10, 29), limit=50)
            _, out, _ = _shape(compiled.columns, await _run(aconn, compiled, 30000))
        by_due = {str(r["Due At"])[:10]: r for r in out}
        assert len(out) == 6 and all(r["Request No"] == ref and r["Workflow"] == "Accounts Payable" for r in out)
        reassigned = by_due["2026-10-21"]
        assert reassigned["Result"] == "Breached" and reassigned["Escalated To"] == "shared@a.example.com"
        assert reassigned["Raised By"] == "owner@a.example.com" and reassigned["Stage"] == "Finance Approval"
        assert reassigned["Notified"] == "owner@a.example.com, shared@a.example.com"
        assert (reassigned["Notifications Sent"], reassigned["Notifications Failed"]) == (1, 1)
        assert by_due["2026-10-22"]["Escalated To"] == "Stage: Manager Review"
        assert by_due["2026-10-23"]["Result"] == "Met" and not by_due["2026-10-23"]["Escalated To"]
        resolution = by_due["2026-10-24"]
        # A resolution SLA covers the whole request: its Stage is where the request is now.
        assert (resolution["Result"], resolution["SLA"], resolution["Stage"]) == ("In Progress", "Resolution", "Finance Approval")
        assert by_due["2026-10-25"]["Result"] == "Cancelled"
        late = by_due["2026-10-26"]  # the SLA job reached it too late: skipped, nobody notified
        assert (late["Result"], late["SLA"], late["Stage"]) == ("Skipped (late)", "Response (Advanced)", "Manager Review")
        assert reassigned["instanceId"] == str(inst) and reassigned["workflowId"] == str(world.workflow_id)
        # Detail columns: key filters first, the request's own state, and how late a breach is.
        assert list(out[0])[:5] == ["Workflow", "Request No", "SLA", "Result", "Stage"]
        assert reassigned["Raised On"] and reassigned["Request Status"]
        assert float(reassigned["Overdue By (Hrs)"]) > 0 and by_due["2026-10-23"]["Overdue By (Hrs)"] is None
    finally:
        with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
            for t in ("sla_timers", "sla_notification_outbox", "transaction_b05ed64d"):
                conn.execute(f"DROP TABLE IF EXISTS workflow.{t}")
            conn.execute("ALTER TABLE workflow.workflow_instances_b05ed64d DROP COLUMN IF EXISTS started_by")


async def test_pending_report_sla_and_timing_columns(world):
    """Response SLA = the open step's timers, resolution = the request's; hours left are signed; the open
    step gives Pending Since / With User For; the last completed step gives Last Acted Stage."""
    from datetime import date as _date

    from app.report_agent_v2.domain.executor import run_compiled as _run, shape_result as _shape
    from app.report_agent_v2.domain.system_reports import compile_system_report

    tenant_db = next(p.split("=")[1] for p in npgsql_to_conninfo((await _tenant_cs(world))).split() if p.startswith("dbname"))
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
        inst = conn.execute("SELECT id FROM workflow.workflow_instances_b05ed64d WHERE status IN (0, 1, 2) "
                            "ORDER BY reference_number LIMIT 1").fetchone()[0]
        conn.execute("""CREATE TABLE workflow.transaction_b05ed64d (id int, workflow_instance_id uuid, stage_name text,
                        stage_type text, action_status int, activity_user_id uuid, created_at timestamptz,
                        modified_at timestamptz, is_deleted boolean)""")
        conn.execute("INSERT INTO workflow.transaction_b05ed64d VALUES "
                     "(1, %s, 'Submit', 'START', 1, %s, now() - interval '3 days', now() - interval '3 days', false), "
                     "(2, %s, 'Finance Approval', 'INTERNAL_ACTOR', 0, %s, now() - interval '2 days 5 hours', NULL, false)",
                     (inst, world.owner, inst, world.shared))
        conn.execute("""CREATE TABLE workflow.sla_timers (id bigint PRIMARY KEY, workflow_instance_id uuid, scope varchar(16),
                        transaction_id int, status smallint, outcome text, due_at_utc timestamptz)""")
        conn.execute("INSERT INTO workflow.sla_timers VALUES "
                     "(1, %s, 'response', 2, 1, 'queued 1 email(s); reassigned to x', now() - interval '10 hours'), "
                     "(2, %s, 'resolution', 0, 0, NULL, now() + interval '20 hours')", (inst, inst))
    try:
        async with await psycopg.AsyncConnection.connect(npgsql_to_conninfo(await _tenant_cs(world)).replace("password=x", f"password={dict(p.split('=', 1) for p in TEST_PG.split()).get('password', 'x')}"), autocommit=True) as aconn:
            compiled = await compile_system_report(aconn, world.tenant_a, "pending_workflow_requests", as_of=_date.today(), limit=50)
            _, out, _ = _shape(compiled.columns, await _run(aconn, compiled, 30000))
        row = next(r for r in out if r["instanceId"] == str(inst))
        assert row["Pending With"] == "shared@a.example.com" and row["With User For"] == "2 Days 5 Hours"
        assert row["Last Acted Stage"] == "Submit" and row["First Actioner"] == "shared@a.example.com"
        assert (row["Response Status"], float(row["Response Time (Hrs)"])) == ("Breached", -10)
        assert (row["Resolution Status"], float(row["Resolution Time (Hrs)"])) == ("Within SLA", 20)
        assert row["Escalated"] == "Yes" and row["Priority"] is None
        other = next(r for r in out if r["instanceId"] != str(inst))
        assert other["Response Status"] is None and other["Escalated"] is None  # no SLA on that request
    finally:
        with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
            conn.execute("DROP TABLE IF EXISTS workflow.transaction_b05ed64d")
            conn.execute("DROP TABLE IF EXISTS workflow.sla_timers")


async def test_user_activity_lists_one_users_logins_and_events(world, make_client):
    """The User Login and Security Activity drill-down: one user's logins (newest first, channel, IP,
    device) and the security events the report counts; Admin only, and only for that report."""
    from datetime import datetime as _dt
    from datetime import timedelta as _td
    from datetime import timezone as _tz

    tenant_db = next(p.split("=")[1] for p in npgsql_to_conninfo((await _tenant_cs(world))).split() if p.startswith("dbname"))
    now = _dt.now(_tz.utc)
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS auth")
        conn.execute("CREATE SCHEMA IF NOT EXISTS activitylog")
        conn.execute("""CREATE TABLE auth."LoginHistory" ("Id" uuid, "TenantId" uuid, "Email" text, "LoggedFrom" text,
                        "IpAddress" text, "UserAgent" text, "CreatedAtUtc" timestamptz)""")
        conn.execute("""CREATE TABLE activitylog."EventLogs" ("Id" uuid, "TenantId" uuid, "UserEmail" text, "EventTitle" text,
                        "EventType" text, "Category" text, "Severity" text, "IpAddress" text, "CreatedAtUtc" timestamptz)""")
        chrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
        for at, frm, ip, ua in [(now - _td(hours=1), "WEB", "10.0.0.1", chrome), (now - _td(days=2), "MOBILE", "10.0.0.2", "EZOFIS/1.4"),
                                (now - _td(days=40), "WEB", "10.0.0.3", chrome)]:  # outside the 30-day window
            conn.execute('INSERT INTO auth."LoginHistory" VALUES (%s,%s,%s,%s,%s,%s,%s)',
                         (uuid.uuid4(), world.tenant_a, "Owner@A.example.com", frm, ip, ua, at))
        conn.execute('INSERT INTO auth."LoginHistory" VALUES (%s,%s,%s,%s,%s,%s,%s)',
                     (uuid.uuid4(), world.tenant_a, "shared@a.example.com", "WEB", "10.9.9.9", chrome, now))
        for title, etype, cat, sev in [("Password changed", "Password Changed", "Security", "Info"),
                                       ("Role updated", "Permission Changed", "Admin", "Info"),
                                       ("Report viewed", "Viewed", "Report", "Info")]:  # not a counted event
            conn.execute('INSERT INTO activitylog."EventLogs" VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                         (uuid.uuid4(), world.tenant_a, "owner@a.example.com", title, etype, cat, sev, "10.0.0.1", now))
    try:
        client = await make_client()
        admin = _h(world, world.admin, role="Admin")
        ids = {x["key"]: x["id"] for x in (await client.post("/api/report-agent-v2/defaults/install", headers=admin)).json()["reports"]}
        url = f"/api/report-agent-v2/reports/{ids['user_login_security']}/user-activity"
        body = (await client.get(url, params={"email": "owner@a.example.com"}, headers=admin)).json()
        assert [(x["channel"], x["device"]) for x in body["logins"]] == [
            ("Web", "Chrome on Windows"), ("Mobile", "EZOFIS/1.4")]
        assert sorted(e["event"] for e in body["events"]) == ["Password changed", "Role updated"]
        # IP addresses are not shown (nor sent); the export asks for every action as well.
        assert not any("ip" in x for x in body["logins"] + body["events"]) and "actions" not in body
        export = (await client.get(url, params={"email": "owner@a.example.com", "includeActions": "true"}, headers=admin)).json()
        assert sorted(a["event"] for a in export["actions"]) == ["Password changed", "Report viewed", "Role updated"]
        # Admin only, and only behind the login report.
        user = await client.get(url, params={"email": "owner@a.example.com"}, headers=_h(world, world.owner))
        assert user.status_code == 403
        other = await client.get(f"/api/report-agent-v2/reports/{ids['ai_credit_consumption']}/user-activity",
                                 params={"email": "owner@a.example.com"}, headers=admin)
        assert other.status_code == 404
    finally:
        with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
            conn.execute('DROP TABLE IF EXISTS auth."LoginHistory"')
            conn.execute('DROP TABLE IF EXISTS activitylog."EventLogs"')


async def test_user_session_lists_actions_until_the_next_login(world, make_client):
    """A login session's activity: every activity-log entry from that login until the user's next login."""
    from datetime import datetime as _dt
    from datetime import timedelta as _td
    from datetime import timezone as _tz

    tenant_db = next(p.split("=")[1] for p in npgsql_to_conninfo((await _tenant_cs(world))).split() if p.startswith("dbname"))
    t0 = _dt.now(_tz.utc).replace(microsecond=0) - _td(hours=5)
    with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS auth")
        conn.execute("CREATE SCHEMA IF NOT EXISTS activitylog")
        conn.execute("""CREATE TABLE auth."LoginHistory" ("Id" uuid, "TenantId" uuid, "Email" text, "LoggedFrom" text,
                        "IpAddress" text, "UserAgent" text, "CreatedAtUtc" timestamptz)""")
        conn.execute("""CREATE TABLE activitylog."EventLogs" ("Id" uuid, "TenantId" uuid, "UserEmail" text, "EventTitle" text,
                        "EventType" text, "Category" text, "Severity" text, "IpAddress" text, "HttpMethod" text, "Path" text,
                        "StatusCode" int, "CreatedAtUtc" timestamptz)""")
        for at in (t0, t0 + _td(hours=2)):  # the second login ends the first session
            conn.execute('INSERT INTO auth."LoginHistory" VALUES (%s,%s,%s,%s,%s,%s,%s)',
                         (uuid.uuid4(), world.tenant_a, "owner@a.example.com", "WEB", "10.0.0.1", "x", at))
        for mins, title in ((65, "Approved REQ-2"), (10, "Opened Requests"), (150, "Next session")):
            conn.execute('INSERT INTO activitylog."EventLogs" VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                         (uuid.uuid4(), world.tenant_a, "owner@a.example.com", title, "Action", "Workflow", "Info",
                          "10.0.0.1", "POST", "/api/workflows", 200, t0 + _td(minutes=mins)))
    try:
        client = await make_client()
        admin = _h(world, world.admin, role="Admin")
        ids = {x["key"]: x["id"] for x in (await client.post("/api/report-agent-v2/defaults/install", headers=admin)).json()["reports"]}
        url = f"/api/report-agent-v2/reports/{ids['user_login_security']}/user-session"
        body = (await client.get(url, params={"email": "owner@a.example.com", "loginAt": t0.isoformat()}, headers=admin)).json()
        assert [a["event"] for a in body["actions"]] == ["Opened Requests", "Approved REQ-2"]
        assert body["actions"][0]["method"] == "POST" and body["actions"][0]["path"] == "/api/workflows"
        assert body["until"].startswith((t0 + _td(hours=2)).isoformat()[:19])
        user = await client.get(url, params={"email": "owner@a.example.com", "loginAt": t0.isoformat()}, headers=_h(world, world.owner))
        assert user.status_code == 403
    finally:
        with psycopg.connect(f"{TEST_PG} dbname={tenant_db}", autocommit=True) as conn:
            conn.execute('DROP TABLE IF EXISTS auth."LoginHistory"')
            conn.execute('DROP TABLE IF EXISTS activitylog."EventLogs"')


"""Test fixtures.

Integration tests need a disposable PostgreSQL server where the test may create databases:
    set REPORT_AGENT_TEST_PG=host=127.0.0.1 port=55432 user=postgres
They are skipped when it is not set. Unit tests always run.
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

import jwt
import psycopg
import pytest

ROOT = Path(__file__).resolve().parent  # tests/report_agent_v2
MODULE = Path(__file__).resolve().parents[2] / "app" / "report_agent_v2"
SIGNING_KEY = "test-signing-key-0123456789-abcdefghijklmnop"

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

os.environ.setdefault("REPORT_AGENT_CATALOG_CONNECTION_STRING", "Host=127.0.0.1;Database=unused")
os.environ.setdefault("REPORT_AGENT_EZOFIS_AUTH_SIGNING_KEY", SIGNING_KEY)


def make_token(sub: uuid.UUID, tid: uuid.UUID | None, role: str = "TenantUser", email: str = "u@example.com",
               key: str = SIGNING_KEY, **overrides) -> str:
    claims = {"sub": str(sub), "email": email, "name": "Test", "role": role, "iss": "Ezofis", "aud": "Ezofis",
              "exp": int(time.time()) + 3600}
    if tid:
        claims["tid"] = str(tid)
    claims.update(overrides)
    return jwt.encode(claims, key, algorithm="HS256")


@dataclass
class World:
    catalog_cs: str
    tenant_a: uuid.UUID
    tenant_b: uuid.UUID
    owner: uuid.UUID
    shared: uuid.UUID
    outsider: uuid.UUID
    admin: uuid.UUID
    user_b: uuid.UUID
    workflow_id: uuid.UUID


TEST_PG = os.getenv("REPORT_AGENT_TEST_PG")
WF_ID = uuid.UUID("b05ed64d-7c94-4ecd-a5b0-caa5839757f9")
FORM_ID = "8aaadcde-f2f9-4c1e-9d6e-111111111111"


def _admin(dbname: str = "postgres") -> psycopg.Connection:
    return psycopg.connect(f"{TEST_PG} dbname={dbname}", autocommit=True)


def _seed_tenant(dbname: str, tenant_id: uuid.UUID, users: list[tuple[uuid.UUID, str, str]], with_ap: bool) -> None:
    with _admin(dbname) as conn:
        conn.execute((ROOT / "fixtures/v6_schema.sql").read_text())
        conn.execute((MODULE / "migrations/001_report_agent_tables.sql").read_text())
        for uid, email, role in users:
            conn.execute('INSERT INTO users."Users" VALUES (%s,%s,%s,%s,%s,false)', (uid, tenant_id, email, email, role))
        if not with_ap:
            conn.execute('INSERT INTO workflow."Workflows" VALUES (%s,%s,%s,NULL,%s,false)', (WF_ID, tenant_id, "Accounts Payable", FORM_ID))
            return
        conn.execute('INSERT INTO workflow."Workflows" VALUES (%s,%s,%s,%s,%s,false)', (WF_ID, tenant_id, "Accounts Payable", "AP invoices", FORM_ID))
        conn.execute('INSERT INTO dbo."wForm" VALUES (%s,%s,%s,false)', (FORM_ID, "Accounts Payable Form", "Workflow"))
        controls = [
            ("invoiceNo", "Invoice No", "SHORT_TEXT", "Invoice_No"),
            ("supplier", "Supplier", "SHORT_TEXT", None),          # resolves by exact label
            ("aB3xY9", "Invoice Amount", "CURRENCY", None),         # resolves by sanitized label
            ("paid1", "Paid Amount", "NUMBER", None),
            ("due1", "Due Date", "DATE", None),
            ("invdt", "Invoice Date", "DATE", None),
            ("sec1", "Header", "LABEL", None),                      # layout control: no column -> dropped
        ]
        for json_id, name, ctype, col in controls:
            conn.execute(
                'INSERT INTO dbo."wFormControl" ("wFormId","jsonId",name,type,"columnName") VALUES (%s,%s,%s,%s,%s)',
                (FORM_ID, json_id, name, ctype, col),
            )
        # (invoice, supplier, amount, paid, due, deleted, in_workflow, wf_status)
        rows = [
            ("INV-1", "Acme", "12,500.00", "2500", "2026-10-15", False, True, 1),
            ("INV-2", "Acme", "5000", None, "2026-08-20", False, True, 1),
            ("INV-3", "Beta", "8000", "8000", "2026-06-01", False, True, 3),
            ("INV-4", "Beta", "3000", "", "2026-05-01", False, True, 1),
            ("INV-5", "Beta", "1200", None, "2026-02-30", False, True, 1),   # impossible date -> clamped
            ("INV-6", "Beta", "N/A", None, "2026-01-01", False, True, 1),     # non-numeric amount
            ("INV-7", "Gamma", "4000", None, "2026-09-15", True, True, 1),    # soft-deleted
            ("INV-8", "Gamma", "700", None, "15/09/2026", False, True, 0),    # dd/mm/yyyy
            ("INV-9", "Gamma", "999", None, "2026-09-15", False, False, 0),   # draft: not in workflow
        ]
        for i, (inv, sup, amt, paid, due, deleted, in_wf, wf_status) in enumerate(rows):
            entry = uuid.uuid4()
            conn.execute(
                'INSERT INTO dbo."ezfb_8aaadcde_items" (item_id,"Invoice_No","Supplier","Invoice_Amount","Paid_Amount","Due_Date","Invoice_Date",is_deleted) '
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (entry, inv, sup, amt, paid, due, "2026-01-01", deleted),
            )
            if in_wf:
                inst = uuid.uuid4()
                conn.execute(
                    "INSERT INTO workflow.workflow_instances_b05ed64d (id,tenant_id,workflow_id,workflow_name,status,reference_number) VALUES (%s,%s,%s,%s,%s,%s)",
                    (inst, tenant_id, WF_ID, "Accounts Payable", wf_status, f"AP-{i:04d}"),
                )
                conn.execute(
                    "INSERT INTO workflow.process_form_b05ed64d (workflow_instance_id,w_form_id,form_entry_id,created_by) VALUES (%s,%s,%s,%s)",
                    (inst, FORM_ID, entry, users[0][0]),
                )
                conn.execute(
                    "INSERT INTO workflow.inbox_b05ed64d (form_entry_id,workflow_instance_id,stage,created_by_name) VALUES (%s,%s,%s,%s)",
                    (str(entry), str(inst), "Finance Approval" if wf_status != 3 else "Paid", "Kenneth"),
                )


@pytest.fixture(scope="session")
def world() -> World:
    if not TEST_PG:
        pytest.skip("REPORT_AGENT_TEST_PG not set")
    suffix = uuid.uuid4().hex[:8]
    names = {k: f"rt_{k}_{suffix}" for k in ("catalog", "tenant_a", "tenant_b")}
    with _admin() as conn:
        for name in names.values():
            conn.execute(f'CREATE DATABASE "{name}"')

    w = World(
        catalog_cs="", tenant_a=uuid.uuid4(), tenant_b=uuid.uuid4(), owner=uuid.uuid4(), shared=uuid.uuid4(),
        outsider=uuid.uuid4(), admin=uuid.uuid4(), user_b=uuid.uuid4(), workflow_id=WF_ID,
    )
    host = dict(p.split("=", 1) for p in TEST_PG.split())

    def npgsql(db: str) -> str:
        return f"Host={host['host']};Port={host.get('port', 5432)};Database={db};Username={host.get('user', 'postgres')};Password={host.get('password', 'x')};Pooling=true;Maximum Pool Size=20"

    w.catalog_cs = npgsql(names["catalog"])
    _seed_tenant(names["tenant_a"], w.tenant_a, [
        (w.owner, "owner@a.example.com", "TenantUser"), (w.shared, "shared@a.example.com", "TenantUser"),
        (w.outsider, "outsider@a.example.com", "TenantUser"), (w.admin, "admin@a.example.com", "Admin"),
    ], with_ap=True)
    _seed_tenant(names["tenant_b"], w.tenant_b, [(w.user_b, "user@b.example.com", "TenantUser")], with_ap=False)
    with _admin(names["catalog"]) as conn:
        conn.execute("CREATE SCHEMA catalog")
        conn.execute('CREATE TABLE catalog."Tenants" ("Id" uuid PRIMARY KEY, "Name" text, "ConnectionString" text, "IsActive" boolean)')
        conn.execute('CREATE TABLE catalog."UserTenants" ("Id" uuid PRIMARY KEY, "Email" text, "TenantId" uuid, "Role" text, "UserId" uuid)')
        conn.execute('INSERT INTO catalog."Tenants" VALUES (%s,%s,%s,true),(%s,%s,%s,true)',
                     (w.tenant_a, "Tenant A", npgsql(names["tenant_a"]), w.tenant_b, "Tenant B", npgsql(names["tenant_b"])))
        for uid, email, tid in [(w.owner, "owner@a.example.com", w.tenant_a), (w.shared, "shared@a.example.com", w.tenant_a),
                                (w.outsider, "outsider@a.example.com", w.tenant_a), (w.admin, "admin@a.example.com", w.tenant_a),
                                (w.user_b, "user@b.example.com", w.tenant_b)]:
            conn.execute('INSERT INTO catalog."UserTenants" VALUES (%s,%s,%s,%s,%s)', (uuid.uuid4(), email, tid, "TenantUser", uid))
    yield w
    with _admin() as conn:
        for name in names.values():
            conn.execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')

from __future__ import annotations

import secrets
import time
import uuid

import jwt
import pytest

from app.report_agent_v2.config import Settings
from app.report_agent_v2.db.connstr import npgsql_to_conninfo
from app.report_agent_v2.domain import naming
from app.report_agent_v2.domain.compiler import SpecValidationError, compile_spec
from app.report_agent_v2.domain.source_catalog import FieldDef, SourceCatalog
from app.report_agent_v2.domain.spec import ReportSpec
from app.report_agent_v2.errors import UnauthorizedError
from app.report_agent_v2.security.jwt_validator import JwtValidator
from tests.report_agent_v2.conftest import SIGNING_KEY, make_token


# --- connection strings ------------------------------------------------------------------------

def test_npgsql_connection_string_is_translated_and_credentials_overridden():
    # Random per run, so the repo holds nothing that looks like a credential.
    stored, runtime = secrets.token_hex(8), secrets.token_hex(8)
    info = npgsql_to_conninfo(
        f"Host=db.example.com;Port=5432;Database=SaaSApp_Tenant_01;Username=owner;Password={stored};"
        "SSL Mode=Require;Trust Server Certificate=true;Maximum Pool Size=20;Command Timeout=0",
        username="report_agent_rt", password=runtime,
    )
    assert "host=db.example.com" in info and "dbname=SaaSApp_Tenant_01" in info
    assert "user=report_agent_rt" in info and f"password={runtime}" in info
    assert "sslmode=require" in info
    assert "owner" not in info and stored not in info and "Pool" not in info


# --- naming (ported from EzfbColumnNaming / FormIdNaming) -------------------------------------

def test_ezfb_naming_matches_dotnet():
    assert naming.ezfb_items_table("8AAADCDE-f2f9-4c1e-9d6e-111111111111") == "ezfb_8aaadcde_items"
    assert naming.label_to_column("PO Number") == "PO_Number"
    assert naming.label_to_column("G/L Account") == "GL_Account"
    assert naming.label_to_column("2nd Approver") == "F_2nd_Approver"
    physical = {"Invoice_Amount", "lineitem", "a1b2c3", "F_9x"}
    assert naming.resolve_ezfb_column(None, "Invoice Amount", "zz", physical) == "Invoice_Amount"
    assert naming.resolve_ezfb_column(None, "Line Item", None, physical) == "lineitem"
    assert naming.resolve_ezfb_column(None, None, "a1b2c3", physical) == "a1b2c3"
    assert naming.resolve_ezfb_column(None, None, "9x", physical) == "F_9x"
    assert naming.resolve_ezfb_column(None, "Missing", "nope", physical) is None


# --- JWT -------------------------------------------------------------------------------------------

@pytest.fixture
def validator() -> JwtValidator:
    return JwtValidator(Settings(REPORT_AGENT_CATALOG_CONNECTION_STRING="x", REPORT_AGENT_EZOFIS_AUTH_SIGNING_KEY=SIGNING_KEY))


async def test_valid_ezofis_token(validator):
    scheme, claims = await validator.validate(make_token(uuid.uuid4(), uuid.uuid4()))
    assert scheme == "Ezofis" and claims["role"] == "TenantUser"


@pytest.mark.parametrize(
    "token_factory, message",
    [
        (lambda: make_token(uuid.uuid4(), None, key="another-signing-key-0123456789-abcdefgh"), "Invalid"),
        (lambda: make_token(uuid.uuid4(), None, exp=int(time.time()) - 3600), "expired"),
        (lambda: make_token(uuid.uuid4(), None, aud="SomeoneElse"), "Invalid"),
        (lambda: make_token(uuid.uuid4(), None, iss="Evil"), "issuer"),
        (lambda: jwt.encode({"sub": "x", "iss": "Ezofis", "aud": "Ezofis", "exp": int(time.time()) + 60}, None, algorithm="none"), "algorithm"),
        (lambda: "not-a-jwt", "Malformed"),
    ],
)
async def test_rejected_tokens(validator, token_factory, message):
    with pytest.raises(UnauthorizedError, match=message):
        await validator.validate(token_factory())


async def test_token_without_exp_is_rejected(validator):
    token = jwt.encode({"sub": "x", "iss": "Ezofis", "aud": "Ezofis"}, SIGNING_KEY, algorithm="HS256")
    with pytest.raises(UnauthorizedError):
        await validator.validate(token)


# --- compiler --------------------------------------------------------------------------------------

def _catalog() -> SourceCatalog:
    c = SourceCatalog(
        source_type="Workflow", source_id=uuid.uuid4(), source_name="AP", items_schema="dbo",
        items_table="ezfb_8aaadcde_items", items_columns={"item_id": "uuid", "Supplier": "text", "Amount": "text", "is_deleted": "boolean"},
    )
    c.fields["supplier"] = FieldDef("supplier", "Supplier", "form", "text", "e", column="Supplier", pg_type="text")
    c.fields["amt"] = FieldDef("amt", "Amount", "form", "number", "e", column="Amount", pg_type="text")
    return c


def _spec(**kw) -> ReportSpec:
    base = {"title": "t", "description": "d", "columns": [{"ref": "supplier", "label": "Supplier"}]}
    base.update(kw)
    return ReportSpec.model_validate(base)


def test_values_are_bound_never_inlined():
    hostile = "x'); DROP TABLE users.\"Users\"; --"
    compiled = compile_spec(_spec(filters=[{"ref": "supplier", "op": "equals", "value": hostile, "values": []}]), _catalog(), max_rows=100)
    text = compiled.query.as_string(None)
    assert "DROP TABLE" not in text
    assert hostile.lower() in compiled.params.values()
    assert text.startswith("SELECT ") and "LIMIT 100" in text


def test_unknown_reference_and_injection_like_ids_are_rejected():
    with pytest.raises(SpecValidationError) as err:
        compile_spec(_spec(columns=[{"ref": 'e."Supplier"; --', "label": "x"}]), _catalog(), max_rows=10)
    assert "unknown reference" in err.value.errors[0]
    with pytest.raises(SpecValidationError):
        compile_spec(
            _spec(derived=[{"id": "bad id;", "label": "x", "dataType": "number", "op": "add",
                            "args": [{"ref": "amt"}, {"number": 1}]}]),
            _catalog(), max_rows=10,
        )


def test_grouped_report_requires_columns_in_group_by():
    spec = _spec(
        measures=[{"id": "total", "label": "Total", "fn": "sum", "of": "amt", "where": []}],
        columns=[{"ref": "supplier", "label": "Supplier"}, {"ref": "total", "label": "Total"}],
    )
    with pytest.raises(SpecValidationError, match="groupBy"):
        compile_spec(spec, _catalog(), max_rows=10)
    ok = compile_spec(spec.model_copy(update={"group_by": ["supplier"]}), _catalog(), max_rows=10)
    assert "GROUP BY" in ok.query.as_string(None)


def test_limit_is_capped_by_max_rows():
    compiled = compile_spec(_spec(limit=1_000_000), _catalog(), max_rows=500)
    assert "LIMIT 500" in compiled.query.as_string(None)


_NULL_ARG = {"ref": None, "number": None, "text": None}


def _aging_catalog() -> SourceCatalog:
    c = _catalog()
    c.items_columns["Due"] = "text"
    c.fields["due"] = FieldDef("due", "Due Date", "form", "date", "e", column="Due", pg_type="text")
    return c


def test_null_placeholder_args_are_ignored():
    spec = _spec(
        derived=[
            {"id": "age", "label": "Age", "dataType": "number", "op": "days_since",
             "args": [{"ref": "due", "number": None, "text": None}, _NULL_ARG, _NULL_ARG]},
            {"id": "bkt", "label": "Bucket", "dataType": "text", "op": "bucket",
             "args": [{"ref": "age", "number": None, "text": None}, _NULL_ARG], "edges": [0, 30], "labels": ["Current", "1-30", "30+"]},
        ],
        columns=[{"ref": "supplier", "label": "Supplier"}, {"ref": "bkt", "label": "Bucket"}],
    )
    compiled = compile_spec(spec, _aging_catalog(), max_rows=10)
    assert "CASE WHEN" in compiled.query.as_string(None)


def test_bucket_leading_zero_edge_with_zero_based_labels_is_realigned():
    spec = _spec(
        derived=[
            {"id": "age", "label": "Age", "dataType": "number", "op": "days_since", "args": [{"ref": "due"}]},
            {"id": "bkt", "label": "Bucket", "dataType": "text", "op": "bucket", "args": [{"ref": "age"}],
             "edges": [0, 30, 60], "labels": ["0-30", "31-60", "60+"]},
        ],
        columns=[{"ref": "bkt", "label": "Bucket"}],
    )
    compiled = compile_spec(spec, _aging_catalog(), max_rows=10)
    assert "60+" in compiled.params.values()
    assert any("leading 0 edge" in w for w in compiled.warnings)
    # Labels that do not start at 0 still need len(edges) + 1 entries.
    bad = spec.model_copy(update={"derived": [spec.derived[0], spec.derived[1].model_copy(update={"labels": ["Current", "1-30", "31-60"]})]})
    with pytest.raises(SpecValidationError, match="len\(edges\) \+ 1"):
        compile_spec(bad, _aging_catalog(), max_rows=10)


def test_errors_report_root_causes_without_cascade():
    spec = _spec(
        derived=[{"id": "age", "label": "Age", "dataType": "number", "op": "days_since", "args": [{"ref": "due"}, {"ref": "due"}]}],
        group_by=["supplier"],
        measures=[{"id": "m1", "label": "M1", "fn": "sum", "of": "amt", "where": [{"ref": "age", "op": "gt", "value": "30", "values": []}]},
                  {"id": "m2", "label": "M2", "fn": "sum", "of": "amt", "where": [{"ref": "age", "op": "gt", "value": "60", "values": []}]}],
        columns=[{"ref": "supplier", "label": "Supplier"}, {"ref": "m1", "label": "M1"}, {"ref": "m2", "label": "M2"}],
        order_by=[{"ref": "m1", "direction": "desc"}],
    )
    with pytest.raises(SpecValidationError) as err:
        compile_spec(spec, _aging_catalog(), max_rows=10)
    assert err.value.errors == ["derived 'age': days_since takes exactly one date argument."]


def test_date_part_groups_by_month():
    spec = _spec(
        derived=[{"id": "month", "label": "Month", "dataType": "text", "op": "date_part",
                  "args": [{"ref": "due"}, {"text": "month"}]}],
        group_by=["month"],
        measures=[{"id": "n", "label": "Count", "fn": "count", "of": None, "where": []}],
        columns=[{"ref": "month", "label": "Month"}, {"ref": "n", "label": "Count"}],
        order_by=[{"ref": "month", "direction": "asc"}],
    )
    text = compile_spec(spec, _aging_catalog(), max_rows=10).query.as_string(None)
    assert "to_char(" in text and "'YYYY-MM'" in text and "GROUP BY" in text
    bad = spec.model_copy(update={"derived": [spec.derived[0].model_copy(update={"args": [spec.derived[0].args[0]]})]})
    with pytest.raises(SpecValidationError, match="date_part takes a date"):
        compile_spec(bad, _aging_catalog(), max_rows=10)


def test_filters_without_a_stated_value_are_dropped():
    from app.report_agent_v2.agents.definition_agent import _user_filters_only

    labels = {"sys.request_raised_at": "Created At", "sys.current_stage": "Stage", "unit": "Company Unit",
              "sys.request_status": "Status", "brand": "Brand"}
    prompt = ("Show active requests with brand Acme in the last 30 days. "
              "Filter by Created At, Stage and Company Unit. Sort by Created At.")
    raw = {"filters": [
        {"ref": "sys.request_raised_at", "op": "equals", "value": None, "values": []},  # "filter by": control only
        {"ref": "sys.current_stage", "op": "equals", "value": "Management", "values": []},  # guessed value
        {"ref": "unit", "op": "in", "value": None, "values": ["North", "South"]},  # guessed values
        {"ref": "sys.request_status", "op": "notIn", "value": None, "values": ["Completed"]},  # read from "active"
        {"ref": "brand", "op": "equals", "value": "Acme", "values": []},  # stated
        {"ref": "sys.request_raised_at", "op": "gte", "value": "today-30", "values": []},  # stated range
        {"ref": "brand", "op": "isNotEmpty", "value": None, "values": []},
    ]}
    _user_filters_only(raw, prompt, labels)
    assert [(f["ref"], f["op"], f["value"], f["values"]) for f in raw["filters"]] == [
        ("sys.request_status", "notIn", None, ["Completed"]),
        ("brand", "equals", "Acme", []),
        ("sys.request_raised_at", "gte", "today-30", []),
        ("brand", "isNotEmpty", None, []),
    ]


def test_guessed_date_on_a_filter_by_field_is_dropped():
    from app.report_agent_v2.agents.definition_agent import _user_filters_only

    labels = {"sys.request_raised_at": "Created At", "amount": "Amount"}
    guessed = {"ref": "sys.request_raised_at", "op": "gte", "value": "today-30", "values": []}
    # "Filter by Created At" states no period: the model's default window is a guess.
    raw = {"filters": [dict(guessed), {"ref": "amount", "op": "gt", "value": "500", "values": []}]}
    _user_filters_only(raw, "Show all requests. Filter by Created At and Amount.", labels)
    assert raw["filters"] == []
    # A stated period keeps the date the model wrote for it; a stated number keeps its filter.
    raw = {"filters": [dict(guessed), {"ref": "amount", "op": "gt", "value": "500", "values": []}]}
    _user_filters_only(raw, "Requests from the last 30 days over 500. Filter by Created At and Amount.", labels)
    assert [f["value"] for f in raw["filters"]] == ["today-30", "500"]

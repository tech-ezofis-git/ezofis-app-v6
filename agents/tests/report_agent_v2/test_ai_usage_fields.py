"""AI usage columns (ai.agent_request_logs) in Report Agent v2: catalog fields and compiled SQL."""
import uuid

from app.report_agent_v2.agents.definition_agent import with_ticket_columns
from app.report_agent_v2.domain import source_catalog
from app.report_agent_v2.domain.compiler import compile_spec
from app.report_agent_v2.domain.source_catalog import AI_USAGE_FIELDS, FieldDef, SourceCatalog
from app.report_agent_v2.domain.spec import ReportSpec

TENANT = uuid.UUID("74fcf357-5fc9-49a4-816e-2df7dc5bd9cb")
LOG_COLUMNS = {c: "text" for c in ("tenant_id", "instance_id", "form_entry_id", "repository_item_id", "started_at_utc")}


def _workflow(process_form: bool = True) -> SourceCatalog:
    c = SourceCatalog(
        source_type="Workflow", source_id=uuid.uuid4(), source_name="AP", items_schema="dbo",
        items_table="ezfb_8aaadcde_items", items_columns={"item_id": "uuid", "Supplier": "text"},
    )
    if process_form:
        c.process_form_table = "process_form_8aaadcde"
        c.process_form_columns = {"form_entry_id": "uuid", "workflow_instance_id": "uuid"}
    c.fields["supplier"] = FieldDef("supplier", "Supplier", "form", "text", "e", column="Supplier", pg_type="text")
    return c


def _folder() -> SourceCatalog:
    c = SourceCatalog(
        source_type="Folder", source_id=uuid.uuid4(), source_name="Invoices", items_schema="repository",
        items_table="items_38b1b6dd", items_columns={"id": "uuid", "Vendor": "text"},
    )
    c.fields["Vendor"] = FieldDef("Vendor", "Vendor", "form", "text", "e", column="Vendor", pg_type="text")
    return c


def _spec(*refs: str) -> ReportSpec:
    return ReportSpec.model_validate(
        {"title": "t", "description": "d", "columns": [{"ref": r, "label": r} for r in refs]}
    )


async def _with_ai_fields(catalog: SourceCatalog, monkeypatch, columns=LOG_COLUMNS) -> SourceCatalog:
    async def fake_columns(conn, schema, table):
        return dict(columns) if (schema, table) == ("ai", "agent_request_logs") else {}

    monkeypatch.setattr(source_catalog, "_columns", fake_columns)
    await source_catalog._add_ai_usage_fields(None, catalog, TENANT)
    return catalog


async def test_ai_fields_are_offered_when_the_log_table_exists(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    assert c.has_ai_log and c.tenant_id == TENANT
    labels = [c.fields[fid].label for fid, *_ in AI_USAGE_FIELDS]
    assert labels == ["AI Agent", "AI Model", "Burgr Suggested Model", "AI Status", "AI Duration (s)",
                      "AI Tokens", "AI Cost (USD)", "AI Credits", "AI Runs"]
    assert {f["label"] for f in c.llm_view()} >= set(labels)


async def test_no_ai_fields_without_the_log_table(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch, columns={})
    assert not c.has_ai_log
    assert not any(fid.startswith("sys.ai_") for fid in c.fields)


async def test_ticket_report_joins_log_summary_on_instance(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    compiled = compile_spec(_spec("supplier", "sys.ai_model", "sys.ai_cost", "sys.ai_runs"), c, max_rows=100)
    text = compiled.query.as_string(None)
    assert "LEFT JOIN LATERAL" in text and "ai.agent_request_logs al0" in text
    assert "(al0.instance_id)::text = (pf.workflow_instance_id)::text" in text
    assert "al.model_used" in text and "ROUND((al.cost_usd)::numeric, 6)" in text
    assert str(TENANT) in compiled.params.values()  # tenant is a bind parameter


async def test_form_only_workflow_joins_on_form_entry(monkeypatch):
    c = await _with_ai_fields(_workflow(process_form=False), monkeypatch)
    text = compile_spec(_spec("supplier", "sys.ai_status"), c, max_rows=100).query.as_string(None)
    assert "al0.form_entry_id = (e.item_id)::text" in text


async def test_folder_report_joins_on_file_item(monkeypatch):
    c = await _with_ai_fields(_folder(), monkeypatch)
    text = compile_spec(_spec("Vendor", "sys.ai_agent"), c, max_rows=100).query.as_string(None)
    assert "al0.repository_item_id = (e.id)::text" in text


AI_DEFAULT_LABELS = ["AI Agent", "AI Model", "Burgr Suggested Model", "AI Status", "AI Duration (s)",
                     "AI Tokens", "AI Cost (USD)", "AI Credits", "AI Runs"]


def _grouped() -> ReportSpec:
    return ReportSpec.model_validate({
        "title": "t", "description": "d", "groupBy": ["supplier"],
        "measures": [{"id": "n", "fn": "count", "label": "Count"}],
        "columns": [{"ref": "supplier", "label": "Supplier"}, {"ref": "n", "label": "Count"}],
    })


async def test_all_ai_columns_are_added_last_to_list_reports(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    spec = with_ticket_columns(_spec("supplier"), c)
    labels = [col.label for col in spec.columns]
    assert labels[0] == "supplier" and labels[-9:] == AI_DEFAULT_LABELS
    assert "agent_request_logs" in compile_spec(spec, c, max_rows=100).query.as_string(None)


async def test_ai_defaults_on_folder_reports(monkeypatch):
    c = await _with_ai_fields(_folder(), monkeypatch)
    assert [col.label for col in with_ticket_columns(_spec("Vendor"), c).columns] == ["Vendor", *AI_DEFAULT_LABELS]


async def test_grouped_prompts_become_one_row_per_request(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    c.fields["sys.request_no"] = FieldDef("sys.request_no", "Request No", "system", "text", "e", column="Supplier", pg_type="text")
    c.fields["sys.current_stage"] = FieldDef("sys.current_stage", "Stage", "system", "text", "e", column="Supplier", pg_type="text")
    spec = with_ticket_columns(_grouped(), c)
    assert not spec.group_by and not spec.measures
    assert [col.label for col in spec.columns] == ["Request No", "Supplier", "Stage", *AI_DEFAULT_LABELS]
    assert [o.ref for o in spec.order_by] == ["supplier"]  # same supplier rows stay together
    compiled = compile_spec(spec, c, max_rows=100)
    text = compiled.query.as_string(None)
    assert "GROUP BY" not in text and "STRING_AGG" not in text
    assert not any(col.total for col in compiled.columns)  # no AI Totals row
    assert with_ticket_columns(spec, c) == spec  # idempotent


async def test_measure_filters_and_sorts_are_dropped(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    grouped = ReportSpec.model_validate({
        "title": "t", "description": "d", "groupBy": ["supplier"],
        "measures": [{"id": "n", "fn": "count", "label": "Count"}],
        "filters": [{"ref": "n", "op": "gt", "value": "1"}, {"ref": "supplier", "op": "isNotEmpty"}],
        "orderBy": [{"ref": "n", "direction": "desc"}],
        "columns": [{"ref": "supplier", "label": "Supplier"}, {"ref": "n", "label": "Count"}],
    })
    spec = with_ticket_columns(grouped, c)
    assert [f.ref for f in spec.filters] == ["supplier"]
    assert [o.ref for o in spec.order_by] == ["supplier"]
    compile_spec(spec, c, max_rows=100)


async def test_no_ai_defaults_without_the_log_table(monkeypatch):
    plain = await _with_ai_fields(_workflow(), monkeypatch, columns={})
    assert not any(col.ref.startswith("sys.ai_") for col in with_ticket_columns(_spec("supplier"), plain).columns)
    assert [col.label for col in with_ticket_columns(_grouped(), plain).columns] == ["Supplier"]


async def test_ai_columns_already_in_the_report_are_not_repeated(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    refs = [col.ref for col in with_ticket_columns(_spec("supplier", "sys.ai_model"), c).columns]
    assert refs.count("sys.ai_model") == 1


async def test_reports_without_ai_columns_do_not_join_the_log(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    text = compile_spec(_spec("supplier"), c, max_rows=100).query.as_string(None)
    assert "agent_request_logs" not in text


# -- Refresh button: default columns on saved reports ------------------------------------------

from types import SimpleNamespace

from app.report_agent_v2.agents import definition_agent, execution_agent
from app.report_agent_v2.agents.definition_agent import refresh_default_columns
from app.report_agent_v2.config import Settings
from app.report_agent_v2.security.authorization import ReportAccess


async def test_refresh_adds_new_defaults_and_keeps_the_reports_own_columns(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    saved = _spec("supplier")  # saved before the AI defaults existed
    refreshed = refresh_default_columns(saved, c)
    assert refreshed.columns[0].ref == "supplier" and [col.label for col in refreshed.columns][-9:] == AI_DEFAULT_LABELS
    assert refresh_default_columns(refreshed, c).dump() == refreshed.dump()  # idempotent


async def test_refresh_removes_retired_defaults(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    monkeypatch.setattr(definition_agent, "RETIRED_DEFAULT_REFS", frozenset({"sys.old_default"}))
    c.fields["sys.old_default"] = FieldDef("sys.old_default", "Old", "system", "text", "e", column="Supplier", pg_type="text")
    refreshed = refresh_default_columns(_spec("supplier", "sys.old_default"), c)
    assert "sys.old_default" not in [col.ref for col in refreshed.columns]


def _agent():
    return execution_agent.ReportExecutionAgent(Settings())


async def _refresh(monkeypatch, catalog, access, saved_spec):
    saves = []

    async def fake_save(conn, **kw):
        saves.append(kw)
        return kw["report_id"], 7, {}

    monkeypatch.setattr(execution_agent.store, "save_definition", fake_save)
    ctx = SimpleNamespace(tenant_id=TENANT, user_id=uuid.uuid4())
    spec_row = {"Version": 3, "Prompt": "invoices", "Warnings": [], "Model": "gpt-4.1-nano", "SourceFingerprint": "x"}
    definition = {"Name": "AP", "Description": "", "ReportSpec": {}}
    result = await _agent()._refresh_defaults(None, ctx, uuid.uuid4(), definition, access, spec_row, saved_spec, catalog)
    return result, saves


async def test_refresh_saves_a_new_version_for_the_owner(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    (spec, row, changed, saved), saves = await _refresh(monkeypatch, c, ReportAccess(True, True, "owner"), _spec("supplier"))
    assert changed and saved and row["Version"] == 7 and len(saves) == 1
    assert saves[0]["prompt"] == "invoices" and saves[0]["model"] == "gpt-4.1-nano"  # no new prompt, no LLM
    assert [col.label for col in saves[0]["spec"].columns][-9:] == AI_DEFAULT_LABELS


async def test_refresh_is_show_only_for_viewers(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    (spec, row, changed, saved), saves = await _refresh(monkeypatch, c, ReportAccess(True, False, "shared"), _spec("supplier"))
    assert changed and not saved and not saves and row["Version"] == 3
    assert [col.label for col in spec.columns][-9:] == AI_DEFAULT_LABELS


async def test_refresh_does_nothing_when_defaults_are_current(monkeypatch):
    c = await _with_ai_fields(_workflow(), monkeypatch)
    current = with_ticket_columns(_spec("supplier"), c)
    (_, _, changed, saved), saves = await _refresh(monkeypatch, c, ReportAccess(True, True, "owner"), current)
    assert not changed and not saved and not saves

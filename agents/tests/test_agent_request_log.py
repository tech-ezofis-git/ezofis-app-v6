"""ai.agent_request_logs: run tracking, row values and the background writer (no real DB or LLM)."""
import asyncio
import json
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.control import agent_request_log as log
from app.llm.adapter import LLMAdapter, LLMAdapterError
from app.llm.burgr_route import suppress_routing

TENANT = "74fcf357-5fc9-49a4-816e-2df7dc5bd9cb"
INSTANCE = "0b44d969-d7da-4269-8b5b-068cc7828341"


class FakePool:
    def __init__(self):
        self.statements: list[tuple[str, tuple]] = []

    async def execute(self, statement, *args):
        self.statements.append((statement, args))


class FakeTenantPools:
    def __init__(self, pool):
        self.pool = pool
        self.tenants: list[str] = []

    async def acquire(self, tenant_id):
        self.tenants.append(tenant_id)
        return self.pool


@pytest.fixture
def writer():
    pool = FakePool()
    pools = FakeTenantPools(pool)
    log.configure(log.AgentRequestLogWriter(pools))
    yield pools
    log.configure(None)


def _inserts(pool):
    return [args for stmt, args in pool.statements if "INSERT INTO ai.agent_request_logs" in stmt]


async def test_run_is_written_with_ids_tokens_and_status(writer):
    run, token = log.start("chat", correlation_id="corr-1")
    log.annotate(tenant_id=TENANT, instance_id=INSTANCE, skill_id="po_matching", workflow_id="not-a-guid")
    run.record_call(model="azure/gpt-4.1-mini", api_base=None,
                    usage={"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120}, response=None)
    run.record_call(model="azure/gpt-4.1-mini", api_base=None,
                    usage={"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}, response=None)
    task = log.finish(run, token, status="Success", agent_name="ap")
    await task

    rows = _inserts(writer.pool)
    assert len(rows) == 1
    row = rows[0]
    assert row[0] == uuid.UUID(TENANT)
    assert row[1] == "corr-1" and row[2] == "chat" and row[3] == "ap" and row[4] == "po_matching"
    assert row[6] is None  # invalid workflow id is dropped, never stored as text
    assert row[7] == uuid.UUID(INSTANCE)
    assert row[11] == "gpt-4.1-mini" and row[12] == "azure"
    assert row[16] == "Success"
    assert row[21:25] == (2, 110, 25, 135)
    assert log.current() is None
    # Schema DDL runs once per pool, before the insert.
    assert any("CREATE TABLE IF NOT EXISTS ai.agent_request_logs" in s for s, _ in writer.pool.statements)


async def test_schema_is_created_only_once_per_pool(writer):
    for _ in range(2):
        run, token = log.start("chat", tenant_id=TENANT)
        await log.finish(run, token, status="Success")
    creates = [s for s, _ in writer.pool.statements if "CREATE TABLE" in s]
    assert len(creates) == 1
    assert len(_inserts(writer.pool)) == 2


async def test_runs_without_a_tenant_are_not_stored(writer):
    run, token = log.start("chat")
    assert log.finish(run, token, status="Success") is None
    assert writer.pool.statements == []


async def test_write_failure_never_raises(writer):
    async def boom(_tenant):
        raise RuntimeError("db down")

    writer.acquire = boom
    run, token = log.start("chat", tenant_id=TENANT)
    await log.finish(run, token, status="Success")  # logged, not raised


def test_status_for_exception():
    try:
        try:
            raise LLMAdapterError("x")
        except LLMAdapterError as cause:
            raise HTTPException(status_code=502, detail="upstream") from cause
    except HTTPException as exc:
        assert log.status_for_exception(exc) == ("Failed", "LLMAdapterError")
    assert log.status_for_exception(HTTPException(status_code=429))[0] == "Rejected"
    assert log.status_for_exception(ValueError("x")) == ("Failed", "ValueError")


def test_timeout_and_fallback_flags():
    run, token = log.start("chat", tenant_id=TENANT)
    run.record_failure(timed_out=True)
    failed = log.row_values(run, status="Failed", error_type="LLMAdapterError", finished_at=run.started_at)
    assert failed[16] == "Timeout"
    run.record_call(model="gpt-5-nano", api_base="https://example.com/v1", usage=None, response=None)
    ok = log.row_values(run, status="Success", error_type=None, finished_at=run.started_at)
    assert ok[15] is True  # a failed call followed by a successful one = fallback
    assert ok[12] == "openai-compatible"
    log._current.reset(token)


async def test_adapter_records_each_llm_call(monkeypatch):
    response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="hi"))],
        usage=SimpleNamespace(prompt_tokens=7, completion_tokens=3, total_tokens=10),
    )

    async def fake_acompletion(**kwargs):
        return response

    monkeypatch.setattr("app.llm.adapter.litellm.acompletion", fake_acompletion)
    adapter = LLMAdapter(SimpleNamespace(llm_model="gpt-4.1-mini", llm_api_base="", llm_api_key=""))
    routing = suppress_routing.set(True)
    run, token = log.start("chat", tenant_id=TENANT)
    try:
        await adapter.chat_completion([{"role": "user", "content": "hello"}])
        assert run.llm_calls == 1 and run.total_tokens == 10 and run.model_used == "gpt-4.1-mini"
    finally:
        log._current.reset(token)
        suppress_routing.reset(routing)


async def test_adapter_records_failures(monkeypatch):
    async def failing(**kwargs):
        raise RuntimeError("provider down")

    monkeypatch.setattr("app.llm.adapter.litellm.acompletion", failing)
    adapter = LLMAdapter(SimpleNamespace(llm_model="gpt-4.1-mini", llm_api_base="", llm_api_key=""))
    routing = suppress_routing.set(True)
    run, token = log.start("chat", tenant_id=TENANT)
    try:
        with pytest.raises(LLMAdapterError):
            await adapter.chat_completion([{"role": "user", "content": "hello"}])
        assert run.failed_calls == 1 and run.llm_calls == 0
    finally:
        log._current.reset(token)
        suppress_routing.reset(routing)


async def test_sub_agents_and_each_llm_call_are_recorded(writer):
    run, token = log.start("chat", tenant_id=TENANT, instance_id=INSTANCE)
    with log.step("extract_invoice"):
        log.record_llm_call("azure/gpt-4.1-mini", api_base=None, response=None, duration_ms=900,
                            usage={"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120})
        log.record_llm_failure(model="azure/gpt-4.1-mini", duration_ms=50, error_type="RateLimitError")
        log.record_llm_call("azure/gpt-4.1-nano", api_base=None, response=None, duration_ms=400,
                            usage={"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15})
    with log.step("po_match"):  # ran, but made no LLM call
        pass
    with log.step("line_pair"):
        log.record_llm_call("gpt-5-nano", api_base="https://example.com/v1", response=None,
                            usage={"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2})
    await log.finish(run, token, status="Success", agent_name="ap")

    row = _inserts(writer.pool)[0]
    assert row[27] == "extract_invoice, po_match, line_pair"
    calls = json.loads(row[28])
    assert [c["seq"] for c in calls] == [1, 2, 3, 4]
    assert [c["sub_agent"] for c in calls] == ["extract_invoice", "extract_invoice", "extract_invoice", "line_pair"]
    assert [c["status"] for c in calls] == ["Success", "Failed", "Success", "Success"]
    assert calls[0]["model"] == "gpt-4.1-mini" and calls[0]["duration_ms"] == 900 and calls[0]["total_tokens"] == 120
    assert calls[1]["error_type"] == "RateLimitError"
    assert calls[3]["provider"] == "openai-compatible"
    assert row[15] is True  # one call failed and a later one answered


async def test_calls_without_a_step_belong_to_the_runs_agent(writer):
    run, token = log.start("chat", tenant_id=TENANT)
    log.record_llm_call("azure/gpt-4.1-mini", api_base=None, response=None, usage=None)
    await log.finish(run, token, status="Success", agent_name="ocr")
    row = _inserts(writer.pool)[0]
    assert row[27] == "ocr" and json.loads(row[28])[0]["sub_agent"] == "ocr"


def test_existing_tables_get_the_new_columns():
    assert any("ADD COLUMN IF NOT EXISTS llm_call_details" in s for s in log.SCHEMA_SQL)
    assert any("ADD COLUMN IF NOT EXISTS sub_agents" in s for s in log.SCHEMA_SQL)

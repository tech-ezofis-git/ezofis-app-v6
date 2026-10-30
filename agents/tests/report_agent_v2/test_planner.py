"""OrchestratorLLMPlanner: orchestrator LLMAdapter + tenant "report" model selection."""

from __future__ import annotations

import pytest

from app.llm.adapter import LLMAdapterError
from app.report_agent_v2.agents import planner as planner_mod
from app.report_agent_v2.agents.planner import OrchestratorLLMPlanner
from app.report_agent_v2.errors import UpstreamError

REQUEST = {"prompt": "AP aging by supplier", "name": None, "sourceType": "Workflow", "sourceName": "AP",
           "formName": "AP form", "tenantId": "t-1"}
CATALOG = [{"id": "f.amount", "label": "Amount", "type": "number"}]


class FakeLLM:
    def __init__(self, replies: list) -> None:
        self.replies = list(replies)
        self.calls: list[tuple[list, dict]] = []

    def describe(self) -> dict:
        return {"model": "default-model"}

    async def chat_completion(self, messages, **overrides):
        self.calls.append((list(messages), overrides))
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return {"content": reply, "usage": None}


@pytest.fixture
def tenant_models(monkeypatch):
    seen = []

    async def fake_apply(catalog, tenant_id, slug):
        seen.append((tenant_id, slug))
        return {"overrides": {"model": "tenant-primary"}, "fallback_chain": [{"model": "tenant-fallback"}]}

    monkeypatch.setattr(planner_mod, "apply_tenant_agent_llm", fake_apply)
    return seen


async def test_uses_tenant_report_model_and_parses_fenced_json(tenant_models):
    llm = FakeLLM(['Here:\n```json\n{"title": "AP aging"}\n```'])
    raw, history, model = await OrchestratorLLMPlanner(llm, catalog_store=object()).plan(REQUEST, CATALOG, None, [])
    assert raw == {"title": "AP aging"}
    assert model == "tenant-primary"
    assert tenant_models == [("t-1", "report")]
    messages, overrides = llm.calls[0]
    assert overrides == {"model": "tenant-primary"}
    assert messages[0]["role"] == "system" and '"type":"object"' in messages[0]["content"]
    assert "t-1" not in messages[1]["content"]  # tenant id selects the model; never sent to the LLM
    assert history[-1] == {"role": "assistant", "content": 'Here:\n```json\n{"title": "AP aging"}\n```'}


async def test_falls_back_to_next_tenant_model(tenant_models):
    llm = FakeLLM([LLMAdapterError("down"), '{"title": "x"}'])
    _, _, model = await OrchestratorLLMPlanner(llm, catalog_store=object()).plan(REQUEST, CATALOG, None, [])
    assert model == "tenant-fallback"
    assert [c[1] for c in llm.calls] == [{"model": "tenant-primary"}, {"model": "tenant-fallback"}]


async def test_all_models_failing_is_upstream_error(tenant_models):
    llm = FakeLLM([LLMAdapterError("a"), LLMAdapterError("b")])
    with pytest.raises(UpstreamError):
        await OrchestratorLLMPlanner(llm, catalog_store=object()).plan(REQUEST, CATALOG, None, [])


async def test_no_catalog_uses_adapter_default_and_repair_round_appends():
    llm = FakeLLM(["not json", '{"title": "fixed"}'])
    planner = OrchestratorLLMPlanner(llm, catalog_store=None)
    raw, history, model = await planner.plan(REQUEST, CATALOG, None, [])
    assert raw == {} and model == "default-model"  # empty spec -> validation feedback -> repair
    raw, history, _ = await planner.plan(REQUEST, CATALOG, ["title: required"], history)
    assert raw == {"title": "fixed"}
    assert llm.calls[1][1] == {}
    assert "title: required" in history[-2]["content"] and history[-2]["role"] == "user"

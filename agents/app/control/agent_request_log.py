"""One row per orchestrator agent run in ai.agent_request_logs (per-tenant DB).

A run starts when a request enters an agent entry point (/chat, the report agent's
generate calls) and finishes when that entry point returns or raises. In between,
LLMAdapter.chat_completion adds every LLM call to the current run (model, tokens, cost),
and the Burgr routing snapshot adds the suggested model. One run can contain several
sub-agents (e.g. the AP skills extract_invoice, line_pair, ...), each making its own LLM
calls: `step()` names the current sub-agent, the run keeps the list of sub-agents that ran
(`sub_agents`) and one entry per LLM call (`llm_call_details`: sub-agent, model, Burgr
suggestion, status, time, tokens, cost). The row is written in the background after the run
finishes; a failed write is logged and never affects the request.

Never stored: prompts, document text, extracted values or error messages (only the type).
"""
from __future__ import annotations

import asyncio
import logging
import time
import json
import uuid
from contextlib import contextmanager
from contextvars import ContextVar, Token
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterator, Optional

logger = logging.getLogger("orchestrator.agent_request_log")

SCHEMA_SQL = (
    "CREATE SCHEMA IF NOT EXISTS ai",
    """
    CREATE TABLE IF NOT EXISTS ai.agent_request_logs (
        id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id              uuid        NOT NULL,
        correlation_id         text,
        source                 text        NOT NULL,
        agent_name             text        NOT NULL,
        skill_id               text,
        user_id                uuid,
        workflow_id            uuid,
        instance_id            uuid,
        form_entry_id          text,
        repository_id          uuid,
        repository_item_id     text,
        model_used             text,
        provider               text,
        burgr_suggested_model  text,
        followed_suggestion    boolean,
        fallback_used          boolean     NOT NULL DEFAULT false,
        status                 text        NOT NULL,
        error_type             text,
        started_at_utc         timestamptz NOT NULL,
        finished_at_utc        timestamptz,
        duration_ms            integer,
        llm_calls              integer     NOT NULL DEFAULT 0,
        prompt_tokens          integer     NOT NULL DEFAULT 0,
        completion_tokens      integer     NOT NULL DEFAULT 0,
        total_tokens           integer     NOT NULL DEFAULT 0,
        cost_usd               numeric(12,6),
        credits_charged        integer,
        sub_agents             text,
        llm_call_details       jsonb       NOT NULL DEFAULT '[]'::jsonb,
        created_at_utc         timestamptz NOT NULL DEFAULT now()
    )
    """,
    # Upgrades tables created before sub-agent / per-call details existed.
    "ALTER TABLE ai.agent_request_logs ADD COLUMN IF NOT EXISTS sub_agents text",
    "ALTER TABLE ai.agent_request_logs ADD COLUMN IF NOT EXISTS llm_call_details jsonb NOT NULL DEFAULT '[]'::jsonb",
    """
    CREATE INDEX IF NOT EXISTS ix_agent_request_logs_instance
        ON ai.agent_request_logs (tenant_id, instance_id, started_at_utc DESC)
    """,
    """
    CREATE INDEX IF NOT EXISTS ix_agent_request_logs_repo_item
        ON ai.agent_request_logs (tenant_id, repository_item_id, started_at_utc DESC)
    """,
    """
    CREATE INDEX IF NOT EXISTS ix_agent_request_logs_started
        ON ai.agent_request_logs (tenant_id, started_at_utc DESC)
    """,
)

_INSERT_SQL = """
    INSERT INTO ai.agent_request_logs (
        tenant_id, correlation_id, source, agent_name, skill_id, user_id,
        workflow_id, instance_id, form_entry_id, repository_id, repository_item_id,
        model_used, provider, burgr_suggested_model, followed_suggestion, fallback_used,
        status, error_type, started_at_utc, finished_at_utc, duration_ms,
        llm_calls, prompt_tokens, completion_tokens, total_tokens, cost_usd, credits_charged,
        sub_agents, llm_call_details
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29::jsonb
    )
"""

_UUID_FIELDS = ("tenant_id", "user_id", "workflow_id", "instance_id", "repository_id")
_TEXT_FIELDS = (
    "correlation_id", "agent_name", "skill_id", "form_entry_id", "repository_item_id",
)


def _uuid_or_none(value: Any) -> Optional[uuid.UUID]:
    if value in (None, ""):
        return None
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value).strip())
    except ValueError:
        return None


def _bare_model(model: str) -> str:
    """'azure/gpt-4.1-mini' -> 'gpt-4.1-mini' (the provider is stored separately)."""
    return (model or "").split("/", 1)[-1]


def _provider(model: str, api_base: Optional[str]) -> str:
    prefix = (model or "").split("/", 1)[0] if "/" in (model or "") else "openai"
    if prefix == "openai" and api_base:
        return "openai-compatible"
    return prefix


def _call_cost(response: Any, bare_model: str, prompt_tokens: int, completion_tokens: int) -> Optional[float]:
    """USD cost from LiteLLM's price list; None when the model is not priced (e.g. self-hosted)."""
    try:
        import litellm

        try:
            return float(litellm.completion_cost(completion_response=response))
        except Exception:
            prompt_cost, completion_cost = litellm.cost_per_token(
                model=bare_model, prompt_tokens=prompt_tokens, completion_tokens=completion_tokens
            )
            return float(prompt_cost + completion_cost)
    except Exception:
        return None


@dataclass
class AgentRun:
    source: str
    started_at: datetime
    started_perf: float
    agent_name: Optional[str] = None
    skill_id: Optional[str] = None
    correlation_id: Optional[str] = None
    tenant_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    workflow_id: Optional[uuid.UUID] = None
    instance_id: Optional[uuid.UUID] = None
    form_entry_id: Optional[str] = None
    repository_id: Optional[uuid.UUID] = None
    repository_item_id: Optional[str] = None
    model_used: Optional[str] = None
    provider: Optional[str] = None
    llm_calls: int = 0
    failed_calls: int = 0
    timed_out: bool = False
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: Optional[float] = None
    credits_charged: Optional[int] = None
    sub_agents: list = field(default_factory=list)
    calls: list = field(default_factory=list)

    def enter_step(self, name: str) -> None:
        if name and name not in self.sub_agents:
            self.sub_agents.append(name)

    def _call_entry(self, *, model: str, api_base: Optional[str], status: str, duration_ms: Optional[int]) -> dict:
        return {
            "seq": len(self.calls) + 1,
            "sub_agent": _step.get(),  # None = the run's own agent, filled in row_values
            "model": _bare_model(model) or None,
            "provider": _provider(model, api_base) if model else None,
            "burgr_suggested_model": _last_burgr_suggestion(),
            "status": status,
            "duration_ms": duration_ms,
        }

    def annotate(self, **values: Any) -> None:
        """Set ids/labels; empty values never overwrite what is already set."""
        for name, value in values.items():
            if value in (None, "") or not hasattr(self, name):
                continue
            if name in _UUID_FIELDS:
                value = _uuid_or_none(value)
                if value is None:
                    continue
            elif name in _TEXT_FIELDS:
                value = str(value).strip()[:200] or None
                if value is None:
                    continue
            setattr(self, name, value)

    def record_call(
        self, *, model: str, api_base: Optional[str], usage: Optional[dict], response: Any,
        duration_ms: Optional[int] = None,
    ) -> None:
        prompt = int((usage or {}).get("prompt_tokens") or 0)
        completion = int((usage or {}).get("completion_tokens") or 0)
        total = int((usage or {}).get("total_tokens") or (prompt + completion))
        bare = _bare_model(model)
        self.llm_calls += 1
        self.prompt_tokens += prompt
        self.completion_tokens += completion
        self.total_tokens += total
        self.model_used = bare or self.model_used
        self.provider = _provider(model, api_base)
        cost = _call_cost(response, bare, prompt, completion)
        if cost is not None:
            self.cost_usd = (self.cost_usd or 0.0) + cost
        entry = self._call_entry(model=model, api_base=api_base, status="Success", duration_ms=duration_ms)
        entry.update(prompt_tokens=prompt, completion_tokens=completion, total_tokens=total,
                     cost_usd=round(cost, 6) if cost is not None else None)
        self.calls.append(entry)

    def record_failure(
        self, *, timed_out: bool, model: str = "", api_base: Optional[str] = None,
        duration_ms: Optional[int] = None, error_type: Optional[str] = None,
    ) -> None:
        self.failed_calls += 1
        self.timed_out = self.timed_out or timed_out
        entry = self._call_entry(model=model, api_base=api_base, status="Timeout" if timed_out else "Failed",
                                 duration_ms=duration_ms)
        entry["error_type"] = error_type
        self.calls.append(entry)


_current: ContextVar[Optional[AgentRun]] = ContextVar("agent_request_log_run", default=None)
# Sub-agent (e.g. AP skill id) the current LLM calls belong to.
_step: ContextVar[Optional[str]] = ContextVar("agent_request_log_step", default=None)
_writer: Optional["AgentRequestLogWriter"] = None
_pending: set[asyncio.Task] = set()


def current() -> Optional[AgentRun]:
    return _current.get()


def start(source: str, **values: Any) -> tuple[AgentRun, Token]:
    run = AgentRun(source=source, started_at=datetime.now(timezone.utc), started_perf=time.perf_counter())
    run.annotate(**values)
    return run, _current.set(run)


def annotate(**values: Any) -> None:
    run = _current.get()
    if run is not None:
        run.annotate(**values)


@contextmanager
def step(name: str) -> Iterator[None]:
    """Name the sub-agent for the LLM calls made inside this block, and note that it ran."""
    label = str(name or "").strip()[:100] or None
    run = _current.get()
    if run is not None and label:
        run.enter_step(label)
    token = _step.set(label)
    try:
        yield
    finally:
        _step.reset(token)


def record_llm_call(
    model: str, *, api_base: Optional[str], usage: Optional[dict], response: Any, duration_ms: Optional[int] = None
) -> None:
    run = _current.get()
    if run is None:
        return
    try:
        run.record_call(model=model, api_base=api_base, usage=usage, response=response, duration_ms=duration_ms)
    except Exception as exc:  # logging must never break an LLM call
        logger.warning("agent_request_log_record_failed", extra={"error_type": type(exc).__name__})


def record_llm_failure(
    *, timed_out: bool = False, model: str = "", api_base: Optional[str] = None,
    duration_ms: Optional[int] = None, error_type: Optional[str] = None,
) -> None:
    run = _current.get()
    if run is None:
        return
    try:
        run.record_failure(timed_out=timed_out, model=model, api_base=api_base,
                           duration_ms=duration_ms, error_type=error_type)
    except Exception as exc:
        logger.warning("agent_request_log_record_failed", extra={"error_type": type(exc).__name__})


def status_for_exception(exc: BaseException) -> tuple[str, str]:
    """(status, error_type) for an exception leaving an entry point. Type names only."""
    status_code = getattr(exc, "status_code", None)
    cause = exc.__cause__ or exc
    error_type = type(cause).__name__
    if isinstance(status_code, int) and status_code < 500:
        return "Rejected", error_type
    return "Failed", error_type


def _last_burgr_suggestion() -> Optional[str]:
    """Burgr's model for the routing decision behind the current LLM call, if any."""
    try:
        from app.llm.burgr_route import _call_log

        calls = _call_log.get() or []
        return (calls[-1].get("burgr_model") or None) if calls else None
    except Exception:
        return None


def _burgr_fields() -> tuple[Optional[str], Optional[bool]]:
    try:
        from app.llm.burgr_route import routing_snapshot

        snapshot = routing_snapshot() or {}
    except Exception:
        return None, None
    suggested = snapshot.get("burgr_model") or None
    return suggested, (bool(snapshot.get("burgr_model_used")) if suggested else None)


def row_values(run: AgentRun, *, status: str, error_type: Optional[str], finished_at: datetime) -> tuple:
    suggested, followed = _burgr_fields()
    duration_ms = int((time.perf_counter() - run.started_perf) * 1000)
    if status == "Failed" and run.timed_out:
        status = "Timeout"
    agent = run.agent_name or run.source
    calls = [{**c, "sub_agent": c.get("sub_agent") or agent} for c in run.calls]
    sub_agents = run.sub_agents or list(dict.fromkeys(c["sub_agent"] for c in calls))
    return (
        run.tenant_id, run.correlation_id, run.source, agent, run.skill_id, run.user_id,
        run.workflow_id, run.instance_id, run.form_entry_id, run.repository_id, run.repository_item_id,
        run.model_used, run.provider, suggested, followed,
        run.failed_calls > 0 and status == "Success",
        status, error_type, run.started_at, finished_at, duration_ms,
        run.llm_calls, run.prompt_tokens, run.completion_tokens, run.total_tokens,
        round(run.cost_usd, 6) if run.cost_usd is not None else None, run.credits_charged,
        ", ".join(sub_agents) or None, json.dumps(calls, default=str),
    )


class AgentRequestLogWriter:
    """Writes rows through ApTenantDbPools (same tenant DB routing as the AP store)."""

    def __init__(self, tenant_pools: Any):
        self._tenant_pools = tenant_pools
        self._schema_ready: set[int] = set()
        self._lock = asyncio.Lock()

    async def _ensure_schema(self, pool: Any) -> None:
        key = id(pool)
        if key in self._schema_ready:
            return
        async with self._lock:
            if key in self._schema_ready:
                return
            for stmt in SCHEMA_SQL:
                await pool.execute(stmt)
            self._schema_ready.add(key)

    async def write(self, values: tuple) -> None:
        tenant_id = values[0]
        pool = await self._tenant_pools.acquire(str(tenant_id))
        await self._ensure_schema(pool)
        await pool.execute(_INSERT_SQL, *values)


def configure(writer: Optional[AgentRequestLogWriter]) -> None:
    global _writer
    _writer = writer


async def _safe_write(writer: AgentRequestLogWriter, values: tuple) -> None:
    try:
        await writer.write(values)
    except Exception as exc:
        logger.warning(
            "agent_request_log_write_failed",
            extra={"error_type": type(exc).__name__, "error": str(exc)[:200]},
        )


def finish(
    run: AgentRun, token: Token, *, status: str, error_type: Optional[str] = None, **values: Any
) -> Optional[asyncio.Task]:
    """End the run and write its row in the background. Runs without a tenant are not stored."""
    try:
        run.annotate(**values)
        row = row_values(run, status=status, error_type=error_type, finished_at=datetime.now(timezone.utc))
    finally:
        _current.reset(token)
    if _writer is None or run.tenant_id is None:
        return None
    try:
        task = asyncio.get_running_loop().create_task(_safe_write(_writer, row))
    except RuntimeError:
        return None
    _pending.add(task)
    task.add_done_callback(_pending.discard)
    return task

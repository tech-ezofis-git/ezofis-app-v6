"""Ask Burgr which catalog model should be tried first.

Burgr never receives provider keys and never calls the model. On any
failure the caller keeps the catalog order.
"""
from __future__ import annotations

import logging
from contextvars import ContextVar
from typing import Any, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger("orchestrator.burgr")

GOALS = ("balanced", "cost", "quality", "speed", "custom")
GOAL_LABELS = {
    "balanced": "Balanced",
    "cost": "Cheapest",
    "quality": "Best quality",
    "speed": "Fastest",
    "custom": "Custom",
}

# Let the prompt check warn, and still call a model. Never block.
_prompt_check = True

_mix: dict[str, Any] = {
    "quality": 60,
    "cost": 30,
    "speed": 10,
    "max_cost": None,
    "max_latency_ms": None,
    "min_context": None,
    "min_score": None,
}

# While a fallback group is running, chat_completion must not ask Burgr again.
suppress_routing: ContextVar[bool] = ContextVar("burgr_suppress", default=False)
# Override dicts this request is allowed to call (catalog primary + fallbacks).
request_candidates: ContextVar[list[dict[str, Any]]] = ContextVar("burgr_candidates", default=[])

_goal: Optional[str] = None
_last: dict[str, Any] = {}
# One entry per routing decision in the current request.
_call_log: ContextVar[Optional[list[dict[str, Any]]]] = ContextVar("burgr_call_log", default=None)


def goal_label(goal: str) -> str:
    return GOAL_LABELS.get(goal, GOAL_LABELS["balanced"])


def get_goal() -> str:
    if _goal in GOALS:
        return _goal
    configured = (get_settings().burgr_goal or "balanced").strip().lower()
    return configured if configured in GOALS else "balanced"


def set_goal(goal: str) -> str:
    global _goal
    cleaned = (goal or "").strip().lower()
    if cleaned not in GOALS:
        raise ValueError("goal must be balanced, cost, quality, speed, or custom")
    _goal = cleaned
    return _goal


def prompt_check_enabled() -> bool:
    return _prompt_check


def set_prompt_check(enabled: Optional[bool]) -> bool:
    global _prompt_check
    if enabled is not None:
        _prompt_check = bool(enabled)
    return _prompt_check


def get_mix() -> dict[str, Any]:
    return dict(_mix)


def set_mix(mix: dict[str, Any]) -> dict[str, Any]:
    """Weights are percents. Empty limits mean Burgr applies no hard cutoff."""
    quality = int(mix.get("quality") if mix.get("quality") is not None else _mix["quality"])
    cost = int(mix.get("cost") if mix.get("cost") is not None else _mix["cost"])
    speed = int(mix.get("speed") if mix.get("speed") is not None else _mix["speed"])
    if quality < 0 or cost < 0 or speed < 0:
        raise ValueError("quality, cost, and speed weights must be 0 or higher")
    _mix["quality"] = quality
    _mix["cost"] = cost
    _mix["speed"] = speed
    for key in ("max_cost", "max_latency_ms", "min_context", "min_score"):
        raw = mix.get(key) if key in mix else _mix[key]
        if raw is None or raw == "":
            _mix[key] = None
            continue
        _mix[key] = float(raw)
    return get_mix()


def last_decision() -> dict[str, Any]:
    return dict(_last)


def enabled() -> bool:
    return bool((get_settings().burgr_api_key or "").strip())


def _bare(model: str) -> str:
    text = (model or "").strip().lower()
    if "/" in text:
        text = text.split("/", 1)[1]
    return text


def _compact(value: str) -> str:
    return "".join(ch for ch in _bare(value) if ch.isalnum())


def match_candidate(chosen_model: str, candidates: list[dict[str, Any]]) -> Optional[dict[str, Any]]:
    want = _bare(chosen_model)
    want_compact = _compact(chosen_model)
    if not want and not want_compact:
        return None
    for candidate in candidates:
        for field in ("model", "slug", "label"):
            text = str(candidate.get(field) or "")
            if want and _bare(text) == want:
                return candidate
            if want_compact and _compact(text) == want_compact:
                return candidate
    return None


def _merge_catalog(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Request chain first, then every keyed catalog model (gpt-5.4-nano included)."""
    from app.llm.model_presets import keyed_preset_overrides

    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for candidate in list(candidates) + keyed_preset_overrides():
        if not isinstance(candidate, dict):
            continue
        key = _bare(str(candidate.get("model") or "")) or _compact(str(candidate.get("slug") or ""))
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(candidate)
    return merged


def _log() -> list[dict[str, Any]]:
    current = _call_log.get()
    if current is None:
        current = []
        _call_log.set(current)
    return current


def _remember(payload: dict[str, Any]) -> None:
    global _last
    _last = payload
    _log().append(dict(payload))


def note_model_used(model: str) -> None:
    """Record the catalog model that was actually called after routing."""
    used = (model or "").strip()
    if not used:
        return
    calls = _log()
    if calls and not calls[-1].get("model_used"):
        calls[-1]["model_used"] = used
        _last["model_used"] = used
        return
    entry = {"model_used": used, "goal": get_goal(), "goal_label": goal_label(get_goal())}
    _remember(entry)


def routing_snapshot() -> Optional[dict[str, Any]]:
    """What Burgr returned, and which catalog model this request actually called."""
    calls = [dict(item) for item in (_call_log.get() or []) if isinstance(item, dict)]
    if not calls:
        return None
    last = calls[-1]
    burgr_model = next((item.get("burgr_model") for item in reversed(calls) if item.get("burgr_model")), None)
    model_used = next((item.get("model_used") for item in reversed(calls) if item.get("model_used")), None)
    applied = bool(next((item.get("applied") for item in reversed(calls) if "applied" in item), False))
    if not burgr_model and last.get("status") == "catalog":
        note = "Burgr did not return a model. The catalog model was called."
    elif applied and (last.get("goal") or get_goal()) in {"cost", "speed"}:
        note = "Burgr priced your catalog models. This goal called the one with the lowest price."
    elif applied and (last.get("goal") or get_goal()) == "quality":
        note = "Burgr scored your catalog models. This goal called the one with the highest score."
    elif applied and (last.get("goal") or get_goal()) == "custom":
        note = "Custom mix used Burgr's score, price, and speed numbers on your catalog."
    elif applied:
        note = "Burgr's balanced pick from your catalog was called."
    elif burgr_model and model_used:
        note = "Burgr returned a model that is not in this tenant's catalog, so the catalog model was called."
    elif burgr_model:
        note = "Burgr returned a model. The catalog call did not finish."
    else:
        note = "The catalog model was called."
    return {
        "goal": last.get("goal") or get_goal(),
        "goal_label": last.get("goal_label") or goal_label(get_goal()),
        "burgr_model": burgr_model,
        "burgr_use_case": last.get("use_case") or None,
        "model_used": model_used,
        "burgr_model_used": applied,
        "tools_sent": bool(next((item.get("tools_sent") for item in reversed(calls) if "tools_sent" in item), False)),
        "prompt_check": next((item.get("prompt_check") for item in reversed(calls) if "prompt_check" in item), None),
        "prompt_warnings": next((item.get("prompt_warnings") for item in reversed(calls) if item.get("prompt_warnings")), []) or [],
        "note": note,
        "mix": get_mix() if (last.get("goal") or get_goal()) == "custom" else None,
        "retires": next((item.get("retires") for item in reversed(calls) if item.get("retires")), None),
        "days_left": next((item.get("days_left") for item in reversed(calls) if item.get("days_left") is not None), None),
        "retirement_warnings": next((item.get("retirement_warnings") for item in reversed(calls) if item.get("retirement_warnings")), []) or [],
        "calls": calls,
    }


async def pick_candidate(
    messages: list[dict[str, str]],
    candidates: list[dict[str, Any]],
    tools: Optional[list[Any]] = None,
) -> Optional[dict[str, Any]]:
    """Return the catalog override Burgr chose, or None to keep catalog order."""
    settings = get_settings()
    key = (settings.burgr_api_key or "").strip()
    usable = _merge_catalog(candidates)
    goal = get_goal()
    if not key or not usable:
        return None

    prompt = "\n".join(str(item.get("content") or "") for item in messages if isinstance(item, dict)).strip()
    if not prompt:
        return None
    names = []
    for candidate in usable:
        bare = _bare(str(candidate.get("model") or "")) or _compact(str(candidate.get("slug") or ""))
        if bare and bare not in names:
            names.append(bare)
    # Ask Burgr to choose inside this catalog. providers keeps the decision
    # on Azure / OpenAI-compatible hosts the catalog already calls.
    preferences: dict[str, Any] = {
        "goal": goal,
        "providers": ["azure", "openai"],
        "models": names,
    }
    if goal == "custom":
        mix = get_mix()
        # Same POST /v1/route. Custom numbers ride in preferences with the goal.
        preferences["quality"] = mix["quality"]
        preferences["cost"] = mix["cost"]
        preferences["speed"] = mix["speed"]
        if mix.get("max_cost") is not None:
            preferences["max_cost"] = mix["max_cost"]
        if mix.get("max_latency_ms") is not None:
            preferences["max_latency_ms"] = mix["max_latency_ms"]
        if mix.get("min_context") is not None:
            preferences["min_context"] = mix["min_context"]
        if mix.get("min_score") is not None:
            preferences["min_score"] = mix["min_score"]
    if prompt_check_enabled():
        # Let the request through. Burgr records findings; it does not block.
        preferences["compliance"] = True
    body = {"prompt": prompt, "preferences": preferences}
    if tools:
        body["tools"] = tools
    url = (settings.burgr_api_base or "https://burgr.ai").rstrip("/") + "/v1/route"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json=body,
            )
            response.raise_for_status()
            data = response.json()
    except Exception as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        logger.warning(
            "burgr_route_failed",
            extra={"error_type": type(exc).__name__, "status_code": status, "url": url},
        )
        _remember({
            "goal": goal,
            "goal_label": goal_label(goal),
            "status": "catalog",
            "burgr_model": None,
            "applied": False,
            "catalog_model": _bare(str(usable[0].get("model") or "")),
        })
        return None

    use_case = ""
    if isinstance(data, dict):
        use_case = str(data.get("use_case_label") or data.get("use_case") or "")
    ranked = _ranked_catalog_options(data if isinstance(data, dict) else {}, usable)
    matched = _option_for_goal(ranked, goal)
    top_name = ""
    if ranked:
        top_name = str(ranked[0].get("burgr_name") or "")
    base = {
        "goal": goal,
        "goal_label": goal_label(goal),
        "burgr_model": (matched or {}).get("burgr_name") or top_name or None,
        "use_case": use_case,
        "applied": matched is not None,
        "catalog_model": _bare(str((matched or usable[0]).get("model") or "")),
        "tools_sent": bool(tools),
        "prompt_check": "allow" if prompt_check_enabled() else "off",
        "prompt_warnings": _prompt_warnings(data if isinstance(data, dict) else {}),
        "retires": (matched or {}).get("retires"),
        "days_left": (matched or {}).get("days_left"),
        "retirement_warnings": (matched or {}).get("retirement_warnings") or [],
    }
    if matched is None:
        base["status"] = "catalog"
        _remember(base)
        return None
    base["status"] = "routed"
    _remember(base)
    return matched


def _prompt_warnings(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Short findings from Burgr's let-through prompt check. No prompt text."""
    compliance = data.get("compliance") if isinstance(data.get("compliance"), dict) else {}
    checks = compliance.get("checks") if isinstance(compliance.get("checks"), list) else []
    by_id = {str(item.get("id")): item for item in checks if isinstance(item, dict)}
    warnings: list[dict[str, Any]] = []
    for severity, ids in (("flag", compliance.get("flagged") or []), ("warn", compliance.get("warned") or [])):
        if not isinstance(ids, list):
            continue
        for check_id in ids:
            item = by_id.get(str(check_id), {})
            evidence = item.get("evidence") if isinstance(item.get("evidence"), list) else []
            warnings.append({
                "severity": severity,
                "id": str(check_id),
                "title": str(item.get("title") or check_id),
                "action": str(item.get("action") or ""),
                "evidence": [str(piece) for piece in evidence[:3]],
            })
    return warnings


def _ranked_catalog_options(data: dict[str, Any], usable: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Burgr's chosen model, then its fallbacks, kept only when we can call them."""
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    offered = [data.get("chosen")]
    offered.extend(data.get("fallback") or [])
    for item in offered:
        if not isinstance(item, dict):
            continue
        name = str(item.get("model") or item.get("name") or "")
        matched = match_candidate(name, usable)
        if matched is None:
            continue
        key = _bare(str(matched.get("model") or ""))
        if not key or key in seen:
            continue
        seen.add(key)
        row = {k: v for k, v in matched.items() if k in {"model", "api_base", "api_key", "api_version"}}
        row["burgr_name"] = str(item.get("name") or name)
        row["retires"] = item.get("retires") or None
        row["days_left"] = item.get("days_left")
        warnings = item.get("warnings")
        if isinstance(warnings, list):
            row["retirement_warnings"] = [str(entry) for entry in warnings if entry][:5]
        elif warnings:
            row["retirement_warnings"] = [str(warnings)]
        else:
            row["retirement_warnings"] = []
        try:
            row["burgr_score"] = float(item.get("score") or 0)
        except (TypeError, ValueError):
            row["burgr_score"] = 0.0
        try:
            row["burgr_cost"] = float(item.get("est_cost") or 0)
        except (TypeError, ValueError):
            row["burgr_cost"] = 0.0
        context = item.get("context") or item.get("context_window")
        try:
            row["burgr_context"] = float(context) if context is not None else None
        except (TypeError, ValueError):
            row["burgr_context"] = None
        latency = item.get("latency_ms") or item.get("expected_latency_ms")
        try:
            row["burgr_latency_ms"] = float(latency) if latency is not None else None
        except (TypeError, ValueError):
            row["burgr_latency_ms"] = None
        rows.append(row)
    return rows


def _option_for_goal(rows: list[dict[str, Any]], goal: str) -> Optional[dict[str, Any]]:
    """Use Burgr's own score and price. The button picks which of those numbers wins."""
    if not rows:
        return None
    if goal == "quality":
        return max(rows, key=lambda row: (row.get("burgr_score") or 0, -(row.get("burgr_cost") or 0)))
    if goal in {"cost", "speed"}:
        return min(rows, key=lambda row: (row.get("burgr_cost") or 0, -(row.get("burgr_score") or 0)))
    if goal == "custom":
        allowed = _within_mix(rows, get_mix())
        if not allowed:
            return None
        return max(allowed, key=_mix_value)
    return rows[0]


def _within_mix(rows: list[dict[str, Any]], mix: dict[str, Any]) -> list[dict[str, Any]]:
    kept: list[dict[str, Any]] = []
    for row in rows:
        if mix.get("max_cost") is not None and (row.get("burgr_cost") or 0) > float(mix["max_cost"]):
            continue
        if mix.get("min_score") is not None and (row.get("burgr_score") or 0) < float(mix["min_score"]):
            continue
        if mix.get("min_context") is not None and row.get("burgr_context") is not None:
            if float(row["burgr_context"]) < float(mix["min_context"]):
                continue
        if mix.get("max_latency_ms") is not None and row.get("burgr_latency_ms") is not None:
            if float(row["burgr_latency_ms"]) > float(mix["max_latency_ms"]):
                continue
        kept.append(row)
    return kept


def _mix_value(row: dict[str, Any]) -> float:
    """Higher is better. Weights are the catalog sliders; numbers are Burgr's."""
    mix = get_mix()
    return (
        float(mix.get("quality") or 0) * float(row.get("burgr_score") or 0)
        - float(mix.get("cost") or 0) * float(row.get("burgr_cost") or 0) * 1000
        - float(mix.get("speed") or 0) * float(row.get("burgr_latency_ms") or row.get("burgr_cost") or 0)
    )


def public_status() -> dict[str, Any]:
    goal = get_goal()
    return {
        "enabled": enabled(),
        "goal": goal,
        "goal_label": goal_label(goal),
        "goals": [{"id": item, "label": GOAL_LABELS[item]} for item in GOALS],
        "mix": get_mix(),
        "prompt_check": prompt_check_enabled(),
        "last": last_decision(),
    }


def suggest_with_tools_sync(
    messages: list[dict[str, str]],
    candidates: list[dict[str, Any]],
    tools: Optional[list[Any]] = None,
) -> Optional[dict[str, Any]]:
    """Same routing decision as pick_candidate, for sync tool loops (FTL)."""
    import asyncio

    return asyncio.run(pick_candidate(messages, candidates, tools=tools))


def apply_routed_config(config: dict[str, Any], routed: Optional[dict[str, Any]]) -> dict[str, Any]:
    if not routed or not routed.get("model"):
        return config
    merged = dict(config)
    merged["model"] = routed.get("model") or merged.get("model")
    if routed.get("api_base"):
        merged["api_base"] = routed["api_base"]
    if routed.get("api_key"):
        merged["api_key"] = routed["api_key"]
    if "api_version" in routed:
        merged["api_version"] = routed.get("api_version") or ""
    return merged

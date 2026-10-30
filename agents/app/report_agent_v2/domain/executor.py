"""Run a compiled query read-only and shape the ReportRunResult-compatible payload."""

from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal

from psycopg import AsyncConnection

from app.report_agent_v2.db.pools import read_only_transaction
from app.report_agent_v2.domain.compiler import ColumnMeta, CompiledQuery


async def run_compiled(conn: AsyncConnection, compiled: CompiledQuery, statement_timeout_ms: int) -> list[tuple]:
    async with read_only_transaction(conn, statement_timeout_ms):
        cur = await conn.execute(compiled.query, compiled.params)
        return await cur.fetchall()


def _flatten_json(value: object) -> str:
    """ReportEzfbNaming.DisplayCell: lookups/multi-selects are stored as JSON; show their text."""
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return ", ".join(v for v in (_flatten_json(x) for x in value) if v)
    if isinstance(value, dict):
        for key in ("name", "label", "text", "displayName", "title", "value"):
            for k, v in value.items():
                if k.lower() == key.lower() and (flat := _flatten_json(v)):
                    return flat
        return ", ".join(v for v in (_flatten_json(x) for x in value.values()) if v)
    return str(value)


def cell(value: object) -> object:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() and abs(value) < 2**53 else float(round(value, 6))
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (bytes, memoryview)):
        return bytes(value).decode("utf-8", "replace")
    if isinstance(value, str):
        trimmed = value.strip()
        if len(trimmed) >= 2 and trimmed[0] in "{[":
            try:
                return _flatten_json(json.loads(trimmed)) or value
            except json.JSONDecodeError:
                return value
        return value
    return value


def shape_result(columns: list[ColumnMeta], rows: list[tuple]) -> tuple[list[dict], list[dict], dict | None]:
    column_payload = [
        {
            "key": c.key,
            "label": c.label,
            "calc": "Sum" if c.total else "None",
            "colType": "calculated" if c.is_calculated else "value",
            "width": 160,
            "isCalculated": c.is_calculated,
            "dataType": c.dtype,
            "role": c.role,
            "ref": c.ref,
        }
        for c in columns
    ]
    out_rows = [{c.key: cell(v) for c, v in zip(columns, row)} for row in rows]

    totals = None
    if any(c.total for c in columns) and out_rows:
        totals = {}
        for i, c in enumerate(columns):
            if c.total:
                s = sum((r[c.key] for r in out_rows if isinstance(r[c.key], (int, float))), 0)
                totals[c.key] = round(s, 6) if isinstance(s, float) else s
            else:
                totals[c.key] = "Total" if i == 0 else ""
    return column_payload, out_rows, totals

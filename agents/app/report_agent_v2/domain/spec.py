"""The saved, reusable report specification (schemaVersion 1).

The LLM never writes SQL. It fills this declarative structure, whose every reference must
point at a catalog field id, a derived id or a measure id. The compiler validates it against
the live catalog and is the only component that produces SQL.

Shape:
    derived  - calculated values, evaluated per row, in order (may reference earlier ones)
    filters  - row conditions (ANDed); conditions on measures become HAVING
    groupBy  - refs to group rows by (empty = one output row per record)
    measures - aggregates (optionally conditional, e.g. SUM(outstanding) WHERE bucket = '31-60')
    columns  - output columns in display order, each a ref plus a display label
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SPEC_SCHEMA_VERSION = 1

DataType = Literal["text", "number", "date", "boolean"]
DerivedOp = Literal[
    "add", "sub", "mul", "div", "coalesce", "round", "days_since", "days_between", "bucket", "if", "date_part",
]
ConditionOp = Literal[
    "equals", "notEquals", "contains", "notContains", "startsWith", "endsWith",
    "gt", "gte", "lt", "lte", "isEmpty", "isNotEmpty", "in", "notIn",
]
AggFn = Literal["sum", "count", "count_distinct", "avg", "min", "max"]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Operand(_Strict):
    """Exactly one of ref / number / text is set."""

    ref: str | None = None
    number: float | None = None
    text: str | None = None


class Condition(_Strict):
    ref: str
    op: ConditionOp
    value: str | None = None
    values: list[str] = Field(default_factory=list)


class Derived(_Strict):
    id: str
    label: str
    data_type: DataType = Field(alias="dataType")
    op: DerivedOp
    args: list[Operand] = Field(default_factory=list)
    edges: list[int] = Field(default_factory=list)
    labels: list[str] = Field(default_factory=list)
    condition: Condition | None = None


class Measure(_Strict):
    id: str
    label: str
    fn: AggFn
    of: str | None = None
    where: list[Condition] = Field(default_factory=list)


class OutputColumn(_Strict):
    ref: str
    label: str


class OrderBy(_Strict):
    ref: str
    direction: Literal["asc", "desc"] = "asc"


class ReportSpec(_Strict):
    schema_version: int = Field(default=SPEC_SCHEMA_VERSION, alias="schemaVersion")
    title: str
    description: str
    derived: list[Derived] = Field(default_factory=list)
    filters: list[Condition] = Field(default_factory=list)
    group_by: list[str] = Field(default_factory=list, alias="groupBy")
    measures: list[Measure] = Field(default_factory=list)
    columns: list[OutputColumn]
    order_by: list[OrderBy] = Field(default_factory=list, alias="orderBy")
    limit: int | None = None
    totals: bool = False
    assumptions: list[str] = Field(default_factory=list)

    def dump(self) -> dict:
        return self.model_dump(by_alias=True, mode="json")


# ---------------------------------------------------------------------------------------------
# JSON schema handed to the model via output_config.format (strict structured output).
# Hand-written so every object is closed (additionalProperties: false) and every property is
# required, with nulls standing in for "not used".
# ---------------------------------------------------------------------------------------------

def _nullable(schema: dict) -> dict:
    return {"anyOf": [schema, {"type": "null"}]}


_STR = {"type": "string"}
_CONDITION = {
    "type": "object",
    "properties": {
        "ref": _STR,
        "op": {"type": "string", "enum": list(ConditionOp.__args__)},
        "value": _nullable(_STR),
        "values": {"type": "array", "items": _STR},
    },
    "required": ["ref", "op", "value", "values"],
    "additionalProperties": False,
}

LLM_OUTPUT_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "title": _STR,
        "description": _STR,
        "derived": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": _STR,
                    "label": _STR,
                    "dataType": {"type": "string", "enum": list(DataType.__args__)},
                    "op": {"type": "string", "enum": list(DerivedOp.__args__)},
                    "args": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "ref": _nullable(_STR),
                                "number": _nullable({"type": "number"}),
                                "text": _nullable(_STR),
                            },
                            "required": ["ref", "number", "text"],
                            "additionalProperties": False,
                        },
                    },
                    "edges": {"type": "array", "items": {"type": "integer"}},
                    "labels": {"type": "array", "items": _STR},
                    "condition": _nullable(_CONDITION),
                },
                "required": ["id", "label", "dataType", "op", "args", "edges", "labels", "condition"],
                "additionalProperties": False,
            },
        },
        "filters": {"type": "array", "items": _CONDITION},
        "groupBy": {"type": "array", "items": _STR},
        "measures": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": _STR,
                    "label": _STR,
                    "fn": {"type": "string", "enum": list(AggFn.__args__)},
                    "of": _nullable(_STR),
                    "where": {"type": "array", "items": _CONDITION},
                },
                "required": ["id", "label", "fn", "of", "where"],
                "additionalProperties": False,
            },
        },
        "columns": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"ref": _STR, "label": _STR},
                "required": ["ref", "label"],
                "additionalProperties": False,
            },
        },
        "orderBy": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"ref": _STR, "direction": {"type": "string", "enum": ["asc", "desc"]}},
                "required": ["ref", "direction"],
                "additionalProperties": False,
            },
        },
        "limit": _nullable({"type": "integer"}),
        "totals": {"type": "boolean"},
        "assumptions": {"type": "array", "items": _STR},
    },
    "required": [
        "title", "description", "derived", "filters", "groupBy", "measures",
        "columns", "orderBy", "limit", "totals", "assumptions",
    ],
    "additionalProperties": False,
}

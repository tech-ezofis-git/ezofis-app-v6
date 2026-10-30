"""Compile a ReportSpec against a SourceCatalog into one parameterized, read-only SELECT.

Security model
--------------
* Identifiers (schemas, tables, columns) only ever come from the introspected catalog and
  are emitted with psycopg.sql.Identifier. Nothing from the spec or the prompt becomes an
  identifier; spec ids are mapped to generated aliases (c0, c1, ...).
* Every user/LLM-supplied value (filter values, literals, bucket labels) is a named bind
  parameter. Integers that become SQL literals (bucket edges, round digits, LIMIT) are
  validated ints rendered via sql.Literal.
* The only statement shape produced is SELECT ... FROM ... [JOIN ...] WHERE ... [GROUP BY]
  [HAVING] [ORDER BY] LIMIT. Functions used are a fixed allow-list written in this module.
* The executor additionally runs it inside a READ ONLY transaction with a statement timeout.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, timedelta

from psycopg import sql

from app.report_agent_v2.domain.source_catalog import NUMBER_PG, FieldDef, SourceCatalog
from app.report_agent_v2.domain.spec import Condition, Derived, Measure, Operand, ReportSpec

_ID = re.compile(r"^[A-Za-z][A-Za-z0-9_.\-]{0,63}$")
_RELATIVE_DATE = re.compile(r"^today\s*(?:([+-])\s*(\d{1,5}))?$", re.IGNORECASE)
_STATUS_LABELS = ["Pending", "Running", "Paused", "Completed", "Failed", "Cancelled"]
_DATE_PARTS = {"day": "YYYY-MM-DD", "week": 'IYYY-"W"IW', "month": "YYYY-MM", "quarter": 'YYYY-"Q"Q', "year": "YYYY"}
MAX_DERIVED = 40
MAX_MEASURES = 40
MAX_COLUMNS = 60
MAX_IN_VALUES = 200


class SpecValidationError(Exception):
    def __init__(self, errors: list[str]) -> None:
        super().__init__("; ".join(errors))
        self.errors = errors


@dataclass
class Expr:
    sql: sql.Composable
    dtype: str  # text | number | date | boolean
    sort: sql.Composable | None = None
    is_aggregate: bool = False


@dataclass
class ColumnMeta:
    key: str
    label: str
    ref: str
    dtype: str
    role: str  # dimension | measure | value
    is_calculated: bool
    total: bool


@dataclass
class CompiledQuery:
    query: sql.Composed
    params: dict
    columns: list[ColumnMeta]
    referenced_fields: set[str]
    warnings: list[str] = field(default_factory=list)


def _ident(*parts: str) -> sql.Composable:
    return sql.SQL(".").join(sql.Identifier(p) for p in parts)


def _user_email(user_id: sql.Composable) -> sql.Composable:
    """users."Users".Email for a user id stored as uuid or text (NULL when unknown — never the raw id)."""
    return sql.SQL('(SELECT u."Email" FROM users."Users" u WHERE (u."Id")::text = NULLIF(btrim(({})::text), \'\') LIMIT 1)').format(user_id)


def _wrap(composable: sql.Composable) -> sql.Composable:
    return sql.SQL("({})").format(composable)


def _safe_numeric(text_expr: sql.Composable) -> sql.Composable:
    # Postgres has no TRY_CAST; strip formatting, cast only when it is a well-formed number.
    cleaned = sql.SQL("regexp_replace(({})::text, '[^0-9.-]', '', 'g')").format(text_expr)
    return sql.SQL("(CASE WHEN {c} ~ '^-?[0-9]*[.]?[0-9]+$' THEN ({c})::numeric END)").format(c=cleaned)


def _safe_date(text_expr: sql.Composable) -> sql.Composable:
    """ISO yyyy-mm-dd (or yyyy/mm/dd) first, then dd-mm-yyyy. Day is clamped to the month,
    so a bad value such as 2026-02-30 can never abort the whole query."""
    t = sql.SQL("btrim(({})::text)").format(text_expr)

    def clamped(y: sql.Composable, m: sql.Composable, d: sql.Composable) -> sql.Composable:
        first = sql.SQL("make_date({}, {}, 1)").format(y, m)
        last_day = sql.SQL("extract(day from ({} + interval '1 month - 1 day'))::int").format(first)
        return sql.SQL("({first} + (LEAST({d}, {last}) - 1))").format(first=first, d=d, last=last_day)

    iso = clamped(
        sql.SQL("substr({},1,4)::int").format(t), sql.SQL("substr({},6,2)::int").format(t), sql.SQL("substr({},9,2)::int").format(t)
    )
    dmy = clamped(
        sql.SQL("substr({},7,4)::int").format(t), sql.SQL("substr({},4,2)::int").format(t), sql.SQL("substr({},1,2)::int").format(t)
    )
    return sql.SQL(
        "(CASE WHEN {t} ~ '^[0-9]{{4}}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12][0-9]|3[01])' THEN {iso} "
        "WHEN {t} ~ '^(0[1-9]|[12][0-9]|3[01])[-/](0[1-9]|1[0-2])[-/][0-9]{{4}}' THEN {dmy} END)"
    ).format(t=t, iso=iso, dmy=dmy)


def _typed_column(ref: sql.Composable, pg_type: str, want: str) -> sql.Composable:
    pg = (pg_type or "").lower()
    if want == "number":
        return sql.SQL("({})::numeric").format(ref) if pg in NUMBER_PG else _safe_numeric(ref)
    if want == "date":
        return sql.SQL("({})::date").format(ref) if pg.startswith(("date", "timestamp")) else _safe_date(ref)
    if want == "boolean":
        if pg == "boolean":
            return ref
        return sql.SQL("(lower(btrim(({})::text)) IN ('true','yes','1','y'))").format(ref)
    return ref


class _Compiler:
    def __init__(self, spec: ReportSpec, catalog: SourceCatalog, as_of: date | None, max_rows: int) -> None:
        self.spec = spec
        self.catalog = catalog
        self.as_of = as_of
        self.max_rows = max_rows
        self.params: dict[str, object] = {}
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.requires: set[str] = set()
        self.referenced: set[str] = set()
        self.env: dict[str, Expr] = {}
        self.measures: dict[str, Expr] = {}
        # Derived/measure ids that already failed with their own error. Later uses of them are
        # skipped silently so the repair feedback lists root causes, not a cascade of echoes.
        self.broken: set[str] = set()

    # -- parameters ----------------------------------------------------------------------
    def bind(self, value: object, cast: str | None = None) -> sql.Composable:
        name = f"p{len(self.params)}"
        self.params[name] = value
        placeholder = sql.Placeholder(name)
        return sql.SQL("{}::{}").format(placeholder, sql.SQL(cast)) if cast else placeholder

    def as_of_sql(self) -> sql.Composable:
        if self.as_of is None:
            return sql.SQL("CURRENT_DATE")
        return self.bind(self.as_of, "date")

    # -- references ----------------------------------------------------------------------
    def field_expr(self, f: FieldDef) -> Expr:
        self.referenced.add(f.id)
        self.requires |= set(f.requires)
        c = self.catalog
        if f.alias == "e" and f.column:
            if f.column == "item_id":
                return Expr(sql.SQL("({})::text").format(_ident("e", "item_id")), "text")
            return Expr(_typed_column(_ident("e", f.column), f.pg_type, f.data_type), f.data_type)
        if f.system == "request_no":
            return Expr(_ident("wi", "reference_number"), "text")
        if f.system == "request_status":
            whens = sql.SQL(" ").join(
                sql.SQL("WHEN {} THEN {}").format(sql.Literal(i), sql.Literal(label)) for i, label in enumerate(_STATUS_LABELS)
            )
            return Expr(sql.SQL("(CASE wi.status {} ELSE (wi.status)::text END)").format(whens), "text")
        if f.system == "request_raised_at":
            return Expr(_typed_column(_ident("wi", "created_at_utc"), c.instances_columns["created_at_utc"], "date"), "date")
        if f.system == "request_completed_at":
            return Expr(_typed_column(_ident("wi", "completed_at_utc"), c.instances_columns["completed_at_utc"], "date"), "date")
        if f.system == "current_stage":
            return Expr(self._coalesce_inbox(["stage", "name"], "text"), "text")
        if f.system == "created_by":
            ids = []
            if "instances" in f.requires:
                ids.append(_ident("wi", "started_by"))
            if "created_by" in c.process_form_columns:
                ids.append(_ident("pf", "created_by"))
            if "created_by" in c.items_columns:
                ids.append(_ident("e", "created_by"))
            return Expr(sql.SQL("COALESCE({})").format(sql.SQL(", ").join(_user_email(i) for i in ids)), "text")
        if f.system == "last_action_by":
            # Prefer stored emails, then resolve user ids to emails; a display name only as last resort.
            parts = [sql.SQL("NULLIF(btrim(({})::text), '')").format(_ident("mb", col))
                     for col in ("activity_user_email", "transaction_created_by_email") if col in c.inbox_columns]
            if self.catalog.has_users:
                parts += [_user_email(_ident("mb", col)) for col in ("transaction_created_by", "user_id") if col in c.inbox_columns]
            if "created_by_name" in c.inbox_columns:
                parts.append(sql.SQL("NULLIF(btrim(({})::text), '')").format(_ident("mb", "created_by_name")))
            return Expr(sql.SQL("COALESCE({})").format(sql.SQL(", ").join(parts)), "text")
        if f.system == "stage_since":
            return Expr(self._coalesce_inbox(["started_at_utc", "created_at_utc", "transaction_created_at"], "date"), "date")
        raise SpecValidationError([f"Field '{f.id}' cannot be compiled."])

    def _coalesce_inbox(self, columns: list[str], want: str) -> sql.Composable:
        parts = []
        for col in columns:
            if col in self.catalog.inbox_columns:
                ref = _ident("mb", col)
                if want == "text":
                    parts.append(sql.SQL("NULLIF(btrim(({})::text), '')").format(ref))
                else:
                    parts.append(_typed_column(ref, self.catalog.inbox_columns[col], want))
        return sql.SQL("COALESCE({})").format(sql.SQL(", ").join(parts))

    def resolve(self, ref: str | None, where: str, allow_measures: bool = False) -> Expr | None:
        if not ref:
            self.errors.append(f"{where}: a reference is required.")
            return None
        if ref in self.broken:
            return None
        if ref in self.env:
            return self.env[ref]
        if allow_measures and ref in self.measures:
            return self.measures[ref]
        f = self.catalog.fields.get(ref)
        if f is not None:
            expr = self.field_expr(f)
            self.env[ref] = expr
            return expr
        if ref in self.measures:
            self.errors.append(f"{where}: measure '{ref}' cannot be used here.")
        else:
            self.errors.append(f"{where}: unknown reference '{ref}'. Use a field id from the catalog or an earlier derived id.")
        return None

    def coerce(self, expr: Expr, want: str, where: str) -> Expr:
        if expr.dtype == want:
            return expr
        if want == "text":
            return Expr(sql.SQL("({})::text").format(expr.sql), "text")
        if expr.dtype == "text" and want in ("number", "date"):
            self.warnings.append(f"{where}: text values are converted to {want}; unparseable values become empty.")
            fn = _safe_numeric if want == "number" else _safe_date
            return Expr(fn(expr.sql), want)
        self.errors.append(f"{where}: expected a {want} value but got {expr.dtype}.")
        return Expr(sql.SQL("NULL"), want)

    def operand(self, op: Operand, want: str, where: str) -> Expr | None:
        set_count = sum(v is not None for v in (op.ref, op.number, op.text))
        if set_count != 1:
            self.errors.append(f"{where}: each argument must set exactly one of ref, number or text.")
            return None
        if op.ref is not None:
            expr = self.resolve(op.ref, where)
            return self.coerce(expr, want, where) if expr else None
        if op.number is not None:
            return self.coerce(Expr(self.bind(op.number, "numeric"), "number"), want, where)
        return self.coerce(Expr(self.bind(op.text, "text"), "text"), want, where)

    # -- derived values ------------------------------------------------------------------
    def derived(self, d: Derived) -> None:
        where = f"derived '{d.id}'"
        # Models often pad args with all-null placeholders ({ref: null, number: null, text: null});
        # they carry no value, so drop them instead of failing the arity checks below.
        args = [a for a in d.args if a.ref or a.number is not None or a.text is not None]
        if d.op in ("add", "sub", "mul", "div"):
            if len(args) < 2:
                self.errors.append(f"{where}: {d.op} needs at least two arguments.")
                return
            parts = [self.operand(a, "number", where) for a in args]
            if any(p is None for p in parts):
                return
            if d.op == "div":
                expr = parts[0].sql
                for p in parts[1:]:
                    expr = sql.SQL("({} / NULLIF({}, 0))").format(expr, p.sql)
            else:
                symbol = {"add": " + ", "sub": " - ", "mul": " * "}[d.op]
                expr = _wrap(sql.SQL(symbol).join(p.sql for p in parts))
            result = Expr(expr, "number")
        elif d.op == "coalesce":
            if not args:
                self.errors.append(f"{where}: coalesce needs arguments.")
                return
            parts = [self.operand(a, d.data_type, where) for a in args]
            if any(p is None for p in parts):
                return
            result = Expr(sql.SQL("COALESCE({})").format(sql.SQL(", ").join(p.sql for p in parts)), d.data_type)
        elif d.op == "round":
            if not args:
                self.errors.append(f"{where}: round needs a value argument.")
                return
            value = self.operand(args[0], "number", where)
            digits = int(args[1].number) if len(args) > 1 and args[1].number is not None else 2
            if value is None:
                return
            result = Expr(sql.SQL("round(({})::numeric, {})").format(value.sql, sql.Literal(max(0, min(digits, 6)))), "number")
        elif d.op == "days_since":
            if len(args) != 1:
                self.errors.append(f"{where}: days_since takes exactly one date argument.")
                return
            value = self.operand(args[0], "date", where)
            if value is None:
                return
            result = Expr(sql.SQL("({} - {})").format(self.as_of_sql(), value.sql), "number")
        elif d.op == "days_between":
            if len(args) != 2:
                self.errors.append(f"{where}: days_between takes exactly two date arguments (start, end).")
                return
            start, end = (self.operand(a, "date", where) for a in args)
            if start is None or end is None:
                return
            result = Expr(sql.SQL("({} - {})").format(end.sql, start.sql), "number")
        elif d.op == "date_part":
            part = (args[1].text or "").strip().lower() if len(args) == 2 else ""
            if part not in _DATE_PARTS:
                self.errors.append(f"{where}: date_part takes a date and one of {', '.join(map(repr, _DATE_PARTS))} as text.")
                return
            value = self.operand(args[0], "date", where)
            if value is None:
                return
            # Sortable text labels (2026-03, 2026-Q1, ...) so grouping and ordering both work.
            result = Expr(sql.SQL("to_char({}, {})").format(value.sql, sql.Literal(_DATE_PARTS[part])), "text")
        elif d.op == "bucket":
            result = self._bucket(d, args, where)
            if result is None:
                return
        elif d.op == "if":
            if d.condition is None or len(args) != 2:
                self.errors.append(f"{where}: if needs a condition and two arguments (then, else).")
                return
            cond = self.condition(d.condition, where, allow_measures=False)
            then, other = (self.operand(a, d.data_type, where) for a in args)
            if cond is None or then is None or other is None:
                return
            result = Expr(sql.SQL("(CASE WHEN {} THEN {} ELSE {} END)").format(cond, then.sql, other.sql), d.data_type)
        else:  # pragma: no cover - guarded by the Literal type
            self.errors.append(f"{where}: unsupported op '{d.op}'.")
            return

        if result.dtype != d.data_type and d.op not in ("bucket", "date_part"):
            result = self.coerce(result, d.data_type, where)
        self.env[d.id] = result

    def _bucket(self, d: Derived, args: list[Operand], where: str) -> Expr | None:
        if len(args) != 1:
            self.errors.append(f"{where}: bucket takes exactly one numeric argument.")
            return None
        edges, labels = list(d.edges), d.labels
        if edges and len(labels) == len(edges) and edges[0] <= 0 and labels[0].strip().startswith("0"):
            # Common off-by-one: a leading 0 edge with labels "0-30", "31-60", ... (0 is a lower
            # bound, not an upper one). Dropping it gives exactly the labelled ranges.
            edges = edges[1:]
            self.warnings.append(f"{where}: ignored the leading 0 edge so the labels line up with the ranges.")
        if not edges or any(b <= a for a, b in zip(edges, edges[1:])):
            self.errors.append(f"{where}: edges must be a non-empty, strictly increasing list of integers.")
            return None
        if len(labels) != len(edges) + 1:
            self.errors.append(f"{where}: labels must have exactly len(edges) + 1 entries.")
            return None
        value = self.operand(args[0], "number", where)
        if value is None:
            return None
        label_whens, sort_whens = [], []
        for i, edge in enumerate(edges):
            cond = sql.SQL("{} <= {}").format(value.sql, sql.Literal(int(edge)))
            label_whens.append(sql.SQL("WHEN {} THEN {}").format(cond, self.bind(labels[i], "text")))
            sort_whens.append(sql.SQL("WHEN {} THEN {}").format(cond, sql.Literal(i)))
        label_sql = sql.SQL("(CASE WHEN {v} IS NULL THEN NULL {w} ELSE {last} END)").format(
            v=value.sql, w=sql.SQL(" ").join(label_whens), last=self.bind(labels[-1], "text")
        )
        sort_sql = sql.SQL("(CASE WHEN {v} IS NULL THEN NULL {w} ELSE {n} END)").format(
            v=value.sql, w=sql.SQL(" ").join(sort_whens), n=sql.Literal(len(edges))
        )
        return Expr(label_sql, "text", sort=sort_sql)

    # -- conditions ----------------------------------------------------------------------
    def _date_value(self, raw: str, where: str) -> sql.Composable | None:
        m = _RELATIVE_DATE.match(raw.strip())
        if m:
            base = self.as_of or None
            offset = int(m.group(2) or 0) * (-1 if m.group(1) == "-" else 1)
            if base is not None:
                return self.bind(base + timedelta(days=offset), "date")
            return sql.SQL("(CURRENT_DATE + {})").format(sql.Literal(offset))
        try:
            return self.bind(date.fromisoformat(raw.strip()[:10]), "date")
        except ValueError:
            self.errors.append(f"{where}: '{raw}' is not a date (use YYYY-MM-DD, 'today' or 'today-30').")
            return None

    def _number_value(self, raw: str, where: str) -> sql.Composable | None:
        try:
            return self.bind(float(raw.replace(",", "").strip()), "numeric")
        except ValueError:
            self.errors.append(f"{where}: '{raw}' is not a number.")
            return None

    def condition(self, c: Condition, where: str, allow_measures: bool) -> sql.Composable | None:
        expr = self.resolve(c.ref, where, allow_measures=allow_measures)
        if expr is None:
            return None
        op = c.op
        if op in ("isEmpty", "isNotEmpty"):
            empty = sql.SQL("({e} IS NULL OR btrim(({e})::text) = '')").format(e=expr.sql)
            return empty if op == "isEmpty" else sql.SQL("NOT {}").format(empty)
        if op in ("in", "notIn"):
            values = [v for v in c.values if v is not None and str(v).strip() != ""]
            if not values or len(values) > MAX_IN_VALUES:
                self.errors.append(f"{where}: '{op}' needs between 1 and {MAX_IN_VALUES} values.")
                return None
            if expr.dtype == "number":
                try:
                    nums = [float(v.replace(",", "")) for v in values]
                except ValueError:
                    self.errors.append(f"{where}: '{op}' values must be numbers for a number field.")
                    return None
                test = sql.SQL("{} = ANY({})").format(expr.sql, self.bind(nums, "numeric[]"))
            else:
                test = sql.SQL("lower(({})::text) = ANY({})").format(
                    expr.sql, self.bind([v.strip().lower() for v in values], "text[]")
                )
            return test if op == "in" else sql.SQL("NOT COALESCE({}, false)").format(test)

        raw = c.value if c.value is not None else (c.values[0] if c.values else None)
        if raw is None or str(raw).strip() == "":
            self.errors.append(f"{where}: operator '{op}' needs a value.")
            return None
        raw = str(raw)

        if op in ("contains", "notContains", "startsWith", "endsWith"):
            escaped = raw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            pattern = {"contains": f"%{escaped}%", "notContains": f"%{escaped}%", "startsWith": f"{escaped}%", "endsWith": f"%{escaped}"}[op]
            like = sql.SQL("({})::text ILIKE {}").format(expr.sql, self.bind(pattern, "text"))
            return sql.SQL("NOT COALESCE({}, false)").format(like) if op == "notContains" else like

        dtype = expr.dtype
        if dtype == "text" and op in ("gt", "gte", "lt", "lte"):
            # Ordering text fields: numeric if the value is numeric, otherwise date.
            try:
                float(raw.replace(",", ""))
                expr, dtype = self.coerce(expr, "number", where), "number"
            except ValueError:
                expr, dtype = self.coerce(expr, "date", where), "date"
        symbol = {"equals": "=", "notEquals": "<>", "gt": ">", "gte": ">=", "lt": "<", "lte": "<="}[op]
        if dtype == "number":
            value = self._number_value(raw, where)
            lhs = expr.sql
        elif dtype == "date":
            value = self._date_value(raw, where)
            lhs = expr.sql
        elif dtype == "boolean":
            value = self.bind(raw.strip().lower() in ("true", "yes", "1", "y"), "boolean")
            lhs = expr.sql
        else:
            value = self.bind(raw.strip().lower(), "text")
            lhs = sql.SQL("lower(btrim(({})::text))").format(expr.sql)
        if value is None:
            return None
        test = sql.SQL("{} {} {}").format(lhs, sql.SQL(symbol), value)
        # "not equal to X" includes empty values, matching what a user expects from the grid.
        return sql.SQL("({} IS NULL OR {})").format(lhs, test) if op == "notEquals" else test

    # -- measures ------------------------------------------------------------------------
    def measure(self, m: Measure) -> None:
        where = f"measure '{m.id}'"
        conds = [self.condition(c, f"{where} where", allow_measures=False) for c in m.where]
        if any(c is None for c in conds):
            return
        filt = sql.SQL(" FILTER (WHERE {})").format(sql.SQL(" AND ").join(conds)) if conds else sql.SQL("")
        if m.fn == "count" and not m.of:
            self.measures[m.id] = Expr(sql.SQL("COUNT(*){}").format(filt), "number", is_aggregate=True)
            return
        arg = self.resolve(m.of, where)
        if arg is None:
            return
        if m.fn in ("sum", "avg"):
            arg = self.coerce(arg, "number", where)
            agg, dtype = sql.SQL(m.fn.upper()), "number"
        elif m.fn == "count":
            agg, dtype = sql.SQL("COUNT"), "number"
        elif m.fn == "count_distinct":
            self.measures[m.id] = Expr(sql.SQL("COUNT(DISTINCT {}){}").format(arg.sql, filt), "number", is_aggregate=True)
            return
        else:
            agg, dtype = sql.SQL(m.fn.upper()), arg.dtype
        self.measures[m.id] = Expr(sql.SQL("{}({}){}").format(agg, arg.sql, filt), dtype, is_aggregate=True)

    # -- FROM ----------------------------------------------------------------------------
    def from_clause(self) -> tuple[sql.Composable, list[sql.Composable]]:
        c = self.catalog
        items = _ident(c.items_schema, c.items_table)
        base_where: list[sql.Composable] = []
        if c.deleted_column:
            base_where.append(sql.SQL("({col} = false OR {col} IS NULL)").format(col=_ident("e", c.deleted_column)))
        parts: list[sql.Composable] = []
        if c.process_form_table:
            item_type = c.items_columns.get("item_id", "")
            if item_type and item_type == c.process_form_entry_type:
                on = sql.SQL("e.item_id = pf.form_entry_id")
            else:
                on = sql.SQL("(e.item_id)::text = (pf.form_entry_id)::text")
            parts.append(sql.SQL("FROM {} pf JOIN {} e ON {}").format(_ident("workflow", c.process_form_table), items, on))
            base_where.insert(0, sql.SQL("(pf.is_deleted = false OR pf.is_deleted IS NULL)"))
        else:
            parts.append(sql.SQL("FROM {} e").format(items))

        if "instances" in self.requires and c.instances_table and c.process_form_table:
            parts.append(sql.SQL("LEFT JOIN {} wi ON wi.id = pf.workflow_instance_id").format(_ident("workflow", c.instances_table)))
        if "inbox" in self.requires and c.inbox_table:
            match = [sql.SQL("(mb0.form_entry_id)::text = (e.item_id)::text")]
            if c.process_form_table and "workflow_instance_id" in c.inbox_columns:
                match.append(sql.SQL("(mb0.workflow_instance_id)::text = (pf.workflow_instance_id)::text"))
            order_cols = [col for col in ("started_at_utc", "created_at_utc", "transaction_created_at") if col in c.inbox_columns]
            order = (
                sql.SQL(" ORDER BY COALESCE({}) DESC NULLS LAST").format(sql.SQL(", ").join(_ident("mb0", col) for col in order_cols))
                if order_cols
                else sql.SQL("")
            )
            parts.append(
                sql.SQL("LEFT JOIN LATERAL (SELECT mb0.* FROM {} mb0 WHERE {}{} LIMIT 1) mb ON true").format(
                    _ident("workflow", c.inbox_table), sql.SQL(" OR ").join(match), order
                )
            )
        return sql.SQL(" ").join(parts), base_where

    # -- main ----------------------------------------------------------------------------
    def compile(self, extra_filters: list[Condition], limit_override: int | None) -> CompiledQuery:
        s = self.spec
        if s.schema_version != 1:
            raise SpecValidationError([f"Unsupported spec schemaVersion {s.schema_version}."])
        if len(s.derived) > MAX_DERIVED or len(s.measures) > MAX_MEASURES or len(s.columns) > MAX_COLUMNS:
            raise SpecValidationError(["Report is too large (too many derived values, measures or columns)."])
        if not s.columns:
            raise SpecValidationError(["At least one output column is required."])

        declared: set[str] = set()
        for item_id in [d.id for d in s.derived] + [m.id for m in s.measures]:
            if not _ID.match(item_id):
                self.errors.append(f"id '{item_id}' must start with a letter and use letters, digits, _ . - only.")
            elif item_id in declared or item_id in self.catalog.fields:
                self.errors.append(f"id '{item_id}' is duplicated or collides with a catalog field id.")
            declared.add(item_id)

        for d in s.derived:
            self.derived(d)
            if d.id not in self.env:
                self.broken.add(d.id)
        for m in s.measures:
            self.measure(m)
            if m.id not in self.measures:
                self.broken.add(m.id)

        row_filters, having = [], []
        for i, f in enumerate(list(s.filters) + list(extra_filters)):
            target = having if f.ref in self.measures else row_filters
            cond = self.condition(f, f"filter #{i + 1}", allow_measures=True)
            if cond is not None:
                target.append(cond)

        grouped = bool(s.group_by or s.measures)
        group_exprs: dict[str, Expr] = {}
        for ref in s.group_by:
            expr = self.resolve(ref, f"groupBy '{ref}'")
            if expr is not None:
                group_exprs[ref] = expr

        select_parts: list[sql.Composable] = []
        columns: list[ColumnMeta] = []
        alias_of: dict[str, sql.Composable] = {}
        used_keys: set[str] = set()
        derived_ids = {d.id for d in s.derived}
        measure_fn = {m.id: m.fn for m in s.measures}
        for i, col in enumerate(s.columns):
            where = f"column '{col.ref}'"
            if col.ref in self.broken:
                continue
            if col.ref in self.measures:
                expr, role = self.measures[col.ref], "measure"
            elif grouped:
                if col.ref not in group_exprs:
                    self.errors.append(f"{where}: in a grouped report every non-measure column must be listed in groupBy.")
                    continue
                expr, role = group_exprs[col.ref], "dimension"
            else:
                expr = self.resolve(col.ref, where)
                role = "value"
                if expr is None:
                    continue
            alias = sql.Identifier(f"c{i}")
            alias_of[col.ref] = alias
            select_parts.append(sql.SQL("{} AS {}").format(expr.sql, alias))
            key = (col.label or col.ref).strip() or col.ref
            if key in used_keys:
                key = f"{key}_{i}"
            used_keys.add(key)
            total = s.totals and expr.dtype == "number" and (
                (role == "measure" and measure_fn.get(col.ref) in ("sum", "count", "count_distinct"))
                or (role == "value" and col.ref in derived_ids)
            )
            columns.append(
                ColumnMeta(
                    key=key, label=key, ref=col.ref, dtype=expr.dtype, role=role,
                    is_calculated=col.ref in derived_ids or role == "measure", total=bool(total),
                )
            )

        order_parts: list[sql.Composable] = []
        for o in s.order_by:
            if o.ref in self.broken:
                continue
            if o.ref in self.measures:
                expr = self.measures[o.ref]
            elif grouped and o.ref not in group_exprs:
                self.errors.append(f"orderBy '{o.ref}': must be a groupBy ref or a measure in a grouped report.")
                continue
            else:
                expr = group_exprs.get(o.ref) or self.resolve(o.ref, f"orderBy '{o.ref}'")
                if expr is None:
                    continue
            direction = sql.SQL("DESC NULLS LAST" if o.direction == "desc" else "ASC NULLS LAST")
            order_parts.append(sql.SQL("{} {}").format(expr.sort or expr.sql, direction))

        if self.errors:
            raise SpecValidationError(list(dict.fromkeys(self.errors)))

        from_sql, base_where = self.from_clause()
        where_parts = base_where + row_filters
        if not order_parts and not grouped and "created_at" in self.catalog.items_columns:
            order_parts.append(sql.SQL("e.created_at DESC NULLS LAST"))

        limit = min(x for x in (s.limit, limit_override, self.max_rows) if x is not None and x > 0)
        query = sql.SQL(" ").join(
            p
            for p in (
                sql.SQL("SELECT {}").format(sql.SQL(", ").join(select_parts)),
                from_sql,
                sql.SQL("WHERE {}").format(sql.SQL(" AND ").join(where_parts)) if where_parts else None,
                sql.SQL("GROUP BY {}").format(sql.SQL(", ").join(e.sql for e in group_exprs.values())) if group_exprs else None,
                sql.SQL("HAVING {}").format(sql.SQL(" AND ").join(having)) if having else None,
                sql.SQL("ORDER BY {}").format(sql.SQL(", ").join(order_parts)) if order_parts else None,
                sql.SQL("LIMIT {}").format(sql.Literal(int(limit))),
            )
            if p is not None
        )
        return CompiledQuery(query, self.params, columns, self.referenced, sorted(set(self.warnings)))


def compile_spec(
    spec: ReportSpec,
    catalog: SourceCatalog,
    *,
    max_rows: int,
    as_of: date | None = None,
    extra_filters: list[Condition] | None = None,
    limit_override: int | None = None,
) -> CompiledQuery:
    return _Compiler(spec, catalog, as_of, max_rows).compile(extra_filters or [], limit_override)

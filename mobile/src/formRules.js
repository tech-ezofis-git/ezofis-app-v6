// Field-level conditional rules, ported from the web rule engine (app/src/pages/form-builder/helpers/ruleEngine.ts):
// settings.validation.enableSettings ("show"), readonlySettings, mandatorySettings (source-driven arrays
// [{ value, controls, operator?, notEqual? }] and target-driven objects { show|readonly|mandatory, conditions }) and
// settings.logic (SHOW / HIDE / ENABLE / DISABLE / REQUIRE with conditions). Hidden fields don't feed other rules.
// Sections (panels) take part too: a rule can show / hide a section, a hidden section hides its fields, and the first
// section is never hidden. Form-level declarative rules (form settings.rules with conditions + actions) are applied.
// Rules may name a field by id, jsonId or name (V5 forms), as the web resolves them.
// fieldStates(fields, values, { panels, rules }) → { [id]: { visible, disabled, required, lockedByRule } }

const str = (v) => (v === undefined || v === null ? '' : String(v));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function unwrap(v) {
  if (!isObj(v)) return v;
  if ('currency' in v && 'value' in v) return v.value;
  if ('phoneNo' in v) return v.phoneNo;
  if ('value' in v) return v.value;
  if ('label' in v) return v.label;
  return v;
}
function nums(a, b) {
  const x = unwrap(a); const y = unwrap(b);
  if (x === '' || x == null || y === '' || y == null || typeof x === 'boolean' || typeof y === 'boolean') return null;
  const n = Number(str(x).replace(/,/g, '')); const m = Number(str(y).replace(/,/g, ''));
  return Number.isFinite(n) && Number.isFinite(m) ? { a: n, b: m } : null;
}
const BOOL = /^(true|false)$/i;
function equals(fv, tv, ci) {
  if (Array.isArray(fv)) return Array.isArray(tv) ? fv.length === tv.length && fv.every((x, i) => equals(x, tv[i], ci)) : fv.some((x) => equals(x, tv, ci));
  if (isObj(fv) && 'currency' in fv && typeof tv === 'string' && /^[A-Za-z]{3}$/.test(tv.trim()) && str(fv.currency).toLowerCase() === tv.trim().toLowerCase()) return true;
  const l = unwrap(fv); const r = unwrap(tv);
  if ((typeof l === 'boolean' || BOOL.test(str(l).trim())) && (typeof r === 'boolean' || BOOL.test(str(r).trim()))) return (l === true || /^true$/i.test(str(l).trim())) === (r === true || /^true$/i.test(str(r).trim()));
  const n = nums(l, r);
  if (n) return n.a === n.b;
  return ci ? str(l).trim().toLowerCase() === str(r).trim().toLowerCase() : str(l).trim() === str(r).trim();
}
function isEmpty(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return !v.trim();
  if (Array.isArray(v)) return !v.length;
  if (isObj(v)) { if ('phoneNo' in v) return !str(v.phoneNo).trim(); if ('value' in v) return isEmpty(v.value); return !Object.keys(v).length; }
  return false;
}
const listOf = (tv) => (Array.isArray(tv) ? tv : str(tv).split(',').map((x) => x.trim()).filter(Boolean));
const anyOf = (fv, tv) => { if (isEmpty(fv)) return false; const l = listOf(tv); return !!l.length && (Array.isArray(fv) ? fv.some((x) => l.some((t) => equals(x, t, true))) : l.some((t) => equals(fv, t, true))); };
const text = (fn) => (fv, tv) => { if (isEmpty(fv)) return false; const r = str(unwrap(tv)).toLowerCase(); return !!r && fn(str(unwrap(fv)).toLowerCase(), r); };
const contains = (fv, tv) => (Array.isArray(fv) ? !isEmpty(fv) && fv.some((x) => equals(x, tv, true)) : text((a, b) => a.includes(b))(fv, tv));
const OPS = {
  EQUALS: (a, b) => equals(a, b, false), NOT_EQUALS: (a, b) => !equals(a, b, false),
  GREATER_THAN: (a, b) => { const n = nums(a, b); return !!n && n.a > n.b; }, GREATER_THAN_OR_EQUAL: (a, b) => { const n = nums(a, b); return !!n && n.a >= n.b; },
  LESS_THAN: (a, b) => { const n = nums(a, b); return !!n && n.a < n.b; }, LESS_THAN_OR_EQUAL: (a, b) => { const n = nums(a, b); return !!n && n.a <= n.b; },
  CONTAINS: contains, NOT_CONTAINS: (a, b) => !contains(a, b),
  STARTS_WITH: text((a, b) => a.startsWith(b)), NOT_STARTS_WITH: (a, b) => !text((x, y) => x.startsWith(y))(a, b),
  ENDS_WITH: text((a, b) => a.endsWith(b)), NOT_ENDS_WITH: (a, b) => !text((x, y) => x.endsWith(y))(a, b),
  IS_EMPTY: (a) => isEmpty(a), IS_NOT_EMPTY: (a) => !isEmpty(a),
  IS_ANY_OF: anyOf, IN: anyOf, IS_NOT_ANY_OF: (a, b) => !anyOf(a, b), NOT_IN: (a, b) => !anyOf(a, b),
};
const ALIAS = {
  '=': 'EQUALS', '==': 'EQUALS', '===': 'EQUALS', EQUAL: 'EQUALS', EQUAL_TO: 'EQUALS', IS: 'EQUALS', IS_EQUALS_TO: 'EQUALS',
  '!=': 'NOT_EQUALS', '!==': 'NOT_EQUALS', '<>': 'NOT_EQUALS', NOT_EQUAL: 'NOT_EQUALS', NOT_EQUAL_TO: 'NOT_EQUALS', IS_NOT: 'NOT_EQUALS', IS_NOT_EQUALS_TO: 'NOT_EQUALS',
  '>': 'GREATER_THAN', GT: 'GREATER_THAN', IS_GREATER_THAN: 'GREATER_THAN', '>=': 'GREATER_THAN_OR_EQUAL', GTE: 'GREATER_THAN_OR_EQUAL', IS_GREATER_THAN_OR_EQUALS_TO: 'GREATER_THAN_OR_EQUAL',
  '<': 'LESS_THAN', LT: 'LESS_THAN', IS_LESS_THAN: 'LESS_THAN', IS_LESSER_THAN: 'LESS_THAN', '<=': 'LESS_THAN_OR_EQUAL', LTE: 'LESS_THAN_OR_EQUAL', IS_LESS_THAN_OR_EQUALS_TO: 'LESS_THAN_OR_EQUAL', IS_LESSER_THAN_OR_EQUALS_TO: 'LESS_THAN_OR_EQUAL',
  '{}': 'IS_EMPTY', EMPTY: 'IS_EMPTY', '!{}': 'IS_NOT_EMPTY', NOT_EMPTY: 'IS_NOT_EMPTY',
};
function op(raw) {
  const u = str(raw || 'EQUALS').trim().toUpperCase().replace(/\s*\([^)]*\)\s*$/, '');
  return OPS[u] || OPS[ALIAS[u]] || OPS[ALIAS[str(raw).trim()]] || null;
}
// value match for source-driven rules: with an operator use it, else non-empty + case-insensitive equality
export function valueMatches(v, ruleValue, operator) {
  const f = operator ? op(operator) : null;
  if (f) return f(v, ruleValue);
  return !isEmpty(v) && equals(v, ruleValue, true);
}

// id aliases (jsonId / name → id) for the evaluation in progress
let IDS = new Map();
const resolve = (id) => IDS.get(String(id)) || String(id);
const valueOf = (id, vals) => { if (!id) return undefined; if (id in vals) return vals[id]; const r = resolve(id); return r in vals ? vals[r] : undefined; };
export function conditionMet(c, vals) {
  if (!isObj(c)) return true;
  if (Array.isArray(c.conditions) && c.conditions.length) return conditionsMet(c.conditions, vals, c.groupLogic || c.logic || c.condition || 'ALL');
  const fv = valueOf(c.fieldId ?? c.field ?? c.name, vals);
  const tv = c.fieldValue === true && typeof c.value === 'string' ? valueOf(c.value, vals) : c.value;
  const raw = c.operator ?? c.logic ?? (typeof c.condition === 'string' && !/^(AND|OR|ALL|ANY)$/i.test(c.condition) ? c.condition : 'EQUALS');
  const f = op(raw);
  return f ? f(fv, tv) : false;
}
// list of clauses with AND/OR per clause (or the group default), parentheses tokens and nested groups
export function conditionsMet(list, vals, group = 'ALL') {
  if (!Array.isArray(list) || !list.length) return true;
  const def = /^(ANY|OR)$/i.test(str(group)) ? 'OR' : 'AND';
  const comb = (x) => { const r = str(x.logicalOperator ?? x.conditionType ?? (typeof x.condition === 'string' && /^(AND|OR|ALL|ANY)$/i.test(x.condition) ? x.condition : '')).toUpperCase(); return r === 'OR' || r === 'ANY' ? 'OR' : r === 'AND' || r === 'ALL' ? 'AND' : def; };
  const kind = (x) => str(x.type ?? x.name ?? x.operator ?? x.logic ?? '').trim().toUpperCase();
  const bare = (x) => !x.fieldId && !x.field && !x.name;
  const toks = [];
  const join = (c) => { const p = toks[toks.length - 1]; if (p && (p.t === 'V' || p.t === ')')) toks.push({ t: c }); };
  list.forEach((x) => {
    if (!isObj(x)) return;
    const k = kind(x); const v = str(x.value).trim();
    if (/^(LEFT_PARAN?THESES|LEFT_PARENTHESES|LPAREN|\()$/.test(k) || (v === '(' && bare(x))) { join(comb(x)); toks.push({ t: '(' }); return; }
    if (/^(RIGHT_PARAN?THESES|RIGHT_PARENTHESES|RPAREN|\))$/.test(k) || (v === ')' && bare(x))) { toks.push({ t: ')' }); return; }
    if (bare(x) && !Array.isArray(x.conditions)) { const c = str(x.type ?? x.operator ?? x.logic ?? x.condition ?? x.value).toUpperCase(); if (/^(AND|ALL)$/.test(c)) { toks.push({ t: 'AND' }); return; } if (/^(OR|ANY)$/.test(c)) { toks.push({ t: 'OR' }); return; } }
    join(comb(x));
    const o = typeof x.openParen === 'number' ? x.openParen : x.openParen || x.leftParenthesis ? 1 : 0;
    for (let i = 0; i < o; i += 1) toks.push({ t: '(' });
    toks.push({ t: 'V', v: conditionMet(x, vals) });
    const cl = typeof x.closeParen === 'number' ? x.closeParen : x.closeParen || x.rightParenthesis ? 1 : 0;
    for (let i = 0; i < cl; i += 1) toks.push({ t: ')' });
  });
  if (!toks.length) return true;
  let i = 0;
  const prim = () => { const t = toks[i]; if (!t) return true; i += 1; if (t.t === '(') { const r = or(); if (toks[i] && toks[i].t === ')') i += 1; return r; } return t.t === 'V' ? t.v : prim(); };
  const and = () => { let l = prim(); while (toks[i] && toks[i].t === 'AND') { i += 1; const r = prim(); l = l && r; } return l; };
  const or = () => { let l = and(); while (toks[i] && toks[i].t === 'OR') { i += 1; const r = and(); l = l || r; } return l; };
  return or();
}
function enableMatch(srcId, rule, vals) {
  const has = rule.value !== undefined && rule.value !== null && str(rule.value).trim() !== '';
  const primary = has ? valueMatches(valueOf(srcId, vals), rule.value, rule.operator || rule.logic) : !isEmpty(valueOf(srcId, vals));
  const extra = rule.compoundCondition && Array.isArray(rule.otherConditions) && rule.otherConditions.length ? rule.otherConditions : Array.isArray(rule.conditions) && rule.conditions.length ? rule.conditions : null;
  if (!extra) return primary;
  const any = /^(OR|ANY)$/i.test(str(rule.condition || rule.groupLogic || 'AND'));
  const m = conditionsMet(extra, vals, any ? 'ANY' : 'ALL');
  if (!has && Array.isArray(rule.conditions) && rule.conditions.length) return m;
  return any ? primary || m : primary && m;
}
function logicResult(rules, vals) {
  const met = (a) => { const l = rules.filter((r) => r.action === a); return { has: l.length > 0, any: l.some((r) => conditionMet(r, vals)) }; };
  const show = met('SHOW'); const hide = met('HIDE'); const en = met('ENABLE'); const dis = met('DISABLE'); const req = met('REQUIRE');
  const out = {};
  if (show.has) out.visible = show.any; else if (hide.has) out.visible = !hide.any;
  if (en.has) out.disabled = !en.any; else if (dis.has) out.disabled = dis.any;
  if (req.has) out.required = req.any;
  return out;
}

// form-level rule actions (web FormRuleEngine.applyAction)
function applyAction(a, st) {
  const raw = a.targetFieldIds || (a.targetFieldId ? [a.targetFieldId] : null) || (a.field ? [a.field] : null) || a.controls || [];
  (Array.isArray(raw) ? raw : [raw]).forEach((rid) => {
    const s = st[resolve(rid)]; if (!s) return;
    const t = str(a.type || a.action).toUpperCase();
    if (t === 'SET_ENABLED') s.disabled = !a.value;
    else if (t === 'ENABLE_FIELD' || t === 'ENABLE') s.disabled = false;
    else if (t === 'DISABLE_FIELD' || t === 'DISABLE') s.disabled = true;
    else if (t === 'SET_VISIBLE' || t === 'SHOW') s.visible = a.value !== false;
    else if (t === 'HIDE') s.visible = false;
    else if (t === 'SET_REQUIRED' || t === 'REQUIRE' || t === 'MANDATORY') s.required = a.value !== false;
  });
}
const VIS = /^(SET_VISIBLE|SHOW|HIDE)$/;
function runRules(rules, vals, st, visibility) {
  (rules || []).forEach((r) => {
    if (!r || !(Array.isArray(r.actions) || Array.isArray(r.then) || Array.isArray(r.elseActions) || Array.isArray(r.else))) return;
    const met = !Array.isArray(r.conditions) || !r.conditions.length || conditionsMet(r.conditions, vals, r.groupLogic || 'ALL');
    const acts = (met ? r.actions || r.then : r.elseActions || r.else) || [];
    acts.forEach((a) => { if (VIS.test(str(a.type || a.action).toUpperCase()) === visibility) applyAction(a, st); });
  });
}

// fields: [{ id, type, settings, jsonId?, name?, panel? }] (top-level fields; panel = the section id they sit in)
// opts.panels: [{ id, settings }] in form order (panels, then secondary panels); opts.rules: form settings.rules
export function fieldStates(fields, values, opts = {}) {
  const panels = opts.panels || []; const rules = opts.rules || [];
  IDS = new Map();
  fields.forEach((f) => { IDS.set(String(f.id), String(f.id)); if (f.jsonId) IDS.set(String(f.jsonId), String(f.id)); if (f.name) IDS.set(String(f.name), String(f.id)); });
  const st = {};
  const v0 = (f) => (f.settings && f.settings.validation) || {};
  const firstPanel = panels[0] && panels[0].id;
  panels.forEach((p, i) => { const ps = p.settings || {}; st[p.id] = { visible: i === 0 || !(ps.hidden || ps.visibility === 'HIDDEN' || p.hidden), disabled: !!ps.readOnly, required: false, panel: true }; });
  fields.forEach((f) => {
    const g = (f.settings && f.settings.general) || {}; const val = v0(f); const ro = val.readonlySettings;
    st[f.id] = {
      visible: !(g.hidden || g.visibility === 'HIDDEN'),
      disabled: f.type === 'CALCULATED' || !!g.readOnly || g.visibility === 'READ_ONLY' || g.visibility === 'DISABLE' || !!(f.settings && f.settings.specific && f.settings.specific.isReadOnly) || !!(isObj(ro) && (ro.isReadOnly || ro.state)),
      required: val.fieldRule === 'REQUIRED' || val.fieldRule === 'MANDATORY',
    };
  });
  // fields named in any enableSettings start hidden and appear when a visible source matches
  const controlled = new Set();
  fields.forEach((f) => {
    const en = v0(f).enableSettings;
    if (Array.isArray(en)) en.forEach((r) => (r && Array.isArray(r.controls) ? r.controls : []).forEach((id) => { const t = resolve(id); if (t !== firstPanel) controlled.add(t); }));
    else if (isObj(en) && en.enable && Array.isArray(en.conditions) && en.conditions.length) controlled.add(String(f.id));
  });
  const shown = (f) => st[f.id] && st[f.id].visible && !(f.panel && f.panel !== firstPanel && st[f.panel] && !st[f.panel].visible);
  const effective = () => { const e = { ...values }; fields.forEach((f) => { if (!shown(f)) e[f.id] = undefined; }); return e; };
  for (let pass = 0; pass < fields.length + 2; pass += 1) {
    const before = JSON.stringify(Object.values(st).map((x) => x.visible));
    controlled.forEach((id) => { if (st[id]) st[id].visible = false; });
    const vals = effective();
    runRules(rules, vals, st, true);
    panels.forEach((p) => { const lr = (p.settings && p.settings.logic) || []; if (lr.length && p.id !== firstPanel) { const r = logicResult(lr.filter((x) => x.action === 'SHOW' || x.action === 'HIDE'), vals); if (r.visible !== undefined) st[p.id].visible = r.visible; } });
    fields.forEach((f) => {
      const lr = (f.settings && f.settings.logic) || [];
      if (lr.length) { const r = logicResult(lr.filter((x) => x.action === 'SHOW' || x.action === 'HIDE'), vals); if (r.visible !== undefined) st[f.id].visible = r.visible; }
    });
    fields.forEach((f) => {
      const en = v0(f).enableSettings;
      if (Array.isArray(en) && shown(f)) en.forEach((r) => { if (r && Array.isArray(r.controls) && r.controls.length && enableMatch(f.id, r, vals)) r.controls.forEach((id) => { const t = resolve(id); if (st[t]) st[t].visible = true; }); });
      else if (isObj(en) && en.enable && Array.isArray(en.conditions) && en.conditions.length && conditionsMet(en.conditions, vals, 'ALL')) st[f.id].visible = true;
    });
    if (JSON.stringify(Object.values(st).map((x) => x.visible)) === before) break;
  }
  const vals = effective();
  runRules(rules, vals, st, false);
  fields.forEach((f) => {
    const lr = (f.settings && f.settings.logic) || [];
    if (lr.length) { const r = logicResult(lr, vals); if (r.visible !== undefined) st[f.id].visible = r.visible; if (r.disabled !== undefined) st[f.id].disabled = r.disabled; if (r.required) st[f.id].required = true; }
  });
  fields.forEach((f) => {
    const val = v0(f); const man = val.mandatorySettings; const ro = val.readonlySettings;
    if (isObj(man) && man.mandatory && Array.isArray(man.conditions) && man.conditions.length && conditionsMet(man.conditions, vals, 'ALL')) st[f.id].required = true;
    if (isObj(ro) && ro.readonly && Array.isArray(ro.conditions) && ro.conditions.length) { const m = conditionsMet(ro.conditions, vals, 'ALL'); if (ro.notEqual ? !m : m) Object.assign(st[f.id], { disabled: true, lockedByRule: true }); }
    if (!shown(f)) return;
    const v = vals[f.id];
    if (Array.isArray(man)) man.forEach((r) => { if (r && Array.isArray(r.controls) && r.controls.length && (Array.isArray(r.conditions) && r.conditions.length ? enableMatch(f.id, r, vals) : valueMatches(v, r.value, r.operator || r.logic))) r.controls.forEach((id) => { const t = resolve(id); if (st[t]) st[t].required = true; }); });
    if (Array.isArray(ro)) {
      const notEq = new Map();
      ro.forEach((r) => {
        if (!r || !Array.isArray(r.controls)) return;
        const m = valueMatches(v, r.value, r.operator || r.logic);
        r.controls.map(resolve).forEach((id) => { if (!st[id]) return; if (r.notEqual) notEq.set(id, (notEq.has(id) ? notEq.get(id) : true) && !m); else if (m) Object.assign(st[id], { disabled: true, lockedByRule: true }); });
      });
      notEq.forEach((lock, id) => { if (lock) Object.assign(st[id], { disabled: true, lockedByRule: true }); });
    }
  });
  // a hidden section hides and un-requires its fields; a read-only section locks them
  fields.forEach((f) => { const p = f.panel && st[f.panel]; if (p && f.panel !== firstPanel && !p.visible) Object.assign(st[f.id], { visible: false, required: false }); if (p && p.disabled) st[f.id].disabled = true; });
  return st;
}

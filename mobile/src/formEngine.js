// Form behaviour for starting a request, matching the cloud.ezofis.com form renderer:
// defaults (current user, dates, custom), master-form options and fills, parent → child cascades,
// calculated fields (row formulas and table sums), conditional "required", OCR fill from file uploads.
// Field settings come from GET /form/{formId}; master rows from GET /form/{masterFormId}/entry/all.
import { authed } from './api.js';
import { kindOf, isEmptyFor, ruleError } from './controls.jsx';
import { fieldStates } from './formRules.js';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHOICE = new Set(['SINGLE_SELECT', 'SINGLE_CHOICE', 'MULTI_SELECT', 'MULTIPLE_CHOICE']);
export const NO_INPUT = new Set(['DIVIDER', 'LABEL', 'PARAGRAPH', 'HEADING', 'IMAGE', 'SPACE', 'BUTTON']);
export const FILE_TYPES = new Set(['FILE_UPLOAD', 'IMAGE_UPLOAD']);
const empty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && !v.length);
const str = (v) => (v === undefined || v === null ? '' : String(v).trim());
const same = (a, b) => str(a).toLowerCase() === str(b).toLowerCase();

// ---------- schema ----------
function normField(x, parentTableId) {
  const st = x.settings || {};
  const sp = st.specific || {};
  const lk = st.lookupSettings || {};
  const gen = st.general || {};
  const val = st.validation || {};
  const type = String(x.type || 'SHORT_TEXT').toUpperCase();
  const optionsType = String(sp.optionsType || lk.optionsSource || sp.optionsSource || '').toUpperCase();
  const sep = sp.separateOptionsUsing === 'NEWLINE' ? /\r?\n/ : ',';
  return {
    id: x.id, label: x.label || x.name || 'Field', type, kind: kindOf(type), settings: st, table: parentTableId || null, raw: x,
    hidden: !!gen.hidden || gen.visibility === 'HIDDEN',
    readOnly: !!gen.readOnly || gen.visibility === 'READ_ONLY' || type === 'CALCULATED',
    placeholder: gen.placeholder || '',
    required: val.fieldRule === 'REQUIRED',
    mandatorySettings: Array.isArray(val.mandatorySettings) ? val.mandatorySettings : [],
    assignOtherControls: Array.isArray(val.assignOtherControls) ? val.assignOtherControls.map(String) : [],
    allowedFileTypes: Array.isArray(val.allowedFileTypes) ? val.allowedFileTypes : [], maxFileSize: Number(val.maxFileSize) || 0,
    // options: custom lists only for choice controls (text fields carry a leftover "Option 1,Option 2,Option 3")
    choice: CHOICE.has(type),
    customOptions: CHOICE.has(type) && (optionsType === 'CUSTOM' || optionsType === '' ) ? String(sp.customOptions || '').split(sep).map((o) => o.trim()).filter(Boolean) : [],
    master: (CHOICE.has(type) && (optionsType === 'MASTER' || optionsType === 'MASTER_TABLE') && sp.masterFormId)
      ? { formId: String(sp.masterFormId), column: String(sp.masterFormColumn || ''), conditions: (sp.masterFormConditionColumn || []).filter((c) => (c.formField || c.formColumn) && c.masterColumn).map((c) => ({ field: String(c.formField || c.formColumn), column: String(c.masterColumn) })), showAll: !!sp.showAllData }
      : null,
    userList: CHOICE.has(type) && optionsType === 'USER_LIST',
    parent: String(sp.masterFormParentColumn || sp.parentFieldId || lk.cascadeFromColumn || '') || null,
    fill: sp.fillValueType === 'MASTER' && sp.masterFormId ? { formId: String(sp.masterFormId), column: String(sp.masterFormColumn || '') } : null,
    fillValueType: sp.fillValueType || '', defaultValueType: sp.defaultValueType || '', defaultInSelect: sp.defaultValueInSelectField || '',
    customDefault: sp.customDefaultValue, dateDefault: sp.dateDefaultValueType || '', autoGenerate: sp.autoGenerateValue || {},
    formula: Array.isArray(sp.formulaTokens) ? sp.formulaTokens : null,
    columns: type === 'TABLE' ? (sp.tableColumns || []).map((c) => normField(c, x.id)) : [],
  };
}

export function buildSchema(formJson) {
  let fj = formJson || {};
  if (typeof fj === 'string') { try { fj = JSON.parse(fj); } catch (e) { fj = {}; } }
  const fields = [...(fj.panels || []), ...(fj.secondaryPanels || [])].flatMap((p) => p.fields || []).map((f) => normField(f));
  const byId = {};
  fields.forEach((f) => { byId[f.id] = f; f.columns.forEach((c) => { byId[c.id] = c; }); });
  // master columns this form actually needs, per master form (everything else is dropped from master rows)
  const need = {};
  const want = (formId, col) => { if (formId && col) (need[formId] = need[formId] || new Set()).add(col); };
  Object.values(byId).forEach((f) => {
    if (f.master) { want(f.master.formId, f.master.column); f.master.conditions.forEach((c) => want(f.master.formId, c.column)); }
    if (f.fill) want(f.fill.formId, f.fill.column);
  });
  Object.values(byId).forEach((f) => { // parents' columns, used as filters by their children
    const p = f.parent && byId[f.parent];
    const src = (f.master && f.master.formId) || (f.fill && f.fill.formId);
    if (p && src && p.master) want(src, p.master.column);
  });
  return { fields, byId, need };
}

// ---------- master rows ----------
const masterCache = new Map();
export function loadMaster(formId, columns) {
  const key = formId;
  if (!masterCache.has(key)) {
    masterCache.set(key, authed(`/form/${formId}/entry/all?currentPage=1&itemsPerPage=5000&includeFormJson=true`).then((d) => {
      const keep = columns ? new Set(columns) : null;
      // Keep only the referenced column ids (master forms can hold sensitive columns the form never uses).
      return ((d && d.entries) || []).map((r) => {
        const o = {};
        Object.keys(r).forEach((k) => { if (GUID.test(k) && (!keep || keep.has(k))) o[k] = r[k]; });
        return o;
      });
    }).catch((e) => { masterCache.delete(key); throw e; }));
  }
  return masterCache.get(key);
}
export function clearMasterCache() { masterCache.clear(); }

// ---------- defaults ----------
function userInfo(me, session) {
  const email = (me && me.email) || (session && session.email) || '';
  const first = (me && me.firstName) || '';
  const last = (me && me.lastName) || '';
  const name = (me && me.displayName) || [first, last].filter(Boolean).join(' ') || email.split('@')[0];
  return { email, first: first || name.split(' ')[0], last, name };
}
function pad(n) { return String(n).padStart(2, '0'); }
function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export function defaultFor(f, user) {
  if (f.fill) return undefined; // filled from master later
  const v = f.defaultValueType;
  if (v === 'USER_EMAIL') return user.email;
  if (v === 'USER_FIRST_NAME') return user.first;
  if (v === 'USER_NAME') return user.name;
  if (v === 'CURRENT_DATE') return today();
  const fv = f.fillValueType;
  if (fv === 'USER_EMAIL') return user.email;
  if (fv === 'USER_NAME') return user.first;
  if (fv === 'LOGIN_NAME') return user.name;
  if (fv === 'CURRENT_YEAR') return String(new Date().getFullYear());
  if (fv === 'AUTO_GENERATE') { const d = new Date(); return `${f.autoGenerate.prefix || 'Form'}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }
  if (f.type === 'COUNTRY_CODE' && f.settings && f.settings.specific && f.settings.specific.defaultCountryCode) return String(f.settings.specific.defaultCountryCode);
  if (f.type === 'DATE' && (f.dateDefault === 'TODAY' || f.dateDefault === 'CURRENT_DATE' || f.defaultInSelect === 'CURRENT_DATE')) return today();
  if (f.choice) {
    if (f.defaultInSelect === 'USER_EMAIL') return user.email;
    if (f.defaultInSelect === 'USER_NAME') return [user.first, user.last].filter(Boolean).join(' ') || user.name;
    if (f.defaultInSelect === 'LOGIN_NAME') return user.name;
    if (!empty(f.customDefault)) return String(f.customDefault);
    if (f.defaultInSelect && !/^(CURRENT_DATE|TODAY|NONE)$/.test(f.defaultInSelect)) return f.defaultInSelect;
    return undefined;
  }
  if (!empty(f.customDefault) && f.customDefault !== 'MASTER') return String(f.customDefault);
  return undefined;
}

export function initialValues(schema, me, session) {
  const user = userInfo(me, session);
  const vals = {};
  schema.fields.forEach((f) => {
    if (f.type === 'TABLE') { vals[f.id] = []; return; }
    const d = defaultFor(f, user);
    if (d !== undefined && d !== '') vals[f.id] = d;
  });
  return vals;
}
export function newRow(table, me, session) {
  const user = userInfo(me, session);
  const r = { _key: Math.random().toString(36).slice(2) };
  table.columns.forEach((c) => { const d = defaultFor(c, user); if (d !== undefined && d !== '') r[c.id] = d; });
  return r;
}

// ---------- master filtering ----------
// Value of a field: a sibling column in the same row, or a top-level field.
const valOf = (id, vals, row) => (row && id in row ? row[id] : vals[id]);

// Conditions for picking rows of `formId` for field f: explicit condition columns, then the parent chain
// (each parent that lives in the same master contributes "row[parentColumn] == parentValue").
function conditionsFor(f, formId, schema, vals, row) {
  const conds = [];
  if (f.master) f.master.conditions.forEach((c) => { const v = valOf(c.field, vals, row); if (!empty(v)) conds.push({ column: c.column, value: v }); });
  const seen = new Set([f.id]);
  let cur = f;
  while (cur && cur.parent && !seen.has(cur.parent)) {
    const p = schema.byId[cur.parent];
    if (!p) break;
    seen.add(p.id);
    const pv = valOf(p.id, vals, row);
    const pcol = p.master && p.master.formId === formId ? p.master.column : p.fill && p.fill.formId === formId ? p.fill.column : '';
    if (pcol && !empty(pv) && !conds.some((c) => c.column === pcol)) conds.push({ column: pcol, value: pv });
    // a parent from another master still narrows through its own explicit conditions on this master
    if (p.master && p.master.formId === formId) p.master.conditions.forEach((c) => { const v = valOf(c.field, vals, row); if (!empty(v) && !conds.some((x) => x.column === c.column)) conds.push({ column: c.column, value: v }); });
    cur = p;
  }
  return conds;
}
const matchRows = (rows, conds) => rows.filter((r) => conds.every((c) => !(c.column in r) || same(r[c.column], c.value)));

export function optionsFor(f, schema, vals, masters, row, users) {
  if (f.master) {
    const rows = masters[f.master.formId];
    if (!rows) return null; // still loading
    const conds = conditionsFor(f, f.master.formId, schema, vals, row);
    // a dependent list with an empty parent shows nothing yet (unless the form says "show all")
    const p = f.parent && schema.byId[f.parent];
    if (p && empty(valOf(p.id, vals, row)) && !f.master.showAll) return [];
    const seen = new Set(); const out = [];
    matchRows(rows, conds).forEach((r) => { const v = str(r[f.master.column]); if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); } });
    return out;
  }
  if (f.userList) return users ? users.map((u) => ({ value: u.email, label: u.displayName && u.displayName !== u.email ? `${u.displayName} (${u.email})` : u.email })) : null;
  return f.customOptions;
}

function fillValue(f, schema, vals, masters, row) {
  const rows = masters[f.fill.formId];
  if (!rows) return undefined;
  const p = f.parent && schema.byId[f.parent];
  if (p && empty(valOf(p.id, vals, row))) return '';
  const hit = matchRows(rows, conditionsFor(f, f.fill.formId, schema, vals, row))[0];
  return hit ? str(hit[f.fill.column]) : '';
}

// ---------- calculations ----------
const num = (v) => { const n = Number(String(v === undefined || v === null ? '' : v).replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const round2 = (n) => Math.round(n * 100) / 100;
function evalTokens(tokens, get, tableSum) {
  const parts = [];
  for (const t of tokens) {
    const type = String(t.type || t.name || '').toUpperCase();
    if (type === 'FIELD') parts.push(num(get(t.value)));
    else if (type === 'TABLE_SUM') { const [tb, col] = String(t.value).split('::'); parts.push(tableSum(tb, col)); }
    else if (type === 'NUMBER' || type === 'CONSTANT' || type === 'VALUE') parts.push(num(t.value));
    else if (type === 'OPERATOR' || ['PLUS', 'MINUS', 'MULTIPLY', 'DIVIDE', 'OPEN_BRACKET', 'CLOSE_BRACKET'].includes(type)) parts.push(String(t.value));
  }
  // safe arithmetic: numbers, + - * / and brackets only
  const expr = parts.join(' ');
  if (!/^[\d.\s+\-*/()]*$/.test(expr) || !expr.trim()) return 0;
  try { const r = Function(`"use strict";return (${expr});`)(); return Number.isFinite(r) ? round2(r) : 0; } catch (e) { return 0; }
}

// ---------- recompute everything that depends on other values ----------
export function recompute(schema, vals0, masters, users, manual = new Set()) {
  const vals = { ...vals0 };
  const options = {}; // fieldId → options (top level)
  const rowOptions = {}; // tableId → [ { colId: options } ]
  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;
    const set = (target, key, v) => { if (str(target[key]) !== str(v)) { target[key] = v; changed = true; } };
    // top-level fields
    schema.fields.forEach((f) => {
      if (f.type === 'TABLE') return;
      if (f.fill && !manual.has(f.id)) { const v = fillValue(f, schema, vals, masters, null); if (v !== undefined) set(vals, f.id, v); }
      if (f.choice) {
        const opts = optionsFor(f, schema, vals, masters, null, users);
        options[f.id] = opts;
        if (opts && f.master) {
          const list = opts.map((o) => (typeof o === 'object' ? o.value : o));
          if (!empty(vals[f.id]) && !list.some((o) => same(o, vals[f.id])) && !f.readOnly) set(vals, f.id, '');
          if (empty(vals[f.id]) && list.length === 1) set(vals, f.id, list[0]); // single match → preselect (as the web form does)
        }
      }
    });
    // table rows
    schema.fields.filter((f) => f.type === 'TABLE').forEach((t) => {
      const rows = (vals[t.id] || []).map((r) => ({ ...r }));
      rowOptions[t.id] = rows.map((r) => {
        const ro = {};
        t.columns.forEach((c) => {
          if (c.fill && !manual.has(`${r._key}:${c.id}`)) { const v = fillValue(c, schema, vals, masters, r); if (v !== undefined) set(r, c.id, v); }
          if (c.choice) {
            const opts = optionsFor(c, schema, vals, masters, r, users);
            ro[c.id] = opts;
            if (opts && c.master) {
              if (!empty(r[c.id]) && !opts.some((o) => same(o, r[c.id]))) set(r, c.id, '');
              if (empty(r[c.id]) && opts.length === 1) set(r, c.id, opts[0]);
            }
          }
        });
        t.columns.filter((c) => c.formula).forEach((c) => set(r, c.id, String(evalTokens(c.formula, (id) => valOf(id, vals, r), () => 0))));
        return ro;
      });
      vals[t.id] = rows;
    });
    // top-level formulas (table sums etc.)
    const tableSum = (tb, col) => round2((vals[tb] || []).reduce((n, r) => n + num(r[col]), 0));
    schema.fields.filter((f) => f.formula && f.type !== 'TABLE').forEach((f) => set(vals, f.id, String(evalTokens(f.formula, (id) => vals[id], tableSum))));
    if (!changed) break;
  }
  // show / read-only / mandatory rules from the field settings (web rule engine), then required:
  // static + rule-driven, plus "when X is value, these controls are required" for table columns
  const states = fieldStates(schema.fields.map((f) => ({ id: f.id, type: f.type, settings: f.settings })), vals);
  const required = new Set();
  const addReq = (f) => { if (f.required) required.add(f.id); };
  Object.values(schema.byId).forEach(addReq);
  Object.entries(states).forEach(([id, s]) => { if (s.required) required.add(id); });
  Object.values(schema.byId).forEach((f) => f.mandatorySettings.forEach((m) => { if (!empty(vals[f.id]) && same(vals[f.id], m.value)) (m.controls || []).forEach((id) => required.add(String(id))); }));
  return { vals, options, rowOptions, required, states };
}

// ---------- validation ----------
// hidden fields (static or by a rule) and read-only fields are never blocking, as on the web
export const shownBy = (f, states) => (states && states[f.id] ? states[f.id].visible : !f.hidden);
export const lockedBy = (f, states) => f.readOnly || !!(states && states[f.id] && states[f.id].disabled);
export function validate(schema, vals, required, states) {
  const errs = {};
  schema.fields.forEach((f) => {
    if (!shownBy(f, states) || NO_INPUT.has(f.type)) return;
    if (f.type === 'TABLE') {
      const rows = vals[f.id] || [];
      if (required.has(f.id) && !rows.length) errs[f.id] = `Add at least one ${f.label} row`;
      rows.forEach((r, i) => f.columns.forEach((c) => {
        if (c.hidden || c.readOnly || !required.has(c.id)) return;
        const v = r[c.id];
        if (FILE_TYPES.has(c.type) ? !(v && (v.file || v.fileId)) : isEmptyFor(c.kind, v)) errs[`${f.id}:${i}:${c.id}`] = `${c.label} is required`;
      }));
      rows.forEach((r, i) => f.columns.forEach((c) => { const k = `${f.id}:${i}:${c.id}`; const fe = !c.hidden && !c.readOnly && !errs[k] && !c.choice && !FILE_TYPES.has(c.type) && ruleError(c.type, c.kind, r[c.id], c.settings, { ...vals, ...r }); if (fe) errs[k] = fe; }));
      return;
    }
    if (lockedBy(f, states)) return;
    const v = vals[f.id];
    if (required.has(f.id) && (FILE_TYPES.has(f.type) ? !(v && (v.file || v.fileId)) : isEmptyFor(f.kind, v))) errs[f.id] = f.kind === 'consent' ? `Turn on ${f.label} to continue` : `${f.label} is required`;
    else if (!f.choice && !FILE_TYPES.has(f.type)) { const fe = ruleError(f.type, f.kind, v, f.settings, vals); if (fe) errs[f.id] = fe; }
  });
  return errs;
}

// File checks the web form applies (allowed types, max size in MB).
export function fileProblem(f, file) {
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  if (f.allowedFileTypes.length && !f.allowedFileTypes.map((x) => String(x).replace(/^\./, '').toLowerCase()).includes(ext)) return `Use a ${f.allowedFileTypes.join(', ')} file`;
  if (file.size > 20 * 1048576) return `${file.name} is larger than 20 MB. Each file can be up to 20 MB.`;
  return '';
}

// ---------- OCR (same calls as the web form) ----------
// Step 1: read values from the file for the controls listed in assignOtherControls.
export async function ocrExtract(repositoryId, file, targets) {
  const fd = new FormData();
  fd.append('file', file, file.name);
  fd.append('repositoryId', repositoryId);
  fd.append('fields', JSON.stringify(targets.map((t) => `${t.label},${t.type}`)));
  const d = await authed('/uploadAndIndex/uploadForOcr', { method: 'POST', body: fd, timeout: 120000 });
  const data = typeof d === 'string' ? JSON.parse(d) : d;
  const values = {};
  (data && data.ocrFieldList || []).forEach((x) => {
    const label = String(x && x.name || '').split(',')[0].replace(/\*/g, '').trim().toLowerCase();
    const t = targets.find((c) => c.label.replace(/\*/g, '').trim().toLowerCase() === label);
    if (t && !empty(x.value)) values[t.id] = x.value;
  });
  return { values, ocrFieldList: (data && data.ocrFieldList) || [], ocrJson: data && data.ocrJson };
}
// Step 2 (on submit): store the file in the workflow's repository → { fileId, repositoryId }.
export async function uploadWithOcr(repositoryId, entry, targets) {
  const fd = new FormData();
  fd.append('file', entry.file, entry.file.name);
  fd.append('repositoryId', repositoryId);
  fd.append('filename', entry.file.name);
  // metadata (flat { name: value }) is the preferred input for uploadWithOcr (FORM_AND_REPOSITORY_FUNCTIONS_API §1b); fields stays as the fallback
  if (entry.ocrFieldList && entry.ocrFieldList.length) fd.append('metadata', JSON.stringify(Object.fromEntries(entry.ocrFieldList.map((f) => [String(f.name || '').split(',')[0], f.value == null ? '' : String(f.value)]).filter(([k]) => k))));
  if (entry.ocrFieldList && entry.ocrFieldList.length) fd.append('fields', JSON.stringify(entry.ocrFieldList));
  else if (targets && targets.length) fd.append('fields', JSON.stringify(targets.map((t) => `${t.label},${t.type}`)));
  if (entry.ocrJson) fd.append('ocrJson', typeof entry.ocrJson === 'string' ? entry.ocrJson : JSON.stringify(entry.ocrJson));
  const d = await authed('/uploadAndIndex/uploadWithOcr', { method: 'POST', body: fd, timeout: 180000 });
  if (!d || !d.fileId) throw new Error('The file upload did not return an id.');
  return { fileId: d.fileId, repositoryId: d.repositoryId || repositoryId };
}

// Targets for a file control's OCR: the assigned controls (siblings in a table row, or top-level fields).
export function ocrTargets(f, schema) {
  const pool = f.table ? (schema.byId[f.table] ? schema.byId[f.table].columns : []) : schema.fields;
  return pool.filter((x) => f.assignOtherControls.includes(x.id) && !FILE_TYPES.has(x.type) && x.type !== 'TABLE');
}

// ---------- payload (§9.3) ----------
export function toPayload(schema, vals, states) {
  const out = {};
  schema.fields.forEach((f) => {
    if (NO_INPUT.has(f.type)) return;
    if (!f.hidden && !shownBy(f, states)) return; // hidden by a rule: not sent (the web clears these values)
    const v = vals[f.id];
    if (f.type === 'TABLE') {
      const rows = (v || []).map((r) => {
        const o = {};
        f.columns.forEach((c) => { const cv = r[c.id]; if (!empty(cv) && !(cv && cv.file && !cv.fileId)) o[c.id] = cv && typeof cv === 'object' && cv.fileId ? { fileId: cv.fileId, fileName: cv.fileName, itemId: cv.fileId, repositoryId: cv.repositoryId } : cv; });
        return o;
      }).filter((o) => Object.keys(o).length);
      if (rows.length) out[f.id] = rows;
      return;
    }
    if (empty(v) || (!FILE_TYPES.has(f.type) && f.kind !== 'consent' && isEmptyFor(f.kind, v))) return;
    // booleans (toggle, consent) and structured values (V5 currency / phone objects) keep their shape, as on the web
    out[f.id] = v && typeof v === 'object' && v.fileId ? { fileId: v.fileId, fileName: v.fileName, itemId: v.fileId, repositoryId: v.repositoryId } : Array.isArray(v) || typeof v === 'boolean' || typeof v === 'number' || (v && typeof v === 'object' && !v.file) ? v : String(v);
  });
  return out;
}
export { empty, num, round2 };

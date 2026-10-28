// Repository metadata form, driven by the repository's field definitions (GET /repositories/{id} → fields):
// dataType → control (date picker, number, yes/no, table, long text, text), isMandatory → required, isReadOnly → locked,
// optionsJson → dropdown values: { type: 'predefined', values } | { type: 'unique' } (column's distinct values, items/facets)
// | { type: 'master', masterFormId, masterFieldId } (master form entries; fields on the same master form cascade).
// Used by Edit details, Review & export and Intelligent upload. Values are keyed by field name.
import React, { useEffect, useMemo, useState } from 'react';
import { Icon, Sparkle } from '../ui.jsx';
import { authed } from '../api.js';
import { isTechnicalLabel } from '../wf.js';
import { repoApi } from '../repo.js';
import { Control, toTime, toDateTime, formatError } from '../controls.jsx';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (v == null ? '' : String(v));

function parseOptions(json) {
  let p = json;
  for (let i = 0; i < 2 && typeof p === 'string'; i += 1) { try { p = JSON.parse(p); } catch (e) { p = null; } }
  if (Array.isArray(p)) return { kind: 'predefined', values: p.map((x) => str(isObj(x) ? x.value ?? x.name ?? x.label : x)).filter(Boolean) };
  if (!isObj(p)) return { kind: 'none', values: [] };
  const values = (Array.isArray(p.values) ? p.values : Array.isArray(p.options) ? p.options : []).map((x) => str(isObj(x) ? x.value ?? x.name ?? x.label : x)).filter(Boolean);
  const columns = (Array.isArray(p.columns) ? p.columns : []).map((c) => str(isObj(c) ? c.name ?? c.key ?? c.label : c)).filter(Boolean);
  if (p.type === 'master' && p.masterFormId && p.masterFieldId) return { kind: 'master', values: [], masterFormId: str(p.masterFormId), masterFieldId: str(p.masterFieldId), columns };
  if (p.type === 'unique') return { kind: 'unique', values: [], columns };
  return { kind: values.length ? 'predefined' : 'none', values, columns };
}

const T = (dataType) => {
  const t = str(dataType).toUpperCase();
  if (/TABLE/.test(t)) return 'TABLE';
  if (/^(CALCULATED|AUTO_?GENERATED|OMR)$/.test(t)) return 'COMPUTED';
  if (/DATE_?TIME/.test(t)) return 'DATETIME';
  if (/DATE/.test(t)) return 'DATE';
  if (/^TIME$/.test(t)) return 'TIME';
  if (/^(LINK|URL)$/.test(t)) return 'LINK';
  if (/CURRENCY/.test(t)) return 'CURRENCY';
  if (/BOOL|CHECK/.test(t)) return 'BOOLEAN';
  if (/NUM|DECIMAL|INT|CURRENCY|AMOUNT|MONEY|FLOAT/.test(t)) return 'NUMBER';
  if (/LONG|MULTI_?LINE|TEXTAREA/.test(t)) return 'LONG_TEXT';
  if (/SELECT|CHOICE|DROPDOWN|RADIO|LIST/.test(t)) return 'SELECT';
  return 'TEXT';
};

// System columns that are never user metadata (raw OCR / AI output, ids, storage). Repository-defined fields such as
// "Line Items" are real metadata here, so the broader workflow-screen filter (isTechnicalKey) isn't used.
const SYSTEM_COL = /^(ocr_?(text|json|score|percent)|summary_?json|ai_?status|tenant_?id|repository_?id|storage_?provider_?id|workflow_?instance_?id|file_?path|id)$/i;
// GET /repositories/{id} → ordered, user-facing field list
export function toSchema(repo) {
  const fields = ((repo && (repo.fields || repo.Fields)) || [])
    .filter((f) => f && (f.name || f.sqlColumnName) && !isTechnicalLabel(f.name) && !SYSTEM_COL.test(str(f.sqlColumnName || f.name).replace(/\s+/g, '')))
    .map((f, i) => {
      const opt = parseOptions(f.optionsJson);
      let type = T(f.dataType);
      if (type === 'TEXT' && (opt.kind === 'predefined' || opt.kind === 'master' || opt.kind === 'unique')) type = 'SELECT';
      if (type === 'TEXT' && /address/i.test(str(f.name))) type = 'LONG_TEXT'; // address fields get a multi-line box, as on the web upload screen
      const folder = !!f.includeInFolderStructure;
      // a folder-structure field is always mandatory; computed values (calculated, auto-generated, OMR) are read-only
      return { id: str(f.id), name: str(f.name || f.sqlColumnName), col: str(f.sqlColumnName || f.name), type, required: !!f.isMandatory || folder, readOnly: !!f.isReadOnly || type === 'COMPUTED', folder, level: Number(f.level) || 0, order: f.orderId != null ? Number(f.orderId) : 1000 + i, opt };
    });
  return fields.sort((a, b) => (b.folder - a.folder) || (a.level - b.level) || (a.order - b.order));
}

export function useSchema(repoId) {
  const [schema, setSchema] = useState(null);
  useEffect(() => {
    let off = false;
    if (!repoId) { setSchema([]); return undefined; }
    setSchema(null);
    repoApi.detail(repoId).then((r) => { if (!off) setSchema(toSchema(r)); }).catch(() => { if (!off) setSchema([]); });
    return () => { off = true; };
  }, [repoId]);
  return schema;
}

// ---- values in / out ----
const find = (obj, ...keys) => { if (!obj) return undefined; const ks = Object.keys(obj); for (const k of keys) { const m = ks.find((x) => x.toLowerCase() === str(k).toLowerCase()); if (m !== undefined) return obj[m]; } return undefined; };
export const toInputDate = (v) => { const s = str(v); const m = /^(\d{4}-\d{2}-\d{2})/.exec(s); if (m) return m[1]; const d = new Date(s); return s && !isNaN(d) ? d.toISOString().slice(0, 10) : ''; };
// table values are stored as {"data":[{col: value}]} (same as the web); OCR may return an array, an object or JSON text
export function toTable(v) {
  let x = v;
  for (let i = 0; i < 2 && typeof x === 'string'; i += 1) { const s = x.trim(); if (!/^[[{]/.test(s)) return { data: [] }; try { x = JSON.parse(s); } catch (e) { return { data: [] }; } }
  const rows = Array.isArray(x) ? x : isObj(x) ? (x.data || x.rows || x.items || x['Line Item'] || x.lineItems || []) : [];
  return { data: (Array.isArray(rows) ? rows : []).map((r) => (isObj(r) ? Object.fromEntries(Object.entries(r).filter(([k]) => k !== '_id').map(([k, y]) => [k, isObj(y) ? str(y.value ?? y['Invoice Value'] ?? JSON.stringify(y)) : str(y)])) : { Value: str(r) })) };
}
const norm = (f, v) => (f.type === 'DATE' ? toInputDate(v) : f.type === 'DATETIME' ? toDateTime(v) : f.type === 'TIME' ? toTime(v) : f.type === 'TABLE' ? JSON.stringify(toTable(v)) : f.type === 'BOOLEAN' ? (/^(true|1|yes)$/i.test(str(v)) ? 'true' : v === '' || v == null ? '' : 'false') : str(v));
export const valuesFromItem = (schema, fields) => Object.fromEntries(schema.map((f) => [f.name, norm(f, find(fields, f.col, f.name) ?? '')]));
// OCR results (ocrFieldList or stage fields) matched by field name or column; anything OCR returned outside the schema is kept as text
export function valuesFromOcr(schema, list) {
  const l = (list || []).filter((x) => x && x.name && !isTechnicalLabel(x.name));
  const byName = (f) => l.find((x) => [f.name, f.col].some((k) => str(x.name).split(',')[0].trim().toLowerCase() === str(k).toLowerCase()));
  const vals = {}; const found = new Set();
  schema.forEach((f) => { const o = byName(f); vals[f.name] = norm(f, o ? o.value : ''); if (o && str(o.value).trim()) found.add(f.name); });
  const extra = l.filter((x) => !schema.some((f) => byName(f) === x)).map((x) => ({ id: 'ocr-' + x.name, name: str(x.name).split(',')[0].trim(), col: x.name, type: T(x.type || 'TEXT') === 'TABLE' ? 'TABLE' : 'TEXT', required: false, readOnly: false, folder: false, level: 99, order: 9999, opt: { kind: 'none', values: [] }, extra: true }));
  extra.forEach((f) => { const o = l.find((x) => x.name === f.col); vals[f.name] = norm(f, o.value); if (str(o.value).trim()) found.add(f.name); });
  return { values: vals, extra, found };
}
export const toStageFields = (schema, values) => schema.map((f) => ({ name: f.name, value: str(values[f.name]) }));
export const toMetadata = (schema, values) => Object.fromEntries(schema.map((f) => [f.name, str(values[f.name])]));
export const toPatch = (schema, values, before) => Object.fromEntries(schema.filter((f) => !f.readOnly && str(values[f.name]) !== str(before[f.name])).map((f) => [f.col, str(values[f.name])]));

const empty = (f, v) => (f.type === 'TABLE' ? !toTable(v).data.length : !str(v).trim());
export function validate(schema, values) {
  const e = {};
  schema.forEach((f) => {
    if (f.readOnly) return;
    if (f.required && empty(f, values[f.name])) e[f.name] = f.folder ? `${f.name} is required to file the document in the right folder` : `${f.name} is required`;
    else if (CONTROL[f.type]) { const fe = formatError(CONTROL[f.type], values[f.name]); if (fe) e[f.name] = fe; }
  });
  return e;
}

// ---- options: predefined / unique (facets) / master (cascading) ----
const masterCache = new Map();
function loadMasterRows(formId, cols) {
  const key = formId + '|' + [...cols].sort().join(',');
  if (!masterCache.has(key)) {
    masterCache.set(key, authed(`/form/${formId}/entry/all?currentPage=1&itemsPerPage=5000&includeFormJson=true`).then((d) => {
      const keep = new Set(cols); // only the columns this repository references (master forms can hold sensitive columns)
      return ((d && (d.entries || d.data)) || []).map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => keep.has(k)).map(([k, v]) => [k, str(isObj(v) ? v.value ?? v.name : v)])));
    }).catch((e) => { masterCache.delete(key); throw e; }));
  }
  return masterCache.get(key);
}

function useOptions(repoId, schema, values) {
  const [master, setMaster] = useState({}); // formId → rows
  const [facets, setFacets] = useState({}); // col → values
  const [failed, setFailed] = useState({});
  const forms = useMemo(() => {
    const m = {};
    schema.forEach((f) => { if (f.opt.kind === 'master') (m[f.opt.masterFormId] = m[f.opt.masterFormId] || []).push(f.opt.masterFieldId); });
    return m;
  }, [schema]);
  useEffect(() => {
    let off = false;
    Object.entries(forms).forEach(([formId, cols]) => loadMasterRows(formId, cols).then((rows) => { if (!off) setMaster((x) => ({ ...x, [formId]: rows })); }).catch(() => { if (!off) { setMaster((x) => ({ ...x, [formId]: [] })); setFailed((x) => ({ ...x, [formId]: true })); } }));
    schema.filter((f) => f.opt.kind === 'unique').forEach((f) => repoApi.facets(repoId, f.col).then((l) => { if (!off) setFacets((x) => ({ ...x, [f.col]: l.map((v) => str(isObj(v) ? v.value ?? v.name : v)).filter(Boolean) })); }).catch(() => { if (!off) setFacets((x) => ({ ...x, [f.col]: [] })); }));
    return () => { off = true; };
  }, [repoId, forms, schema]);
  // master rows still possible for field f, given the values chosen in the earlier fields of the same master form
  const rowsFor = (f) => {
    const rows = master[f.opt.masterFormId];
    if (!rows) return null;
    const earlier = schema.slice(0, schema.indexOf(f)).filter((g) => g.opt.kind === 'master' && g.opt.masterFormId === f.opt.masterFormId && str(values[g.name]).trim());
    return rows.filter((r) => earlier.every((g) => str(r[g.opt.masterFieldId]) === str(values[g.name])));
  };
  const optionsFor = (f) => {
    if (f.opt.kind === 'predefined') return f.opt.values;
    if (f.opt.kind === 'unique') return facets[f.col] || null;
    if (f.opt.kind === 'master') { const r = rowsFor(f); return r ? [...new Set(r.map((x) => x[f.opt.masterFieldId]).filter(Boolean))].sort((a, b) => a.localeCompare(b)) : null; }
    return [];
  };
  return { optionsFor, master, failed };
}

// after a change, later fields on the same master form are cleared when no longer valid and auto-filled when only one value fits
function cascade(schema, values, changed, rowsFor) {
  const next = { ...values };
  if (changed.opt.kind !== 'master') return next;
  schema.slice(schema.indexOf(changed) + 1).filter((g) => g.opt.kind === 'master' && g.opt.masterFormId === changed.opt.masterFormId).forEach((g) => {
    const rows = rowsFor(g, next); if (!rows) return;
    const opts = [...new Set(rows.map((r) => r[g.opt.masterFieldId]).filter(Boolean))];
    if (opts.length === 1) next[g.name] = opts[0];
    else if (str(next[g.name]) && !opts.includes(str(next[g.name]))) next[g.name] = '';
  });
  return next;
}

function TableInput({ f, value, onChange, disabled, err }) {
  const t = toTable(value);
  const [cols, setCols] = useState(() => { const c = [...(f.opt.columns || []), ...(f.opt.kind === 'predefined' ? f.opt.values : [])]; t.data.forEach((r) => Object.keys(r).forEach((k) => { if (!c.includes(k)) c.push(k); })); return c.length ? c : ['Description', 'Value']; });
  const [newCol, setNewCol] = useState(null);
  useEffect(() => { setCols((c) => { const n = [...c]; t.data.forEach((r) => Object.keys(r).forEach((k) => { if (!n.includes(k)) n.push(k); })); return n.length === c.length ? c : n; }); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (rows) => onChange(JSON.stringify({ data: rows }));
  const set = (i, c, v) => save(t.data.map((r, j) => (j === i ? { ...r, [c]: v } : r)));
  return (
    <div className={'mt-table' + (err ? ' err' : '')}>
      {t.data.map((r, i) => (
        <div key={i} className="mt-row">
          <div className="mt-row-h"><b>Row {i + 1}</b>{!disabled ? <button type="button" className="icon-btn" aria-label={`Delete row ${i + 1}`} onClick={() => save(t.data.filter((_, j) => j !== i))}><Icon name="close" size={16} color="#C2264B" /></button> : null}</div>
          <div className="mt-cells">{cols.map((c) => <label key={c} className="mt-cell"><span>{c}</span><input className="input" value={str(r[c])} disabled={disabled} onChange={(e) => set(i, c, e.target.value)} aria-label={`${f.name} row ${i + 1} ${c}`} /></label>)}</div>
        </div>
      ))}
      {!t.data.length ? <div className="muted" style={{ fontSize: 13 }}>No rows yet.</div> : null}
      {!disabled ? (
        <div className="mt-tools">
          <button type="button" className="chip" onClick={() => save([...t.data, Object.fromEntries(cols.map((c) => [c, '']))])}><Icon name="plus" size={14} />Add row</button>
          {newCol === null ? <button type="button" className="chip" onClick={() => setNewCol('')}><Icon name="grid" size={14} />Add column</button>
            : <span className="mt-newcol"><input className="input" autoFocus placeholder="Column name" value={newCol} onChange={(e) => setNewCol(e.target.value)} aria-label="New column name" /><button type="button" className="chip on" onClick={() => { const n = newCol.trim(); if (n && !cols.includes(n)) setCols([...cols, n]); setNewCol(null); }}>Add</button></span>}
        </div>
      ) : null}
    </div>
  );
}

// folder types drawn by the shared controls (src/controls.jsx); TABLE, BOOLEAN and SELECT stay below
const CONTROL = { NUMBER: 'number', DATE: 'date', DATETIME: 'datetime', TIME: 'time', LINK: 'url', CURRENCY: 'currency', COMPUTED: 'readonly' };

// `found`: names AI/OCR filled (shown with an OCR tag until edited); `base`: values to compare for the Edited tag
export default function MetaForm({ repoId, schema, values, onChange, errors = {}, found, base, disabled, idPrefix = 'mf' }) {
  const { optionsFor, master, failed } = useOptions(repoId, schema, values);
  // master rows still possible for g once `next` values are applied (used to clear / auto-fill dependent fields)
  const filterRows = (g, next) => {
    const all = master[g.opt.masterFormId];
    if (!all) return null;
    const earlier = schema.slice(0, schema.indexOf(g)).filter((h) => h.opt.kind === 'master' && h.opt.masterFormId === g.opt.masterFormId && str(next[h.name]).trim());
    return all.filter((row) => earlier.every((h) => str(row[h.opt.masterFieldId]) === str(next[h.name])));
  };
  const set = (f, v) => onChange(cascade(schema, { ...values, [f.name]: v }, f, filterRows), f.name);
  return (
    <div className="meta-form">
      {schema.map((f) => {
        const id = `${idPrefix}-${f.name}`;
        const v = values[f.name] ?? '';
        const ro = disabled || f.readOnly;
        const edited = base && str(v) !== str(base[f.name] ?? '');
        const tag = f.readOnly ? <span className="ocr-tag lock"><Icon name="lock" size={10} />Read only</span> : found && found.has(f.name) && !edited ? <span className="ocr-tag"><Sparkle size={10} color="#0A6E7A" />OCR</span> : edited ? <span className="ocr-tag edited">Edited</span> : null;
        const lab = <label htmlFor={id}>{f.name}{f.required ? <span className="req"> *</span> : <span className="optional"> (optional)</span>}{tag}</label>;
        let input;
        if (f.type === 'TABLE') input = <TableInput f={f} value={v} disabled={ro} err={errors[f.name]} onChange={(x) => set(f, x)} />;
        else if (f.type === 'BOOLEAN') input = <div className="choice-row" role="radiogroup" aria-label={f.name}>{[['true', 'Yes'], ['false', 'No']].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={v === k} className={'chip' + (v === k ? ' on' : '')} disabled={ro} onClick={() => set(f, v === k ? '' : k)}>{l}</button>)}</div>;
        else if (f.type === 'SELECT') {
          const opts = optionsFor(f);
          const list = opts ? (str(v) && !opts.includes(str(v)) ? [str(v), ...opts] : opts) : [];
          if (f.opt.kind === 'unique' || f.opt.kind === 'none') {
            input = <><input id={id} className={'input strong' + (errors[f.name] ? ' error' : '')} list={id + '-l'} value={v} readOnly={ro} placeholder="Type or pick a value" onChange={(e) => set(f, e.target.value)} /><datalist id={id + '-l'}>{list.map((o) => <option key={o} value={o} />)}</datalist></>;
          } else if (opts === null) input = <div className="input locked"><span className="spinner" style={{ width: 14, height: 14 }} /> Loading options…</div>;
          else {
            const parentMissing = f.opt.kind === 'master' && !list.length && schema.slice(0, schema.indexOf(f)).some((g) => g.opt.kind === 'master' && g.opt.masterFormId === f.opt.masterFormId && !str(values[g.name]).trim());
            input = <select id={id} className={'input strong' + (errors[f.name] ? ' error' : '')} value={v} disabled={ro || (!list.length && !str(v))} onChange={(e) => set(f, e.target.value)}><option value="">{list.length ? 'Select…' : parentMissing ? 'Choose the field above first' : failed[f.opt.masterFormId] ? "Couldn't load the list" : 'No options'}</option>{list.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
          }
        } else if (f.type === 'LONG_TEXT') input = <textarea id={id} className={'input strong' + (errors[f.name] ? ' error' : '')} rows={3} value={v} readOnly={ro} onChange={(e) => set(f, e.target.value)} />;
        else input = <Control kind={CONTROL[f.type] || 'text'} id={id} value={v} readOnly={ro} error={!!errors[f.name]} placeholder={found && !found.has(f.name) && !v ? 'Not found · type a value' : ''} onChange={(x) => set(f, x)} />;
        return <div key={f.name} className="field" data-err={errors[f.name] ? '1' : undefined}>{lab}{input}{errors[f.name] ? <span className="err" role="alert">{errors[f.name]}</span> : null}</div>;
      })}
      {!schema.length ? <div className="muted" style={{ fontSize: 13 }}>This folder has no details to fill in.</div> : null}
    </div>
  );
}


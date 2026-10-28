// EZOFIS Workflow API (WORKFLOW_API_FULL_REFERENCE, 26 Oct 2026) + adapters that turn raw rows into screen data.
// Base: https://cloud.ezofis.com/api/Workflows. Every call sends Authorization: Bearer + X-Tenant-Id (see api.js `authed`).
// Response shapes were checked read-only against the live cloud.ezofis.com app on 26 Oct 2026.
import { authed, authedBlob } from './api.js';
import { kindOf, isInputKind, displayValue, KNOWN_TYPES } from './controls.jsx';

// Form file values store item ids without dashes ("293b1361fb9c...") — the repository API takes the GUID form.
export const toGuid = (id) => { const s = String(id || '').trim(); return /^[0-9a-f]{32}$/i.test(s) ? `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}` : s; };

const q = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const W = '/Workflows';

// ---------- raw endpoints ----------
export const wfApi = {
  userSession: () => authed('/usersession'),                                                     // §2
  list: () => authed(W).then((d) => (d && d.items) || []),                                       // §3.1
  get: (id) => authed(`${W}/${id}`),                                                             // §3.2
  filterFields: (id) => authed(`${W}/${id}/filter-fields`),                                      // §3.3
  form: (formId) => authed(`/form/${formId}`),                                                   // §3.4
  mailbox: (box, workflowId, { pageNumber = 1, pageSize = 20, instanceId, skipTotal } = {}) =>  // §4 inbox | sent | completed
    authed(`${W}/${box}?` + q({ workflowId, instanceId, pageNumber, pageSize, skipTotal })),
  allInbox: (itemsPerWorkflow = 20) => authed(`${W}/inbox/all-workflows?itemsPerWorkflow=${itemsPerWorkflow}`), // §4.3
  locate: (w, i) => authed(`${W}/${w}/instances/${i}/locate`),                                   // §5.2
  instance: (w, i) => authed(`${W}/${w}/instances/${i}`),                                        // §5.3
  history: (w, i) => authed(`${W}/${w}/instances/${i}/history`),                                 // §5.4
  comments: (w, i) => authed(`${W}/${w}/instances/${i}/comments`),                               // §5.5
  addComment: (w, i, text) => authed(`${W}/${w}/instances/${i}/comments`, { method: 'POST', body: { comments: text, stepInstanceId: null, externalCommentsBy: null, showTo: 0 } }),
  attachments: (w, i) => authed(`${W}/${w}/instances/${i}/attachments`),                         // §5.6
  uploadAttachment: (w, i, file, repositoryId, transactionId) => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    if (repositoryId) fd.append('repositoryId', repositoryId);
    if (transactionId) fd.append('transactionId', transactionId);
    return authed(`${W}/${w}/instances/${i}/attachments`, { method: 'POST', body: fd, timeout: 120000 });
  },
  // File bytes for an attachment / repository item (same call the web viewer uses).
  // §5.7 GET /api/repositories/{repositoryId}/items/{itemId}/file?disposition=inline|attachment → raw bytes.
  // shareToken: documents shared with me (GET /repositories/shared-with-me) are opened through their share
  file: (repositoryId, itemId, disposition = 'inline', shareToken) => authedBlob(`/repositories/${repositoryId}/items/${toGuid(itemId)}/file?disposition=${disposition}${shareToken ? '&shareToken=' + encodeURIComponent(shareToken) : ''}`),
  // Repository item (metadata fields) and its AI summary (POST; consumes AI credits, so only on request).
  item: (repositoryId, itemId, shareToken) => authed(`/repositories/${repositoryId}/items/${toGuid(itemId)}${shareToken ? '?shareToken=' + encodeURIComponent(shareToken) : ''}`),
  aiSummary: (repositoryId, itemId) => authed(`/repositories/${repositoryId}/items/${toGuid(itemId)}/ai-summary`, { method: 'POST', timeout: 180000 }).then((d) => { const c = (d && d.data) || d; return { output: (c && (c.output || c.Output)) || (typeof c === 'string' ? c : ''), creditConsumed: !!(c && (c.creditConsumed || c.CreditConsumed)) }; }),
  // Start a new request with JSON form data (payload shape mirrors the cloud.ezofis.com client).
  // §9.2 Start with JSON form data (formData keyed by field jsonId; tables as arrays of row objects).
  startJson: (workflowId, formData, stagedFiles = []) => authed(`${W}/${workflowId}/start/json`, { method: 'POST', body: { context: '', envType: 'live', formData, stagedFiles }, timeout: 60000 }),
  // §9.1 Start with a file: multipart, file field must be exactly "file"; formData is a JSON string.
  startWithFile: (workflowId, file, formData, fileIds = []) => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('context', '');
    fd.append('envType', 'live');
    fd.append('formData', JSON.stringify(formData || {}));
    if (fileIds.length) fd.append('fileIds', JSON.stringify(fileIds));
    return authed(`${W}/${workflowId}/start`, { method: 'POST', body: fd, timeout: 120000 });
  },
  users: () => authed('/Users').then((d) => (Array.isArray(d) ? d : (d && d.items) || [])),
  moveNext: (instanceId, body) => authed(`${W}/instances/${instanceId}/move-next`, { method: 'POST', body, timeout: 60000 }), // §6
  counts: () => authed(`${W}/counts`),
  // §7 per-stage views: rows at the given designer blocks (used by a workflow's own request tabs) and their counts.
  byActivity: (workflowId, activityIds, pageNumber = 1, pageSize = 20) => authed('/workflows/by-activity', { method: 'POST', body: { workflowId, activityIds, pageNumber, pageSize } }),
  byActivityCounts: (workflowId, activityIds) => authed(`${W}/by-activity/counts`, { method: 'POST', body: { workflowId, activityIds } }),                                                           // §8
  countsByWorkflow: () => authed(`${W}/inbox/counts-by-workflow`),                               // §8
  instanceCount: (workflowId) => authed(`${W}/instance-count?workflowId=${workflowId}`),         // used by the web app; per-workflow inbox/sent/completed counts
};

// ---------- caches (per session) ----------
const metaCache = new Map();
const formCache = new Map();
let listCache = null;
// Every uploaded file (attachments, new-request files, form file fields) is limited to 20 MB.
export const MAX_FILE_MB = 20;
export const tooBig = (file) => file && file.size > MAX_FILE_MB * 1048576;
export function clearWfCache() { metaCache.clear(); formCache.clear(); listCache = null; }

function cached(map, key, load) {
  if (!map.has(key)) map.set(key, load().catch((e) => { map.delete(key); throw e; }));
  return map.get(key);
}

export function getWorkflows() {
  if (!listCache) listCache = wfApi.list().catch((e) => { listCache = null; throw e; });
  return listCache;
}

// Workflow design → what the mobile app needs: block labels, rules (action buttons), preview fields, form id.
export function getMeta(workflowId) {
  return cached(metaCache, workflowId, async () => {
    const w = await wfApi.get(workflowId);
    let wj = w.workflowJson || {};
    if (typeof wj === 'string') { try { wj = JSON.parse(wj); } catch (e) { wj = {}; } }
    const blocks = {};
    (wj.blocks || []).forEach((b) => { blocks[b.id] = { id: b.id, type: b.type, label: (b.settings && b.settings.label) || b.type, settings: b.settings || {} }; });
    const general = (wj.settings && wj.settings.general) || {};
    return {
      id: w.id, name: w.name, formId: w.formId, repositoryId: w.repositoryId,
      blocks, rules: wj.rules || [], previewValues: general.previewValues || [], shortName: general.shortName || '',
      requestTabs: (() => { let t = general.requestTabs; if (typeof t === 'string') { try { t = JSON.parse(t); } catch (e) { t = []; } } return (Array.isArray(t) ? t : []).map((x, i) => ({ id: String((x && x.id) || `tab-${i + 1}`), label: String((x && x.label) || '').trim(), nodeIds: Array.isArray(x && x.nodeIds) ? x.nodeIds.map(String).filter(Boolean) : [] })).filter((x) => x.label); })(),
      isStageBased: general.isStageBased === 1 || general.isStageBased === true,
      isAP: Object.values(blocks).some((b) => b.type === 'AP_AGENT'),
      steps: (w.steps || []).slice().sort((a, b) => a.order - b.order),
    };
  });
}

// Form schema → flat field list (panels + secondary panels), table columns included.
export function getForm(formId) {
  if (!formId) return Promise.resolve(null);
  return cached(formCache, formId, async () => {
    const f = await wfApi.form(formId);
    let fj = f.formJson || {};
    if (typeof fj === 'string') { try { fj = JSON.parse(fj); } catch (e) { fj = {}; } }
    const fields = [...(fj.panels || []), ...(fj.secondaryPanels || [])].flatMap((p) => p.fields || []).map((x) => {
      const st = x.settings || {};
      const spec = st.specific || {};
      const gen = st.general || {};
      const sep = spec.separateOptionsUsing === 'NEWLINE' ? /\r?\n/ : ',';
      return {
        id: x.id, label: x.label || x.displayLabel || 'Field', type: x.type,
        columns: (spec.tableColumns || []).map((c) => {
          const cs = (c.settings && c.settings.specific) || {};
          const csep = cs.separateOptionsUsing === 'NEWLINE' ? /\r?\n/ : ',';
          return {
            id: c.id, label: c.label, type: c.type, required: ((c.settings && c.settings.validation) || {}).fieldRule === 'REQUIRED',
            optionsType: cs.optionsType || '', options: cs.optionsType === 'CUSTOM' ? String(cs.customOptions || '').split(csep).map((o) => o.trim()).filter(Boolean) : [],
          };
        }),
        required: (st.validation && st.validation.fieldRule) === 'REQUIRED',
        hidden: !!gen.hidden || gen.visibility === 'HIDDEN', readOnly: !!gen.readOnly || gen.visibility === 'READ_ONLY', placeholder: gen.placeholder || '', settings: st,
        optionsType: spec.optionsType || '', options: spec.optionsType === 'CUSTOM' ? String(spec.customOptions || '').split(sep).map((o) => o.trim()).filter(Boolean) : [],
        defaultValue: spec.customDefaultValue || spec.defaultValue || '',
      };
    });
    const byId = Object.fromEntries(fields.map((x) => [x.id, x]));
    const byLabel = {};
    fields.forEach((x) => { const k = String(x.label).trim().toLowerCase(); if (!(k in byLabel)) byLabel[k] = x; });
    return { name: f.name, fields, byId, byLabel, json: fj };
  });
}

// ---------- formatting ----------
const NO_VALUE_TYPES = new Set(['DIVIDER', 'LABEL', 'PARAGRAPH', 'HEADING', 'IMAGE', 'SPACE', 'BUTTON']);
// types the approver can edit on the phone: every shared control kind that takes input (src/controls.jsx)
export const EDITABLE_TYPES = new Set([...KNOWN_TYPES].filter((t) => isInputKind(kindOf(t))));

export function fmtDate(s, withTime) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return String(s);
  return d.toLocaleString('en-GB', withTime ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' });
}
export function ago(s) {
  if (!s) return '';
  const d = new Date(s); const ms = Date.now() - d.getTime();
  if (isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  const days = Math.round(h / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return days + 'd ago';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
export const isToday = (s) => { if (!s) return false; const d = new Date(s), n = new Date(); return d.toDateString() === n.toDateString(); };
export const ageDays = (s) => (s ? Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 86400000)) : 0);

const SHAPED = new Set(['currency', 'phone', 'time', 'datetime', 'toggle', 'consent', 'password', 'rating', 'scale', 'signature']);
export function fmtValue(v, type, settings) {
  if (v === null || v === undefined) return '';
  if (type && SHAPED.has(kindOf(type))) return displayValue(kindOf(type), v, settings);
  if (Array.isArray(v)) return v.map((x) => fmtValue(x)).filter(Boolean).join(', ');
  if (typeof v === 'object') return v.filename || v.fileName || v.name || v.label || v.value || '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const s = String(v).trim();
  if (type === 'DATE' && /^\d{4}-\d{2}-\d{2}/.test(s)) return fmtDate(s);
  return s;
}

// All form fields with their values for the detail screen. TABLE fields become rows of label/value pairs.
export function formView(form, formData) {
  const data = formData || {};
  if (!form) {
    return Object.entries(data).filter(([k, v]) => !Array.isArray(v) && fmtValue(v) && !isTechnicalKey(k)).map(([k, v]) => ({ id: k, label: k, type: 'SHORT_TEXT', value: fmtValue(v), raw: v }));
  }
  return form.fields.filter((f) => !NO_VALUE_TYPES.has(f.type) && !isTechnicalLabel(f.label)).map((f) => {
    const raw = data[f.id];
    if (f.type === 'TABLE') {
      const rows = (Array.isArray(raw) ? raw : []).map((row) => (f.columns.length ? f.columns : Object.keys(row || {}).map((k) => ({ id: k, label: k })))
        .map((c) => {
          const v = row && row[c.id];
          const fileObj = v && typeof v === 'object' && !Array.isArray(v) && (v.itemid || v.itemId || v.fileId) ? v : null;
          return { label: c.label, value: fmtValue(v, c.type), file: c.type === 'FILE_UPLOAD' || !!fileObj, itemId: fileObj ? (fileObj.itemid || fileObj.itemId || fileObj.fileId) : '', repositoryId: fileObj ? fileObj.repositoryId || fileObj.repositoryid || '' : '' };
        })
        .filter((c) => c.value));
      return { id: f.id, label: f.label, type: f.type, rows: rows.filter((r) => r.length), raw };
    }
    return { id: f.id, label: f.label, type: f.type, value: fmtValue(raw, f.type, f.settings), raw, hidden: f.hidden, readOnly: f.readOnly, settings: f.settings };
  }).filter((f) => !(f.hidden && !f.value)); // hidden form fields only show when the workflow filled them in
}

// AI agent output on a row (AP agent etc.) → short insight.
export function agentInsight(row) {
  const raw = row && row.agentResponse;
  if (!raw) return null;
  let a = raw;
  if (typeof raw === 'string') { try { a = JSON.parse(raw); } catch (e) { return null; } }
  if (!a || typeof a !== 'object') return null;
  const decision = a.decision || a.status || '';
  const score = typeof a.score === 'number' ? Math.round(a.score) : null;
  const insight = a.ai_insight || a.insight || '';
  const reason = a.reason || '';
  if (!decision && !insight && !reason) return null;
  return { decision, score, insight, reason, tone: toneFor(decision) };
}
export function toneFor(text) {
  const t = String(text || '').toLowerCase();
  if (/duplicate|not matched|mismatch|reject|fail|error|disqualif|exception/.test(t)) return 'bad';
  if (/partial|review|hold|pending|info/.test(t)) return 'warn';
  if (/match|approv|verified|complete|qualif|paid|success/.test(t)) return 'ok';
  return 'neu';
}

// Document metadata from the linked repository item (used when the form has no values yet, e.g. AP agent stage).
// Technical keys are never shown: ids, tenant / instance / repository / storage references, OCR text, raw JSON, paths.
const TECH_I = /ocr|tenant|instance|repositor|storage|provider|json|path|line_?item|hash|checksum|AiStatus|token|secret|password|connection|database|^File(Type|Size|Version|Name)$|^(Created|Modified)By$/i;
const TECH_CS = /(Id|ID|Ids)$|^Is[A-Z]|^Active[A-Z]/;
const TECH_WORD_ID = /(^|[\s_-])id$/i;
export const isTechnicalKey = (k) => { const s = String(k).trim(); const c = s.replace(/\s+/g, ''); return TECH_I.test(c) || TECH_CS.test(c) || TECH_WORD_ID.test(s); };
// Form labels are business data, so only clearly technical ones are hidden (e.g. OCR Text, Tenant ID, Workflow Instance ID).
export const isTechnicalLabel = (l) => /ocr|tenant\s*id|instance\s*id|storage\s*provider|repository\s*id|connection\s*string|database/i.test(String(l));
export function repoFields(row) {
  const f = row && row.repositoryItem && row.repositoryItem.fields;
  if (!f) return [];
  return Object.entries(f)
    .filter(([k, v]) => !isTechnicalKey(k) && v !== null && v !== '' && typeof v !== 'object')
    .map(([k, v]) => [k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' '), /Utc$|Date$/.test(k) ? fmtDate(v, /Utc$/.test(k)) : String(v)]);
}

const AMOUNT_RX = /amount|total|value|price|cost/i;
const money = (v, cur) => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  if (!isFinite(n) || String(v).trim() === '') return String(v);
  const s = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cur ? `${cur} ${s}` : s;
};

// Inbox / Sent / Completed row → card data. `meta` and `form` are optional (card enhances once they load).
export function toCard(row, meta, form) {
  const fd = row.formData || {};
  const preview = [];
  if (meta && form && meta.previewValues.length) {
    meta.previewValues.forEach((label) => {
      const f = form.byLabel[String(label).trim().toLowerCase()];
      const v = f ? fmtValue(fd[f.id], f.type) : '';
      if (v) preview.push([label, v]);
    });
  }
  const repo = (row.repositoryItem && row.repositoryItem.fields) || {};
  const cur = repo.Currency || '';
  if (!preview.length) {
    [['Supplier', repo.VendorName || repo.Supplier || repo.Vendor], ['Invoice no.', repo.InvoiceNo], ['Invoice amount', repo.InvoiceAmount], ['Document type', repo.DocumentType]]
      .forEach(([l, v]) => { if (v) preview.push([l, String(v)]); });
  }
  if (!preview.length && form) {
    form.fields.filter((f) => !NO_VALUE_TYPES.has(f.type) && f.type !== 'TABLE').some((f) => { const v = fmtValue(fd[f.id], f.type); if (v) preview.push([f.label, v]); return preview.length >= 3; });
  }
  const amountPair = preview.find(([l]) => AMOUNT_RX.test(l));
  const textPairs = preview.filter((p) => p !== amountPair);
  const titlePair = textPairs.find(([, v]) => !/@/.test(v) && v.length > 2) || textPairs[0];
  const fileName = row.repositoryItem && row.repositoryItem.fileName;
  const ai = agentInsight(row);
  return {
    key: `${row.workflowId}~${row.workflowInstanceId}`,
    workflowId: row.workflowId, instanceId: row.workflowInstanceId,
    ref: row.referenceNumber || 'Request', workflow: row.name || (meta && meta.name) || '',
    stage: row.stage || row.lastActionStageName || '', stageType: row.stageType,
    title: titlePair ? titlePair[1] : fileName || (meta && meta.name) || row.name || '',
    sub: textPairs.filter((p) => p !== titlePair).slice(0, 2).map(([, v]) => v).join(' · '),
    amount: amountPair ? money(amountPair[1], cur) : '',
    fileName, file: fileName && row.itemId && row.repositoryId ? { fileName, contentType: row.repositoryItem.fileType, fileSize: row.repositoryItem.fileSize, repositoryId: row.repositoryId, itemId: row.itemId } : null,
    ai, at: row.transactionCreatedAt || row.createdAtUtc, isNew: isToday(row.transactionCreatedAt),
    by: row.transactionCreatedByEmail || row.createdByName || '',
    comments: row.commentsCount || 0, attachments: row.attachmentCount || 0,
    completed: !!row.completedAtUtc || row.stageType === 'END',
    color: row.stageType === 'END' ? 't' : 'p',
    search: [row.referenceNumber, row.name, row.stage, fileName, ...preview.map((p) => p[1]), ai && ai.decision].filter(Boolean).join(' ').toLowerCase(),
  };
}

// Action buttons for the ticket's current step = designer rules leaving that block (dynamic per workflow/step).
export function actionsFor(meta, activityId) {
  if (!meta || !activityId) return [];
  const seen = new Set();
  return meta.rules.filter((r) => r.fromBlockId === activityId).map((r) => ({
    label: r.proceedAction || r.action, ruleId: r.id, to: meta.blocks[r.toBlockId] ? meta.blocks[r.toBlockId].label : '', color: String(r.buttonColor || '').trim(),
    needsComment: !!r.remarks, confirm: !!r.confirm, unsupported: r.signature ? 'a signature' : r.passwordAccess ? 'your password' : '',
  })).filter((a) => a.label && !seen.has(a.label) && seen.add(a.label));
}

// Tabs for one workflow, as the web inbox builds them: the workflow's own request tabs (each listing the
// designer blocks it shows), else Inbox / Sent / Completed (Invoices / Exceptions / Processed for AP workflows).
const BOX_KEYS = ['inbox', 'sent', 'completed'];
export function tabsFor(meta) {
  const defLabels = meta && meta.isAP ? ['Invoices', 'Exceptions', 'Processed'] : ['Inbox', 'Sent', 'Completed'];
  const own = (meta && meta.requestTabs) || [];
  if (!own.length) return BOX_KEYS.map((k, i) => ({ key: k, label: defLabels[i], box: k, nodeIds: [] }));
  return own.map((t, i) => (t.nodeIds.length
    ? { key: 'tab-' + t.id, label: t.label || defLabels[i] || `View ${i + 1}`, nodeIds: t.nodeIds }
    : { key: BOX_KEYS[i] || 'tab-' + t.id, label: t.label || defLabels[i], box: BOX_KEYS[i] || 'inbox', nodeIds: [] }));
}

// Path walked so far (from history) + current stage, for the progress bar.
export function pathFromHistory(history, currentStage, completed) {
  const names = [];
  ((history && history.flows) || []).slice().sort((a, b) => a.sequence - b.sequence).forEach((f) => { const n = f.stageName; if (n && names[names.length - 1] !== n) names.push(n); });
  if (currentStage && names[names.length - 1] !== currentStage) names.push(currentStage);
  return { steps: names.length ? names : [currentStage || 'Current step'], current: completed ? names.length : Math.max(0, names.length - 1) };
}

export const MILESTONE_DOT = { start: '#0E8A5F', submitted: '#0E8A5F', approved: '#0E8A5F', completed: '#0E8A5F', verified: '#0A7C89', ap_agent: '#0A7C89', forwarded: '#B45309', moved: '#8300E6' };

export function initials(nameOrEmail) {
  const s = String(nameOrEmail || '?').split('@')[0].replace(/[._-]+/g, ' ').trim();
  const p = s.split(/\s+/).filter(Boolean);
  return ((p[0] || '?')[0] + (p[1] ? p[1][0] : (p[0] || '')[1] || '')).toUpperCase();
}
export const prettyName = (nameOrEmail) => String(nameOrEmail || '').split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Edits made on the Edit form screen, sent as formData with the next action (move-next), per ticket.
export const drafts = new Map();

// Small async helper with limited concurrency (fan-out for Sent / Completed across workflows).
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length); let i = 0;
  const worker = async () => { while (i < items.length) { const k = i++; try { out[k] = { ok: true, value: await fn(items[k]) }; } catch (e) { out[k] = { ok: false, error: e }; } } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// ---------- line items ----------
// Pulled from the AI agent response (extracted invoice lines, PO matching), or the document's extracted line items.
const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.-]/g, '')); return String(v == null ? '' : v).trim() !== '' && isFinite(n) ? n : null; };
const fmtNum = (n) => (n == null ? '' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }));
function parseMaybe(v) { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (e) { return null; } }
function findArray(o, rx, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 4) return null;
  for (const [k, v] of Object.entries(o)) {
    const val = parseMaybe(v);
    if (rx.test(k) && Array.isArray(val) && val.length && typeof val[0] === 'object') return val;
  }
  for (const v of Object.values(o)) { const r = findArray(parseMaybe(v), rx, depth + 1); if (r) return r; }
  return null;
}
const pickV = (o, keys) => { for (const k of keys) { const hit = Object.keys(o).find((x) => x.toLowerCase() === k); if (hit != null && o[hit] !== null && o[hit] !== '') return o[hit]; } return null; };
const side = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);

export function lineItems(row) {
  if (!row) return null;
  const agent = parseMaybe(row.agentResponse) || {};
  // 1) PO matching table (invoice vs PO, with scores) when the AP agent produced one.
  const matching = findArray(agent, /line\s*item\s*match/i);
  if (matching) {
    const items = matching.map((l, i) => {
      const g = (k) => side(l[k]) || side(l[Object.keys(l).find((x) => x.toLowerCase() === k.toLowerCase())]) || {};
      const d = g('Description'), q = g('Quantity'), p = g('Price'), a = g('Amount');
      return {
        n: i + 1, description: d['Invoice Value'] || d['PO Value'] || '',
        qty: q['Invoice Value'], poQty: q['PO Value'], rate: p['Invoice Value'], poRate: p['PO Value'], amount: a['Invoice Value'], poAmount: a['PO Value'],
        score: num(l['Line Score']), mismatch: ['Quantity', 'Price', 'Amount'].filter((k) => num(g(k).Score) !== null && num(g(k).Score) < 100),
      };
    });
    if (items.length) return { source: 'PO matching', compare: true, items };
  }
  // 2) Extracted lines from the agent JSON, 3) the document's extracted line items.
  const repoLines = row.repositoryItem && row.repositoryItem.fields && parseMaybe(row.repositoryItem.fields.InvoiceExtractedLineItem);
  const lines = findArray(agent, /^line\s*items?$|^line_items$|^lines$/i) || (Array.isArray(repoLines) ? repoLines : null);
  if (!lines) return null;
  const items = lines.map((l, i) => ({
    n: pickV(l, ['line_no', 'line', 'item number']) || i + 1,
    description: pickV(l, ['description', 'material description', 'item', 'name']) || '',
    qty: pickV(l, ['quantity', 'qty', 'order quantity']), rate: pickV(l, ['rate', 'price', 'unit price', 'net price']),
    amount: pickV(l, ['line_amount', 'amount', 'total', 'net value']), uom: pickV(l, ['uom', 'unit of measure']),
    score: num(pickV(l, ['score'])), mismatch: [],
  })).filter((x) => x.description || x.amount != null);
  return items.length ? { source: 'Extracted from the document', compare: false, items } : null;
}
export { fmtNum, num };

// ---------- starting a request ----------
const TABLE_COL_TYPES = new Set(['SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'EMAIL', 'PHONE', 'SINGLE_SELECT', 'SINGLE_CHOICE']);
const START_TYPES = new Set(['SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'EMAIL', 'PHONE', 'SINGLE_SELECT', 'SINGLE_CHOICE']);
export function startFields(form) {
  if (!form) return { fields: [], blocked: [] };
  const fields = []; const blocked = [];
  form.fields.forEach((f) => {
    if (NO_VALUE_TYPES.has(f.type) || f.hidden || f.type === 'CALCULATED' || isTechnicalLabel(f.label)) return;
    const choice = f.type === 'SINGLE_SELECT' || f.type === 'SINGLE_CHOICE';
    let ok = START_TYPES.has(f.type) && (!choice || f.optionsType === 'CUSTOM' || f.optionsType === 'USER_LIST');
    if (f.type === 'TABLE') {
      // Tables (e.g. expense lines): editable when every required column is a simple type.
      const cols = f.columns.filter((c) => TABLE_COL_TYPES.has(c.type));
      const badReq = f.columns.filter((c) => c.required && !TABLE_COL_TYPES.has(c.type));
      ok = cols.length > 0 && !badReq.length;
      if (ok) { fields.push({ ...f, editColumns: cols }); return; }
    }
    if (ok) fields.push(f); else if (f.required) blocked.push(f.label);
  });
  return { fields, blocked };
}
// Who can start: the START block must be a manual (form) start, and if it lists users, the current user must be one.
export function canStart(meta, userId) {
  const starts = Object.values((meta && meta.blocks) || {}).filter((b) => b.type === 'START');
  if (!starts.length) return false;
  return starts.some((b) => {
    const st = b.settings || {};
    if (st.toolType && !/manual|form|user/i.test(st.toolType)) return false;
    const otherAudiences = st.isGroupEnabled || st.isManagerEnabled || st.isDynamicUserEnabled || st.isMasterUserEnabled || st.isCoordinatorEnabled;
    if (st.isUserEnabled && Array.isArray(st.users) && st.users.length && !otherAudiences && userId) return st.users.includes(userId);
    return true;
  });
}

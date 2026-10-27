// EZOFIS repositories (Folders) — FORM_AND_REPOSITORY_FUNCTIONS_API (Oct 2026), sections 4–6.
// Archived files live in a repository (browse/structure → browse/children → items/query → item/file).
// New files are staged first (bulkUpload → index/all → index/{fileId}/fields) and become repository items when
// exported (PUT index/{fileId}). Every call sends Bearer + X-Tenant-Id (api.js `authed`).
import { authed, authedBlob, ApiError } from './api.js';
import { MAX_FILE_MB } from './wf.js';

const R = '/repositories';
const U = '/uploadAndIndex';
const q = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// PagedResult<T> → { rows, total, next } (total is -1 when the server skipped the count).
const paged = (d) => ({ rows: (d && (d.data || d.items)) || [], total: d && typeof d.totalCount === 'number' ? d.totalCount : -1, next: (d && d.nextCursor) || null });

export const repoApi = {
  // Repositories the user may view (same list as the web Folders page).
  list: () => authed(R).then((d) => (Array.isArray(d) ? d : (d && (d.items || d.data)) || [])),
  // 5a folder levels + drill-down paths; 5b next level ({ groups: PagedResult<{ name, itemCount, dateModified }>, isLeafLevel, ... })
  structure: (id) => authed(`${R}/${id}/browse/structure`),
  children: (id, { pathId, parentFilters, page = 1, pageSize = 50, search } = {}) => authed(`${R}/${id}/browse/children?` + q({
    pathId, parentFilters: parentFilters && Object.keys(parentFilters).length ? JSON.stringify(parentFilters) : undefined, page, pageSize, search,
  })).then((d) => ({ ...d, groups: paged(d && d.groups) })),
  // 5d file list (filters in the body; keys = sqlColumnName, a folder's parentFilters show the files inside it)
  query: (id, { filters = {}, search, page = 1, pageSize = 30 } = {}) => authed(`${R}/${id}/items/query`, {
    method: 'POST', body: { filters, search: search || null, sortBy: 'documentDate', sortOrder: 'desc', page, pageSize },
  }).then(paged),
  filterFields: (id) => authed(`${R}/${id}/items/filter-fields`).then((d) => (d && d.fields) || []),
  // 5f detail is wfApi.item / wfApi.file (same endpoints); 4c / 4d
  updateMetadata: (id, itemId, values) => authed(`${R}/${id}/items/${itemId}/metadata`, { method: 'PATCH', body: values }),
  remove: (id, itemId) => authed(`${R}/${id}/items/${itemId}`, { method: 'DELETE' }),

  // ---- staged files (index list) ----
  // 6a files waiting to be indexed (uploaded by this user, not archived)
  staged: (repositoryId, page = 1, itemsPerPage = 100) => authed(`${U}/index/all`, { method: 'POST', body: { repositoryId, currentPage: page, itemsPerPage, mode: 'browse' } })
    .then((d) => {
      const groups = (d && d.data) || [];
      const rows = Array.isArray(groups) ? groups.flatMap((g) => (isObj(g) && Array.isArray(g.value) ? g.value : isObj(g) ? [g] : [])) : [];
      return { rows: rows.filter((r) => !r.isIndexed), total: (d && d.meta && d.meta.totalItems) || rows.length };
    }),
  stagedFile: (fileId) => authedBlob(`${U}/files/${fileId}?disposition=inline`),
  // 1d save values only; 1c save + archive into the repository (returns itemId); 1e delete
  saveStaged: (fileId, repositoryId, fields) => authed(`${U}/index/${fileId}/fields`, { method: 'PUT', body: { fields, repositoryId } }),
  exportStaged: (fileId, repositoryId, fields) => authed(`${U}/index/${fileId}`, { method: 'PUT', timeout: 120000, body: { repositoryId, itemId: null, status: 'Indexed', fields, ocrResult: null } }),
  deleteStaged: (fileIds, repositoryId) => authed(`${U}/index/deleteFiles`, { method: 'POST', body: { fileIds, repositoryId } }),
  // 6c bulk upload: stage all files now, OCR runs in the background; poll the job for each file's phase
  bulkUpload: (repositoryId, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f, f.name));
    fd.append('repositoryId', repositoryId);
    return authed(`${U}/bulkUpload`, { method: 'POST', body: fd, timeout: 300000 });
  },
  job: (jobId) => authed(`${U}/bulkUpload/jobs/${encodeURIComponent(jobId)}`),
  activeJob: (repositoryId) => authed(`${U}/bulkUpload/jobs/active?` + q({ repositoryId })).catch((e) => { if (e instanceof ApiError && e.status === 404) return null; throw e; }),
};

// ---- MOBILE_APP_REPOSITORY_API (Oct 2026): intelligent upload, AI summary, share, sign ----
const AI_MS = 300000; // AI calls can take up to ~5 minutes
const S = '/sign-requests';
export const docApi = {
  // 1a AI picks the repository → document_intelligent_result { repository_id, repository_name, confidence_score, rationale, candidates[] }
  classify: (file) => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('pageno', '1');
    fd.append('include_repository_catalog', 'true');
    return authed(`${R}/document-intelligent-agent/upload`, { method: 'POST', body: fd, timeout: AI_MS }).then(normalizeClassify);
  },
  // 1b OCR the repository's fields (nothing saved) → { ocrJson, ocrFieldList, ocrText }
  ocr: (file, repositoryId) => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('repositoryId', repositoryId);
    return authed(`${U}/uploadForOcr`, { method: 'POST', body: fd, timeout: AI_MS });
  },
  // 1c stage with the reviewed values → { fileId }; then 1d archive = repoApi.exportStaged → { itemId }
  stage: (file, repositoryId, values, ocr) => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('repositoryId', repositoryId);
    fd.append('metadata', JSON.stringify(values));
    if (ocr && ocr.ocrJson) fd.append('ocrJson', typeof ocr.ocrJson === 'string' ? ocr.ocrJson : JSON.stringify(ocr.ocrJson));
    if (ocr && ocr.ocrText) fd.append('ocrText', ocr.ocrText);
    return authed(`${U}/uploadWithOcr`, { method: 'POST', body: fd, timeout: AI_MS });
  },
  // 2 first call generates (1 credit), later calls return the saved summary
  summary: (repositoryId, itemId) => authed(`${R}/${repositoryId}/items/${itemId}/ai-summary`, { method: 'POST', timeout: AI_MS }),
  // 3 share by email (action 0 = can view, 1 = can edit), revoke, shared with me
  share: (repositoryId, itemId, { email, message, action = 0 }) => authed(`${R}/${repositoryId}/items/${itemId}/share`, { method: 'POST', body: { email, message: message || undefined, action } }),
  revokeShare: (shareId) => authed(`${R}/share/${shareId}`, { method: 'DELETE' }),
  sharedWithMe: () => authed(`${R}/shared-with-me`).then((d) => (Array.isArray(d) ? d : (d && (d.items || d.data)) || [])),
  // 4 sign requests (sender)
  requestSign: (repositoryId, itemId, body) => authed(`${R}/${repositoryId}/items/${itemId}/sign-requests`, { method: 'POST', body }),
  signRequests: (repositoryId, itemId) => authed(`${R}/${repositoryId}/items/${itemId}/sign-requests`).then((d) => (Array.isArray(d) ? d : (d && (d.items || d.data)) || [])),
  signRequest: (id) => authed(`${S}/${id}`),
  cancelSign: (id) => authed(`${S}/${id}/cancel`, { method: 'POST' }),
  // 5 signing (signer logged in to the app)
  pendingForMe: () => authed(`${S}/pending-for-me`).then((d) => (Array.isArray(d) ? d : (d && (d.items || d.data)) || [])),
  signFile: (id) => authedBlob(`${S}/${id}/file?disposition=inline`),
  sign: (id, body) => authed(`${S}/${id}/sign`, { method: 'POST', body, timeout: 120000 }),
  decline: (id, reason) => authed(`${S}/${id}/decline`, { method: 'POST', body: { reason: reason || undefined } }),
};

// The AI service sets these names; accept snake_case and camelCase.
function normalizeClassify(d) {
  const r = (d && (d.document_intelligent_result || d.documentIntelligentResult)) || d || {};
  const pick = (o, ...k) => { for (const x of k) if (o && o[x] != null && o[x] !== '') return o[x]; return null; };
  const score = (v) => (v == null || v === '' || isNaN(Number(v)) ? null : Math.round(Number(v) <= 1 ? Number(v) * 100 : Number(v)));
  const top = { id: pick(r, 'repository_id', 'repositoryId'), name: pick(r, 'repository_name', 'repositoryName'), score: score(pick(r, 'confidence_score', 'confidenceScore', 'score')) };
  const cands = (pick(r, 'candidates', 'candidate_repositories') || []).filter(isObj).map((c) => ({ id: pick(c, 'repository_id', 'repositoryId', 'id'), name: pick(c, 'repository_name', 'repositoryName', 'name'), score: score(pick(c, 'score', 'confidence_score')) })).filter((c) => c.id);
  return { suggested: top.id ? top : cands[0] || null, candidates: cands, rationale: pick(r, 'rationale', 'reason') || '' };
}

// AI summary `output` is usually the summary_result JSON: document_summary, key_facts_extracted[], document_type, document_title.
// Highlights arrive as <b><u>…</u></b>; everything else is plain text (never rendered as HTML).
export function parseSummary(raw) {
  const d = raw && (raw.data || raw);
  let out = d && (d.output ?? d.Output);
  let o = out;
  if (typeof out === 'string') { try { o = JSON.parse(out); } catch (e) { o = null; } }
  if (o && isObj(o.summary_result)) o = o.summary_result;
  const credit = !!(d && (d.creditConsumed || d.CreditConsumed));
  if (!isObj(o)) return { text: typeof out === 'string' ? out : '', facts: [], credit };
  const facts = o.key_facts_extracted || o.keyFacts || o.key_facts || [];
  return {
    title: o.document_title || o.documentTitle || '', type: o.document_type || o.documentType || '',
    text: o.document_summary || o.documentSummary || o.summary || '', facts: Array.isArray(facts) ? facts.map(String) : [],
    score: o.confidence_score != null ? Math.round(Number(o.confidence_score)) : null, credit,
  };
}

export const SIGNER = { Waiting: { label: 'Waiting', tone: 'neu' }, Pending: { label: 'Emailed', tone: 'p' }, Signed: { label: 'Signed', tone: 'ok' }, Declined: { label: 'Declined', tone: 'bad' } };
export const SIGN_STATUS = { InProgress: { label: 'In progress', tone: 'p' }, Completed: { label: 'Completed', tone: 'ok' }, Cancelled: { label: 'Cancelled', tone: 'neu' }, Expired: { label: 'Expired', tone: 'warn' } };
export const isPdf = (name, type) => /\.pdf$/i.test(String(name || '')) || /pdf/i.test(String(type || ''));

export const tooLarge = (f) => f && f.size > MAX_FILE_MB * 1048576;

// Bulk job file phase → what the user sees.
export const PHASE = {
  Uploading: { label: 'Uploading', tone: 'p', busy: true },
  PendingOcr: { label: 'Reading with AI', tone: 'p', busy: true },
  OcrCompleted: { label: 'Ready to review', tone: 't' },
  OcrFailed: { label: "Couldn't read · review manually", tone: 'a' },
  Indexed: { label: 'Exported to folder', tone: 'ok' },
  Missing: { label: 'Removed', tone: 'neu' },
};
// index/all stage status → phase
export const stagePhase = (s) => {
  const v = String(s || '').toLowerCase();
  if (v.includes('fail')) return 'OcrFailed';
  if (v.includes('pending')) return 'PendingOcr';
  if (v.includes('archiv') || v.includes('index')) return 'Indexed';
  return 'OcrCompleted';
};

// ---- bulk upload jobs this device started (kept per tenant so progress survives leaving the screen) ----
const JOBS = 'ezofis.uploadJobs';
const read = () => { try { const l = JSON.parse(localStorage.getItem(JOBS) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
const write = (l) => { try { localStorage.setItem(JOBS, JSON.stringify(l.slice(0, 20))); } catch (e) { /* storage unavailable */ } window.dispatchEvent(new Event('ezofis-uploads')); };
const DAY = 86400000;
export function trackedJobs(tenantId) { return read().filter((j) => j.tenantId === tenantId && Date.now() - j.startedAt < 3 * DAY); }
export function trackJob(job) { write([job, ...read().filter((j) => j.jobId !== job.jobId)]); }
export function updateJob(jobId, patch) { write(read().map((j) => (j.jobId === jobId ? { ...j, ...patch } : j))); }
export function forgetJob(jobId) { write(read().filter((j) => j.jobId !== jobId)); }
// After a staged file is exported or deleted on this device, show it on its upload right away
// (the job is no longer polled once OCR has finished).
export function markJobFile(fileId, phase) {
  const set = (l) => (l || []).map((f) => (f.fileId === fileId ? { ...f, phase } : f));
  write(read().map((j) => ((j.files || []).some((f) => f.fileId === fileId) ? { ...j, files: set(j.files), status: j.status ? { ...j.status, files: set(j.status.files) } : j.status } : j)));
}

// Field values typed for a stage row → API shape. Dates stay yyyy-mm-dd.
export const toFields = (list) => list.map((f) => ({ name: f.name, value: f.value == null ? '' : String(f.value) }));
export const extOf = (n) => { const m = /\.([a-z0-9]{2,5})$/i.exec(String(n || '')); return m ? m[1].toUpperCase().slice(0, 4) : 'FILE'; };
export const sizeOf = (n) => (n ? (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : '');

// Folders on the EZOFIS repository API (signed in). Sample-data screens stay in Folders.jsx.
//  • /app/folders                 repositories the user can view
//  • /app/folders/r/:repoId       folder tree (browse/structure + browse/children), files (items/query), files to review (index/all)
//  • /app/upload                  bulk upload → staged files with live OCR progress (bulkUpload/jobs/{jobId})
//  • /app/review?repo=&id=        review a staged file's AI-extracted values, save, export to the repository or delete
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { FileThumb, Icon, IconBtn, Sheet, Sparkle, TopBar } from '../ui.jsx';
import { apiErrorMessage } from '../api.js';
import { fmtDate, ago, isTechnicalKey, isTechnicalLabel, MAX_FILE_MB } from '../wf.js';
import FileViewer from './FileViewer.jsx';
import { Skeleton, ErrorNote, Cnt } from './LiveWorkflow.jsx';
import { repoApi, docApi, PHASE, stagePhase, trackedJobs, trackJob, updateJob, forgetJob, markJobFile, extOf, sizeOf, tooLarge, isPdf, draftRepos, trackDraftRepo, repoPermissions } from '../repo.js';
import MetaForm, { useSchema, valuesFromItem, valuesFromOcr, toStageFields, toPatch, validate } from './MetaForm.jsx';
import { ShareSheet, SignRequestSheet, SignStatus, ToSignCard, usePendingSigns, SmartUpload, SharedWithMe } from './DocActions.jsx';

const PAGE = 30;
const TONES = ['p', 't', 'd', 'a'];
const testMs = (() => { try { return Number(localStorage.getItem('ezofis.jobPollMs')) || 0; } catch (e) { return 0; } })();
const JOB_MS = testMs || 4000;

// Repositories are listed once per session (refreshed on pull / org switch).
let repoList = null;
export function getRepos(force) {
  if (force || !repoList) repoList = repoApi.list().catch((e) => { repoList = null; throw e; });
  return repoList;
}
function useRepos(tick) {
  const { session } = useStore();
  const [state, setState] = useState({ list: null, error: '' });
  useEffect(() => {
    let off = false;
    getRepos(tick > 0).then((list) => { if (!off) setState({ list, error: '' }); }).catch((e) => { if (!off) setState({ list: [], error: apiErrorMessage(e, 'your folders') }); });
    return () => { off = true; };
  }, [tick, session && session.tenantId]);
  return state;
}

function useDebounced(v, ms = 350) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

// ---------- bulk upload jobs (polled while any file is still uploading or being read) ----------
const busyJob = (j) => !j.status || !j.status.isTerminal || (j.status.files || []).some((f) => f.phase === 'PendingOcr');
export function useUploadJobs() {
  const { session } = useStore();
  const tenantId = session && session.tenantId;
  const [jobs, setJobs] = useState(() => trackedJobs(tenantId));
  useEffect(() => {
    const sync = () => setJobs(trackedJobs(tenantId));
    sync();
    window.addEventListener('ezofis-uploads', sync);
    return () => window.removeEventListener('ezofis-uploads', sync);
  }, [tenantId]);
  const active = jobs.filter(busyJob).map((j) => j.jobId).join(',');
  useEffect(() => {
    if (!active) return undefined;
    let off = false; let timer = null;
    const poll = async () => {
      await Promise.all(active.split(',').map((id) => repoApi.job(id).then((s) => { if (!off) updateJob(id, { status: s, checkedAt: Date.now() }); }).catch((e) => { if (!off && e && e.status === 404) updateJob(id, { status: { isTerminal: true, files: [], missing: true } }); })));
      if (!off) timer = setTimeout(poll, document.hidden ? JOB_MS * 4 : JOB_MS);
    };
    poll();
    return () => { off = true; clearTimeout(timer); };
  }, [active]);
  return jobs;
}
// one row per file of a tracked job: server status when known, else what the upload returned
export function jobFiles(j) {
  const byId = {};
  ((j.status && j.status.files) || []).forEach((f) => { byId[f.fileId] = f; });
  return (j.files || []).map((f) => { const s = byId[f.fileId]; return { fileId: f.fileId, fileName: f.fileName, phase: s ? s.phase : f.phase, error: (s && s.error) || f.error, itemId: s && s.promotedItemId }; });
}
const counts = (files) => files.reduce((c, f) => ({ ...c, [f.phase]: (c[f.phase] || 0) + 1 }), {});

function UploadsBanner({ jobs, onOpen }) {
  const files = jobs.flatMap(jobFiles);
  if (!files.length) return null;
  const c = counts(files);
  const busy = (c.PendingOcr || 0) + (c.Uploading || 0);
  const ready = (c.OcrCompleted || 0) + (c.OcrFailed || 0);
  if (!busy && !ready) return null;
  return (
    <button type="button" className="up-banner" onClick={onOpen}>
      <span className="up-ic">{busy ? <span className="spinner light" /> : <Icon name="checkCircle" size={20} />}</span>
      <span className="grow"><b>{busy ? `AI is reading ${busy} file${busy > 1 ? 's' : ''}` : `${ready} file${ready > 1 ? 's' : ''} ready to review`}</b><span>{busy && ready ? `${ready} ready to review · ` : ''}{c.Indexed ? `${c.Indexed} exported · ` : ''}Tap to see uploads</span></span>
      <Icon name="chevR" size={18} />
    </button>
  );
}

// ---------- 1. repositories ----------
export function LiveFolders() {
  const nav = useNavigate();
  const [tick, setTick] = useState(0);
  const { list, error } = useRepos(tick);
  const jobs = useUploadJobs();
  const toSign = usePendingSigns(tick);
  const [shared, setShared] = useState([]);
  const [viewing, setViewing] = useState(null);
  useEffect(() => { let off = false; docApi.sharedWithMe().then((l) => { if (!off) setShared(l); }).catch(() => { if (!off) setShared([]); }); return () => { off = true; }; }, [tick]);
  const [q, setQ] = useState('');
  const shown = (list || []).filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="screen">
      <TopBar title="Folders" sub={list ? `${list.length} folder${list.length === 1 ? '' : 's'}` : ''} back right={<IconBtn name="refresh" label="Refresh folders" onClick={() => setTick((x) => x + 1)} />} />
      <div className="content wide" style={{ paddingBottom: 110 }}>
        <ToSignCard list={toSign} onOpen={() => nav('/app/sign')} />
        <UploadsBanner jobs={jobs} onOpen={() => nav('/app/upload')} />
        {list && list.length > 6 ? <label className="nr-search"><Icon name="search" size={18} color="#8A84A0" /><input type="search" placeholder="Search folders" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search folders" /></label> : null}
        {error ? <ErrorNote text={error} onRetry={() => setTick((x) => x + 1)} /> : null}
        {list === null ? <Skeleton n={4} h={84} /> : null}
        <div className="repo-grid">
          {shown.map((r, i) => (
            <button key={r.id} type="button" className={'repo-card ' + TONES[i % 4]} onClick={() => nav('/app/folders/r/' + r.id)}>
              <span className="repo-ic"><Icon name="folder" size={22} /></span>
              <span className="grow">
                <span className="repo-n" title={r.name}>{r.name}</span>
                <span className="repo-m">{(r.fileCount || 0).toLocaleString()} file{r.fileCount === 1 ? '' : 's'}</span>
              </span>
              <Icon name="chevR" size={18} color="#A39DB5" />
            </button>
          ))}
        </div>
        {list && !list.length && !error ? <div className="empty"><Icon name="folder" size={40} color="#CFC8DC" />You don't have access to any folders yet.</div> : null}
        {list && list.length && !shown.length ? <div className="empty">No folder matches “{q}”.</div> : null}
        <SharedWithMe list={shared} onOpen={(s) => setViewing({ fileName: s.fileName, repositoryId: s.sourceRepositoryId, itemId: s.sourceItemId, shareToken: s.shareToken })} />
      </div>
      {viewing ? <FileViewer file={viewing} onClose={() => setViewing(null)} /> : null}
      <button type="button" className="fab" aria-label="Upload documents" onClick={() => nav('/app/upload')} style={{ position: 'fixed', right: 20, bottom: 'calc(var(--sab) + 100px)', margin: 0 }}><Icon name="upload" size={28} stroke={2.4} /></button>
    </div>
  );
}

// ---------- 2. one repository: folders / files / to review ----------
const rowSub = (r) => {
  const own = [r.documentType, r.supplier, r.invoiceNumber || r.poNumber].filter(Boolean);
  if (own.length) return own.join(' · ');
  return Object.entries(r.fields || {}).filter(([k, v]) => !isTechnicalKey(k) && v != null && v !== '' && typeof v !== 'object' && !/date/i.test(k)).slice(0, 3).map(([, v]) => String(v)).join(' · ');
};
const money = (a, c) => (a == null || a === '' ? '' : `${c ? c + ' ' : ''}${Number(a).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

function FileRow({ r, onOpen }) {
  const amt = money(r.amount ?? r.invoiceAmount, r.currency);
  return (
    <button type="button" className="file-row" onClick={() => onOpen(r)} aria-label={'Open ' + r.fileName}>
      <FileThumb ext={extOf(r.fileName)} />
      <span className="grow">
        <span className="fr-top"><span className="fr-n">{r.fileName || 'Untitled file'}</span>{amt ? <b className="fr-a">{amt}</b> : null}</span>
        {rowSub(r) ? <span className="fr-s">{rowSub(r)}</span> : null}
        <span className="fr-m">{[r.documentDate ? fmtDate(r.documentDate) : '', r.status, r.createdBy].filter(Boolean).join(' · ')}</span>
      </span>
    </button>
  );
}

function FilesList({ repoId, filters, search, reload, onOpen, emptyText }) {
  const [state, setState] = useState({ loading: true, error: '', rows: [], total: 0, page: 1, more: false });
  const fkey = JSON.stringify(filters || {});
  const load = useCallback(async (page = 1) => {
    if (page === 1) setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const d = await repoApi.query(repoId, { filters: JSON.parse(fkey), search, page, pageSize: PAGE });
      setState((s) => {
        const rows = page === 1 ? d.rows : [...s.rows, ...d.rows];
        const total = d.total >= 0 ? d.total : rows.length;
        return { loading: false, error: '', rows, total, page, more: d.total >= 0 ? rows.length < d.total : d.rows.length === PAGE };
      });
    } catch (e) { setState((s) => ({ ...s, loading: false, error: apiErrorMessage(e, 'the files') })); }
  }, [repoId, fkey, search]);
  useEffect(() => { load(1); }, [load, reload]);
  return (
    <>
      {state.error ? <ErrorNote text={state.error} onRetry={() => load(1)} /> : null}
      {state.loading ? <Skeleton n={4} h={72} /> : (
        <>
          {state.rows.length ? <div className="sec-label">{search ? 'Matching files' : 'Files'} · {state.total.toLocaleString()}</div> : null}
          <div className="files-list">{state.rows.map((r) => <FileRow key={r.id} r={r} onOpen={onOpen} />)}</div>
          {!state.rows.length && !state.error ? <div className="empty"><Icon name="file" size={40} color="#CFC8DC" />{search ? `No files match “${search}”.` : emptyText || 'No files here yet.'}</div> : null}
          {state.more ? <button type="button" className="btn neutral small load-more" onClick={() => load(state.page + 1)}>Load more ({state.rows.length} of {state.total})</button> : null}
        </>
      )}
    </>
  );
}

// Edit details / delete for an archived file (PATCH metadata, DELETE item), shown inside the file viewer.
// Actions follow the user's folder-security permissions (editMetadata, delete, sendForSignature); hidden until known.
function ItemActions({ repoId, item, perms, refresh, onChanged, onDeleted }) {
  const { showToast } = useStore();
  const schema = useSchema(repoId);
  const [edit, setEdit] = useState(null);
  const [errs, setErrs] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(false);
  const [sign, setSign] = useState(false);
  const [signTick, setSignTick] = useState(0);
  const pdf = isPdf(item.fileName, item.fileType);
  const before = useMemo(() => (schema ? valuesFromItem(schema, item.fields || {}) : {}), [schema, item]);
  const canEdit = perms && perms.editMetadata && schema && schema.some((f) => !f.readOnly);
  const open = () => { setErrs({}); setEdit(before); };
  const save = async () => {
    const e = validate(schema, edit);
    setErrs(e);
    if (Object.keys(e).length) { showToast(`${Object.keys(e).length} required detail${Object.keys(e).length > 1 ? 's are' : ' is'} missing`, { tone: 'bad' }); return; }
    const changed = toPatch(schema, edit, before);
    if (!Object.keys(changed).length) { setEdit(null); return; }
    setBusy(true);
    try { await repoApi.updateMetadata(repoId, item.id, changed); showToast('Details saved'); setEdit(null); refresh(); onChanged(); } catch (x) { showToast(x && x.status === 403 ? "You don't have permission to edit details here." : apiErrorMessage(x, 'these details'), { tone: 'bad' }); } finally { setBusy(false); }
  };
  const del = async () => {
    setBusy(true);
    try { await repoApi.remove(repoId, item.id); showToast(`${item.fileName || 'File'} deleted`); setConfirm(false); onDeleted(); } catch (e) { showToast(e && e.status === 403 ? "You don't have permission to delete files here." : apiErrorMessage(e, 'this file'), { tone: 'bad' }); } finally { setBusy(false); }
  };
  return (
    <>
    <div className="fv-actions">
      <button type="button" className="btn primary small" onClick={() => setShare(true)}><Icon name="share" size={16} />Share</button>
      {perms && perms.sendForSignature ? <button type="button" className={'btn neutral small' + (pdf ? '' : ' dim')} onClick={() => (pdf ? setSign(true) : showToast('Only PDF documents can be sent for signature.', { tone: 'bad' }))}><Icon name="edit" size={16} />Request signature</button> : null}
      {canEdit ? <button type="button" className="btn neutral small" onClick={open}><Icon name="doc" size={16} />Edit details</button> : null}
      {perms && perms.delete ? <button type="button" className="btn neutral small danger-t" onClick={() => setConfirm(true)}><Icon name="close" size={16} />Delete</button> : null}
      <ShareSheet open={share} onClose={() => setShare(false)} repoId={repoId} item={item} />
      <SignRequestSheet open={sign} onClose={() => setSign(false)} repoId={repoId} item={item} onSent={() => setSignTick((x) => x + 1)} />
      <Sheet open={!!edit} onClose={() => !busy && setEdit(null)} title="Edit details">
        <p className="muted" style={{ margin: 0, fontSize: 12 }}><span className="req">*</span> required</p>
        <div className="edit-list">{edit ? <MetaForm repoId={repoId} schema={schema} values={edit} base={before} errors={errs} idPrefix="md" onChange={(v, name) => { setEdit(v); setErrs((x) => ({ ...x, [name]: '' })); }} /> : null}</div>
        <div className="grid2"><button type="button" className="btn outline-grey" disabled={busy} onClick={() => setEdit(null)}>Cancel</button><button type="button" className="btn primary" disabled={busy} onClick={save}>{busy ? <><span className="spinner" />Saving…</> : 'Save'}</button></div>
      </Sheet>
      <Sheet open={confirm} onClose={() => !busy && setConfirm(false)} title={`Delete ${item.fileName || 'this file'}?`}>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>It's removed from this folder for everyone. An admin can restore it.</p>
        <div className="grid2"><button type="button" className="btn outline-grey" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button><button type="button" className="btn danger" disabled={busy} onClick={del}>{busy ? <><span className="spinner" />Deleting…</> : 'Delete'}</button></div>
      </Sheet>
    </div>
    {pdf ? <SignStatus repoId={repoId} itemId={item.id} tick={signTick} /> : null}
    </>
  );
}

// Drafts: files this device uploaded (bulk or intelligent) that are staged but not exported yet — kept until exported or deleted.
export function useDrafts(tick, extraRepoIds = []) {
  const { session } = useStore();
  const [state, setState] = useState({ loading: true, groups: [] });
  const ids = [...new Set([...extraRepoIds.filter(Boolean), ...draftRepos(session && session.tenantId)])].join(',');
  useEffect(() => {
    let off = false;
    if (!ids) { setState({ loading: false, groups: [] }); return undefined; }
    setState((s) => ({ ...s, loading: !s.groups.length }));
    Promise.all(ids.split(',').map((id) => repoApi.staged(id).then((d) => ({ repoId: id, rows: d.rows })).catch(() => ({ repoId: id, rows: [] })))).then((g) => { if (!off) setState({ loading: false, groups: g.filter((x) => x.rows.length) }); });
    return () => { off = true; };
  }, [ids, tick]);
  return state;
}

export function DraftsList({ drafts, repos, onOpen }) {
  const n = drafts.groups.reduce((s, g) => s + g.rows.length, 0);
  if (!n) return null;
  return (
    <section className="drafts">
      <div className="row-between" style={{ alignItems: 'center' }}><h2 className="sec-title" style={{ margin: 0 }}>Drafts · {n}</h2><span className="muted" style={{ fontSize: 12 }}>Not exported yet</span></div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Files you uploaded wait here until you check their details and export them to the folder.</p>
      {drafts.groups.map((g) => {
        const repo = (repos || []).find((r) => r.id === g.repoId);
        return (
          <div key={g.repoId} className="files-list">
            <div className="sec-label" style={{ margin: '4px 0 0' }}><Icon name="folder" size={12} /> {repo ? repo.name : 'Folder'}</div>
            {g.rows.map((r) => {
              const ph = PHASE[stagePhase(r.stageStatus || r.status)];
              const nf = (r.fields || []).filter((f) => f.value).length;
              return (
                <button key={r.fileId || r.id} type="button" className="file-row" onClick={() => onOpen(g.repoId, r)} aria-label={'Review ' + r.name}>
                  <FileThumb ext={extOf(r.name)} />
                  <span className="grow"><span className="fr-n">{r.name}</span><span className={'fr-s ph-' + ph.tone}>{ph.busy ? <span className="spinner tiny" /> : null}{ph.label}{nf ? ` · ${nf} detail${nf > 1 ? 's' : ''} found` : ''}</span><span className="fr-m">{[sizeOf(r.size), r.createdAt ? 'uploaded ' + ago(r.createdAt) : ''].filter(Boolean).join(' · ')}</span></span>
                  <Icon name="chevR" size={18} color="#A39DB5" />
                </button>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

// A fresh screen per repository, so search text, levels and files never carry over to another folder.
export function LiveRepo() { const { repoId } = useParams(); return <RepoScreen key={repoId} />; }
function RepoScreen() {
  const { repoId } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { list } = useRepos(0);
  const repo = (list || []).find((r) => r.id === repoId);
  const [st, setSt] = useState({ repoId: '', data: undefined });
  const structure = st.repoId === repoId ? st.data : undefined; // never use another folder's levels while switching
  const [reload, setReload] = useState(0);
  const [viewing, setViewing] = useState(null);
  const [q, setQ] = useState(null);
  const search = useDebounced((q || '').trim());
  const [pathsOpen, setPathsOpen] = useState(false);

  useEffect(() => {
    let off = false;
    const empty = { folderFields: [], browsePaths: [] };
    repoApi.structure(repoId).then((s) => { if (!off) setSt({ repoId, data: s || empty }); }).catch(() => { if (!off) setSt({ repoId, data: empty }); });
    return () => { off = true; };
  }, [repoId]);
  const hasTree = !!(structure && (structure.folderFields || []).length);
  const tab = params.get('tab') || (structure === undefined ? '' : hasTree ? 'folders' : 'files');
  let path = [];
  try { path = JSON.parse(params.get('path') || '[]'); } catch (e) { path = []; }
  const showFiles = params.get('files') === '1';
  const pathId = params.get('pathId') || '';
  const setQs = (patch, push = true) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); setParams(n, { replace: !push }); };
  const goPath = (p, files) => setQs({ path: p.length ? JSON.stringify(p) : '', files: files ? '1' : '' });
  const parentFilters = useMemo(() => Object.fromEntries(path.map((p) => [p.f, p.v])), [params.get('path')]); // eslint-disable-line react-hooks/exhaustive-deps

  // the current folder level
  const [level, setLevel] = useState({ loading: true });
  useEffect(() => {
    if (tab !== 'folders' || showFiles || !hasTree) return undefined;
    let off = false;
    setLevel({ loading: true });
    repoApi.children(repoId, { pathId, parentFilters, search, page: 1, pageSize: 50 }).then((d) => { if (!off) setLevel({ loading: false, ...d }); }).catch((e) => { if (!off) setLevel({ loading: false, error: apiErrorMessage(e, 'this folder') }); });
    return () => { off = true; };
  }, [repoId, tab, showFiles, hasTree, pathId, parentFilters, search, reload]);
  const [moreGroups, setMoreGroups] = useState([]);
  useEffect(() => setMoreGroups([]), [level]);
  const groups = [...((level.groups && level.groups.rows) || []), ...moreGroups];
  const loadMoreGroups = async () => {
    const page = Math.floor(groups.length / 50) + 1;
    try { const d = await repoApi.children(repoId, { pathId, parentFilters, search, page, pageSize: 50 }); setMoreGroups((m) => [...m, ...d.groups.rows]); } catch (e) { /* the list stays as it is */ }
  };
  const paths = (structure && structure.browsePaths) || [];
  const curPath = paths.find((p) => p.id === pathId) || paths[0];
  // The server lists folder levels from browse/structure (the file-name level is left out); once every level is picked,
  // browse/children answers isLeafLevel with no groups — so picking a group at the last level lists its files.
  const depth = (curPath && curPath.fieldOrder && curPath.fieldOrder.length) || ((structure && structure.folderFields) || []).length;
  const openGroup = (g) => { const p = [...path, { f: level.groupField, n: level.groupFieldName || level.groupField, v: g.name }]; goPath(p, p.length >= depth); };
  const atLeaf = showFiles || (!level.loading && !level.error && level.isLeafLevel && !((level.groups && level.groups.rows) || []).length && path.length > 0);

  const { me, session } = useStore();
  const [perms, setPerms] = useState(null);
  useEffect(() => { let off = false; repoPermissions(repoId, me, session).then((p) => { if (!off) setPerms(p); }).catch(() => { if (!off) setPerms({}); }); return () => { off = true; }; }, [repoId, me, session]);

  const tabs = [...(hasTree ? [['folders', 'Folders']] : []), ['files', 'All files']];
  const open = (r) => setViewing({ fileName: r.fileName, repositoryId: repoId, itemId: r.id, uploadedBy: r.createdBy });

  return (
    <div className="screen">
      <TopBar title={(repo && repo.name) || 'Folder'} sub={repo ? `${(repo.fileCount || 0).toLocaleString()} files` : ''} back="/app/folders" right={<span style={{ display: 'flex' }}><IconBtn name="search" label={tab === 'folders' && !atLeaf ? 'Search folders' : 'Search files'} onClick={() => setQ(q === null ? '' : null)} /><IconBtn name="refresh" label="Refresh" onClick={() => setReload((x) => x + 1)} /></span>} />
      <div className="repo-head">
        {structure === undefined ? <div className="skel" style={{ height: 48, borderRadius: 999 }} aria-hidden="true" /> : tabs.length > 1 ? (
          <div className="seg" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }} role="tablist" aria-label="Folder views">
            {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setQ(null); setQs({ tab: k, path: '', files: '' }, false); }}><span>{l}</span></button>)}
          </div>
        ) : null}
        {q !== null ? <input className="input" autoFocus placeholder={tab === 'folders' && !atLeaf ? `Search ${level.groupFieldName || 'folders'}` : 'Search file name or details'} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /> : null}
      </div>
      <div className="content wide" style={{ paddingBottom: 110 }}>
        {tab === 'folders' && hasTree ? (
          <>
            <div className="crumbs" aria-label="Folder path">
              <button type="button" className={'crumb' + (!path.length ? ' on' : '')} onClick={() => goPath([], false)}><Icon name="folder" size={14} />{(repo && repo.name) || 'All'}</button>
              {path.map((p, i) => (
                <React.Fragment key={i}><Icon name="chevR" size={14} color="#A39DB5" /><button type="button" className={'crumb' + (i === path.length - 1 ? ' on' : '')} onClick={() => goPath(path.slice(0, i + 1), i === path.length - 1 && showFiles)}><small>{p.n}</small><span className="crumb-v">{p.v}</span></button></React.Fragment>
              ))}
            </div>
            {!path.length && paths.length > 1 ? <button type="button" className="chip path-chip" onClick={() => setPathsOpen(true)}><Icon name="list" size={14} /><span className="crumb-v">Organized by {curPath ? curPath.label : ''}</span><Icon name="chevD" size={14} stroke={2.6} /></button> : null}
            {atLeaf ? <FilesList repoId={repoId} filters={parentFilters} search={search} reload={reload} onOpen={open} emptyText="This folder is empty." /> : (
              <>
                {level.error ? <ErrorNote text={level.error} onRetry={() => setReload((x) => x + 1)} /> : null}
                {level.loading ? <Skeleton n={5} h={60} /> : (
                  <>
                    {groups.length ? <div className="sec-label">{level.groupFieldName || 'Folders'} · {level.groups.total >= 0 ? level.groups.total : groups.length}</div> : null}
                    <div className="group-list">
                      {groups.map((g) => (
                        <button key={g.name} type="button" className="group-row" onClick={() => openGroup(g)}>
                          <span className="g-ic"><Icon name="folder" size={20} /></span>
                          <span className="grow"><span className="g-n">{g.name || '(blank)'}</span><span className="g-m">{g.itemCount.toLocaleString()} file{g.itemCount === 1 ? '' : 's'}{g.dateModified ? ' · updated ' + ago(g.dateModified) : ''}</span></span>
                          <Icon name="chevR" size={18} color="#A39DB5" />
                        </button>
                      ))}
                    </div>
                    {!groups.length && !level.error ? <div className="empty"><Icon name="folder" size={40} color="#CFC8DC" />{search ? `No ${String(level.groupFieldName || 'folder').toLowerCase()} matches “${search}”.` : 'No subfolders here.'}</div> : null}
                    {level.groups && level.groups.total > groups.length ? <button type="button" className="btn neutral small load-more" onClick={loadMoreGroups}>Show more ({groups.length} of {level.groups.total})</button> : null}
                  </>
                )}
              </>
            )}
          </>
        ) : null}
        {tab === 'files' ? <FilesList repoId={repoId} filters={{}} search={search} reload={reload} onOpen={open} emptyText="No files in this folder yet. Upload some to get started." /> : null}
      </div>
      {perms && perms.upload ? <button type="button" className="fab" aria-label={'Upload to ' + ((repo && repo.name) || 'this folder')} onClick={() => nav('/app/upload?repo=' + repoId)} style={{ position: 'fixed', right: 20, bottom: 'calc(var(--sab) + 28px)', margin: 0 }}><Icon name="upload" size={28} stroke={2.4} /></button> : null}
      {viewing ? (
        <FileViewer file={viewing} onClose={() => setViewing(null)} actions={(item, refresh) => (
          <ItemActions repoId={repoId} perms={perms} item={{ ...item, id: viewing.itemId, fileName: item.fileName || viewing.fileName }} refresh={refresh} onChanged={() => setReload((x) => x + 1)} onDeleted={() => { setViewing(null); setReload((x) => x + 1); getRepos(true); }} />
        )} />
      ) : null}
      <Sheet open={pathsOpen} onClose={() => setPathsOpen(false)} title="Organize folders by">
        <div className="sheet-list">{paths.map((p) => <button key={p.id} type="button" className={'opt' + (curPath && p.id === curPath.id ? ' on' : '')} onClick={() => { setQs({ pathId: p.id === (paths[0] && paths[0].id) ? '' : p.id, path: '', files: '' }, false); setPathsOpen(false); }}>{p.label}</button>)}</div>
      </Sheet>
    </div>
  );
}

// ---------- 3. upload (bulk) with staging progress ----------
export function LiveUpload() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { session, showToast } = useStore();
  const { list } = useRepos(0);
  const [destId, setDestId] = useState(params.get('repo') || '');
  const [destOpen, setDestOpen] = useState(false);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const jobs = useUploadJobs();
  const refs = { scan: useRef(null), photos: useRef(null), files: useRef(null) };
  // Intelligent upload (AI picks the folder, OCR fills the details, you check each file) vs bulk upload into one folder.
  const [smart, setSmartPref] = useState(() => { try { return localStorage.getItem('ezofis.smartUpload') !== 'off'; } catch (e) { return true; } });
  const setSmart = (on) => { setSmartPref(on); try { localStorage.setItem('ezofis.smartUpload', on ? 'on' : 'off'); } catch (e) { /* ignore */ } };
  const [smartFiles, setSmartFiles] = useState(null);
  useEffect(() => { if (!destId && list && list.length === 1) setDestId(list[0].id); }, [list, destId]);
  const dest = (list || []).find((r) => r.id === destId);

  const add = (fileList) => {
    const l = [...(fileList || [])];
    const big = l.filter(tooLarge);
    if (big.length) showToast(`${big.map((f) => f.name).join(', ')} ${big.length > 1 ? 'are' : 'is'} over ${MAX_FILE_MB} MB and wasn't added`, { tone: 'bad' });
    setPicked((p) => [...p, ...l.filter((f) => !tooLarge(f))]);
    setErr('');
  };
  const upload = async () => {
    if (smart) { if (picked.length) { setSmartFiles(picked); setPicked([]); } return; }
    if (!dest) { setDestOpen(true); return; }
    if (!picked.length || busy) return;
    setBusy(true); setErr('');
    try {
      const res = await repoApi.bulkUpload(dest.id, picked);
      const files = (res.files || []).map((f) => ({ fileId: f.fileId, fileName: f.fileName, phase: f.succeeded === false ? 'OcrFailed' : 'PendingOcr', error: f.error }));
      if (res.jobId) trackJob({ jobId: res.jobId, repositoryId: dest.id, repositoryName: dest.name, tenantId: session.tenantId, startedAt: Date.now(), files });
      trackDraftRepo(session.tenantId, dest.id);
      setPicked([]);
      showToast(`${files.length} file${files.length === 1 ? '' : 's'} uploaded to ${dest.name}. AI is reading them now.`);
    } catch (e) {
      setErr(e && e.status === 403 ? `You don't have permission to upload to ${dest.name}.` : apiErrorMessage(e, 'the upload'));
    } finally { setBusy(false); }
  };

  const visible = jobs.filter((j) => jobFiles(j).length);
  const readyFor = visible.map((j) => ({ j, n: jobFiles(j).filter((f) => f.phase === 'OcrCompleted' || f.phase === 'OcrFailed').length })).filter((x) => x.n);
  const total = picked.reduce((n, f) => n + f.size, 0);
  // drafts are re-read whenever an upload's files change phase, and after intelligent upload finishes
  const [draftTick, setDraftTick] = useState(0);
  const phases = jobs.map((j) => jobFiles(j).map((f) => f.phase).join('')).join('|');
  const drafts = useDrafts(phases + ':' + draftTick, jobs.map((j) => j.repositoryId));

  return (
    <div className="screen">
      <TopBar title="Upload documents" back right={<span />} />
      <div className="content" style={{ gap: 16 }}>
        {smartFiles ? <SmartUpload files={smartFiles} repos={list || []} onCancel={() => { setSmartFiles(null); setDraftTick((x) => x + 1); }} onFinished={() => { setSmartFiles(null); setDraftTick((x) => x + 1); getRepos(true); }} /> : null}
        {!smartFiles ? (<>
        <div className="update-card smart-toggle" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <span className="up-ic" style={{ background: 'rgba(255,255,255,.18)' }}><Sparkle size={20} color="#fff" /></span>
          <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>Intelligent upload</span><span style={{ display: 'block', fontSize: 13, opacity: 0.92 }}>{smart ? 'AI picks the folder and fills the details. You check each file.' : 'Upload many files to one folder. AI reads them; you review later.'}</span></span>
          <button type="button" role="switch" aria-checked={smart} aria-label="Intelligent upload" className="switch teal" onClick={() => setSmart(!smart)} />
        </div>
        {!smart ? (
          <div className="field">
            <span className="lab">Upload to <span className="req">*</span></span>
            <button type="button" className="input strong" style={{ display: 'flex', alignItems: 'center', textAlign: 'left', gap: 8 }} onClick={() => setDestOpen(true)}><Icon name="folder" size={18} color="#643094" /><span style={{ flex: 1 }}>{dest ? dest.name : list === null ? 'Loading folders…' : 'Choose a folder'}</span><Icon name="chevD" size={16} stroke={2.4} /></button>
          </div>
        ) : null}
        <div className="card w up-sources">
          <button type="button" className="qa" onClick={() => refs.scan.current.click()}><span className="c solid"><Icon name="camera" size={26} /></span>Scan</button>
          <button type="button" className="qa" onClick={() => refs.photos.current.click()}><span className="c"><Icon name="image" size={26} /></span>Photos</button>
          <button type="button" className="qa" onClick={() => refs.files.current.click()}><span className="c"><Icon name="file" size={26} /></span>Files</button>
          <input ref={refs.scan} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} aria-label="Scan a document" />
          <input ref={refs.photos} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} aria-label="Choose photos" />
          <input ref={refs.files} type="file" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} aria-label="Choose files" />
        </div>
        </>) : null}
        {picked.length ? (
          <section className="up-picked">
            <div className="row-between"><b>Selected · {picked.length}</b><span className="muted" style={{ fontSize: 12 }}>{sizeOf(total)} · max {MAX_FILE_MB} MB each</span></div>
            {picked.map((f, i) => (
              <div key={i} className="file-row static"><FileThumb ext={extOf(f.name)} /><span className="grow"><span className="fr-n">{f.name}</span><span className="fr-m">{sizeOf(f.size)}</span></span>{!busy ? <button type="button" className="icon-btn" aria-label={'Remove ' + f.name} onClick={() => setPicked((p) => p.filter((_, j) => j !== i))}><Icon name="close" size={18} /></button> : null}</div>
            ))}
          </section>
        ) : null}
        {err ? <div className="notice bad" role="alert"><Icon name="warn" size={18} /><span className="grow">{err}</span><button type="button" onClick={upload}>Try again</button></div> : null}

        {visible.length ? <h2 className="sec-title" style={{ margin: 0 }}>Uploads</h2> : null}
        {visible.map((j) => {
          const files = jobFiles(j);
          const c = counts(files);
          const done = !busyJob(j) && !(c.OcrCompleted || c.OcrFailed);
          return (
            <section key={j.jobId} className="up-job">
              <div className="row-between" style={{ alignItems: 'center' }}>
                <span className="up-job-t"><Icon name="folder" size={16} />{j.repositoryName}</span>
                <span className="muted" style={{ fontSize: 12 }}>{ago(new Date(j.startedAt).toISOString())}{done ? <button type="button" className="text-btn" style={{ height: 28 }} onClick={() => forgetJob(j.jobId)}>Clear</button> : null}</span>
              </div>
              <div className="up-bar" aria-hidden="true"><i style={{ width: Math.round(((files.length - (c.PendingOcr || 0)) / Math.max(1, files.length)) * 100) + '%' }} /></div>
              {files.map((f) => {
                const ph = PHASE[f.phase] || PHASE.PendingOcr;
                return (
                  <div key={f.fileId} className="up-file">
                    <FileThumb ext={extOf(f.fileName)} />
                    <span className="grow"><span className="fr-n">{f.fileName}</span><span className={'fr-s ph-' + ph.tone}>{ph.busy ? <span className="spinner tiny" /> : <Icon name={f.phase === 'Indexed' ? 'checkCircle' : f.phase === 'OcrFailed' ? 'warn' : 'check'} size={14} />}{ph.label}</span></span>
                  </div>
                );
              })}
            </section>
          );
        })}
        {!smartFiles ? <DraftsList drafts={drafts} repos={list} onOpen={(repoId, r) => nav(`/app/review?repo=${repoId}&id=${r.fileId || r.id}`)} /> : null}
        {!smartFiles && !picked.length && !visible.length && !drafts.groups.length ? <div className="empty" style={{ padding: 20 }}>Scan a document, or choose photos or files to upload.<br /><span style={{ fontSize: 12 }}>Up to {MAX_FILE_MB} MB per file. You can upload several at once.</span></div> : null}
      </div>
      {!smartFiles ? <div className="bottombar">
        {picked.length && smart ? (
          <button type="button" className="btn primary" disabled={list === null} onClick={upload}><Sparkle size={16} color="#fff" />Upload {picked.length} file{picked.length > 1 ? 's' : ''} with AI</button>
        ) : picked.length ? (
          <button type="button" className="btn primary" disabled={busy || !dest} onClick={upload}>{busy ? <><span className="spinner" />Uploading {picked.length} file{picked.length > 1 ? 's' : ''}…</> : `Upload ${picked.length} file${picked.length > 1 ? 's' : ''}${dest ? ' to ' + dest.name : ''}`}</button>
        ) : readyFor.length ? (
          <button type="button" className="btn primary" onClick={() => nav(`/app/review?repo=${readyFor[0].j.repositoryId}`)}>Review {readyFor[0].n} file{readyFor[0].n > 1 ? 's' : ''} in {readyFor[0].j.repositoryName}</button>
        ) : (
          <button type="button" className="btn neutral" onClick={() => nav(dest ? '/app/folders/r/' + dest.id : '/app/folders')}>Go to {dest ? dest.name : 'folders'}</button>
        )}
      </div> : null}
      <Sheet open={destOpen} onClose={() => setDestOpen(false)} title="Upload to">
        <div className="sheet-list">
          {list === null ? <div className="muted" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="spinner" />Loading folders…</div> : null}
          {(list || []).map((r) => <button key={r.id} type="button" className={'opt' + (r.id === destId ? ' on' : '')} onClick={() => { setDestId(r.id); setDestOpen(false); }}><Icon name="folder" size={20} /><span style={{ flex: 1 }}>{r.name}</span></button>)}
        </div>
      </Sheet>
    </div>
  );
}

// ---------- 4. review a staged file: AI-extracted values in the repository's own form → save / export / delete ----------
export function LiveReview() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const repoId = params.get('repo') || '';
  const { showToast } = useStore();
  const { list } = useRepos(0);
  const repo = (list || []).find((r) => r.id === repoId);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const repoSchema = useSchema(repoId);
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [errs, setErrs] = useState({});

  useEffect(() => {
    if (!repoId) return undefined;
    let off = false;
    repoApi.staged(repoId).then((d) => { if (!off) { setRows(d.rows); setErr(''); } }).catch((e) => { if (!off) { setRows([]); setErr(apiErrorMessage(e, 'files to review')); } });
    return () => { off = true; };
  }, [repoId, tick]);
  const cur = rows && (rows.find((r) => (r.fileId || r.id) === params.get('id')) || rows[0]);
  const curId = cur && (cur.fileId || cur.id);
  // the repository's fields (typed controls, required, options), filled from the OCR values saved on the stage row
  const ocr = useMemo(() => (cur && repoSchema ? valuesFromOcr(repoSchema, cur.fields || []) : null), [cur, repoSchema]);
  const schema = useMemo(() => (repoSchema && ocr ? [...repoSchema, ...ocr.extra] : []), [repoSchema, ocr]);
  useEffect(() => { if (ocr) { setVals(ocr.values); setErrs({}); } }, [curId, ocr]); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = (left) => {
    if (left.length) setParams({ repo: repoId, id: left[0].fileId || left[0].id }, { replace: true });
    else { showToast('All files reviewed'); nav('/app/upload', { replace: true }); }
  };
  const drop = () => { const left = rows.filter((r) => (r.fileId || r.id) !== curId); setRows(left); goNext(left); };
  const fields = () => toStageFields(schema, vals);
  const save = async () => { setBusy('save'); try { await repoApi.saveStaged(curId, repoId, fields()); showToast('Saved as draft. Finish it from Upload › Drafts.'); setTick((x) => x + 1); } catch (e) { showToast(apiErrorMessage(e, 'your changes'), { tone: 'bad' }); } finally { setBusy(''); } };
  const exportIt = async () => {
    const e = validate(schema, vals);
    setErrs(e);
    if (Object.keys(e).length) { showToast(`Fill in ${Object.keys(e).length} required detail${Object.keys(e).length > 1 ? 's' : ''} first`, { tone: 'bad' }); setTimeout(() => { const el = document.querySelector('[data-err="1"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 50); return; }
    setBusy('export');
    try { await repoApi.exportStaged(curId, repoId, fields()); markJobFile(curId, 'Indexed'); showToast(`${cur.name} exported to ${(repo && repo.name) || 'the folder'}`, { tone: 'ok' }); getRepos(true); drop(); } catch (x) { showToast(x && x.status === 403 ? "You don't have permission to file documents here." : apiErrorMessage(x, 'the export'), { tone: 'bad' }); } finally { setBusy(''); }
  };
  const del = async () => { setBusy('delete'); try { await repoApi.deleteStaged([curId], repoId); markJobFile(curId, 'Missing'); showToast(`${cur.name} deleted`); setConfirm(false); drop(); } catch (e) { showToast(apiErrorMessage(e, 'this file'), { tone: 'bad' }); } finally { setBusy(''); } };
  const view = async () => { setBusy('view'); try { const blob = await repoApi.stagedFile(curId); setViewing({ fileName: cur.name, blob }); } catch (e) { showToast(apiErrorMessage(e, 'this file'), { tone: 'bad' }); } finally { setBusy(''); } };

  const back = '/app/upload';
  if (!repoId) return <div className="screen"><TopBar title="Review" back={back} /><div className="content"><div className="empty">Choose a folder to review its uploaded files.</div></div></div>;
  if (rows === null || !repoSchema) return <div className="screen"><TopBar title="Review" back={back} /><div className="content"><Skeleton n={5} h={64} /></div></div>;
  if (!cur) {
    return (
      <div className="screen"><TopBar title="Review" sub={repo && repo.name} back={back} />
        <div className="content">{err ? <ErrorNote text={err} onRetry={() => setTick((x) => x + 1)} /> : <div className="empty"><Icon name="checkCircle" size={44} color="#CFC8DC" />Nothing left to review in {(repo && repo.name) || 'this folder'}.<button type="button" className="btn primary" style={{ marginTop: 10, width: 220 }} onClick={() => nav('/app/upload?repo=' + repoId)}>Upload more</button></div>}</div>
      </div>
    );
  }
  const idx = rows.indexOf(cur) + 1;
  const phase = stagePhase(cur.stageStatus || cur.status);
  const found = ocr ? ocr.found.size : 0;
  const required = schema.filter((f) => f.required && !f.readOnly).length;
  return (
    <div className="screen">
      <TopBar title="Review & export" sub={`${idx} of ${rows.length} · ${(repo && repo.name) || ''}`} back={back} right={<IconBtn name="refresh" label="Refresh" onClick={() => setTick((x) => x + 1)} />} />
      <div className="content" style={{ gap: 14 }}>
        <button type="button" className="rv-file" onClick={view} disabled={busy === 'view'} aria-label={'View ' + cur.name}>
          <FileThumb ext={extOf(cur.name)} />
          <span className="grow"><span className="fr-n">{cur.name}</span><span className="fr-m">{[sizeOf(cur.size), cur.createdAt ? 'uploaded ' + ago(cur.createdAt) : ''].filter(Boolean).join(' · ')}</span></span>
          <span className="open-chip">{busy === 'view' ? <span className="spinner tiny" /> : <Icon name="eye" size={16} />}View</span>
        </button>
        {phase === 'PendingOcr' ? <div className="notice info"><span className="spinner tiny" /><span className="grow">AI is still reading this file. Wait a moment and refresh, or fill in the details yourself.</span><button type="button" onClick={() => setTick((x) => x + 1)}>Refresh</button></div>
          : phase === 'OcrFailed' ? <div className="notice warn"><Icon name="warn" size={18} /><span className="grow">AI couldn't read this file. Fill in the details yourself before exporting.</span></div>
            : <div className="rv-ai"><Sparkle size={18} color="#fff" /><span className="grow"><b>{found ? `AI extracted ${found} of ${schema.length} details` : 'No details were extracted'}</b><span>Check them, then export to the folder.</span></span></div>}
        {required ? <p className="muted" style={{ margin: 0, fontSize: 12 }}><span className="req">*</span> {required} required detail{required > 1 ? 's' : ''}; the rest are optional.</p> : null}
        <MetaForm repoId={repoId} schema={schema} values={vals} base={ocr && ocr.values} found={ocr && ocr.found} errors={errs} idPrefix="rv" onChange={(v, name) => { setVals(v); setErrs((x) => ({ ...x, [name]: '' })); }} />
        <div className="rv-more">
          <button type="button" className="text-btn" disabled={!!busy} onClick={save}>{busy === 'save' ? 'Saving…' : 'Save for later'}</button>
          {rows.length > 1 ? <button type="button" className="text-btn" disabled={!!busy} onClick={() => { const n = rows[idx % rows.length]; setParams({ repo: repoId, id: n.fileId || n.id }, { replace: true }); }}>Skip</button> : null}
          <button type="button" className="text-btn danger-t" disabled={!!busy} onClick={() => setConfirm(true)}>Delete</button>
        </div>
      </div>
      <div className="bottombar">
        <button type="button" className="btn primary" disabled={!!busy} onClick={exportIt}>{busy === 'export' ? <><span className="spinner" />Exporting…</> : `Export to ${(repo && repo.name) || 'folder'}`}</button>
      </div>
      <Sheet open={confirm} onClose={() => !busy && setConfirm(false)} title={`Delete ${cur.name}?`}>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>The uploaded file and its extracted details are removed. It won't be added to the folder.</p>
        <div className="grid2"><button type="button" className="btn outline-grey" disabled={!!busy} onClick={() => setConfirm(false)}>Cancel</button><button type="button" className="btn danger" disabled={!!busy} onClick={del}>{busy === 'delete' ? <><span className="spinner" />Deleting…</> : 'Delete'}</button></div>
      </Sheet>
      {viewing ? <FileViewer file={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}

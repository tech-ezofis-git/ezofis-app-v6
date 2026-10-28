// Workflow screens on the real EZOFIS Workflow API (used when signed in; sample-data screens stay in Workflow.jsx).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore, actionKind } from '../store.jsx';
import { ActionBar, actionColor, FileThumb, Icon, IconBtn, Pill, Progress, Sheet, TopBar, useSplit, Sparkle } from '../ui.jsx';
import { apiErrorMessage } from '../api.js';
import FileViewer from './FileViewer.jsx';
import {
  lineItems, fmtNum, MAX_FILE_MB, tooBig, tabsFor, wfApi, getWorkflows, getMeta, getForm, toCard, formView, actionsFor, pathFromHistory, agentInsight, repoFields,
  ago, fmtDate, initials, prettyName, MILESTONE_DOT, EDITABLE_TYPES, drafts, mapLimit, toneFor,
} from '../wf.js';
import { Control, kindOf, formatError, displayValue } from '../controls.jsx';

const PAGE = 20;
const BOXES = [['inbox', 'Inbox', 'Inbox'], ['sent', 'Sent', 'Sent'], ['completed', 'Completed', 'Done']];

// Tab label + count badge on one line; short label on very narrow phones (see .seg / .utabs CSS).
export const Cnt = ({ n }) => (n != null && n !== '' ? <span className="cnt">{n > 999 ? '999+' : n}</span> : null);

// Loads workflow design + form for the workflows on screen, so cards can show labelled preview values.
function useMetas(ids) {
  const [metas, setMetas] = useState({});
  const key = [...new Set(ids)].sort().join(',');
  useEffect(() => {
    let off = false;
    key.split(',').filter(Boolean).forEach((id) => {
      getMeta(id).then(async (meta) => {
        const form = await getForm(meta.formId).catch(() => null);
        if (!off) setMetas((m) => (m[id] ? m : { ...m, [id]: { meta, form } }));
      }).catch(() => { /* card keeps its basic text */ });
    });
    return () => { off = true; };
  }, [key]);
  return metas;
}

export function Skeleton({ n = 3, h = 96 }) {
  return <>{Array.from({ length: n }, (_, i) => <div key={i} className="skel" style={{ height: h }} aria-hidden="true" />)}</>;
}

export function ErrorNote({ text, onRetry }) {
  return <div className="notice bad" role="alert"><Icon name="warn" size={18} /><span className="grow">{text}</span>{onRetry ? <button type="button" onClick={onRetry}>Retry</button> : null}</div>;
}

export function LiveCard({ c, onClick, selected, onOpenFile }) {
  const key = (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } };
  return (
    <div role="button" tabIndex={0} className={'card ' + c.color + (selected ? ' selected' : '')} onClick={onClick} onKeyDown={key} style={{ cursor: 'pointer' }}>
      <span className="row-between" style={{ alignItems: 'center', gap: 8 }}>
        <span className="ct" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{c.ref}{c.isNew ? <span className="pill new">New</span> : null}</span>
        {c.ai && c.ai.decision ? <Pill tone={c.ai.tone} solid>{c.ai.decision}</Pill> : <Pill tone={c.completed ? 'ok' : 'neu'}>{c.stage}</Pill>}
      </span>
      <span className="cb" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
      {c.sub ? <span className="cb" style={{ display: 'block', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.sub}</span> : null}
      <span className="cm"><span>{c.workflow}{c.ai && c.ai.decision ? ' · ' + c.stage : ''} · {ago(c.at)}</span><b style={{ color: 'var(--ink)' }}>{c.amount}</b></span>
      {onOpenFile && c.file ? <button type="button" className="card-file" aria-label={'Open ' + c.file.fileName} onClick={(e) => { e.stopPropagation(); onOpenFile(c.file); }}><Icon name="clip" size={14} /><span>{c.file.fileName}</span></button> : null}
    </div>
  );
}

// ---------- list ----------
function LiveList({ selectedKey, onOpen, onFirst }) {
  const { liveTick, setInboxCount, inboxCount } = useStore();
  const [params, setParams] = useSearchParams();
  const wfId = params.get('wf') || '';
  // Tabs: all workflows → Inbox / Sent / Completed; one workflow → its own request tabs from the workflow settings
  const [wfMeta, setWfMeta] = useState(undefined); // undefined = loading, null = unavailable
  useEffect(() => {
    let off = false;
    setWfMeta(wfId ? undefined : null);
    if (wfId) getMeta(wfId).then((m) => { if (!off) setWfMeta(m); }).catch(() => { if (!off) setWfMeta(null); });
    return () => { off = true; };
  }, [wfId]);
  const tabs = useMemo(() => (wfId && wfMeta ? tabsFor(wfMeta) : BOXES.map(([k, l, short]) => ({ key: k, label: l, short, box: k, nodeIds: [] }))), [wfId, wfMeta]);
  const wantKey = params.get('tab') === 'actioned' ? 'sent' : params.get('tab') || '';
  const tab = tabs.find((t) => t.key === wantKey) || tabs[0];
  const box = tab.box || 'custom';
  const tabReady = !wfId || wfMeta !== undefined;
  const segRef = useRef(null);

  const [workflows, setWorkflows] = useState(null);
  const [wfOpen, setWfOpen] = useState(false);
  const [search, setSearch] = useState(null);
  const [chip, setChip] = useState('All');
  const [state, setState] = useState({ loading: true, error: '', groups: null, rows: [], total: 0, page: 1, more: false });
  const [counts, setCounts] = useState(null);
  useEffect(() => { // keep the selected workflow tab in view when the row scrolls on small phones
    const el = segRef.current && segRef.current.querySelector('button.on');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const seg = segRef.current;
    if (seg) { const edge = () => seg.classList.toggle('more-r', seg.scrollLeft + seg.clientWidth < seg.scrollWidth - 4); edge(); seg.onscroll = edge; }
  }, [tab.key, tabReady, counts, state.loading]);
  const [reload, setReload] = useState(0);
  const nav = useNavigate();
  const loadingMore = useRef(false);

  const setQ = (patch) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); setParams(n, { replace: true }); };

  useEffect(() => { getWorkflows().then((l) => setWorkflows(l.filter((w) => w.status !== 0))).catch(() => setWorkflows([])); }, [liveTick]);

  // Tab counts: workflow tabs → by-activity/counts (summed per tab); mailbox tabs → instance-count; all workflows → /counts.
  useEffect(() => {
    let off = false;
    setCounts(null);
    if (!tabReady) return undefined;
    const jobs = [];
    if (!wfId) jobs.push(wfApi.counts().then((d) => ({ inbox: null, sent: d.sentCount, completed: d.completedCount })));
    else {
      const nodeTabs = tabs.filter((t) => t.nodeIds.length);
      if (nodeTabs.length) {
        const all = [...new Set(nodeTabs.flatMap((t) => t.nodeIds))];
        jobs.push(wfApi.byActivityCounts(wfId, all).then((d) => {
          const per = {}; ((d && d.items) || []).forEach((x) => { per[x.activityId] = Number(x.count) || 0; });
          return Object.fromEntries(nodeTabs.map((t) => [t.key, t.nodeIds.reduce((n, id) => n + (per[id] || 0), 0)]));
        }));
      }
      if (tabs.some((t) => t.box)) jobs.push(wfApi.instanceCount(wfId).then((d) => Object.fromEntries(tabs.filter((t) => t.box).map((t) => [t.key, d[t.box + 'Count']]))));
    }
    Promise.allSettled(jobs).then((r) => { if (!off) setCounts(Object.assign({}, ...r.filter((x) => x.status === 'fulfilled').map((x) => x.value))); });
    return () => { off = true; };
  }, [wfId, tabs, tabReady, liveTick, reload]);

  const load = useCallback(async (page = 1) => {
    if (page === 1) setState({ loading: true, error: '', groups: null, rows: [], total: 0, page: 1, more: false });
    try {
      if (box === 'inbox' && !wfId) {
        const d = await wfApi.allInbox(PAGE);
        const groups = (d.workflows || []).filter((g) => (g.items || []).length || g.totalCount);
        setState({ loading: false, error: '', groups, rows: groups.flatMap((g) => g.items || []), total: d.totalCount || 0, page: 1, more: false });
        setCounts((c) => ({ ...(c || {}), inbox: d.totalCount || 0 })); setInboxCount(d.totalCount || 0);
      } else if (wfId) {
        // a workflow tab bound to designer blocks lists the requests at those steps (§7); otherwise its mailbox
        const d = tab.nodeIds.length ? await wfApi.byActivity(wfId, tab.nodeIds, page, PAGE) : await wfApi.mailbox(box, wfId, { pageNumber: page, pageSize: PAGE });
        const items = d.items || [];
        setState((s) => {
          const rows = page === 1 ? items : [...s.rows, ...items];
          const total = d.totalCount >= 0 ? d.totalCount : rows.length;
          return { loading: false, error: '', groups: null, rows, total, page, more: rows.length < total && items.length === PAGE };
        });
      } else {
        // Sent / Completed are per-workflow in the API: fan out over the workflows this user can see, newest first.
        const list = await getWorkflows();
        const res = await mapLimit(list.filter((w) => w.status !== 0), 4, (w) => wfApi.mailbox(box, w.id, { pageNumber: 1, pageSize: 10 }));
        const ok = res.filter((r) => r.ok).map((r) => r.value);
        if (!ok.length && res.length) throw res[0].error;
        const rows = ok.flatMap((d) => d.items || []).sort((a, b) => String(b.transactionCreatedAt || '').localeCompare(String(a.transactionCreatedAt || '')));
        const total = ok.reduce((n, d) => n + Math.max(0, d.totalCount || 0), 0);
        setState({ loading: false, error: '', groups: null, rows, total, page: 1, more: false, partial: ok.length < res.length });
      }
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: apiErrorMessage(e, box === 'inbox' ? 'your inbox' : 'these requests') }));
    } finally { loadingMore.current = false; }
  }, [box, wfId, tab, setInboxCount]);

  useEffect(() => { if (tabReady) { load(1); setChip('All'); } }, [load, tabReady, liveTick, reload]);

  const metas = useMetas(state.rows.map((r) => r.workflowId));
  const cards = useMemo(() => state.rows.map((r) => toCard(r, metas[r.workflowId] && metas[r.workflowId].meta, metas[r.workflowId] && metas[r.workflowId].form)), [state.rows, metas]);
  // Quick filters: All · New today (arrived today) · Earlier (older, still waiting — not actioned yet)
  const visible = cards.filter((c) => (!search || c.search.includes(search.toLowerCase().trim()))
    && (chip === 'All' || (chip === 'New today' ? c.isNew : chip === 'Earlier' ? !c.isNew && !c.completed : true)));
  useEffect(() => { if (onFirst && visible[0]) onFirst(visible[0].key); }, [visible.length && visible[0].key]); // eslint-disable-line react-hooks/exhaustive-deps

  const wfName = wfId ? ((workflows || []).find((w) => w.id === wfId) || {}).name || 'Workflow' : 'All workflows';
  // The open tab's badge always equals what its list reports (count endpoints can disagree with the list on some tenants);
  // other tabs use the count endpoints, corrected with each list total once that tab has been opened.
  const seen = useRef({});
  useEffect(() => { seen.current = {}; }, [wfId, liveTick, reload]);
  useEffect(() => { if (!state.loading && !state.error) seen.current[tab.key] = state.total; }, [state.loading, state.error, state.total, tab.key]);
  const countOf = (k) => (k === tab.key && !state.loading && !state.error ? state.total
    : seen.current[k] != null ? seen.current[k]
      : counts && counts[k] != null ? counts[k] : k === 'inbox' && !wfId ? inboxCount : null);

  const [viewing, setViewing] = useState(null);
  const renderCards = (list) => list.map((c) => <LiveCard key={c.key} c={c} selected={selectedKey === c.key} onClick={() => onOpen(c.key)} onOpenFile={setViewing} />);

  return (
    <div className="screen">
      <TopBar title="Workflow" back tone="surface" right={<span style={{ display: 'flex' }}><IconBtn name="plus" label="New request" onClick={() => nav('/app/new')} /><IconBtn name="refresh" label="Refresh" onClick={() => setReload((x) => x + 1)} /><IconBtn name="search" label="Search requests" onClick={() => setSearch(search === null ? '' : null)} /></span>} />
      <div style={{ background: 'var(--surface)', padding: '0 var(--gutter) 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {search !== null ? <input className="input" autoFocus placeholder="Search number, title, stage or file" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search requests" /> : null}
        <button type="button" className="input strong" style={{ display: 'flex', alignItems: 'center', textAlign: 'left' }} onClick={() => setWfOpen(true)}><span style={{ flex: 1 }}>{wfName}</span><Icon name="chevD" size={16} stroke={2.4} /></button>
        {!tabReady ? <div className="skel" style={{ height: 48, borderRadius: 999 }} aria-hidden="true" /> : (
          <div ref={segRef} className={'seg' + (wfId ? ' fit' : '')} style={wfId ? undefined : { gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }} role="tablist" aria-label="Request views">
            {tabs.map((t, i) => <button key={t.key} type="button" role="tab" aria-selected={tab.key === t.key} aria-label={t.label + (countOf(t.key) != null ? ', ' + countOf(t.key) : '')} className={tab.key === t.key ? 'on' : ''} onClick={() => setQ({ tab: i === 0 ? '' : t.key })}><span className="lbl-l">{t.label}</span><span className="lbl-s">{t.short || t.label}</span><Cnt n={countOf(t.key)} /></button>)}
          </div>
        )}
      </div>
      <div className="content" style={{ maxWidth: 'none' }}>
        {!state.loading && cards.length ? (
          <div className="chips">{[['All', cards.length], ['New today', cards.filter((c) => c.isNew).length], ['Earlier', cards.filter((c) => !c.isNew && !c.completed).length]].map(([c, n]) => <button key={c} type="button" className={'chip' + (chip === c ? ' on' : '')} onClick={() => setChip(c)}>{c}<span className="chip-n">{n}</span></button>)}</div>
        ) : null}
        {state.error ? <ErrorNote text={state.error} onRetry={() => setReload((x) => x + 1)} /> : null}
        {state.partial ? <div className="notice warn"><Icon name="warn" size={18} /><span className="grow">Some workflows didn't load. Showing what's available.</span></div> : null}
        {state.loading ? <Skeleton n={4} /> : null}
        {!state.loading && state.groups && !search && chip === 'All' ? state.groups.map((g) => {
          const gc = cards.filter((c) => c.workflowId === g.workflowId);
          return (
            <React.Fragment key={g.workflowId}>
              <div className="grp-h"><b>{g.workflowName}</b><span>{g.totalCount} open{g.newTodayCount ? ` · ${g.newTodayCount} new today` : ''}</span></div>
              {renderCards(gc)}
              {g.totalCount > gc.length ? <button type="button" className="btn neutral small" onClick={() => setQ({ wf: g.workflowId, tab: '' })}>Show all {g.totalCount} in {g.workflowName}</button> : null}
            </React.Fragment>
          );
        }) : null}
        {!state.loading && !(state.groups && !search && chip === 'All') ? renderCards(visible) : null}
        {!state.loading && !state.error && !visible.length ? (
          <div className="empty"><Icon name={box === 'inbox' ? 'checkCircle' : 'inbox'} size={40} color="#CFC8DC" />{search || chip !== 'All' ? 'Nothing matches this filter.' : box === 'custom' ? `Nothing in ${tab.label} right now.` : box === 'inbox' ? 'Nothing waiting for you. Nice work!' : box === 'sent' ? 'Nothing you acted on is still running.' : 'No completed requests yet.'}</div>
        ) : null}
        {state.more ? <button type="button" className="btn neutral small load-more" onClick={() => { if (loadingMore.current) return; loadingMore.current = true; load(state.page + 1); }}>Load more ({state.rows.length} of {state.total})</button> : null}
      </div>
      {viewing ? <FileViewer file={viewing} onClose={() => setViewing(null)} /> : null}
      <Sheet open={wfOpen} onClose={() => setWfOpen(false)} title="Show workflow">
        <div className="sheet-list">
          <button type="button" className={'opt' + (!wfId ? ' on' : '')} onClick={() => { setQ({ wf: '', tab: '' }); setWfOpen(false); }}>All workflows</button>
          {workflows === null ? <div className="muted" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="spinner" />Loading workflows…</div> : null}
          {(workflows || []).map((w) => <button key={w.id} type="button" className={'opt' + (w.id === wfId ? ' on' : '')} onClick={() => { setQ({ wf: w.id, tab: '' }); setWfOpen(false); }}>{w.name}</button>)}
        </div>
      </Sheet>
    </div>
  );
}

// ---------- detail ----------
export function useTicket(key, tick) {
  const [workflowId, instanceId] = String(key || '').split('~');
  const [t, setT] = useState({ loading: true });
  const load = useCallback(async () => {
    if (!workflowId || !instanceId) { setT({ loading: false, error: "This request link isn't valid." }); return; }
    setT((x) => ({ ...x, loading: true, error: '' }));
    const settle = (p) => p.then((value) => ({ value }), (error) => ({ error }));
    const [row, inst, hist, cm, at, meta] = await Promise.all([
      settle(wfApi.locate(workflowId, instanceId)), settle(wfApi.instance(workflowId, instanceId)), settle(wfApi.history(workflowId, instanceId)),
      settle(wfApi.comments(workflowId, instanceId)), settle(wfApi.attachments(workflowId, instanceId)), settle(getMeta(workflowId)),
    ]);
    if (row.error && hist.error) { setT({ loading: false, error: apiErrorMessage(row.error, 'this request') }); return; }
    const formId = (row.value && row.value.formId) || (meta.value && meta.value.formId);
    const form = await getForm(formId).catch(() => null);
    setT({
      loading: false, workflowId, instanceId, row: row.value || null, rowError: row.error ? apiErrorMessage(row.error, 'the request row') : '',
      instance: inst.value || null, history: hist.value || null, historyError: hist.error ? apiErrorMessage(hist.error, 'the history') : '',
      comments: (cm.value && cm.value.comments) || [], commentsError: cm.error ? apiErrorMessage(cm.error, 'comments') : '',
      attachments: (at.value && at.value.attachments) || [], attachmentsError: at.error ? apiErrorMessage(at.error, 'attachments') : '',
      meta: meta.value || null, form,
    });
  }, [workflowId, instanceId]);
  useEffect(() => { load(); }, [load, tick]);
  return [t, load, setT];
}

function LiveDetail({ id, embedded }) {
  const nav = useNavigate();
  const { showToast, liveTick, bumpLive, setLastResult, addNotif, me } = useStore();
  const [t, reload, setT] = useTicket(id, liveTick);
  const [tab, setTab] = useState('form');
  const [pending, setPending] = useState(null);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [linesOpen, setLinesOpen] = useState(true);
  const [uploading, setUploading] = useState('');
  const fileRef = useRef(null);
  useEffect(() => { setTab('form'); }, [id]);

  const back = <button type="button" className="circle-btn" aria-label="Back" onClick={() => nav('/app/inbox')}><Icon name="back" size={20} stroke={2.2} /></button>;
  if (t.loading && !t.row && !t.history) {
    return <div className="screen">{!embedded ? <TopBar title="Request" back="/app/inbox" /> : null}<div className="content"><Skeleton n={1} h={70} /><Skeleton n={4} h={56} /></div></div>;
  }
  if (t.error) {
    return <div className="screen">{!embedded ? <TopBar title="Request" back="/app/inbox" /> : null}<div className="content"><ErrorNote text={t.error} onRetry={reload} /></div></div>;
  }

  const row = t.row || {};
  const hist = t.history || {};
  const mailbox = row.mailbox || (hist.statusName && /complete/i.test(hist.statusName) ? 'completed' : '');
  const completed = mailbox === 'completed' || !!row.completedAtUtc || row.stageType === 'END';
  const stage = row.stage || (t.instance && (t.instance.stepInstances || []).find((s) => s.id === t.instance.currentStepInstanceId) || {}).stepName || '';
  const path = pathFromHistory(t.history, stage, completed);
  const acts = mailbox === 'inbox' ? actionsFor(t.meta, row.activityId) : [];
  const block = t.meta && row.activityId ? t.meta.blocks[row.activityId] : null;
  const fd = { ...(row.formData || {}), ...(drafts.get(id) || {}) };
  const fields = formView(t.form, fd);
  const isFilled = (f) => !!(f.value || (f.rows && f.rows.length));
  const filledCount = fields.filter(isFilled).length;
  const shown = fields.filter((f) => showEmpty || isFilled(f));
  const lines = lineItems(row);
  const canEdit = mailbox === 'inbox' && block && block.settings.formEditAccess === 'ALL' && t.form && fields.some((f) => EDITABLE_TYPES.has(f.type));
  const ai = agentInsight(row);
  const repo = repoFields(row);
  const pendingEdits = drafts.get(id);
  const ref = row.referenceNumber || hist.referenceNumber || 'Request';
  const wfName = row.name || hist.workflowName || (t.meta && t.meta.name) || '';
  const act = pending ? acts.find((a) => a.label === pending) : null;

  const confirm = async () => {
    if (!act) return;
    if (act.unsupported) return;
    if ((act.needsComment || actionKind(act.label) === 'danger') && !comment.trim()) { setErr('Add a comment so the requester knows why.'); return; }
    setBusy(true); setErr('');
    try {
      const body = { activityid: row.activityId, review: act.label, comments: comment.trim() || undefined };
      if (pendingEdits) body.formData = fd;
      const res = await wfApi.moveNext(row.workflowInstanceId || t.instanceId, body);
      drafts.delete(id);
      const kind = actionKind(act.label);
      const next = res && res.workflowCompleted ? 'Completed' : (res && res.nextStepName) || act.to || 'the next step';
      setLastResult({ id: ref, key: id, label: act.label, past: act.label.toLowerCase(), kind, nextStage: next, comment: comment.trim(), workflow: wfName, when: new Date(), live: true, message: res && res.message, completed: !!(res && res.workflowCompleted), by: (me && (me.displayName || me.email)) || '' });
      addNotif({ type: 'wf', title: `${act.label} · ${ref}`, body: `${wfName} · ${res && res.workflowCompleted ? 'completed' : 'moved to ' + next}`, tone: kind === 'danger' ? 'r' : 'p', to: '/app/inbox?tab=sent' });
      setPending(null); setComment('');
      bumpLive();
      nav('/app/done/' + encodeURIComponent(id), { replace: embedded });
    } catch (e) {
      setErr(e && e.status === 400 ? (e.message || 'EZOFIS rejected this action.') : apiErrorMessage(e, 'this action'));
    } finally { setBusy(false); }
  };

  const postComment = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      await wfApi.addComment(t.workflowId, t.instanceId, text);
      setDraft('');
      const d = await wfApi.comments(t.workflowId, t.instanceId).catch(() => null);
      setT((x) => ({ ...x, comments: d && d.comments ? d.comments : [...x.comments, { id: 'local' + Date.now(), comments: text, authorName: 'You', createdAtUtc: new Date().toISOString() }] }));
    } catch (er) { showToast(apiErrorMessage(er, 'your comment'), { tone: 'bad' }); } finally { setPosting(false); }
  };

  const upload = async (list) => {
    const picked = [...(list || [])];
    if (fileRef.current) fileRef.current.value = '';
    if (!picked.length) return;
    const big = picked.filter(tooBig);
    const ok = picked.filter((f) => !tooBig(f));
    if (big.length) showToast(`${big.map((f) => f.name).join(', ')} ${big.length > 1 ? 'are' : 'is'} over ${MAX_FILE_MB} MB and wasn't attached`, { tone: 'bad' });
    if (!ok.length) return;
    let done = 0; const failed = [];
    for (let k = 0; k < ok.length; k += 1) {
      setUploading(ok.length > 1 ? `Uploading ${k + 1} of ${ok.length}…` : 'Uploading…');
      try { await wfApi.uploadAttachment(t.workflowId, t.instanceId, ok[k], (t.meta && t.meta.repositoryId) || row.repositoryId, row.transactionId); done += 1; } catch (er) { failed.push(ok[k].name + ' (' + apiErrorMessage(er, 'the upload') + ')'); }
    }
    const d = await wfApi.attachments(t.workflowId, t.instanceId).catch(() => null);
    if (d) setT((x) => ({ ...x, attachments: d.attachments || [] }));
    setUploading('');
    if (failed.length) showToast(`Couldn't attach ${failed.join(', ')}`, { tone: 'bad', duration: 6000 });
    else showToast(done === 1 ? ok[0].name + ' attached to ' + ref : `${done} files attached to ${ref}`);
  };

  const flows = ((hist.flows) || []).slice().sort((a, b) => b.sequence - a.sequence);
  const ext = (n) => (String(n || '').split('.').pop() || 'FILE').toUpperCase().slice(0, 4);

  return (
    <div className="screen">
      <header className="topbar white" style={{ gridTemplateColumns: embedded ? '1fr auto' : '44px 1fr auto' }}>
        {!embedded ? back : null}
        <div className="topbar-title" style={{ textAlign: 'left' }}><div className="t">{ref}</div><div className="s">{wfName}</div></div>
        <IconBtn name="refresh" label="Refresh request" onClick={reload} />
      </header>
      <div style={{ padding: '0 var(--gutter)', background: '#fff', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--line)' }}>
        <div className="row-between" style={{ gap: 10 }}><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--deep)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{completed ? 'Completed' + (stage ? ' · ' + stage : '') : stage}</span><span className="muted" style={{ fontSize: 12 }}>{mailbox ? mailbox[0].toUpperCase() + mailbox.slice(1) : hist.statusName || ''}</span></div>
        <Progress steps={path.steps} current={Math.min(path.current, path.steps.length - 1)} />
        <div className="muted" style={{ fontSize: 12 }}>
          {mailbox === 'inbox' ? `Waiting on you · since ${ago(row.transactionCreatedAt)}` : hist.nextActionUser && !completed ? `Waiting on ${prettyName(hist.nextActionUser)}` : completed ? `Finished ${fmtDate(row.completedAtUtc || row.transactionCreatedAt, true)}` : ''}
        </div>
        <div className="utabs live" role="tablist" style={{ borderBottom: 0, marginTop: 4 }}>
          {[['form', 'doc', 'Form', null, 'Form'], ['files', 'clip', 'Files', t.attachments.length, 'Attachments'], ['chat', 'chat', 'Chat', t.comments.length, 'Comments'], ['history', 'history', 'History', null, 'History']].map(([k, ic, l, n, aria]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} aria-label={aria + (n ? ', ' + n : '')} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Icon name={ic} size={16} /><span className="lbl">{l}</span>{n ? <Cnt n={n} /> : null}</button>
          ))}
        </div>
      </div>

      <div className="content" style={{ paddingBottom: 24 }}>
        {tab === 'form' ? (
          <>
            {ai ? (
              <div className="ai-card">
                <div className="row-between" style={{ alignItems: 'center' }}><span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, color: 'var(--teal-dark)' }}><Sparkle size={18} />AI agent</span><span style={{ display: 'flex', gap: 6 }}>{ai.decision ? <Pill tone={ai.tone} solid>{ai.decision}</Pill> : null}{ai.score != null ? <Pill tone="t" solid>{ai.score}%</Pill> : null}</span></div>
                {ai.insight ? <div style={{ fontSize: 14, fontWeight: 600 }}>{ai.insight}</div> : null}
                {ai.reason ? <div className="r">{ai.reason}</div> : null}
              </div>
            ) : null}
            {pendingEdits ? <div className="notice info"><Icon name="edit" size={18} /><span className="grow">You edited {Object.keys(pendingEdits).length} field{Object.keys(pendingEdits).length > 1 ? 's' : ''}. They're saved when you take an action.</span><button type="button" onClick={() => { drafts.delete(id); setT((x) => ({ ...x })); }}>Discard</button></div> : null}
            {row.repositoryItem && row.repositoryItem.fileName && row.itemId && row.repositoryId ? (
              <button type="button" className="card t list-row" style={{ textAlign: 'left' }} aria-label={'Open ' + row.repositoryItem.fileName} onClick={() => setViewing({ fileName: row.repositoryItem.fileName, contentType: row.repositoryItem.fileType, fileSize: row.repositoryItem.fileSize, repositoryId: row.repositoryId, itemId: row.itemId, ai })}>
                <FileThumb ext={ext(row.repositoryItem.fileName)} />
                <span style={{ flex: 1, minWidth: 0 }}><span className="ct" style={{ display: 'block', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.repositoryItem.fileName}</span><span className="cb" style={{ display: 'block', fontSize: 12 }}>Source document</span></span>
                <span className="open-chip"><Icon name="eye" size={16} />Open</span>
              </button>
            ) : null}
            {lines ? (
              <section className="lines" aria-label="Line items">
                <button type="button" className="lines-h" aria-expanded={linesOpen} onClick={() => setLinesOpen(!linesOpen)}>
                  <span><b>Line items</b><Cnt n={lines.items.length} /></span>
                  <span className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>{lines.source}<Icon name="chevD" size={14} stroke={2.4} style={{ transform: linesOpen ? 'rotate(180deg)' : 'none' }} /></span>
                </button>
                {linesOpen ? lines.items.map((li, i) => (
                  <div key={i} className={'line' + (li.mismatch.length ? ' bad' : '')}>
                    <div className="line-top"><span className="line-n">{li.n}</span><span className="line-d">{li.description || 'Item'}</span>{li.score != null ? <Pill tone={li.score >= 100 ? 'ok' : li.score >= 60 ? 'warn' : 'bad'} solid>{Math.round(li.score)}%</Pill> : null}</div>
                    <div className="line-grid">
                      <span><small>Qty</small>{fmtNum(li.qty) || '—'}{li.uom ? ' ' + li.uom : ''}{lines.compare && li.poQty != null && String(li.poQty) !== String(li.qty) ? <em> PO {fmtNum(li.poQty)}</em> : null}</span>
                      <span><small>Rate</small>{fmtNum(li.rate) || '—'}{lines.compare && li.poRate != null && String(li.poRate) !== String(li.rate) ? <em> PO {fmtNum(li.poRate)}</em> : null}</span>
                      <span><small>Amount</small><b>{fmtNum(li.amount) || '—'}</b>{lines.compare && li.poAmount != null && String(li.poAmount) !== String(li.amount) ? <em> PO {fmtNum(li.poAmount)}</em> : null}</span>
                    </div>
                    {li.mismatch.length ? <div className="line-warn">{li.mismatch.join(', ')} {li.mismatch.length > 1 ? "don't" : "doesn't"} match the PO</div> : null}
                  </div>
                )) : null}
              </section>
            ) : null}
            <div className="form-h">
              <span className="form-t">{(t.form && t.form.name) || 'Request form'}</span>
              {canEdit ? <button type="button" className="icon-btn" aria-label="Edit form" style={{ background: 'var(--surface)' }} onClick={() => nav('/app/inbox/' + encodeURIComponent(id) + '/edit')}><Icon name="edit" size={18} color="#643094" /></button> : null}
            </div>
            {fields.length && fields.length !== filledCount ? (
              <div className="seg mini" role="radiogroup" aria-label="Which fields to show">
                <button type="button" role="radio" aria-checked={!showEmpty} className={!showEmpty ? 'on' : ''} onClick={() => setShowEmpty(false)}>Filled<span className="cnt">{filledCount}</span></button>
                <button type="button" role="radio" aria-checked={showEmpty} className={showEmpty ? 'on' : ''} onClick={() => setShowEmpty(true)}>All fields<span className="cnt">{fields.length}</span></button>
              </div>
            ) : null}
            {t.rowError ? <ErrorNote text={t.rowError} onRetry={reload} /> : null}
            {shown.map((f) => (f.type === 'TABLE' ? (
              <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="sec-label" style={{ marginTop: 2 }}>{f.label}{f.rows ? ` · ${f.rows.length} row${f.rows.length === 1 ? '' : 's'}` : ''}</div>
                {!(f.rows && f.rows.length) ? <div className="field-card unfilled"><div className="v">No rows</div></div> : null}
                {(f.rows || []).map((r, i) => <div key={i} className="tbl-row">{r.map((c) => <React.Fragment key={c.label}><span className="l">{c.label}</span><span className="v">{c.file && c.itemId && (c.repositoryId || row.repositoryId || (t.meta && t.meta.repositoryId)) ? <button type="button" className="file-link" onClick={() => setViewing({ fileName: c.value, repositoryId: c.repositoryId || row.repositoryId || t.meta.repositoryId, itemId: c.itemId })}><Icon name="clip" size={14} />{c.value}</button> : c.value}</span></React.Fragment>)}</div>)}
              </div>
            ) : (
              <div key={f.id} className={'field-card' + (isFilled(f) ? '' : ' unfilled')}><div className="l">{f.label}</div><div className="v">{f.value || 'Not filled'}</div></div>
            )))}
            {!shown.length && repo.length ? (
              <>
                <div className="sec-label">Document details</div>
                {repo.map(([l, v]) => <div key={l} className="field-card"><div className="l">{l}</div><div className="v">{v}</div></div>)}
              </>
            ) : null}
            {!shown.length && !repo.length ? <div className="muted" style={{ fontSize: 14 }}>No form values on this request yet.</div> : null}
            {!showEmpty && fields.length > filledCount && shown.length ? <button type="button" className="text-btn" style={{ alignSelf: 'center' }} onClick={() => setShowEmpty(true)}>{fields.length - filledCount} empty field{fields.length - filledCount > 1 ? 's' : ''} hidden · Show all</button> : null}
          </>
        ) : null}

        {tab === 'files' ? (
          <>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Attachments · {t.attachments.length}</span>
            {t.attachmentsError ? <ErrorNote text={t.attachmentsError} onRetry={reload} /> : null}
            {t.attachments.map((f) => (
              <button key={f.id} type="button" className="card t list-row" style={{ textAlign: 'left' }} onClick={() => setViewing({ ...f, repositoryId: f.repositoryId || row.repositoryId })} aria-label={'Open ' + f.fileName}><FileThumb ext={ext(f.fileName)} /><span style={{ flex: 1, minWidth: 0 }}><span className="ct" style={{ display: 'block', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName}</span><span className="cb" style={{ display: 'block', fontSize: 12 }}>{[f.fileSize ? Math.max(1, Math.round(f.fileSize / 1024)) + ' KB' : '', f.uploadedBy ? prettyName(f.uploadedBy) : '', ago(f.createdAtUtc)].filter(Boolean).join(' · ')}</span></span><span className="open-chip"><Icon name="eye" size={16} />Open</span></button>
            ))}
            {!t.attachments.length && !t.attachmentsError ? <div className="muted" style={{ fontSize: 14 }}>No attachments on this request.</div> : null}
            {mailbox === 'inbox' ? (
              <>
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} aria-label="Choose files to attach" />
                <button type="button" className="btn neutral" style={{ borderStyle: 'dashed' }} disabled={!!uploading} onClick={() => fileRef.current && fileRef.current.click()}>{uploading ? <><span className="spinner" />{uploading}</> : <><Icon name="plus" size={18} />Add attachments</>}</button>
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'chat' ? (
          <>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Comments</span>
            {t.commentsError ? <ErrorNote text={t.commentsError} onRetry={reload} /> : null}
            {t.comments.length ? t.comments.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <span className="avatar">{c.isAgent ? 'AI' : initials(c.authorName || c.externalCommentsBy || c.createdBy)}</span>
                <div className="bubble"><span className="muted" style={{ display: 'block', fontSize: 12 }}>{c.isAgent ? 'AI Agent' : prettyName(c.authorName || c.externalCommentsBy || 'User')} · {ago(c.createdAtUtc)}</span>{c.comments}</div>
              </div>
            )) : !t.commentsError ? <div className="muted" style={{ fontSize: 14 }}>No comments yet.</div> : null}
            <form style={{ display: 'flex', gap: 8 }} onSubmit={postComment}>
              <input className="input" aria-label="Add a comment" placeholder="Add a comment…" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={posting} />
              <button type="submit" className="btn primary" aria-label="Send comment" disabled={posting || !draft.trim()} style={{ width: 52, flex: 'none', padding: 0 }}>{posting ? <span className="spinner" /> : <Icon name="send" size={18} />}</button>
            </form>
          </>
        ) : null}

        {tab === 'history' ? (
          <>
            <span style={{ fontSize: 16, fontWeight: 600 }}>History</span>
            {t.historyError ? <ErrorNote text={t.historyError} onRetry={reload} /> : null}
            {flows.map((h) => (
              <div key={h.sequence + '-' + (h.transactionRowId || '')} className="timeline">
                <span className="rail-l2"><i style={{ background: MILESTONE_DOT[h.milestone] || '#8300E6' }} /><b /></span>
                <span style={{ paddingBottom: 14 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{h.title || h.description || h.stageName}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{[prettyName(h.performedByUserName || h.createdByName || h.actionUser), fmtDate(h.performedAtUtc || h.occurredAtUtc, true)].filter(Boolean).join(' · ')}</span>
                  {h.review && h.review !== h.description ? <span style={{ display: 'block', fontSize: 12, color: 'var(--deep)' }}>Action: {h.review}</span> : null}
                </span>
              </div>
            ))}
            {!flows.length && !t.historyError ? <div className="muted" style={{ fontSize: 14 }}>No history yet.</div> : null}
          </>
        ) : null}
      </div>

      {acts.length ? <ActionBar actions={acts.map((a) => ({ label: a.label, color: a.color }))} onAction={(l) => { setPending(l); setErr(''); }} /> : null}
      {mailbox === 'inbox' && !acts.length && t.meta ? <div className="bottombar"><div className="notice info" style={{ width: '100%' }}><Icon name="clock" size={18} /><span className="grow">No actions are set up for the {stage || 'current'} step. Open it on the web to continue.</span></div></div> : null}

      {viewing ? <FileViewer file={viewing} onClose={() => setViewing(null)} /> : null}
      <Sheet open={!!pending} onClose={() => !busy && setPending(null)} title={pending ? `${pending} ${ref}?` : ''}>
        {act && act.to ? <div className="muted" style={{ fontSize: 13 }}>Moves to <b style={{ color: 'var(--ink)' }}>{act.to}</b>.</div> : null}
        {act && act.unsupported ? <div className="notice warn"><Icon name="lock" size={18} /><span className="grow">This action needs {act.unsupported}. Use cloud.ezofis.com for it.</span></div> : (
          <div className="field">
            <label htmlFor="cm">Comment {act && (act.needsComment || actionKind(act.label) === 'danger') ? <span className="req">*</span> : <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>}</label>
            <textarea id="cm" className={'input' + (err ? ' error' : '')} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a note for the requester" disabled={busy} />
            {err ? <span className="err" role="alert">{err}</span> : null}
          </div>
        )}
        <div className="grid2">
          <button type="button" className="btn outline-grey" disabled={busy} onClick={() => setPending(null)}>Cancel</button>
          <button type="button" className={'btn ' + (act && actionColor(act.color) ? 'colored' : pending && actionKind(pending) === 'danger' ? 'danger' : 'primary')} style={(act && actionColor(act.color)) || undefined} disabled={busy || (act && !!act.unsupported)} onClick={confirm}>{busy ? <><span className="spinner" />Working…</> : pending}</button>
        </div>
      </Sheet>
    </div>
  );
}

export function LiveInbox() {
  const { id } = useParams();
  const split = useSplit();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [first, setFirst] = useState(null);
  const qs = params.toString() ? '?' + params.toString() : '';
  const open = (k) => nav('/app/inbox/' + encodeURIComponent(k) + qs);
  if (split) {
    const sel = id || first;
    return (
      <div className="split">
        <div className="pane-list"><LiveList selectedKey={sel} onOpen={open} onFirst={setFirst} /></div>
        <div className="pane-detail">{sel ? <LiveDetail id={sel} embedded key={sel} /> : <div className="pane-empty"><Icon name="checkCircle" size={48} color="#CFC8DC" />Select a request.</div>}</div>
      </div>
    );
  }
  if (id) return <LiveDetail id={id} />;
  return <LiveList onOpen={open} />;
}

// ---------- edit (values are sent as formData with the next action) ----------
export function LiveEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { showToast, liveTick } = useStore();
  const [t] = useTicket(id, liveTick);
  const [vals, setVals] = useState(null);
  const [errs, setErrs] = useState({});
  const fields = useMemo(() => (t.row ? formView(t.form, { ...(t.row.formData || {}), ...(drafts.get(id) || {}) }).filter((f) => EDITABLE_TYPES.has(f.type)) : []), [t.row, t.form, id]);
  useEffect(() => { if (fields.length && !vals) setVals(Object.fromEntries(fields.map((f) => [f.id, f.raw == null ? '' : f.raw]))); }, [fields, vals]);
  if (t.loading && !t.row) return <div className="screen"><TopBar title="Edit form" back={'/app/inbox/' + encodeURIComponent(id)} /><div className="content"><Skeleton n={4} h={64} /></div></div>;
  if (t.error || !t.row) return <div className="screen"><TopBar title="Edit form" back="/app/inbox" /><div className="content"><ErrorNote text={t.error || "This request can't be edited."} /></div></div>;
  const key = (v) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  const base = t.row.formData || {};
  const save = () => {
    const e = {};
    fields.forEach((f) => { const fe = !f.readOnly && formatError(kindOf(f.type), vals[f.id]); if (fe) e[f.id] = fe; });
    setErrs(e);
    if (Object.keys(e).length) { showToast('Check the highlighted fields', { tone: 'bad' }); return; }
    const changed = {};
    Object.entries(vals || {}).forEach(([k, v]) => { if (key(base[k]) !== key(v)) changed[k] = v; });
    if (Object.keys(changed).length) drafts.set(id, changed); else drafts.delete(id);
    showToast(Object.keys(changed).length ? 'Changes kept. Take an action to save them.' : 'No changes');
    nav('/app/inbox/' + encodeURIComponent(id), { replace: true });
  };
  return (
    <div className="screen">
      <TopBar title="Edit form" sub={`${t.row.referenceNumber} · ${t.row.stage}`} back={'/app/inbox/' + encodeURIComponent(id)} right={<span />} />
      <div className="content" style={{ gap: 16 }}>
        {fields.map((f) => {
          const k = kindOf(f.type);
          const v = vals ? vals[f.id] : '';
          return (
            <div key={f.id} className="field" data-err={errs[f.id] ? '1' : undefined}>
              <label htmlFor={'f-' + f.id}>{f.label}{f.readOnly ? <Icon name="lock" size={12} color="#9C96AB" style={{ marginLeft: 4 }} /> : null}</label>
              <Control kind={k} id={'f-' + f.id} value={v} readOnly={f.readOnly} error={!!errs[f.id]} settings={f.settings} label={k === 'consent' ? undefined : f.label} onChange={(x) => { setErrs((e) => ({ ...e, [f.id]: '' })); setVals({ ...vals, [f.id]: x }); }} />
              {errs[f.id] ? <span className="err" role="alert">{errs[f.id]}</span> : vals && key(v) !== key(f.raw) ? <span className="hint">Changed from {displayValue(k, f.raw, f.settings) || 'empty'}</span> : null}
            </div>
          );
        })}
        <div className="card t" style={{ fontSize: 13 }}>Changes are saved to {t.row.referenceNumber} when you approve, reject or take another action.</div>
      </div>
      <div className="bottombar" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <button type="button" className="btn neutral" onClick={() => nav(-1)}>Cancel</button>
        <button type="button" className="btn primary" onClick={save}>Keep changes</button>
      </div>
    </div>
  );
}

// ---------- done ----------
export function LiveDone() {
  const nav = useNavigate();
  const { lastResult, liveTick } = useStore();
  const res = lastResult || { id: 'Request', label: 'Action', kind: 'primary', nextStage: '' };
  const [next, setNext] = useState(undefined);
  useEffect(() => {
    let off = false;
    wfApi.allInbox(1).then((d) => {
      const g = (d.workflows || []).find((x) => (x.items || []).length);
      if (!off) setNext(g ? { card: toCard(g.items[0]), total: d.totalCount } : null);
    }).catch(() => { if (!off) setNext(null); });
    return () => { off = true; };
  }, [liveTick]);
  const color = res.kind === 'danger' ? '#C2264B' : res.kind === 'primary' ? '#0E8A5F' : '#643094';
  const ring = res.kind === 'danger' ? '#FCE8ED' : res.kind === 'primary' ? '#E3F5EE' : '#F1E6FD';
  const when = (res.when || new Date()).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="screen" style={{ minHeight: '100%' }}>
      <div className="content" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 'calc(var(--sat) + 64px)', gap: 14 }}>
        <span className="success-ring" style={{ background: ring }}><span style={{ background: color, boxShadow: `0 10px 24px ${color}55` }}><Icon name={res.kind === 'danger' ? 'close' : 'check'} size={34} color="#fff" stroke={3} /></span></span>
        <h1 style={{ fontFamily: 'var(--head)', fontSize: 26, marginTop: 8 }}>{res.label} done</h1>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.5 }}>{res.id} {res.completed ? 'is now complete' : <>moved to <b style={{ color: 'var(--ink)' }}>{res.nextStage}</b></>}.</p>
      </div>
      <div className="content" style={{ paddingTop: 0 }}>
        <div className="card p" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 10px' }}>
          {[['Request', res.id], ['Action', res.label], ['Workflow', res.workflow || '—'], ['When', when]].map(([l, v]) => <div key={l}><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--deep)' }}>{l}</div><div style={{ fontSize: 14 }}>{v}</div></div>)}
          {res.comment ? <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--deep)' }}>Comment</div><div style={{ fontSize: 14 }}>{res.comment}</div></div> : null}
        </div>
        {next === undefined ? <Skeleton n={1} h={80} /> : next ? (
          <>
            <div className="sec-label">Next in your inbox · {next.total}</div>
            <LiveCard c={next.card} onClick={() => nav('/app/inbox/' + encodeURIComponent(next.card.key), { replace: true })} />
          </>
        ) : <div className="card t"><div className="ct">Inbox clear</div><div className="cb">No more requests waiting for you.</div></div>}
      </div>
      <div className="bottombar">
        {next ? <button type="button" className="btn primary" onClick={() => nav('/app/inbox/' + encodeURIComponent(next.card.key), { replace: true })}>Open next request</button> : null}
        <button type="button" className="btn neutral" onClick={() => nav('/app/inbox', { replace: true })}>Back to inbox</button>
      </div>
    </div>
  );
}

export { toneFor };

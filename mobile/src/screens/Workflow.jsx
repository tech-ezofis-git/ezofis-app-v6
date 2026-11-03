import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore, actionKind } from '../store.jsx';
import { ActionBar, FileThumb, Icon, IconBtn, Pill, Progress, Sheet, TopBar, useSplit } from '../ui.jsx';
import { WORKFLOWS } from '../data.js';
import { LiveInbox, LiveEdit, LiveDone } from './LiveWorkflow.jsx';

function ReqCard({ r, onClick, selected }) {
  return (
    <button type="button" className={'card ' + r.color + (selected ? ' selected' : '')} onClick={onClick}>
      <span className="row-between" style={{ alignItems: 'center' }}><span className="ct">{r.id}</span><Pill tone={r.tone}>{r.status}</Pill></span>
      <span className="cb" style={{ display: 'block' }}>{r.title}</span>
      <span className="cm"><span>{r.workflow} · {r.due || r.meta}</span><b style={{ color: 'var(--ink)' }}>{r.amount}</b></span>
    </button>
  );
}

function InboxList({ selectedId, onOpen }) {
  const { requests, actioned } = useStore();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'actioned' ? 'actioned' : 'inbox';
  const [wf, setWf] = useState('All workflows');
  const [wfOpen, setWfOpen] = useState(false);
  const [search, setSearch] = useState(null);
  const [quick, setQuick] = useState('All');
  const nav = useNavigate();

  const list = useMemo(() => {
    let l = tab === 'inbox' ? requests : actioned;
    if (wf !== 'All workflows') l = l.filter((r) => r.workflow === wf);
    if (search) l = l.filter((r) => (r.id + ' ' + r.title + ' ' + r.workflow).toLowerCase().includes(search.toLowerCase()));
    if (tab === 'inbox' && quick !== 'All') l = l.filter((r, i) => (quick === 'New today' ? i < 2 : i >= 2)); // sample data: the first two arrived today
    return l;
  }, [tab, requests, actioned, wf, search, quick]);

  return (
    <div className="screen">
      <TopBar title="Workflow" back tone="surface" right={<IconBtn name="search" label="Search requests" onClick={() => setSearch(search === null ? '' : null)} />} />
      <div style={{ background: 'var(--surface)', padding: '0 var(--gutter) 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {search !== null ? <input className="input" autoFocus placeholder="Search ID, title or workflow" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search requests" /> : null}
        <button type="button" className="input strong" style={{ display: 'flex', alignItems: 'center', textAlign: 'left' }} onClick={() => setWfOpen(true)}><span style={{ flex: 1 }}>{wf}</span><Icon name="chevD" size={16} stroke={2.4} /></button>
        <div className="seg" style={{ gridTemplateColumns: '1fr 1fr' }} role="tablist">
          <button type="button" role="tab" className={tab === 'inbox' ? 'on' : ''} onClick={() => setParams({})}>Inbox · {requests.length}</button>
          <button type="button" role="tab" className={tab === 'actioned' ? 'on' : ''} onClick={() => setParams({ tab: 'actioned' })}>Actioned · {actioned.length}</button>
        </div>
      </div>
      <div className="content" style={{ maxWidth: 'none' }}>
        {tab === 'inbox' ? (
          <div className="chips">{['All', 'New today', 'Earlier'].map((c) => <button key={c} type="button" className={'chip' + (quick === c ? ' on' : '')} onClick={() => setQuick(c)}>{c}</button>)}</div>
        ) : null}
        {list.length ? list.map((r) => (
          <ReqCard key={r.id} r={r} selected={selectedId === r.id} onClick={() => (tab === 'inbox' ? onOpen(r.id) : nav('/app/notifications'))} />
        )) : (
          <div className="empty"><Icon name={tab === 'inbox' ? 'checkCircle' : 'inbox'} size={40} color="#CFC8DC" />{tab === 'inbox' ? 'No requests in this view. Nice work!' : 'Nothing actioned yet.'}</div>
        )}
      </div>
      <Sheet open={wfOpen} onClose={() => setWfOpen(false)} title="Show workflow">
        <div className="sheet-list">{['All workflows', ...WORKFLOWS].map((w) => <button key={w} type="button" className={'opt' + (w === wf ? ' on' : '')} onClick={() => { setWf(w); setWfOpen(false); }}>{w}</button>)}</div>
      </Sheet>
    </div>
  );
}

function Detail({ id, embedded }) {
  const nav = useNavigate();
  const { requests, actOn, showToast } = useStore();
  const r = requests.find((x) => x.id === id);
  const [tab, setTab] = useState('form');
  const [pending, setPending] = useState(null);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const [newComments, setNewComments] = useState([]);
  const [draft, setDraft] = useState('');
  useEffect(() => { setTab('form'); setNewComments([]); }, [id]);

  if (!r) {
    return (
      <div className="screen">
        {!embedded ? <TopBar title="Request" back="/app/inbox" /> : null}
        <div className="pane-empty"><Icon name="checkCircle" size={44} color="#CFC8DC" />This request has been actioned.</div>
      </div>
    );
  }
  const needsComment = (l) => actionKind(l) !== 'primary';
  const confirm = () => {
    if (needsComment(pending) && !comment.trim()) { setErr('Add a comment so the requester knows why.'); return; }
    actOn(r.id, pending, comment.trim());
    setPending(null); setComment(''); setErr('');
    nav('/app/done/' + r.id, { replace: embedded });
  };
  const comments = [...r.comments, ...newComments];

  return (
    <div className="screen">
      <header className="topbar white" style={{ gridTemplateColumns: embedded ? '1fr auto' : '44px 1fr auto' }}>
        {!embedded ? <button type="button" className="circle-btn" aria-label="Back" onClick={() => nav('/app/inbox')}><Icon name="back" size={20} stroke={2.2} /></button> : null}
        <div className="topbar-title" style={{ textAlign: 'left' }}><div className="t">{r.id}</div><div className="s">{r.workflow}</div></div>
        <IconBtn name="share" label="Share request" onClick={() => showToast('Link to ' + r.id + ' copied')} />
      </header>
      <div style={{ padding: '0 var(--gutter)', background: '#fff', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--line)' }}>
        <div className="row-between"><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--deep)' }}>{r.stage}</span><span className="muted" style={{ fontSize: 12 }}>Step {r.current + 1} of {r.steps.length}</span></div>
        <Progress steps={r.steps} current={r.current} />
        <div className="muted" style={{ fontSize: 12 }}>Waiting on you · {r.waiting}</div>
        <div className="utabs" role="tablist" style={{ borderBottom: 0, marginTop: 4 }}>
          <button type="button" role="tab" className={tab === 'form' ? 'on' : ''} onClick={() => setTab('form')}><Icon name="doc" size={16} />Form</button>
          <button type="button" role="tab" className={tab === 'files' ? 'on' : ''} onClick={() => setTab('files')}><Icon name="clip" size={16} />Files {r.files.length || ''}</button>
          <button type="button" role="tab" className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')} aria-label="Comments"><Icon name="chat" size={16} />Chat {comments.length || ''}</button>
          <button type="button" role="tab" className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}><Icon name="history" size={16} />History</button>
        </div>
      </div>

      <div className="content" style={{ paddingBottom: 24 }}>
        {tab === 'form' ? (
          <>
            <div className="row-between" style={{ alignItems: 'center' }}><span style={{ fontSize: 16, fontWeight: 600 }}>Request form</span><button type="button" className="icon-btn" aria-label="Edit form" style={{ background: 'var(--surface)' }} onClick={() => nav('/app/inbox/' + r.id + '/edit')}><Icon name="edit" size={18} color="#643094" /></button></div>
            {r.fields.map(([l, v]) => <div key={l} className="field-card"><div className="l">{l}</div><div className="v">{v}</div></div>)}
          </>
        ) : null}
        {tab === 'files' ? (
          <>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Attachments · {r.files.length}</span>
            {r.files.map((f) => (
              <div key={f.name} className="card t list-row"><FileThumb ext={f.ext} /><span style={{ flex: 1, minWidth: 0 }}><span className="ct" style={{ display: 'block', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span><span className="cb" style={{ display: 'block', fontSize: 12 }}>{f.meta}</span></span><IconBtn name="download" label={'Download ' + f.name} color="#0A7C89" onClick={() => showToast(f.name + ' downloaded')} /></div>
            ))}
            <button type="button" className="btn neutral" style={{ borderStyle: 'dashed' }} onClick={() => showToast('Attachment added to ' + r.id)}><Icon name="plus" size={18} />Add attachment</button>
          </>
        ) : null}
        {tab === 'chat' ? (
          <>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Comments</span>
            {comments.length ? comments.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}><span className="avatar">{c.initials}</span><div className="bubble"><span className="muted" style={{ display: 'block', fontSize: 12 }}>{c.who} · {c.when}</span>{c.text}</div></div>
            )) : <div className="muted" style={{ fontSize: 14 }}>No comments yet.</div>}
            <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; setNewComments((l) => [...l, { who: 'You', initials: 'AE', when: 'now', text: draft.trim() }]); setDraft(''); }}>
              <input className="input" aria-label="Add a comment" placeholder="Add a comment…" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button type="submit" className="btn primary" aria-label="Send comment" style={{ width: 52, flex: 'none', padding: 0 }}><Icon name="send" size={18} /></button>
            </form>
          </>
        ) : null}
        {tab === 'history' ? (
          <>
            <span style={{ fontSize: 16, fontWeight: 600 }}>History</span>
            {r.history.map((h, i) => (
              <div key={i} className="timeline"><span className="rail-l2"><i style={{ background: h.dot }} /><b /></span><span style={{ paddingBottom: 14 }}><span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{h.title}</span><span className="muted" style={{ fontSize: 12 }}>{h.meta}</span></span></div>
            ))}
          </>
        ) : null}
      </div>

      <ActionBar actions={r.actions} onAction={(l) => { setPending(l); setErr(''); }} />

      <Sheet open={!!pending} onClose={() => setPending(null)} title={pending ? `${pending} ${r.id}?` : ''}>
        <div className="field">
          <label htmlFor="cm">Comment {pending && needsComment(pending) ? <span className="req">*</span> : <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>}</label>
          <textarea id="cm" className={'input' + (err ? ' error' : '')} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a note for the requester" />
          {err ? <span className="err" role="alert">{err}</span> : null}
        </div>
        <div className="grid2">
          <button type="button" className="btn outline-grey" onClick={() => setPending(null)}>Cancel</button>
          <button type="button" className={'btn ' + (pending ? actionKind(pending) === 'danger' ? 'danger' : 'primary' : 'primary')} onClick={confirm}>{pending}</button>
        </div>
      </Sheet>
    </div>
  );
}

function SampleInbox() {
  const { id } = useParams();
  const split = useSplit();
  const nav = useNavigate();
  const { requests } = useStore();
  const [params] = useSearchParams();
  const qs = params.toString() ? '?' + params.toString() : '';
  if (split) {
    const sel = id || (requests[0] && requests[0].id);
    return (
      <div className="split">
        <div className="pane-list"><InboxList selectedId={sel} onOpen={(x) => nav('/app/inbox/' + x + qs)} /></div>
        <div className="pane-detail">{sel ? <Detail id={sel} embedded key={sel} /> : <div className="pane-empty"><Icon name="checkCircle" size={48} color="#CFC8DC" />Your inbox is clear.</div>}</div>
      </div>
    );
  }
  if (id) return <Detail id={id} />;
  return <InboxList onOpen={(x) => nav('/app/inbox/' + x)} />;
}

function SampleEditRequest() {
  const { id } = useParams();
  const nav = useNavigate();
  const { requests, updateRequest, showToast } = useStore();
  const r = requests.find((x) => x.id === id);
  const [vals, setVals] = useState(() => (r ? Object.fromEntries(r.fields) : {}));
  if (!r) return <div className="screen"><TopBar title="Edit form" back="/app/inbox" /><div className="empty">Request not found.</div></div>;
  const locked = (l) => /budget|po value|ai match/i.test(l);
  const save = () => {
    const missing = r.fields.find(([l]) => !locked(l) && !String(vals[l] || '').trim());
    if (missing) { showToast(missing[0] + ' is required', { tone: 'bad' }); return; }
    updateRequest(r.id, { fields: r.fields.map(([l]) => [l, vals[l]]), history: [{ title: 'Form edited', meta: 'You · just now', dot: '#643094' }, ...r.history] });
    showToast('Changes saved to ' + r.id);
    nav('/app/inbox/' + r.id, { replace: true });
  };
  return (
    <div className="screen">
      <TopBar title="Edit form" sub={`${r.id} · ${r.stage}`} back={'/app/inbox/' + r.id} right={<span />} />
      <div className="content" style={{ gap: 16 }}>
        {r.fields.map(([l, orig]) => (
          <div key={l} className="field">
            <label htmlFor={'f-' + l}>{l} {!locked(l) ? <span className="req">*</span> : null}</label>
            {locked(l) ? (
              <div className="input locked" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{orig}<Icon name="lock" size={16} color="#9C96AB" /></div>
            ) : /purpose|description/i.test(l) ? (
              <textarea id={'f-' + l} className="input strong" rows={3} value={vals[l]} onChange={(e) => setVals({ ...vals, [l]: e.target.value })} />
            ) : (
              <input id={'f-' + l} className="input strong" value={vals[l]} onChange={(e) => setVals({ ...vals, [l]: e.target.value })} />
            )}
            {!locked(l) && vals[l] !== orig ? <span className="hint">Changed from {orig}</span> : null}
          </div>
        ))}
        <div className="card t" style={{ fontSize: 13 }}>Your changes are saved to {r.id} and recorded in History.</div>
      </div>
      <div className="bottombar" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <button type="button" className="btn neutral" onClick={() => nav(-1)}>Cancel</button>
        <button type="button" className="btn primary" onClick={save}>Save changes</button>
      </div>
    </div>
  );
}

function SampleDone() {
  const { id } = useParams();
  const nav = useNavigate();
  const { lastResult, requests } = useStore();
  const res = lastResult && lastResult.id === id ? lastResult : { id, label: 'Approve', past: 'approved', kind: 'primary', nextStage: 'Completed', workflow: '' };
  const color = res.kind === 'primary' ? '#0E8A5F' : res.kind === 'danger' ? '#C2264B' : '#643094';
  const ring = res.kind === 'primary' ? '#E3F5EE' : res.kind === 'danger' ? '#FCE8ED' : '#F1E6FD';
  const next = requests[0];
  const when = (res.when || new Date()).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const title = res.kind === 'primary' ? `Request ${res.past}` : res.kind === 'danger' ? 'Request rejected' : `${res.label} sent`;
  return (
    <div className="screen" style={{ minHeight: '100%' }}>
      <div className="content" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 'calc(var(--sat) + 64px)', gap: 14 }}>
        <span className="success-ring" style={{ background: ring }}><span style={{ background: color, boxShadow: `0 10px 24px ${color}55` }}><Icon name={res.kind === 'danger' ? 'close' : 'check'} size={34} color="#fff" stroke={3} /></span></span>
        <h1 style={{ fontFamily: 'var(--head)', fontSize: 26, marginTop: 8 }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.5 }}>{res.id} {res.kind === 'danger' ? 'was closed' : <>moved to <b style={{ color: 'var(--ink)' }}>{res.nextStage}</b></>}. The requester has been notified.</p>
      </div>
      <div className="content" style={{ paddingTop: 0 }}>
        <div className="card p" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 10px' }}>
          {[['Request', res.id], ['Action', res.label], ['By', 'Arun E.'], ['When', when]].map(([l, v]) => <div key={l}><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--deep)' }}>{l}</div><div style={{ fontSize: 14 }}>{v}</div></div>)}
          {res.comment ? <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--deep)' }}>Comment</div><div style={{ fontSize: 14 }}>{res.comment}</div></div> : null}
        </div>
        {next ? (
          <>
            <div className="sec-label">Next in your inbox · {requests.length}</div>
            <button type="button" className={'card ' + next.color} onClick={() => nav('/app/inbox/' + next.id, { replace: true })}>
              <span className="row-between" style={{ alignItems: 'center' }}><span className="ct">{next.id}</span><Pill tone={next.tone}>{next.status}</Pill></span>
              <span className="cb" style={{ display: 'block' }}>{next.title} · {next.workflow}</span>
            </button>
          </>
        ) : <div className="card t"><div className="ct">Inbox clear</div><div className="cb">No more requests waiting for you.</div></div>}
      </div>
      <div className="bottombar">
        {next ? <button type="button" className="btn primary" onClick={() => nav('/app/inbox/' + next.id, { replace: true })}>Open next request</button> : null}
        <button type="button" className="btn neutral" onClick={() => nav('/app/inbox', { replace: true })}>Back to inbox</button>
      </div>
    </div>
  );
}

// Signed in → real Workflow API; "Explore with sample data" → the sample screens above.
export function Inbox() { const { live } = useStore(); return live ? <LiveInbox /> : <SampleInbox />; }
export function EditRequest() { const { live } = useStore(); return live ? <LiveEdit /> : <SampleEditRequest />; }
export function Done() { const { live, lastResult } = useStore(); return live && (!lastResult || lastResult.live) ? <LiveDone /> : <SampleDone />; }

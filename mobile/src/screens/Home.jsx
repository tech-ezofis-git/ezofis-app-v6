import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { Icon, Sheet, Sparkle } from '../ui.jsx';
import { USER, WORKFLOWS } from '../data.js';
import markWhite from '../assets/mark-white.png';
import { wfApi, toCard, agentInsight, ageDays, prettyName } from '../wf.js';
import { apiErrorMessage } from '../api.js';
import { LiveCard, Skeleton, ErrorNote } from './LiveWorkflow.jsx';
import { AskAiCard, AskAiSheet, useAskAiNew } from './AskAi.jsx';
import { SUGGESTIONS } from '../assistant.js';

const AI_HINTS = {
  'What needs my approval today?': ['approv', 'today', 'pending', 'waiting', 'how many', 'inbox', 'open'],
  'Summarise overdue items': ['overdue', 'late', 'due', 'delay'],
  'Which suppliers have open invoices?': ['supplier', 'vendor', 'invoice'],
  'Which requests are oldest?': ['oldest', 'old', 'longest', 'aging', 'overdue', 'late'],
  'What did the AI agents flag?': ['flag', 'agent', 'duplicate', 'exception', 'mismatch', 'risk', 'issue', 'problem'],
};

const AI_ANSWERS = {
  'What needs my approval today?': (reqs) => reqs.length ? `You have ${reqs.length} open requests. ${reqs.filter((r) => r.status === 'Overdue').length} is overdue (DOC-0218). INV-2026-3101 is fully matched to PO-31001 and is the quickest to clear.` : 'Your inbox is clear. Nothing needs your approval right now.',
  'Summarise overdue items': (reqs) => { const o = reqs.filter((r) => r.status === 'Overdue'); return o.length ? o.map((r) => `${r.id}: ${r.title} (${r.due})`).join('\n') : 'Nothing is overdue.'; },
  'Which suppliers have open invoices?': () => 'Nexus Industrial Solutions Ltd — 1 open invoice, CAD 1,582.00, matched to PO-31001.',
};

function SampleHome() {
  const nav = useNavigate();
  const { requests, actioned, unread, files } = useStore();
  const [wf, setWf] = useState('Accounts Payable');
  const [wfOpen, setWfOpen] = useState(false);
  const [ai, setAi] = useState(null); // null = closed, '' = open, 'question' = open and ask it
  const [aiNew, aiSeen] = useAskAiNew();
  const openAi = (q) => { aiSeen(); setAi(q || ''); };

  const AI_Q = Object.fromEntries(Object.entries(AI_ANSWERS).map(([k, f]) => [k, () => f(requests)]));
  const AI_NOTE = 'Sample data. Sign in to ask about your own requests.';
  const top = requests[0];
  const wfReqs = requests.filter((r) => r.workflow === wf);
  const overdue = requests.filter((r) => r.status === 'Overdue').length;

  return (
    <div className="screen">
      <div className="hero home-hero">
        <div className="hero-inner" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ flex: 'none', width: 56, height: 56, borderRadius: 999, background: 'linear-gradient(135deg, #19C1D4, #0A7C89)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--head)', fontWeight: 700, fontSize: 24, boxShadow: '0 6px 16px rgba(0,0,0,.25)' }}>{USER.initial}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--head)', fontWeight: 700, fontSize: 22, lineHeight: 1.15 }}>Welcome</div>
            <div style={{ fontSize: 15, letterSpacing: 0.4 }}>{USER.short}</div>
          </div>
          <button type="button" aria-label={`Notifications, ${unread} new`} onClick={() => nav('/app/notifications')} style={{ position: 'relative', width: 46, height: 46, border: '1.5px solid rgba(255,255,255,.6)', borderRadius: 999, background: 'rgba(255,255,255,.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" size={20} />{unread ? <span style={{ position: 'absolute', top: 9, right: 11, width: 9, height: 9, borderRadius: 999, background: '#5CE1E6' }} /> : null}
          </button>
        </div>
      </div>

      <div className="sheet-body">
        <div className="content wide" style={{ paddingTop: 0 }}>

          <div className="home-grid">
            <div className="home-main" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {top ? (
                <button type="button" className="update-card" onClick={() => nav('/app/inbox/' + top.id)}>
                  <UpdHead />
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{requests.length} request{requests.length > 1 ? 's' : ''} waiting for you</span>
                  <span style={{ fontSize: 13, opacity: 0.92 }}>Next: {top.id} · {top.status}{overdue ? ` · ${overdue} overdue` : ''}</span>
                </button>
              ) : (
                <div className="update-card"><UpdHead arrow={false} /><span style={{ fontSize: 17, fontWeight: 600 }}>You're all caught up</span><span style={{ fontSize: 13, opacity: 0.92 }}>{actioned.length} requests actioned recently</span></div>
              )}

              <h2 className="sec-title">Quick actions</h2>
              <div className="qa-grid">
                <button type="button" className="qa" onClick={() => nav('/app/upload?source=scan')}><span className="c solid"><Icon name="camera" size={24} /></span>Scan</button>
                <button type="button" className="qa" onClick={() => nav('/app/upload')}><span className="c"><Icon name="upload" size={24} /></span>Upload</button>
                <button type="button" className="qa" onClick={() => nav('/app/inbox?tab=actioned')}><span className="c"><Icon name="checkCircle" size={24} /></span>Actioned</button>
                <button type="button" className={'qa ai' + (aiNew ? ' hot' : '')} onClick={() => openAi('')}><span className="c ai"><Sparkle size={22} color="#fff" />{aiNew ? <span className="qa-new">New</span> : null}</span>Ask AI</button>
              </div>
              <AskAiCard questions={Object.keys(AI_Q)} isNew={aiNew} onAsk={openAi} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="home-div" role="separator" aria-hidden="true" />
              <div className="row-between" style={{ marginTop: 6 }}>
                <h2 className="sec-title" style={{ margin: 0 }}>Dashboard</h2>
                <button type="button" className="chip" onClick={() => setWfOpen(true)}>{wf}<Icon name="chevD" size={14} stroke={2.6} /></button>
              </div>
              <div className="kpis">
                <div className="kpi solid"><div className="k">{wf === 'Accounts Payable' ? 'Total AP' : 'Open value'}</div><div className="v">{wf === 'Accounts Payable' ? 'CAD 1,582' : (wfReqs[0] && wfReqs[0].amount) || '—'}</div><div className="n">This month</div></div>
                <div className="kpi p"><div className="k">Open requests</div><div className="v">{wfReqs.length}</div><div className="n">{wfReqs.filter((r) => r.status === 'Matched').length} matched</div></div>
                <div className="kpi t"><div className="k">Overdue</div><div className="v">{wfReqs.filter((r) => r.status === 'Overdue').length}</div><div className="n">Past due date</div></div>
                <div className="kpi p"><div className="k">Files indexed</div><div className="v">{files.length}</div><div className="n">In folders</div></div>
              </div>
              <div className="card w">
                <div className="row-between"><span style={{ fontWeight: 600 }}>Aging</span><span className="muted" style={{ fontSize: 12 }}>Open items by days</span></div>
                <div className="bars" style={{ marginTop: 12 }}>
                  {[['0–30', wfReqs.length], ['31–60', 0], ['61–90', 0], ['90+', 0]].map(([l, n]) => (
                    <div key={l}><i className={n ? '' : 'e0'} style={{ height: n ? Math.min(20 + n * 24, 64) : 4 }} /><span>{l}</span></div>
                  ))}
                </div>
              </div>
              <div className="card t" style={{ display: 'flex', gap: 12 }}>
                <Sparkle size={20} />
                <div><div className="ct">AI insight</div><div className="cb">{wf === 'Accounts Payable' && wfReqs.length ? 'INV-2026-3101 matches PO-31001 on totals and lines. Ready to approve for posting.' : `No exceptions found in ${wf} this month.`}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={wfOpen} onClose={() => setWfOpen(false)} title="Show dashboard for">
        <div className="sheet-list">{WORKFLOWS.map((w) => <button key={w} type="button" className={'opt' + (w === wf ? ' on' : '')} onClick={() => { setWf(w); setWfOpen(false); }}>{w}</button>)}</div>
      </Sheet>
      <AskAiSheet open={ai !== null} initial={ai} onClose={() => setAi(null)} answers={AI_Q} hints={AI_HINTS} footnote={AI_NOTE} />
    </div>
  );
}

// Header row of the "requests waiting" card: icon + "Updates for you" + arrow.
function UpdHead({ arrow = true }) {
  return (
    <span className="upd-head">
      <span className="upd-ic"><Sparkle size={18} color="#fff" /></span>
      <span className="upd-label">Updates for you</span>
      {arrow ? <Icon name="chevR" size={20} stroke={2.4} /> : null}
    </span>
  );
}

export default function Home() { const { live } = useStore(); return live ? <LiveHome /> : <SampleHome />; }

// Home on the Workflow API: all-workflows inbox (reliable open counts) + /counts (sent / completed totals).
function LiveHome() {
  const nav = useNavigate();
  const { unread, me, session, liveTick } = useStore();
  const [data, setData] = useState(null);
  const [counts, setCounts] = useState(null);
  const [err, setErr] = useState('');
  const [reload, setReload] = useState(0);
  const [wf, setWf] = useState('');
  const [wfOpen, setWfOpen] = useState(false);
  const [aiNew, aiSeen] = useAskAiNew();
  // Ask AI opens the full chat on the Repository Assistant API (screens/AskAiChat.jsx).
  const openAi = (q) => { aiSeen(); nav('/app/ask' + (q ? '?q=' + encodeURIComponent(q) : '')); };
  useEffect(() => {
    let off = false;
    setErr('');
    wfApi.allInbox(20).then((d) => { if (!off) setData(d); }).catch((e) => { if (!off) { setErr(apiErrorMessage(e, 'your requests')); setData((x) => x || { workflows: [], totalCount: 0, failed: true }); } });
    wfApi.counts().then((c) => { if (!off) setCounts(c); }).catch(() => { /* optional */ });
    return () => { off = true; };
  }, [liveTick, reload]);

  const groups = (data && data.workflows) || [];
  const total = data ? data.totalCount || 0 : null;
  const newToday = groups.reduce((n, g) => n + (g.newTodayCount || 0), 0);
  const all = groups.flatMap((g) => g.items || []);
  const newest = all.slice().sort((a, b) => String(b.transactionCreatedAt || '').localeCompare(String(a.transactionCreatedAt || '')))[0];
  const g = groups.find((x) => x.workflowId === wf) || groups[0];
  const gItems = (g && g.items) || [];
  const buckets = [['0–7d', 0, 7], ['8–30d', 8, 30], ['31–60d', 31, 60], ['60d+', 61, 1e9]].map(([l, a, b]) => [l, gItems.filter((r) => { const d = ageDays(r.transactionCreatedAt); return d >= a && d <= b; }).length]);
  const maxB = Math.max(1, ...buckets.map((b) => b[1]));
  const insightRow = gItems.find((r) => agentInsight(r));
  const insight = insightRow ? agentInsight(insightRow) : null;
  const name = (me && (me.displayName || [me.firstName, me.lastName].filter(Boolean).join(' '))) || prettyName(session && session.email);
  const role = (me && me.role) || (session && session.role) || '';

  return (
    <div className="screen">
      <div className="hero home-hero">
        <div className="hero-inner" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ flex: 'none', width: 56, height: 56, borderRadius: 999, background: 'linear-gradient(135deg, #19C1D4, #0A7C89)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--head)', fontWeight: 700, fontSize: 24, boxShadow: '0 6px 16px rgba(0,0,0,.25)' }}>{(name || '?')[0].toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--head)', fontWeight: 700, fontSize: 22, lineHeight: 1.15 }}>Welcome</div>
            <div style={{ fontSize: 15, letterSpacing: 0.4, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          </div>
          <button type="button" aria-label={`Notifications, ${unread} new`} onClick={() => nav('/app/notifications')} style={{ position: 'relative', width: 46, height: 46, border: '1.5px solid rgba(255,255,255,.6)', borderRadius: 999, background: 'rgba(255,255,255,.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" size={20} />{unread ? <span style={{ position: 'absolute', top: 9, right: 11, width: 9, height: 9, borderRadius: 999, background: '#5CE1E6' }} /> : null}
          </button>
        </div>
      </div>
      <div className="sheet-body">
        <div className="content wide" style={{ paddingTop: 0 }}>
          <div className="home-grid">
            <div className="home-main" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {err ? <ErrorNote text={err} onRetry={() => setReload((x) => x + 1)} /> : null}
              {data === null ? <Skeleton n={1} h={110} /> : total ? (
                <button type="button" className="update-card" onClick={() => nav('/app/inbox')}>
                  <UpdHead />
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{total} request{total > 1 ? 's' : ''} waiting for you</span>
                  <span style={{ fontSize: 13, opacity: 0.92 }}>{newToday ? `${newToday} new today · ` : ''}{groups.length} workflow{groups.length > 1 ? 's' : ''}</span>
                </button>
              ) : !data.failed ? (
                <div className="update-card"><UpdHead arrow={false} /><span style={{ fontSize: 17, fontWeight: 600 }}>You're all caught up</span><span style={{ fontSize: 13, opacity: 0.92 }}>{counts ? `${counts.completedCount} completed · ${counts.sentCount} in progress` : 'Nothing is waiting for you'}</span></div>
              ) : null}
              <h2 className="sec-title">Quick actions</h2>
              <div className="qa-grid">
                <button type="button" className="qa" onClick={() => nav('/app/upload?source=scan')}><span className="c solid"><Icon name="camera" size={24} /></span>Scan</button>
                <button type="button" className="qa" onClick={() => nav('/app/new')}><span className="c"><Icon name="plus" size={24} /></span>New request</button>
                <button type="button" className="qa" onClick={() => nav('/app/inbox?tab=completed')}><span className="c"><Icon name="checkCircle" size={24} /></span>Completed</button>
                <button type="button" className={'qa ai' + (aiNew ? ' hot' : '')} onClick={() => openAi('')}><span className="c ai"><Sparkle size={22} color="#fff" />{aiNew ? <span className="qa-new">New</span> : null}</span>Ask AI</button>
              </div>
              <AskAiCard questions={SUGGESTIONS.map((s) => s.text)} isNew={aiNew} onAsk={openAi} sub="Find documents, invoices and requests in seconds" placeholder="Ask about a document or request…" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="home-div" role="separator" aria-hidden="true" />
              <div className="row-between" style={{ marginTop: 6 }}>
                <h2 className="sec-title" style={{ margin: 0 }}>Dashboard</h2>
                {groups.length ? <button type="button" className="chip" onClick={() => setWfOpen(true)}>{g ? g.workflowName : 'Workflow'}<Icon name="chevD" size={14} stroke={2.6} /></button> : null}
              </div>
              {newest ? <><div className="sec-label">Latest request</div><LiveCard c={toCard(newest)} onClick={() => nav('/app/inbox/' + encodeURIComponent(newest.workflowId + '~' + newest.workflowInstanceId))} /></> : null}
              <div className="kpis">
                <div className="kpi solid"><div className="k">Inbox</div><div className="v">{total == null ? '…' : total}</div><div className="n">All workflows</div></div>
                <div className="kpi p"><div className="k">In progress</div><div className="v">{counts ? counts.sentCount : '…'}</div><div className="n">You acted, still running</div></div>
                <div className="kpi t"><div className="k">Completed</div><div className="v">{counts ? counts.completedCount : '…'}</div><div className="n">Finished requests</div></div>
                <div className="kpi p"><div className="k">{g ? 'Open here' : 'New today'}</div><div className="v">{g ? g.totalCount : newToday}</div><div className="n">{g ? `${g.newTodayCount || 0} new today` : 'Across workflows'}</div></div>
              </div>
              {g ? (
                <div className="card w">
                  <div className="row-between"><span style={{ fontWeight: 600 }}>Aging</span><span className="muted" style={{ fontSize: 12 }}>{g.totalCount > gItems.length ? `Latest ${gItems.length} of ${g.totalCount}` : 'Open items by days waiting'}</span></div>
                  <div className="bars" style={{ marginTop: 12 }}>
                    {buckets.map(([l, n]) => <div key={l}><i className={n ? '' : 'e0'} style={{ height: n ? 12 + Math.round((n / maxB) * 52) : 4 }} title={`${n} requests`} /><span>{l}</span></div>)}
                  </div>
                </div>
              ) : null}
              {groups.length > 1 ? (
                <div className="card w">
                  <div className="row-between"><span style={{ fontWeight: 600 }}>Open by workflow</span><span className="muted" style={{ fontSize: 12 }}>Tap to open</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {groups.map((x) => (
                      <button key={x.workflowId} type="button" onClick={() => nav('/app/inbox?wf=' + x.workflowId)} style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 4, cursor: 'pointer', font: 'inherit' }}>
                        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.workflowName}</span><b style={{ fontSize: 13 }}>{x.totalCount}</b>
                        <span style={{ gridColumn: '1 / -1', height: 6, borderRadius: 99, background: 'var(--tint-p)' }}><span style={{ display: 'block', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#8300E6,#643094)', width: Math.max(4, Math.round((x.totalCount / Math.max(1, ...groups.map((y) => y.totalCount))) * 100)) + '%' }} /></span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="card t" style={{ display: 'flex', gap: 12 }}>
                <Sparkle size={20} />
                <div><div className="ct">AI insight{insightRow ? ' · ' + insightRow.referenceNumber : ''}</div><div className="cb">{insight ? (insight.insight || insight.reason || insight.decision) : g ? `No AI exceptions in ${g.workflowName} right now.` : 'AI insights appear here when agents review your requests.'}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Sheet open={wfOpen} onClose={() => setWfOpen(false)} title="Show dashboard for">
        <div className="sheet-list">{groups.map((x) => <button key={x.workflowId} type="button" className={'opt' + (g && x.workflowId === g.workflowId ? ' on' : '')} onClick={() => { setWf(x.workflowId); setWfOpen(false); }}><span style={{ flex: 1 }}>{x.workflowName}</span><span className="muted" style={{ fontSize: 12 }}>{x.totalCount}</span></button>)}</div>
      </Sheet>
    </div>
  );
}

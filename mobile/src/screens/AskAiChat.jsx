// Ask EZOFIS AI: full-screen chat on the Repository Assistant API (src/assistant.js).
// One sessionId per chat (kept until "New chat"), so the agent remembers earlier questions.
// Result cards open in the app: documents in the file viewer, requests in the inbox ticket.
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { Icon, FileThumb, Sparkle } from '../ui.jsx';
import { prettyName, fmtDate } from '../wf.js';
import FileViewer from './FileViewer.jsx';
import { askAssistant, askErrorMessage, newSessionId, normalizeAnswer, cardTarget, CARD_LABEL, SUGGESTIONS } from '../assistant.js';

// ---------- chat state (kept in memory while the app runs, so opening a file and coming back keeps the thread) ----------
let chat = { sessionId: newSessionId(), scope: null, messages: [], tenantId: '' };
const subs = new Set();
const setChat = (patch) => { chat = { ...chat, ...(typeof patch === 'function' ? patch(chat) : patch) }; subs.forEach((f) => f()); };
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
const useChat = () => useSyncExternalStore(subscribe, () => chat);
let seq = 0;
const SHOW = 4;

function ask(question, scope = chat.scope) {
  const text = String(question || '').trim();
  if (!text || chat.messages.some((m) => m.pending)) return;
  const id = ++seq;
  const sessionId = chat.sessionId;
  setChat((c) => ({ scope, messages: [...c.messages, { id: 'q' + id, who: 'me', text }, { id: 'a' + id, who: 'ai', pending: true, startedAt: Date.now(), question: text, scope }] }));
  askAssistant({ message: text, sessionId, specificId: scope && scope.repositoryId })
    .then((res) => normalizeAnswer(res))
    .then((a) => finish(id, sessionId, a.blocks.length ? { blocks: a.blocks, needsWeb: a.needsWeb } : { blocks: [{ type: 'paragraph', text: "I couldn't find anything for that. Try different words, a supplier name, or an invoice or PO number." }], empty: true }))
    .catch((e) => finish(id, sessionId, { error: askErrorMessage(e) }));
}
function finish(id, sessionId, patch) {
  if (chat.sessionId !== sessionId) return; // a new chat was started meanwhile
  setChat((c) => ({ messages: c.messages.map((m) => (m.id === 'a' + id && m.pending ? { ...m, ...patch, pending: false } : m)) }));
}
function stop() {
  setChat((c) => ({ messages: c.messages.map((m) => (m.pending ? { ...m, pending: false, stopped: true } : m)) }));
}
function newChat() { setChat({ sessionId: newSessionId(), scope: null, messages: [] }); }

// **bold** and line breaks from the agent's paragraph text (rendered as text, never as HTML).
function Rich({ text }) {
  return String(text).split(/\n/).map((line, i) => (
    <React.Fragment key={i}>{i ? <br /> : null}{line.split(/(\*\*[^*]+\*\*)/).map((p, j) => (/^\*\*[^*]+\*\*$/.test(p) ? <b key={j}>{p.slice(2, -2)}</b> : p))}</React.Fragment>
  ));
}

const extOf = (n) => { const m = /\.([a-z0-9]{2,5})$/i.exec(String(n || '')); return m ? m[1].toUpperCase() : ''; };
const ICON = { ticket: 'inbox', request: 'inbox', comment: 'chat', form: 'grid', repository: 'folder', workflow: 'history' };

function ResultCard({ c, onOpen }) {
  const target = cardTarget(c);
  const ext = extOf(c.title);
  const desc = c.description && !/^[[{]/.test(c.description) ? c.description : '';
  const label = CARD_LABEL[c.type] || (c.type ? c.type[0].toUpperCase() + c.type.slice(1) : 'Result');
  // the agent's subtitle often starts with the type again ("Request · Field Hit")
  const sub = c.subtitle.split(' · ').filter((x) => x && x.toLowerCase() !== label.toLowerCase() && x.toLowerCase() !== c.type);
  const body = (
    <>
      {ext || c.type === 'document' || c.type === 'file' ? <FileThumb ext={ext || 'FILE'} /> : <span className="ask-rc-ic"><Icon name={ICON[c.type] || 'search'} size={20} /></span>}
      <span className="ask-rc-main">
        <span className="ask-rc-t">{c.title}</span>
        <span className="ask-rc-s">{[label, ...sub].join(' · ')}</span>
        {desc ? <span className="ask-rc-d">{desc}</span> : null}
        {c.fields.length ? <span className="ask-rc-f">{c.fields.slice(0, 3).map((f) => <span key={f.label}><small>{f.label}</small>{f.value}</span>)}</span> : null}
        <span className="ask-rc-foot">
          <span className="ask-rc-w">{c.when ? fmtDate(c.when, true) : ''}</span>
          {!target ? <span className="ask-rc-web">Open on the web</span>
            : <span className="open-chip"><Icon name={target.kind === 'file' ? 'eye' : 'chevR'} size={16} />{target.kind === 'file' ? 'Open file' : 'View request'}</span>}
        </span>
      </span>
    </>
  );
  if (!target) return <div className="ask-rc">{body}</div>;
  return <button type="button" className="ask-rc tap" onClick={() => onOpen(target)} aria-label={(target.kind === 'file' ? 'Open file ' : 'Open request ') + c.title}>{body}</button>;
}

function CardsBlock({ b, onOpen }) {
  const [all, setAll] = useState(false);
  const list = all ? b.items : b.items.slice(0, SHOW);
  return (
    <div className="ask-cards">
      {b.title ? <div className="ask-bt">{b.title}<span className="cnt">{b.items.length}</span></div> : null}
      {list.map((c, i) => <ResultCard key={i} c={c} onOpen={onOpen} />)}
      {b.items.length > SHOW ? <button type="button" className="text-btn" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show ${b.items.length - SHOW} more`}</button> : null}
    </div>
  );
}

function Answer({ m, onOpen, isLast }) {
  const [copied, setCopied] = useState(false);
  if (m.pending) return <Thinking m={m} />;
  const plain = (m.blocks || []).map((b) => (b.type === 'paragraph' ? b.text : b.type === 'bullets' ? b.items.map((i) => (i.label ? `${i.label}: ${i.value}` : i.value)).join('\n') : b.type === 'cards' ? b.items.map((c) => c.title).join('\n') : '')).filter(Boolean).join('\n\n');
  const copy = async () => { try { await navigator.clipboard.writeText(plain.replace(/\*\*/g, '')); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch (e) { /* clipboard unavailable */ } };
  return (
    <div className="ask-ai-row">
      <span className="ai-av big" aria-hidden="true"><Sparkle size={16} color="#fff" /></span>
      <div className="ask-ans" aria-live={isLast ? 'polite' : undefined}>
        <span className="ask-ans-h" aria-hidden="true"><span className="ai-av"><Sparkle size={12} color="#fff" /></span>EZOFIS AI</span>
        {m.error ? (
          <div className="ask-err" role="alert"><Icon name="warn" size={18} /><span className="grow">{m.error}</span><button type="button" onClick={() => ask(m.question, m.scope)}>Try again</button></div>
        ) : m.stopped ? (
          <div className="ask-stopped">Stopped. <button type="button" className="text-btn" onClick={() => ask(m.question, m.scope)}>Ask again</button></div>
        ) : (
          <>
            {m.blocks.map((b, i) => {
              if (b.type === 'paragraph') return <p key={i} className="ask-p"><Rich text={b.text} /></p>;
              if (b.type === 'bullets') return (
                <div key={i} className="ask-bul">
                  {b.title ? <div className="ask-bt">{b.title}</div> : null}
                  <div className="ask-tags">{b.items.map((it, j) => <span key={j} className="ask-tag">{it.label ? <small>{it.label}</small> : null}{it.value}</span>)}</div>
                </div>
              );
              if (b.type === 'cards') return <CardsBlock key={i} b={b} onOpen={onOpen} />;
              if (b.type === 'repo_picker') return (
                <div key={i} className="ask-bul">
                  <div className="ask-bt">{b.title}</div>
                  <div className="ask-repos">{b.items.map((r) => <button key={r.repositoryId} type="button" className="ask-repo" onClick={() => ask(m.question, r)}><Icon name="folder" size={18} />{r.name}</button>)}</div>
                </div>
              );
              return null;
            })}
            {m.needsWeb ? <div className="notice info"><Icon name="globe" size={18} /><span className="grow">Ask AI suggested an action that needs confirming. Finish it on cloud.ezofis.com.</span></div> : null}
            {!m.empty ? <div className="ask-tools"><button type="button" className="ask-tool" onClick={copy} aria-label="Copy answer"><Icon name={copied ? 'check' : 'doc'} size={15} />{copied ? 'Copied' : 'Copy'}</button></div> : null}
          </>
        )}
      </div>
    </div>
  );
}

function Thinking({ m }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.round((now - m.startedAt) / 1000));
  const step = s < 6 ? 'Understanding your question' : s < 20 ? 'Searching your documents and requests' : 'Still working. Big searches can take up to 2 minutes';
  return (
    <div className="ask-ai-row">
      <span className="ai-av big pulse" aria-hidden="true"><Sparkle size={16} color="#fff" /></span>
      <div className="ask-thinking" role="status">
        <span className="ai-dots"><i /><i /><i /></span>
        <span className="grow">{step}…{s >= 6 ? <span className="muted"> {s}s</span> : null}</span>
        <button type="button" className="ask-stop" onClick={stop}>Stop</button>
      </div>
    </div>
  );
}

export default function AskAiChat() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { live, me, session } = useStore();
  const c = useChat();
  const [text, setText] = useState('');
  const [viewing, setViewing] = useState(null);
  const end = useRef(null);
  const box = useRef(null);
  const busy = c.messages.some((m) => m.pending);

  // a different organization starts a new chat
  useEffect(() => { if (session && chat.tenantId !== session.tenantId) setChat({ sessionId: newSessionId(), scope: null, messages: [], tenantId: session.tenantId }); }, [session]);
  // Home passes the first question as ?q=
  useEffect(() => { const q = params.get('q'); if (q && live) { setParams({}, { replace: true }); ask(q); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (end.current) end.current.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [c.messages.length, busy]);
  useEffect(() => { const el = box.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; } }, [text]);

  const send = (q) => { const v = String(q == null ? text : q).trim(); if (!v || busy) return; setText(''); ask(v); };
  const open = (t) => { if (t.kind === 'file') setViewing(t.file); else nav('/app/inbox/' + encodeURIComponent(t.key)); };
  const first = prettyName((me && (me.firstName || me.displayName)) || (session && session.email) || '').split(' ')[0];

  const header = (
    <header className="topbar white ask-top">
      <button type="button" className="circle-btn" aria-label="Back" onClick={() => nav(-1)}><Icon name="back" size={20} stroke={2.2} /></button>
      <div className="ask-title">
        <span className="ai-av big" aria-hidden="true"><Sparkle size={16} color="#fff" /></span>
        <span style={{ minWidth: 0 }}><span className="t">Ask EZOFIS AI</span><span className="s">{c.scope ? 'In ' + c.scope.name : 'All your documents and requests'}</span></span>
      </div>
      {live && c.messages.length ? <button type="button" className="ask-new" onClick={() => { newChat(); setText(''); }} aria-label="Start a new chat"><Icon name="plus" size={18} /><span className="lbl">New</span></button> : <span />}
    </header>
  );

  if (!live) {
    return <div className="screen">{header}<div className="content"><div className="notice info"><Icon name="user" size={18} /><span className="grow">Sign in to ask EZOFIS AI about your own documents and requests.</span><button type="button" onClick={() => nav('/login')}>Sign in</button></div></div></div>;
  }

  return (
    <div className="screen ask-screen">
      {header}
      <div className="content ask-thread">
        {!c.messages.length ? (
          <div className="ask-empty">
            <div className="ask-hello">
              <div className="askai-glow" aria-hidden="true" />
              <span className="askai-ic"><Sparkle size={24} color="#fff" /></span>
              <h1>{first ? `Hi ${first}, what are you looking for?` : 'What are you looking for?'}</h1>
              <p>I search your EZOFIS documents, folders, requests and comments, and open what I find.</p>
            </div>
            <div className="sec-label">Try asking</div>
            <div className="ask-sugs">
              {SUGGESTIONS.map((s) => <button key={s.text} type="button" className="ask-sug" onClick={() => send(s.text)}><span className="ask-sug-ic"><Icon name={s.icon} size={18} /></span><span className="grow">{s.text}</span><Icon name="chevR" size={16} color="#A39DB5" /></button>)}
            </div>
            <p className="ask-tip"><Sparkle size={13} />Tip: include a supplier, invoice number, PO number or file name for sharper results.</p>
          </div>
        ) : c.messages.map((m, i) => (m.who === 'me'
          ? <div key={m.id} className="ask-me">{m.text}</div>
          : <Answer key={m.id} m={m} onOpen={open} isLast={i === c.messages.length - 1} />))}
        <span ref={end} />
      </div>
      <div className="ask-composer">
        {c.scope ? <div className="ask-scope"><Icon name="folder" size={14} /><span className="grow">Searching in <b>{c.scope.name}</b></span><button type="button" aria-label="Search everywhere" onClick={() => setChat({ scope: null })}><Icon name="close" size={14} stroke={2.6} /></button></div> : null}
        <form className="ask-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <textarea ref={box} rows={1} className="ask-input" placeholder={busy ? 'Ask AI is answering…' : 'Search or ask a question…'} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} aria-label="Your question" enterKeyHint="send" maxLength={2000} />
          <button type="submit" className="ask-send" aria-label="Send question" disabled={!text.trim() || busy}><Icon name="send" size={18} /></button>
        </form>
        <p className="ask-foot">AI answers can be wrong. Open the document to check before you act.</p>
      </div>
      {viewing ? <FileViewer file={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}

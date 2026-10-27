// "Ask EZOFIS AI" spotlight on Home + the ask sheet. Answers are built from the user's own inbox data.
import React, { useEffect, useRef, useState } from 'react';
import { Icon, Sheet, Sparkle } from '../ui.jsx';

const SEEN_KEY = 'ezofis.askai.used';
const readUsed = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } };
const markUsed = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* storage unavailable */ } };

// Until the user has asked once, Ask AI pulses and shows a "New" tag + hint.
export function useAskAiNew() {
  const [isNew, setNew] = useState(() => !readUsed());
  return [isNew, () => { markUsed(); setNew(false); }];
}

// Keyword match for typed questions → one of the answerable questions.
function matchQuestion(text, keys, hints) {
  const t = text.toLowerCase();
  let best = null; let score = 0;
  keys.forEach((k) => {
    const words = (hints[k] || []).concat(k.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    const s = words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (s > score) { score = s; best = k; }
  });
  return best;
}

export function AskAiCard({ questions, onAsk, isNew }) {
  return (
    <section className={'askai' + (isNew ? ' is-new' : '')} aria-label="Ask EZOFIS AI">
      <div className="askai-glow" aria-hidden="true" />
      <div className="askai-top">
        <span className="askai-ic"><Sparkle size={22} color="#fff" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="askai-t">Ask EZOFIS AI{isNew ? <span className="askai-new">New</span> : null}</div>
          <div className="askai-s">Get answers about your requests in seconds</div>
        </div>
      </div>
      <button type="button" className="askai-input" onClick={() => onAsk('')}>
        <span className="askai-ph">Ask about your requests…</span>
        <span className="askai-go" aria-hidden="true"><Icon name="send" size={16} /></span>
      </button>
      <div className="askai-chips">
        {questions.slice(0, 3).map((q) => <button key={q} type="button" className="askai-chip" onClick={() => onAsk(q)}><Sparkle size={13} color="#5CE1E6" />{q}</button>)}
      </div>
    </section>
  );
}

export function AskAiSheet({ open, onClose, answers, hints = {}, initial, footnote }) {
  const keys = Object.keys(answers);
  const [text, setText] = useState('');
  const [thread, setThread] = useState([]);
  const [typing, setTyping] = useState(false);
  const end = useRef(null);
  const ask = (q) => {
    const question = String(q || '').trim();
    if (!question) return;
    const key = keys.includes(question) ? question : matchQuestion(question, keys, hints);
    const answer = key ? answers[key]() : `I can't answer that one yet. Try asking:\n• ${keys.join('\n• ')}`;
    setThread((l) => [...l, { who: 'me', text: question }]);
    setText(''); setTyping(true);
    setTimeout(() => { setThread((l) => [...l, { who: 'ai', text: answer }]); setTyping(false); }, 650);
  };
  useEffect(() => { if (open) { setThread([]); setText(''); if (initial) ask(initial); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (end.current) end.current.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [thread, typing]);
  return (
    <Sheet open={open} onClose={onClose} title="Ask EZOFIS AI">
      <div className="ai-thread">
        {!thread.length && !typing ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>Ask in your own words, or tap a question.</p> : null}
        {thread.map((m, i) => (m.who === 'me'
          ? <div key={i} className="ai-me">{m.text}</div>
          : <div key={i} className="ai-ans"><span className="ai-av"><Sparkle size={14} color="#fff" /></span><div style={{ whiteSpace: 'pre-line' }}>{m.text}</div></div>))}
        {typing ? <div className="ai-ans"><span className="ai-av"><Sparkle size={14} color="#fff" /></span><span className="ai-dots"><i /><i /><i /></span></div> : null}
        <span ref={end} />
      </div>
      <div className="askai-chips light">{keys.map((k) => <button key={k} type="button" className="askai-chip" onClick={() => ask(k)}><Sparkle size={13} />{k}</button>)}</div>
      <form className="ai-form" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <input className="input" placeholder="Ask about your requests…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Your question" />
        <button type="submit" className="btn primary" aria-label="Ask" disabled={!text.trim()} style={{ width: 52, flex: 'none', padding: 0 }}><Icon name="send" size={18} /></button>
      </form>
      {footnote ? <p className="muted" style={{ margin: 0, fontSize: 11 }}>{footnote}</p> : null}
    </Sheet>
  );
}

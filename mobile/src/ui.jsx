import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore, actionKind } from './store.jsx';
import markColor from './assets/mark-color.png';
import lockup from './assets/lockup-color.png';

const P = {
  back: 'M15 18l-6-6 6-6', chevR: 'M9 6l6 6-6 6', chevD: 'M6 9l6 6 6-6', close: 'M6 6l12 12M18 6L6 18',
  home: 'M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  inbox: 'M3 13l3-8h12l3 8v6a1 1 0 01-1 1H4a1 1 0 01-1-1zM3 13h5l1.5 2.5h5L16 13h5',
  folder: 'M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z',
  settings: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  bell: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 003.4 0',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-3.5-3.5', filter: 'M4 6h16M7 12h10M10 18h4',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  image: 'M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM9 12a2 2 0 100-4 2 2 0 000 4zM21 16l-5-5-9 9',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4', doc: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h3',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16', download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  check: 'M5 12l5 5 9-10', checkCircle: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 12l3 3 5-6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4', clip: 'M21 11.5l-8.6 8.6a5 5 0 01-7.1-7.1l8.6-8.6a3.3 3.3 0 014.7 4.7l-8.6 8.6a1.7 1.7 0 01-2.4-2.4l7.9-7.9',
  chat: 'M4 5h16v11H9l-5 4z', refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7', history: 'M3 12a9 9 0 103-6.7L3 8M3 3v5h5M12 7v5l3 2',
  share: 'M18 7.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18 21.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4',
  lock: 'M5 11h14v10H5zM8 11V8a4 4 0 018 0v3', globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0', mail: 'M3 5h18v14H3zM3 7l9 6 9-6',
  plus: 'M12 5v14M5 12h14', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', warn: 'M12 3l9.5 17h-19zM12 10v4M12 17.5v.5',
  send: 'M4 12l16-8-6 16-2-6z', logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11', help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17v.5',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', swap: 'M7 7h12l-3-3M17 17H5l3 3', building: 'M4 21V9l8-5 8 5v12M9 21v-6h6v6', hash: 'M5 9h14M5 15h14M10 4L8 20M16 4l-2 16',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01', eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  phone: 'M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2',
};

export function Icon({ name, size = 22, color = 'currentColor', stroke = 2, fill = 'none', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <path d={P[name]} />
    </svg>
  );
}

// Brand sparkle pair (from the EZOFIS brand guide) for AI moments.
export function Sparkle({ size = 20, color = '#0A7C89' }) {
  return (
    <svg width={size} height={size * 0.92} viewBox="0 0 140 128" aria-hidden="true">
      <path fill={color} d="M50 26C56 26 58 50 70 58C80 64 94 64 94 70C94 76 80 76 70 82C58 90 56 114 50 114C44 114 42 90 30 82C20 76 6 76 6 70C6 64 20 64 30 58C42 50 44 26 50 26Z" />
      <path fill={color} d="M106 4C109 4 110 16 116 20C121 23 128 23 128 26C128 29 121 29 116 32C110 36 109 48 106 48C103 48 102 36 96 32C91 29 84 29 84 26C84 23 91 23 96 20C102 16 103 4 106 4Z" />
    </svg>
  );
}

export function useMedia(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on));
  }, [query]);
  return m;
}
export const useWide = () => useMedia('(min-width: 768px)');
export const useSplit = () => useMedia('(min-width: 960px)');

export function TopBar({ title, sub, back, right, onBack, tone = 'surface' }) {
  const nav = useNavigate();
  const goBack = onBack || (() => (typeof back === 'string' ? nav(back) : nav(-1)));
  return (
    <header className={'topbar ' + tone}>
      {back !== false && back !== undefined ? (
        <button type="button" className="circle-btn" aria-label="Back" onClick={goBack}><Icon name="back" size={20} stroke={2.2} /></button>
      ) : <span className="topbar-spacer" />}
      <div className="topbar-title">
        <div className="t">{title}</div>
        {sub ? <div className="s">{sub}</div> : null}
      </div>
      <div className="topbar-right">{right}</div>
    </header>
  );
}

export function IconBtn({ name, label, onClick, badge, dot, color }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} onClick={onClick} style={color ? { color } : undefined}>
      <Icon name={name} size={22} />
      {badge ? <span className="badge">{badge > 99 ? '99+' : badge}</span> : null}
      {dot ? <span className="dot" /> : null}
    </button>
  );
}

const TABS = [
  { to: '/app/home', icon: 'home', label: 'Home' },
  { to: '/app/inbox', icon: 'inbox', label: 'Inbox' },
  { to: '/app/folders', icon: 'folder', label: 'Folders' },
  { to: '/app/settings', icon: 'settings', label: 'Settings' },
];

export function BottomNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const { requests, live, inboxCount } = useStore();
  const n = live ? inboxCount || 0 : requests.length;
  return (
    <nav className="bottomnav" aria-label="Main">
      {TABS.map((t) => {
        const active = loc.pathname.startsWith(t.to);
        return (
          <button key={t.to} type="button" className={'tab' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined} onClick={() => nav(t.to)}>
            <span className="tab-ic"><Icon name={t.icon} size={24} stroke={active ? 2.2 : 1.8} />{t.icon === 'inbox' && n ? <span className="badge">{n > 99 ? '99+' : n}</span> : null}</span>
            <span className="tab-l">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function Rail() {
  const nav = useNavigate();
  const loc = useLocation();
  const { requests, unread, live, inboxCount } = useStore();
  const items = [...TABS.slice(0, 3), ...(live ? [{ to: '/app/ask', icon: 'chat', label: 'Ask AI' }] : []), { to: '/app/notifications', icon: 'bell', label: 'Alerts' }, TABS[3]];
  return (
    <nav className="rail" aria-label="Main">
      <img src={markColor} alt="EZOFIS" className="rail-logo" />
      <img src={lockup} alt="ezofis" className="rail-brand" />
      <button type="button" className="rail-fab" aria-label="Upload documents" onClick={() => nav('/app/upload')}><Icon name="upload" size={22} color="#fff" stroke={2.2} /><span>Upload</span></button>
      {items.map((t) => {
        const active = loc.pathname.startsWith(t.to);
        const badge = t.icon === 'inbox' ? (live ? inboxCount || 0 : requests.length) : t.icon === 'bell' ? unread : 0;
        return (
          <button key={t.to} type="button" className={'rail-item' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined} onClick={() => nav(t.to)}>
            <span className="rail-ic"><Icon name={t.icon} size={24} stroke={active ? 2.2 : 1.8} />{badge ? <span className="badge">{badge > 99 ? '99+' : badge}</span> : null}</span>
            <span className="rail-l">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  // Rendered on <body> so a sheet opened inside a scrolling panel (e.g. the file viewer) is never clipped.
  return createPortal(
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className="sheet">
        <span className="grabber" />
        {title ? <div className="sheet-title">{title}</div> : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Toast() {
  const { toast, setToast } = useStore();
  const nav = useNavigate();
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.key}>
      <span className={'toast-ic ' + (toast.tone || 'ok')}><Icon name={toast.tone === 'bad' ? 'close' : 'check'} size={16} color="#fff" stroke={3} /></span>
      <span className="toast-t">{toast.text}</span>
      {toast.action ? <button type="button" className="toast-a" onClick={() => { setToast(null); nav(toast.to); }}>{toast.action}</button> : null}
    </div>
  );
}

export function Pill({ tone = 'neu', children, solid }) {
  return <span className={'pill ' + tone + (solid ? ' solid' : '')}>{children}</span>;
}

// Renders whatever actions the workflow API returns: primary on the right, one more beside it, the rest in "More".
// Workflow designer button colours (rules[].buttonColor) → solid button styles. Hex/rgb values pass straight through.
const NAMED = { red: '#C62828', danger: '#C62828', green: '#0E8A5F', success: '#0E8A5F', blue: '#1565C0', primary: '#643094', purple: '#643094', violet: '#643094', orange: '#E07A00', amber: '#E07A00', yellow: '#F2B705', teal: '#0A6E7A', cyan: '#0A6E7A', grey: '#5F6470', gray: '#5F6470', black: '#1F1A2B', pink: '#C2185B', brown: '#795548' };
export function actionColor(c) {
  if (!c || typeof c !== 'string') return null;
  const v = c.trim().toLowerCase();
  const hex = NAMED[v] || (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(v) || /^(rgb|hsl)a?\(/.test(v) ? v : null);
  if (!hex) return null;
  let light = false;
  const m = /^#([0-9a-f]{6})$/.exec(hex);
  if (m) { const n = parseInt(m[1], 16); light = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 170; }
  return { background: hex, borderColor: hex, color: light ? '#1F1A2B' : '#fff', boxShadow: 'none' };
}
export function ActionBar({ actions, onAction }) {
  const [more, setMore] = useState(false);
  // actions: plain labels or { label, color } from the workflow JSON; the kind still decides placement (primary right, danger beside it)
  let acts = actions.map((a) => (typeof a === 'string' ? { label: a, kind: actionKind(a) } : { label: a.label, kind: actionKind(a.label), style: actionColor(a.color) }));
  if (acts.length && !acts.some((a) => a.kind === 'primary')) acts[acts.length - 1].kind = 'primary';
  let visible = acts; let overflow = [];
  if (acts.length > 2) {
    const prim = acts.filter((a) => a.kind === 'primary').slice(-1)[0];
    const second = acts.find((a) => a.kind === 'danger' && a !== prim) || acts.find((a) => a !== prim);
    visible = [second, prim];
    overflow = acts.filter((a) => a !== prim && a !== second);
  } else {
    visible = [...acts].sort((a, b) => (a.kind === 'primary') - (b.kind === 'primary'));
  }
  return (
    <>
      <div className="actionbar" style={{ gridTemplateColumns: (overflow.length ? '54px ' : '') + `repeat(${Math.max(visible.length, 1)}, minmax(0, 1fr))` }}>
        {overflow.length ? <button type="button" className="btn outline-grey" aria-label="More actions" onClick={() => setMore(true)}><MoreDots /></button> : null}
        {visible.map((a) => <button key={a.label} type="button" className={'btn ' + (a.style ? 'colored' : a.kind)} style={a.style || undefined} onClick={() => onAction(a.label)}>{a.label}</button>)}
      </div>
      <Sheet open={more} onClose={() => setMore(false)} title="More actions">
        <div className="sheet-list">
          {overflow.map((a) => <button key={a.label} type="button" className={'btn ' + (a.style ? 'colored' : a.kind)} style={a.style || undefined} onClick={() => { setMore(false); onAction(a.label); }}>{a.label}</button>)}
        </div>
      </Sheet>
    </>
  );
}
function MoreDots() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ position: 'absolute' }}><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>; }

export function FileThumb({ ext }) {
  const c = ext === 'PDF' ? '#A61E3F' : ext === 'DOC' ? '#0A6E7A' : '#643094';
  return <span className="thumb" style={{ color: c }}>{ext}</span>;
}

export function Progress({ steps, current }) {
  return (
    <div className="progress" role="img" aria-label={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}>
      {steps.map((s, i) => <span key={i} className={i < current ? 'done' : i === current ? 'now' : ''} />)}
    </div>
  );
}

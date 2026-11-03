import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { REQUESTS, ACTIONED, FILES, UPLOAD_POOL, NOTIFS } from './data.js';
import { loadSession } from './api.js';
import { wfApi, clearWfCache } from './wf.js';
import { repoApi } from './repo.js';
import { bgSession, bgAllowNotifications } from './background.js';
import { pushRegister } from './push.js';
import { notifApi, toItem } from './notifications.js';
import { phonePref } from './notify.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function actionKind(label) {
  if (/reject|decline|cancel/i.test(label)) return 'danger';
  if (/approve|submit|complete|accept|verify/i.test(label)) return 'primary';
  return 'neutral';
}

function detectPlatform() {
  try {
    const cap = window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform();
    if (cap === 'ios' || cap === 'android') return cap;
  } catch (e) { /* not native */ }
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return 'android';
}

function readPref(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch (e) { return fallback; }
}
function writePref(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* storage unavailable */ } }

let seq = 100;

export function StoreProvider({ children }) {
  const [requests, setRequests] = useState(REQUESTS);
  const [actioned, setActioned] = useState(ACTIONED);
  const [files, setFiles] = useState(FILES);
  const [staged, setStaged] = useState([]);
  // Signed in: the bell list is the server's (GET /api/notifications, refreshNotifs); sample mode shows demo items.
  const [notifs, setNotifs] = useState(() => (loadSession() ? [] : NOTIFS));
  const [inboxCount, setInboxCount] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [platformPref, setPlatformPref] = useState(() => {
    const q = new URLSearchParams(location.search).get('platform');
    return q === 'ios' || q === 'android' ? q : readPref('ezofis.platform', 'auto');
  });
  // Live mode = signed in with a real EZOFIS session; otherwise the app shows sample data ("Explore").
  const [session, setSession] = useState(() => loadSession());
  // the background inbox check follows the session: it gets the token on sign-in and forgets it on sign-out
  // and, once per app start, Android asks for the notification permission if EZOFIS doesn't have it yet
  // server push (Firebase) registers this phone with EZOFIS when it's built in; the background check is the fallback
  useEffect(() => { bgSession(session, phonePref()); if (session && phonePref()) { bgAllowNotifications(); pushRegister(session); } }, [session && session.accessToken, session && session.tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [me, setMe] = useState(null);
  const [liveTick, setLiveTick] = useState(0);
  const live = !!session;
  const syncSession = useCallback(() => setSession((prev) => { const n = loadSession(); if (!n || !prev || n.tenantId !== prev.tenantId || n.accessToken !== prev.accessToken) { clearWfCache(); setMe(null); setInboxCount(null); if (!!n !== !!prev) setNotifs(n ? [] : NOTIFS); } return n; }), []);
  const bumpLive = useCallback(() => setLiveTick((t) => t + 1), []);
  // Folders the user can see (null = not known yet). With none, the Folders menu and Upload are hidden.
  const [folderCount, setFolderCount] = useState(null);
  useEffect(() => {
    if (!session) { setFolderCount(null); return undefined; }
    let off = false;
    repoApi.list().then((l) => { if (!off) setFolderCount(l.length); }).catch(() => { /* unknown: keep the menu */ });
    return () => { off = true; };
  }, [session && session.tenantId, session && session.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!session) return undefined;
    let off = false;
    wfApi.userSession().then((u) => { if (!off) setMe(u); }).catch(() => { /* profile is optional; screens fall back to the session email */ });
    wfApi.allInbox(1).then((d) => { if (!off) setInboxCount(d.totalCount || 0); }).catch(() => { /* badge is optional */ });
    return () => { off = true; };
  }, [session, liveTick]);
  const poolIdx = useRef(0);
  const toastTimer = useRef(null);

  const platform = platformPref === 'auto' ? detectPlatform() : platformPref;
  useEffect(() => { document.documentElement.dataset.platform = platform; }, [platform]);

  const setPlatform = useCallback((p) => { setPlatformPref(p); writePref('ezofis.platform', p); }, []);

  const showToast = useCallback((text, opts = {}) => {
    clearTimeout(toastTimer.current);
    setToast({ text, ...opts, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), opts.duration || 3600);
  }, []);

  // sample mode only: signed in, the server keeps the notifications and the list is refreshed from it
  const addNotif = useCallback((n) => { if (loadSession()) return; setNotifs((list) => [{ id: 'n' + (++seq), unread: true, time: 'Just now', ...n }, ...list]); }, []);
  // reads the server list; returns the raw rows (LiveWatcher uses them to spot new ones), null when it couldn't
  const refreshNotifs = useCallback(async () => {
    if (!loadSession()) return null;
    try { const rows = await notifApi.list(); setNotifs(rows.map(toItem)); return rows; } catch (e) { return null; }
  }, []);
  useEffect(() => { if (session) refreshNotifs(); }, [session && session.accessToken, session && session.tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const actOn = useCallback((id, label, comment) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return null;
    const kind = actionKind(label);
    const past = /approve/i.test(label) ? 'approved' : /reject/i.test(label) ? 'rejected' : /submit/i.test(label) ? 'submitted' : /send back/i.test(label) ? 'sent back' : /force close/i.test(label) ? 'force closed' : /request info/i.test(label) ? 'requested info on' : 'actioned';
    const nextStage = kind === 'primary' ? (req.steps[req.current + 1] || 'Completed') : kind === 'danger' ? 'Rejected' : 'Requester';
    const status = kind === 'primary' ? (/submit/i.test(label) ? 'Submitted' : 'Approved') : kind === 'danger' ? 'Rejected' : label;
    const tone = kind === 'primary' ? 'ok' : kind === 'danger' ? 'bad' : 'warn';
    setRequests((l) => l.filter((r) => r.id !== id));
    setActioned((l) => [{ id, workflow: req.workflow, title: `You ${past} · just now`, amount: req.amount, meta: kind === 'danger' ? 'Closed' : `Moved to ${nextStage}`, status, tone, color: req.color }, ...l]);
    addNotif({ type: 'wf', title: `You ${past} ${id}`, body: `${req.workflow} · ${kind === 'danger' ? 'request closed' : 'moved to ' + nextStage}`, tone: kind === 'danger' ? 'r' : 'p', to: '/app/inbox?tab=actioned' });
    const result = { id, label, past, kind, nextStage, comment, workflow: req.workflow, when: new Date() };
    setLastResult(result);
    return result;
  }, [requests, addNotif]);

  const addUpload = useCallback((source) => {
    const base = UPLOAD_POOL[poolIdx.current % UPLOAD_POOL.length];
    poolIdx.current += 1;
    const id = 'u' + (++seq);
    const item = { ...base, id, source, stage: 'Uploading', progress: 12,
      fields: [['Supplier', base.supplier, 99], ['Invoice number', base.po ? base.po.replace('PO', 'INV') : '—', 97], ['PO number', base.po || '—', base.po ? 100 : 0], ['Amount', base.amount || '—', base.amount ? 100 : 0]],
      buyer: base.missingBuyer ? '' : 'Procurement' };
    setStaged((l) => [...l, item]);
    const step = (patch, ms) => setTimeout(() => setStaged((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s))), ms);
    step({ stage: 'Queued', progress: 35 }, 700);
    step({ stage: 'Classifying', progress: 70 }, 1500);
    step({ stage: base.low ? 'Check type' : 'Ready', progress: 100 }, 2600);
    return id;
  }, []);

  const updateRequest = useCallback((id, patch) => setRequests((l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r))), []);
  const updateStaged = useCallback((id, patch) => setStaged((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s))), []);
  const skipStaged = useCallback((id) => setStaged((l) => { const s = l.find((x) => x.id === id); return s ? [...l.filter((x) => x.id !== id), s] : l; }), []);

  const exportStaged = useCallback((ids) => {
    const list = staged.filter((s) => ids.includes(s.id));
    if (!list.length) return 0;
    setStaged((l) => l.filter((s) => !ids.includes(s.id)));
    setFiles((f) => [
      ...list.map((s) => ({ id: s.id, name: s.name, ext: s.ext, type: s.type, supplier: s.supplier, po: s.po, amount: s.amount, status: 'Indexed', when: 'just now', isNew: true,
        fields: [...s.fields, ['Buyer', s.buyer || '—', s.buyer ? 100 : 0]] })),
      ...f.map((x) => ({ ...x, isNew: false })),
    ]);
    const n = list.length;
    addNotif({ type: 'files', title: `${n} file${n > 1 ? 's' : ''} exported`, body: `${list.map((s) => s.name).join(', ')} → Accounts Payable · Indexed`, tone: 't', to: '/app/folders' });
    showToast(`${n} file${n > 1 ? 's' : ''} exported to Accounts Payable`, { action: 'View', to: '/app/notifications', tone: 'ok' });
    return n;
  }, [staged, addNotif, showToast]);

  // mark read / delete update the list at once and tell the server (PATCH …/read, DELETE …)
  const markRead = useCallback((id) => {
    setNotifs((l) => l.map((n) => {
      if (n.id !== id) return n;
      if (n.server && n.unread) notifApi.read(id).catch(() => {});
      return { ...n, unread: false };
    }));
  }, []);
  const markAllRead = useCallback(() => setNotifs((l) => l.map((n) => { if (n.server && n.unread) notifApi.read(n.id).catch(() => {}); return { ...n, unread: false }; })), []);
  const removeNotif = useCallback((id) => setNotifs((l) => l.filter((n) => { if (n.id === id && n.server) notifApi.remove(id).catch(() => {}); return n.id !== id; })), []);

  const value = useMemo(() => ({
    live, session, me, liveTick, syncSession, bumpLive, setLastResult, addNotif, refreshNotifs, removeNotif, inboxCount, setInboxCount, folderCount, setFolderCount,
    hasFolders: !live || folderCount !== 0,
    requests, actioned, files, staged, notifs, toast, lastResult, platform, platformPref,
    setPlatform, showToast, setToast, actOn, addUpload, updateRequest, updateStaged, skipStaged, exportStaged, markAllRead, markRead,
    unread: notifs.filter((n) => n.unread).length,
  }), [live, session, me, liveTick, syncSession, bumpLive, addNotif, inboxCount, folderCount, requests, actioned, files, staged, notifs, toast, lastResult, platform, platformPref, setPlatform, showToast, actOn, addUpload, updateRequest, updateStaged, skipStaged, exportStaged, markAllRead, markRead, refreshNotifs, removeNotif]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

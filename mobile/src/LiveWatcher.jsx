// Background auto-refresh for signed-in users.
// Polls the all-workflows inbox (every 45 s while the app is open, every 2 min while it is in the background,
// immediately when the app comes back or the network returns). When new requests arrive it adds them to the
// in-app notification list, posts a phone notification (when the app is not on screen), updates the inbox badge
// and refreshes the screen — only on Home / Inbox / Notifications, so forms and open tickets are never reset.
import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './store.jsx';
import { wfApi } from './wf.js';
import { phoneNotify, onNotificationTap } from './notify.js';
import { bgSeen, bgCheckNow, bgAvailable } from './background.js';
import { onPushTap } from './push.js';
import { App as CapApp } from '@capacitor/app';

const testMs = (() => { try { return Number(localStorage.getItem('ezofis.pollMs')) || 0; } catch (e) { return 0; } })();
const FG_MS = testMs || 45000, BG_MS = testMs || 120000;
const AUTO = 'ezofis.autoRefresh';
export const autoRefreshOn = () => { try { return localStorage.getItem(AUTO) !== 'off'; } catch (e) { return true; } };
export const setAutoRefresh = (on) => { try { localStorage.setItem(AUTO, on ? 'on' : 'off'); } catch (e) { /* ignore */ } window.dispatchEvent(new Event('ezofis-autorefresh')); };
const refreshable = (p) => p === '/app/home' || p === '/app/inbox' || p === '/app/notifications';
const keyOf = (r) => `${r.workflowInstanceId}|${r.transactionId || r.activityId || ''}`;
// Is the user looking at the app? Android's in-app WebView doesn't always set document.hidden when the app goes to the
// background, so the Capacitor app state decides on the phone.
let appActive = true;
try { CapApp.addListener('appStateChange', (st) => { appActive = !!(st && st.isActive); }); } catch (e) { /* web: document.hidden only */ }
const away = () => document.hidden || !appActive;

export default function LiveWatcher() {
  const { live, session, bumpLive, addNotif, setInboxCount, showToast } = useStore();
  const loc = useLocation();
  const nav = useNavigate();
  const snap = useRef(null);
  const stale = useRef(false);
  const busy = useRef(false);
  const path = useRef(loc.pathname);
  path.current = loc.pathname;

  const check = useCallback(async () => {
    if (busy.current || !navigator.onLine || !autoRefreshOn()) return;
    busy.current = true;
    try {
      const d = await wfApi.allInbox(10);
      const rows = (d.workflows || []).flatMap((g) => g.items || []);
      const total = d.totalCount || 0;
      const keys = new Set(rows.map(keyOf));
      const prev = snap.current;
      snap.current = { keys, total };
      setInboxCount(total);
      // While the user is away on the phone, the background check announces new requests (the notification path the
      // Settings test proves) and keeps its own "seen" list; requests count as seen only when the app was on screen.
      const fresh = prev ? rows.filter((r) => !prev.keys.has(keyOf(r))) : [];
      const listIn = () => fresh.slice(0, 5).forEach((r) => addNotif({
        type: 'wf', tone: 'p', title: `New request · ${r.referenceNumber || r.name}`,
        body: `${r.name}${r.stage ? ' · ' + r.stage : ''}`, to: '/app/inbox/' + encodeURIComponent(r.workflowId + '~' + r.workflowInstanceId),
      }));
      if (away() && bgAvailable()) { listIn(); bgCheckNow('app, you were away'); if (refreshable(path.current)) bumpLive(); else stale.current = true; return; }
      bgSeen([...keys]); // the background check won't announce these again
      if (!prev) return;
      if (!fresh.length && total === prev.total) return;
      listIn();
      if (fresh.length) {
        const one = fresh[0];
        const title = fresh.length === 1 ? `New request · ${one.referenceNumber || one.name}` : `${fresh.length} new requests`;
        const body = fresh.length === 1 ? `${one.name}${one.stage ? ' · ' + one.stage : ''} is waiting for you` : `${total} waiting in your EZOFIS inbox`;
        if (away()) phoneNotify(title, body, { route: '/app/inbox' + (fresh.length === 1 ? '/' + encodeURIComponent(one.workflowId + '~' + one.workflowInstanceId) : ''), tag: 'ezofis-inbox' });
        else showToast(fresh.length === 1 ? `New request ${one.referenceNumber || ''} arrived` : `${fresh.length} new requests arrived`);
      }
      if (refreshable(path.current)) bumpLive(); else stale.current = true;
    } catch (e) {
      /* a failed poll is retried on the next tick; a 401 already signs the user out */
    } finally { busy.current = false; }
  }, [addNotif, bumpLive, setInboxCount, showToast]);

  // start / restart with the session
  useEffect(() => {
    snap.current = null; stale.current = false;
    if (!live) return undefined;
    let timer = null, off = false;
    const loop = () => { if (off) return; timer = setTimeout(async () => { await check(); loop(); }, away() ? BG_MS : FG_MS); };
    const now = () => { clearTimeout(timer); check().then(loop); };
    const onVis = () => { if (!document.hidden) now(); };
    check().then(loop);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', now);
    window.addEventListener('ezofis-autorefresh', now);
    let resumeOff = () => {};
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App && App.addListener) { const h = App.addListener('resume', now); resumeOff = () => Promise.resolve(h).then((x) => x && x.remove && x.remove()); }
    return () => { off = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', now); window.removeEventListener('ezofis-autorefresh', now); resumeOff(); };
  }, [live, session && session.accessToken, session && session.tenantId, check]);

  // changes found while a form / ticket was open are applied when the user is back on a list
  useEffect(() => { if (stale.current && refreshable(loc.pathname)) { stale.current = false; bumpLive(); } }, [loc.pathname, bumpLive]);

  // tapping a phone notification (release build) opens the request
  useEffect(() => { let un = () => {}; onNotificationTap((r) => nav(r)).then((f) => { un = f; }); return () => un(); }, [nav]);
  useEffect(() => { let un = () => {}; onPushTap((r) => nav(r)).then((f) => { un = f; }); return () => un(); }, [nav]);

  return null;
}

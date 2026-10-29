import React, { useEffect, useState } from 'react';
import { permission, requestPermission, phonePref, setPhonePref, phoneNotify } from '../notify.js';
import { pushRegister, pushUnregister, pushAvailable, pushToken, pushRegistered } from '../push.js';
import { bgSession, bgAvailable, bgStatus, bgCheckNow, bgTestNotification, bgPermission, bgAllowNotifications } from '../background.js';
import { autoRefreshOn, setAutoRefresh } from '../LiveWatcher.jsx';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { Icon, Sheet, TopBar } from '../ui.jsx';
import { USER } from '../data.js';
import { authed, loadSession, clearSession } from '../api.js';

// Organization brand for Settings. GET /api/branding (tenant from X-Tenant-Id) is what the web app calls for the tenant's
// branding; brandingJson carries `logo` (data URL or link) and `brandName`. Until the API answers, the name and a monogram show.
const brandCache = new Map();
function useTenantBrand(session) {
  const id = session && session.tenantId;
  const [brand, setBrand] = useState(() => brandCache.get(id) || {});
  useEffect(() => {
    if (!id || brandCache.has(id)) return undefined;
    let off = false;
    authed('/branding').then((d) => {
      const rec = (d && (d.branding || d)) || {};
      let j = rec.brandingJson || rec.json || {};
      if (typeof j === 'string') { try { j = JSON.parse(j); } catch (e) { j = {}; } }
      const logo = String(j.logo || j.logoUrl || '');
      const b = { logo: /^(data:image\/|https:\/\/)/i.test(logo) ? logo : '', name: String(j.brandName || j.appTitle || '').trim() };
      brandCache.set(id, b); if (!off) setBrand(b);
    }).catch(() => { brandCache.set(id, {}); });
    return () => { off = true; };
  }, [id]);
  return brand;
}
const initialsOf = (n) => { const w = String(n || '?').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase(); };

const TONE_BG = { p: 'var(--tint-p)', t: 'var(--tint-t)', a: 'var(--tint-a)', r: 'var(--tint-r)' };
const TONE_FG = { p: 'var(--deep)', t: 'var(--teal-dark)', a: 'var(--warn-t)', r: 'var(--bad-t)' };
const TONE_DOT = { p: '#8300E6', t: '#0A7C89', a: '#B45309', r: '#C2264B' };

export function Notifications() {
  const nav = useNavigate();
  const { notifs, markAllRead, markRead, unread, live, showToast } = useStore();
  const [f, setF] = useState('all');
  const [perm, setPerm] = useState(null);
  useEffect(() => { permission().then(setPerm); }, []);
  const allow = async () => { const p = await requestPermission(); setPerm(p); if (p === 'granted') { setPhonePref(true); showToast('Phone notifications are on'); } else if (p === 'denied') showToast('Allow notifications for EZOFIS in your phone settings.', { tone: 'bad' }); };
  const list = notifs.filter((n) => f === 'all' || n.type === f);
  const today = list.filter((n) => !/yesterday/i.test(n.time));
  const earlier = list.filter((n) => /yesterday/i.test(n.time));
  const Item = ({ n }) => (
    <button type="button" className="card" onClick={() => { markRead(n.id); nav(n.to); }} style={{ background: TONE_BG[n.tone], display: 'flex', gap: 12, position: 'relative' }}>
      <span style={{ flex: 'none', width: 38, height: 38, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 999, background: TONE_DOT[n.tone] }} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="row-between"><span style={{ fontSize: 14, fontWeight: 600, color: TONE_FG[n.tone] }}>{n.title}</span><span className="muted" style={{ flex: 'none', fontSize: 11 }}>{n.time}</span></span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--body)', marginTop: 2, lineHeight: 1.4 }}>{n.body}</span>
      </span>
      {n.unread ? <span aria-label="Unread" style={{ position: 'absolute', left: 6, top: 6, width: 8, height: 8, borderRadius: 999, background: '#8300E6' }} /> : null}
    </button>
  );
  return (
    <div className="screen">
      <TopBar title="Notifications" back right={<button type="button" className="text-btn" onClick={markAllRead} disabled={!unread}>Mark all read</button>} />
      <div style={{ background: 'var(--surface)', padding: '0 var(--gutter) 14px' }}>
        <div className="chips">
          {[['all', `All${unread ? ' · ' + unread + ' new' : ''}`], ['wf', 'Workflow'], ['files', 'Files']].map(([k, l]) => <button key={k} type="button" className={'chip' + (f === k ? ' on' : '')} onClick={() => setF(k)}>{l}</button>)}
        </div>
      </div>
      <div className="content">
        {live && perm === 'prompt' ? (
          <div className="notice info" style={{ alignItems: "center" }}><Icon name="bell" size={18} /><span className="grow">Get new requests on your phone, even when EZOFIS is closed.</span><button type="button" onClick={allow}>Turn on</button></div>
        ) : null}
        {today.length ? <div className="sec-label">Today</div> : null}
        {today.map((n) => <Item key={n.id} n={n} />)}
        {earlier.length ? <div className="sec-label">Earlier</div> : null}
        {earlier.map((n) => <Item key={n.id} n={n} />)}
        {!list.length ? <div className="empty"><Icon name="bell" size={40} color="#CFC8DC" />No notifications here.</div> : null}
      </div>
    </div>
  );
}

// Settings → Background check: what the closed-app inbox check last did, the notification permission, and buttons to run
// it now or post a test notification (to tell "no new requests" apart from "notifications blocked").
function BackgroundCheck() {
  const { showToast } = useStore();
  const [st, setSt] = useState(null);
  const [perm, setPerm] = useState('');
  const [busy, setBusy] = useState('');
  const load = async () => { setSt(await bgStatus()); setPerm(await bgPermission()); };
  useEffect(() => { load(); }, []);
  const run = async (what) => {
    setBusy(what);
    if (what === 'test') { const p = await bgAllowNotifications(); setPerm(p); if (p !== 'granted') { showToast('Notifications are blocked. Allow them for EZOFIS in your phone settings.', { tone: 'bad' }); setBusy(''); return; } await bgTestNotification(); showToast('Test notification sent. Check your notification shade.'); }
    else { await bgSession(loadSession(), phonePref()); await bgCheckNow(); }
    await load(); setBusy('');
  };
  const last = st && st.last;
  const when = last && last.at ? new Date(last.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const permText = perm === 'granted' ? 'Allowed' : perm === 'denied' ? 'Blocked in phone settings' : 'Not allowed yet';
  return (
    <div className="bg-card" aria-label="Background check">
      <div className="bg-row"><span>Last check</span><b>{last ? `${when} · ${last.result}` : st ? 'Not run yet · it runs about 15 minutes after you leave the app' : 'Loading…'}</b></div>
      <div className="bg-row"><span>Notifications</span><b className={perm === 'granted' ? 'ok' : 'bad'}>{permText}</b></div>
      {st && st.history && st.history.length ? (
        <div className="bg-hist" aria-label="Recent checks">
          {st.history.map((h, i) => <div key={i}><time>{new Date(h.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time><span>{h.by || 'schedule'}</span><b>{h.result}{h.waiting != null ? ` · ${h.waiting} waiting` : ''}{h.newest ? ` · newest ${h.newest}` : ''}</b></div>)}
        </div>
      ) : null}
      {pushAvailable() ? (
        <div className="bg-row"><span>Firebase push</span><b className={pushToken() ? 'ok' : ''}>{!pushToken() ? 'Not registered yet' : pushRegistered() ? 'On · registered with EZOFIS' : 'Phone ready · EZOFIS server not set up yet'}{pushToken() ? <button type="button" className="chip" style={{ marginLeft: 8, height: 26 }} onClick={() => { try { navigator.clipboard.writeText(pushToken()); showToast('Push token copied'); } catch (e) { showToast(pushToken()); } }}>Copy token</button> : null}</b></div>
      ) : null}
      <div className="bg-row"><span>Signed in for checks</span><b>{st ? (st.signedIn ? (st.enabled ? 'Yes' : 'Paused (phone notifications off)') : 'No') : '…'}</b></div>
      <div className="grid2" style={{ marginTop: 6 }}>
        <button type="button" className="btn neutral small" disabled={!!busy} onClick={() => run('check')}>{busy === 'check' ? <span className="spinner" /> : null}Check now</button>
        <button type="button" className="btn neutral small" disabled={!!busy} onClick={() => run('test')}>{busy === 'test' ? <span className="spinner" /> : null}Test notification</button>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: '6px 0 0', lineHeight: 1.45 }}>If no check runs after you close the app, set Settings → Apps → EZOFIS → Battery to Unrestricted.</p>
    </div>
  );
}

export function Settings() {
  const nav = useNavigate();
  const { platformPref, setPlatform, platform, showToast, me, syncSession } = useStore();
  const [perm, setPerm] = useState('unsupported');
  const [phoneOn, setPhoneOn] = useState(phonePref());
  const [auto, setAuto] = useState(autoRefreshOn());
  useEffect(() => { let off = false; const upd = () => permission().then((p) => { if (!off) setPerm(p); }); upd(); document.addEventListener('visibilitychange', upd); return () => { off = true; document.removeEventListener('visibilitychange', upd); }; }, []);
  const phoneActive = phoneOn && perm === 'granted';
  const togglePhone = async () => {
    if (phoneActive) { setPhonePref(false); setPhoneOn(false); bgSession(loadSession(), false); pushUnregister(loadSession()); return; }
    let p = perm;
    if (p !== 'granted') p = await requestPermission();
    setPerm(p);
    if (p === 'granted') { setPhonePref(true); setPhoneOn(true); bgSession(loadSession(), true); pushRegister(loadSession()); phoneNotify('Phone notifications are on', 'You\'ll be told here when a new request is waiting for you.'); }
    else if (p === 'unsupported') showToast('This preview can\'t show phone notifications. Use the app on your phone.');
    else showToast('Notifications are blocked. Allow them for EZOFIS in your phone settings.', { tone: 'bad' });
  };
  const phoneSub = perm === 'unsupported' ? 'Not available in this preview' : perm === 'denied' ? 'Blocked in phone settings' : phoneActive ? 'New requests, even when the app is closed' : 'Off · tap to allow';
  const [lang, setLang] = useState(false);
  const [language, setLanguage] = useState('English');
  const [session] = useState(() => loadSession());
  const brand = useTenantBrand(session);
  const signOut = () => { pushUnregister(loadSession()); clearSession(); bgSession(null); syncSession(); try { localStorage.removeItem('ezofis.pin'); } catch (e) { /* storage unavailable */ } nav('/welcome', { replace: true }); };
  const name = me && me.displayName ? me.displayName : session ? session.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : USER.name;
  return (
    <div className="screen">
      <TopBar title="Settings" back right={<span />} />
      <div className="content">
        <div className="card p" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ flex: 'none', width: 56, height: 56, borderRadius: 999, background: 'linear-gradient(135deg, #19C1D4, #0A7C89)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--head)', fontWeight: 700, fontSize: 24 }}>{name[0]}</span>
          <div style={{ minWidth: 0 }}><div className="ct">{name}</div><div className="cb" style={{ wordBreak: 'break-all' }}>{session ? [session.email, (me && me.role) || session.role || 'Member', me && (me.jobTitle || me['Job Title'] || me.department)].filter(Boolean).join(' · ') : `${USER.email} · sample data`}</div></div>
        </div>
        <div className="sec-label">App preview</div>
        <div className="card w">
          <div style={{ fontSize: 15, fontWeight: 600 }}>Platform style</div>
          <div className="muted" style={{ fontSize: 12, margin: '2px 0 10px' }}>Showing {platform === 'ios' ? 'iOS' : 'Android'} style. Auto follows this device.</div>
          <div className="seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} role="radiogroup" aria-label="Platform style">
            {[['auto', 'Auto'], ['android', 'Android'], ['ios', 'iOS']].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={platformPref === k} className={platformPref === k ? 'on' : ''} onClick={() => setPlatform(k)}>{l}</button>)}
          </div>
        </div>
        <div className="sec-label">Organization</div>
        {session ? (
          <div className="org-card">
            <span className="org-logo">{brand.logo ? <img src={brand.logo} alt={brand.name || session.tenantName} /> : <b>{initialsOf(brand.name || session.tenantName)}</b>}</span>
            <span className="grow">
              <span className="org-n">{brand.name || session.tenantName}</span>
              <span className="org-m">{[(me && me.role) || session.role, me && me.department].filter(Boolean).join(' · ') || 'Member'}</span>
              <span className="org-m">{session.email}</span>
            </span>
          </div>
        ) : (
          <button type="button" className="setting-row" onClick={() => nav('/login')}><span className="ic"><Icon name="user" size={20} /></span><span className="tx">Sign in to your organization<small>You're exploring sample data</small></span><Icon name="chevR" size={18} color="#5E5873" /></button>
        )}
        {session && bgAvailable() ? <><div className="sec-label">Background check</div><BackgroundCheck /></> : null}
        <div className="sec-label">Preferences</div>
        <div>
          <div className="setting-row"><span className="ic"><Icon name="bell" size={20} /></span><span className="tx">Phone notifications<small>{phoneSub}</small></span><button type="button" role="switch" aria-checked={phoneActive} aria-label="Phone notifications" className="switch" onClick={togglePhone} /></div>
          <div className="setting-row"><span className="ic"><Icon name="refresh" size={20} /></span><span className="tx">Auto-refresh<small>{auto ? 'Checks for new requests every 45 seconds' : 'Off · pull to refresh manually'}</small></span><button type="button" role="switch" aria-checked={auto} aria-label="Auto-refresh" className="switch" onClick={() => { setAutoRefresh(!auto); setAuto(!auto); }} /></div>
          <button type="button" className="setting-row" onClick={() => setLang(true)}><span className="ic"><Icon name="globe" size={20} /></span><span className="tx">Language<small>{language}</small></span><Icon name="chevR" size={18} color="#5E5873" /></button>
          <button type="button" className="setting-row" onClick={() => showToast('Opening help.ezofis.com')}><span className="ic"><Icon name="help" size={20} /></span><span className="tx">Help center<small>Guides for inbox, folders and uploads</small></span><Icon name="chevR" size={18} color="#5E5873" /></button>
          <button type="button" className="setting-row" onClick={signOut}><span className="ic" style={{ background: 'var(--tint-r)', color: 'var(--bad)' }}><Icon name="logout" size={20} /></span><span className="tx" style={{ color: 'var(--bad)' }}>Sign out</span></button>
        </div>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 10 }}>EZOFIS Mobile · V6 · 0.6.0</p>
      </div>
      <Sheet open={lang} onClose={() => setLang(false)} title="Language">
        <div className="sheet-list">{['English', 'Tamil', 'Hindi', 'Arabic', 'French'].map((l) => <button key={l} type="button" className={'opt' + (l === language ? ' on' : '')} onClick={() => { setLanguage(l); setLang(false); }}>{l}</button>)}</div>
      </Sheet>
    </div>
  );
}

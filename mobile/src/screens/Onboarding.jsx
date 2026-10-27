import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon, Sheet, Sparkle, TopBar } from '../ui.jsx';
import { authApi, loginErrorMessage, saveSession, loadSession, clearSession, IS_BROWSER_PREVIEW } from '../api.js';
import { getProviderEmail, SocialUnavailable, SocialCancelled } from '../social.js';
import { USER } from '../data.js';
import markWhite from '../assets/mark-white.png';
import markColor from '../assets/mark-color.png';
import lockupWhite from '../assets/lockup-white.png';
import lockup from '../assets/lockup-color.png';

export function Splash() {
  const nav = useNavigate();
  useEffect(() => { const t = setTimeout(() => nav('/loading', { replace: true }), 1300); return () => clearTimeout(t); }, [nav]);
  return (
    <div className="splash" onClick={() => nav('/loading', { replace: true })}>
      <img className="mark" src={markWhite} alt="EZOFIS" />
    </div>
  );
}

const LINES = [
  ['Idea. Innovate.\nImplement.', 'Starting EZOFIS…'],
  ['Say goodbye to\ntedious workflows.', 'Securing your session…'],
  ['Your gateway to\nsmarter workflows.', 'Loading your workspace…'],
  ['The human is the boss,\nalways.', 'Ready'],
];

export function Loader() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i < 3) { const t = setTimeout(() => setI(i + 1), 1700); return () => clearTimeout(t); }
    const t = setTimeout(() => nav(loadSession() ? '/app/home' : '/welcome', { replace: true }), 1600);
    return () => clearTimeout(t);
  }, [i, nav]);
  return (
    <div className="splash">
      <button type="button" onClick={() => nav('/welcome', { replace: true })} style={{ position: 'absolute', top: 'calc(var(--sat) + 16px)', right: 16, border: 0, background: 'transparent', color: 'rgba(255,255,255,.85)', fontWeight: 500, fontSize: 14, padding: 10 }}>Skip</button>
      <div className="loader-line" key={i} aria-live="polite">{LINES[i][0]}</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div className="loader-bar"><span style={{ width: (i + 1) * 25 + '%' }} /></div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{LINES[i][1]}</div>
      </div>
      <img src={lockupWhite} alt="ezofis" style={{ position: 'absolute', bottom: 'calc(var(--sab) + 40px)', width: 120 }} />
    </div>
  );
}

const SLIDES = [
  { tone: 'teal', a: "What's new in V6,", b: 'AI in your hand!', cta: 'Take a tour' },
  { tone: 'purple', a: 'Approve on the go,', b: 'Inbox in your pocket', cta: 'See how' },
];

const INFO = {
  workspace: { title: 'Find your workspace', body: 'Enter your work email on the sign-in screen and EZOFIS opens your company workspace automatically. Your administrator can also share your workspace address.' },
  support: { title: 'Contact support', body: 'Reach the EZOFIS support team from the Help Center, or ask your workspace administrator for access to workflows and folders.' },
  help: { title: 'Help center', body: 'Step-by-step guides for the inbox, folders, uploads and approvals are available at help.ezofis.com.' },
  security: { title: 'Security & privacy', body: 'EZOFIS is SOC 2 Type II compliant. Your session is protected by your EZOFIS sign-in and, where your organization enables it, two-step verification.' },
};

export function Welcome() {
  const nav = useNavigate();
  const [slide, setSlide] = useState(0);
  const [info, setInfo] = useState(null);
  useEffect(() => { const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500); return () => clearInterval(t); }, []);
  const s = SLIDES[slide];
  return (
    <div className="screen" style={{ minHeight: '100dvh' }}>
      <div className="hero" style={{ paddingBottom: 96 }}>
        <div className="hero-inner" style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ flex: 'none', width: 64, height: 64, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(0,0,0,.2)' }}><img src={markColor} alt="" style={{ width: 38 }} /></span>
            <div>
              <div style={{ fontFamily: 'var(--head)', fontWeight: 700, fontSize: 24 }}>Welcome to</div>
              <div style={{ fontSize: 16, opacity: 0.9 }}>EZOFIS Workspace</div>
            </div>
          </div>
          <button type="button" onClick={() => nav('/login')} style={{ alignSelf: 'flex-start', marginLeft: 80, height: 46, border: '2px solid #fff', borderRadius: 999, padding: '0 6px 0 22px', display: 'flex', alignItems: 'center', gap: 14, color: '#fff', background: 'transparent', fontWeight: 500, fontSize: 16 }}>
            Sign in<span style={{ width: 32, height: 32, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevR" size={18} color="#643094" stroke={2.6} /></span>
          </button>
        </div>
      </div>
      <div className="sheet-body">
        <div className="content" style={{ paddingTop: 0 }}>
          <div className={'banner ' + s.tone} style={{ marginTop: -60 }} key={slide}>
            <img src={markWhite} alt="" className="wm" />
            <div style={{ position: 'absolute', right: 30, top: 22 }}><Sparkle size={36} color="#fff" /></div>
            <div className="b1">{s.a}<span className="b2">{s.b}</span></div>
            <button type="button" className="cta" onClick={() => setInfo('help')}>{s.cta}</button>
            <div className="dots">{SLIDES.map((x, j) => <button key={j} type="button" aria-label={'Slide ' + (j + 1)} className={j === slide ? 'on' : ''} onClick={() => setSlide(j)} />)}</div>
          </div>
          <h2 className="sec-title" style={{ fontSize: 20 }}>Get started</h2>
          <div className="grid2 wide4">
            <button type="button" className="tile p" onClick={() => setInfo('workspace')}><Icon name="search" size={26} color="#8300E6" />Find your workspace</button>
            <button type="button" className="tile t" onClick={() => setInfo('support')}><Icon name="chat" size={26} color="#0A7C89" />Contact support</button>
            <button type="button" className="tile d" onClick={() => setInfo('help')}><Icon name="doc" size={26} color="#643094" />Help center</button>
            <button type="button" className="tile a" onClick={() => setInfo('security')}><Icon name="lock" size={26} color="#0A7C89" />Security &amp; privacy</button>
          </div>
        </div>
      </div>
      <Sheet open={!!info} onClose={() => setInfo(null)} title={info ? INFO[info].title : ''}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--body)' }}>{info ? INFO[info].body : ''}</p>
        <button type="button" className="btn primary" onClick={() => setInfo(null)}>Got it</button>
      </Sheet>
    </div>
  );
}

function OtpInput({ value, onChange, length = 6 }) {
  return (
    <div style={{ position: 'relative' }}>
      <input id="otp" aria-label={`${length}-digit code`} inputMode="numeric" autoComplete="one-time-code" maxLength={length} value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', fontSize: 16 }} autoFocus />
      <div className="pin-row" aria-hidden="true" style={{ gap: 8 }}>
        {Array.from({ length }, (_, i) => <span key={i} className={'pin' + (i === value.length ? ' on' : '')} style={{ width: 46, height: 56, fontSize: 22, fontWeight: 600 }}>{value[i] || ''}</span>)}
      </div>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [step, setStep] = useState('email');          // email | org | password | otp | guest
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [via, setVia] = useState('password');         // password | google | microsoft
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [socialInfo, setSocialInfo] = useState(null);

  useEffect(() => {
    if (step !== 'otp' || left <= 0) return undefined;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [step, left]);

  const done = (login, t) => { saveSession(login, t, email.trim()); nav('/app/home', { replace: true }); };
  const run = async (fn) => { setErr(''); setBusy(true); try { await fn(); } finally { setBusy(false); } };

  const afterTenants = async (list, mode, verifiedEmail) => {
    if (!list.tenants.length) { setErr(mode === 'password' ? 'No EZOFIS account uses this email. Check it, or ask your administrator for an invite.' : `No EZOFIS organization has ${verifiedEmail}.`); return; }
    setTenants(list.tenants);
    if (list.requiresOrgSelection || list.tenants.length > 1) { setStep('org'); return; }
    await chooseTenant(list.tenants[0], mode, verifiedEmail);
  };

  const chooseTenant = async (t, mode = via, verifiedEmail = email) => {
    setTenant(t);
    if (mode === 'password') { setStep('password'); return; }
    try {
      const login = await authApi.social(verifiedEmail, mode, t.tenantId);
      done(login, t);
    } catch (e) { setErr(loginErrorMessage(e, 'social')); setStep('email'); }
  };

  const submitEmail = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('Enter your work email, for example name@company.com.'); return; }
    setVia('password');
    run(async () => { try { await afterTenants(await authApi.tenants(email), 'password'); } catch (x) { setErr(loginErrorMessage(x)); } });
  };

  const submitPassword = (e) => {
    e && e.preventDefault();
    if (!pw) { setErr('Enter your password.'); return; }
    run(async () => {
      try {
        const r = await authApi.login(email, pw, tenant.tenantId);
        if (r.kind === 'success') done(r, tenant);
        else if (r.kind === '2fa') { setChallenge(r); setCode(''); setLeft(Number(r.expiresInSeconds) || 300); setStep('otp'); }
        else setStep('guest');
      } catch (x) { setErr(loginErrorMessage(x, 'password')); }
    });
  };

  const submitOtp = (e) => {
    e && e.preventDefault();
    if (code.length < 6) { setErr('Enter the 6-digit code.'); return; }
    run(async () => {
      try { done(await authApi.complete2fa(challenge.tempToken, code, challenge.tenantId || tenant.tenantId), tenant); }
      catch (x) { setErr(loginErrorMessage(x, '2fa')); }
    });
  };
  useEffect(() => { if (step === 'otp' && code.length === 6 && !busy) submitOtp(); }, [code]); // eslint-disable-line

  const social = (provider) => {
    setVia(provider);
    run(async () => {
      let id;
      try { id = await getProviderEmail(provider); }
      catch (x) { if (x instanceof SocialCancelled) return; if (x instanceof SocialUnavailable) setSocialInfo(provider); else setErr(x.message); return; }
      setEmail(id.email);
      try { await afterTenants(await authApi.tenants(id.email), provider, id.email); } catch (x) { setErr(loginErrorMessage(x, 'social')); }
    });
  };

  const back = () => {
    setErr('');
    if (step === 'otp' || step === 'guest') { setStep('password'); setChallenge(null); return; }
    if (step === 'password' && tenants.length > 1) { setStep('org'); return; }
    if (step === 'password' || step === 'org') { setStep('email'); setPw(''); return; }
    nav('/welcome');
  };
  const titles = { email: 'Sign in', org: 'Choose organization', password: 'Enter password', otp: 'Verify it\'s you', guest: 'Set your password' };
  const spinner = <span className="spinner" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} />;
  const providerName = (p) => (p === 'google' ? 'Google' : 'Microsoft');

  return (
    <div className="screen" style={{ minHeight: '100dvh' }}>
      <TopBar title={titles[step]} back onBack={back} right={<span />} />
      <div className="content" style={{ gap: 18, maxWidth: 480 }}>
        {step === 'email' ? (
          <form onSubmit={submitEmail} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <img src={lockup} alt="ezofis" style={{ width: 168, marginTop: 6 }} />
            <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.5 }}>Sign in with your EZOFIS work account.</p>
            {IS_BROWSER_PREVIEW ? <div className="notice info" role="note"><span className="grow">You're viewing the web preview. Sign-in works in the Android app (APK). Here, use <b>Explore with sample data</b> below to try every screen.</span></div> : null}
            <div className="field">
              <label htmlFor="em">Work email <span className="req">*</span></label>
              <input id="em" className={'input' + (err ? ' error' : '')} type="email" inputMode="email" autoComplete="username" autoCapitalize="none" placeholder="name@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} />
              {err ? <span className="err" role="alert">{err}</span> : null}
            </div>
            <button type="submit" className="btn primary" disabled={busy}>{busy && via === 'password' ? spinner : 'Continue'}</button>
            <div className="or">or</div>
            <button type="button" className="sso" onClick={() => social('google')} disabled={busy}><span className="slot" aria-hidden="true" />{busy && via === 'google' ? 'Signing in…' : 'Sign in with Google'}</button>
            <button type="button" className="sso ms" onClick={() => social('microsoft')} disabled={busy}><span className="slot" aria-hidden="true" style={{ borderRadius: 0 }} />{busy && via === 'microsoft' ? 'Signing in…' : 'Sign in with Microsoft'}</button>
            <button type="button" className="text-btn" style={{ alignSelf: 'center', color: 'var(--muted)', fontWeight: 500 }} onClick={() => nav('/app/home', { replace: true })}>Explore with sample data instead</button>
          </form>
        ) : null}

        {step === 'org' ? (
          <>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.5 }}><b style={{ color: 'var(--ink)' }}>{email}</b> belongs to {tenants.length} organizations. Choose one to sign in to.</p>
            <div className="sheet-list">
              {tenants.map((t) => (
                <button key={t.tenantId} type="button" className="opt" disabled={busy} onClick={() => run(() => chooseTenant(t))}>
                  <span className="ic" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--tint-p)', color: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="building" size={18} /></span>
                  <span style={{ flex: 1 }}><span style={{ display: 'block', fontWeight: 600 }}>{t.name}</span><span className="muted" style={{ fontSize: 12 }}>{t.role}</span></span>
                  <Icon name="chevR" size={18} color="#5E5873" />
                </button>
              ))}
            </div>
            {err ? <span className="err" role="alert">{err}</span> : null}
          </>
        ) : null}

        {step === 'password' ? (
          <form onSubmit={submitPassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="id-card">
              <span style={{ fontWeight: 600 }}><Icon name="user" size={20} color="#8300E6" />{email}</span>
              <span className="muted"><Icon name="building" size={20} color="#8300E6" />{tenant && tenant.name}{tenants.length > 1 ? <button type="button" className="text-btn" style={{ height: 28, marginLeft: 'auto' }} onClick={() => setStep('org')}>Change</button> : null}</span>
            </div>
            <div className="field">
              <label htmlFor="pw">Password <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <input id="pw" className={'input' + (err ? ' error' : '')} type={show ? 'text' : 'password'} autoComplete="current-password" autoFocus placeholder="Password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} style={{ paddingRight: 52 }} />
                <button type="button" className="icon-btn" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} style={{ position: 'absolute', right: 4, top: 4 }}><Icon name="eye" size={20} color="#5E5873" /></button>
              </div>
              {err ? <span className="err" role="alert">{err}</span> : null}
              <span className="muted" style={{ fontSize: 12 }}>Forgot your password? Reset it from cloud.ezofis.com or ask your administrator.</span>
            </div>
            <button type="submit" className="btn primary" disabled={busy}>{busy ? spinner : 'Sign in'}</button>
          </form>
        ) : null}

        {step === 'otp' && challenge ? (
          <form onSubmit={submitOtp} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.5 }}>
              {/authenticator/i.test(challenge.method || '') ? 'Open your authenticator app and enter the 6-digit code for EZOFIS.' : (challenge.message || 'A code was sent to your email.') + ' Enter it below.'}
            </p>
            <OtpInput value={code} onChange={(v) => { setCode(v); setErr(''); }} />
            {err ? <span className="err" role="alert" style={{ textAlign: 'center' }}>{err}</span> : null}
            <div className="muted" style={{ fontSize: 13, textAlign: 'center' }}>{left > 0 ? `Code expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Code expired.'}</div>
            <button type="submit" className="btn primary" disabled={busy || code.length < 6}>{busy ? spinner : 'Verify'}</button>
            {!/authenticator/i.test(challenge.method || '') ? <button type="button" className="text-btn" style={{ alignSelf: 'center', fontSize: 14 }} disabled={busy} onClick={() => submitPassword()}>Send a new code</button> : null}
          </form>
        ) : null}

        {step === 'guest' ? (
          <div className="card a"><div className="ct">Set a password first</div><div className="cb">You were invited as a guest. Open the invitation link from your email to set your password, then sign in here.</div></div>
        ) : null}
      </div>

      <Sheet open={!!socialInfo} onClose={() => setSocialInfo(null)} title={socialInfo ? `Sign in with ${providerName(socialInfo)}` : ''}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--body)' }}>{socialInfo ? `${providerName(socialInfo)} sign-in works in the official EZOFIS Android build once ${socialInfo === 'google' ? 'Google sign-in' : 'Microsoft sign-in (MSAL)'} is configured. For now, sign in with your email and password.` : ''}</p>
        <button type="button" className="btn primary" onClick={() => setSocialInfo(null)}>Use email and password</button>
      </Sheet>
    </div>
  );
}

const PIN_KEY = 'ezofis.pin';
const hashPin = (pin, salt) => { let h = 2166136261; for (const c of salt + ':' + pin) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
const readPin = () => { try { return localStorage.getItem(PIN_KEY); } catch (e) { return null; } };
const writePin = (v) => { try { v ? localStorage.setItem(PIN_KEY, v) : localStorage.removeItem(PIN_KEY); } catch (e) { /* storage unavailable */ } };

export function Passcode() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const session = loadSession();
  const demo = params.get('demo') === '1' || !session;
  const stored = readPin();
  const mode = demo ? 'demo' : params.get('setup') === '1' || !stored ? 'create' : 'unlock';
  const [code, setCode] = useState('');
  const [first, setFirst] = useState(null);
  const [shake, setShake] = useState(false);
  const [msg, setMsg] = useState('');
  const salt = session ? session.userId || session.email : 'demo';
  const fail = (m) => { setMsg(m); setShake(true); setTimeout(() => { setShake(false); setCode(''); }, 400); };
  const press = (d) => { setMsg(''); setCode((c) => (c.length < 4 ? c + d : c)); };
  const verify = () => {
    if (code.length < 4) { fail('Enter all 4 digits.'); return; }
    if (mode === 'demo') { nav('/app/home', { replace: true }); return; }
    if (mode === 'create') {
      if (!first) { setFirst(code); setCode(''); return; }
      if (first !== code) { setFirst(null); fail("Passcodes didn't match. Start again."); return; }
      writePin(hashPin(code, salt)); nav('/app/home', { replace: true }); return;
    }
    if (hashPin(code, salt) === stored) nav('/app/home', { replace: true }); else fail('Wrong passcode. Try again.');
  };
  useEffect(() => { if (code.length === 4) { const t = setTimeout(verify, 250); return () => clearTimeout(t); } return undefined; }, [code]); // eslint-disable-line
  const forgot = () => { clearSession(); writePin(null); nav('/login', { replace: true }); };
  const title = mode === 'create' ? (first ? 'Confirm passcode' : 'Create a passcode') : 'Enter passcode';
  const sub = mode === 'create' ? (first ? 'Enter the same 4 digits again.' : 'Choose a 4-digit passcode to unlock EZOFIS on this device.') : mode === 'demo' ? 'Sample-data mode: enter any 4 digits.' : 'Unlock EZOFIS with your 4-digit passcode.';
  return (
    <div className="screen" style={{ minHeight: '100dvh' }}>
      <TopBar title={title} back={mode === 'unlock' ? false : '/login'} right={<span />} />
      <div className="content" style={{ gap: 20, maxWidth: 480 }}>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>{sub}</p>
        <div className="id-card">
          <span style={{ fontWeight: 600, fontSize: 15 }}><Icon name="mail" size={20} color="#8300E6" />{session ? session.email : USER.email}</span>
          <span className="muted"><Icon name="building" size={20} color="#8300E6" />{session ? session.tenantName : 'Sample organization'}</span>
        </div>
        <div className={'pin-row' + (shake ? ' shake' : '')} aria-label={`${code.length} of 4 digits entered`}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={'pin' + (i === code.length ? ' on' : '')}>{i < code.length ? <i /> : null}</span>)}
        </div>
        {msg ? <span className="err" role="alert" style={{ textAlign: 'center' }}>{msg}</span> : null}
        {mode === 'unlock' ? <button type="button" className="text-btn" style={{ alignSelf: 'center', fontSize: 15 }} onClick={forgot}>Forgot passcode? Sign in again</button> : null}
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} type="button" onClick={() => press(d)}>{d}</button>)}
          <span />
          <button type="button" onClick={() => press('0')}>0</button>
          <button type="button" aria-label="Delete" onClick={() => setCode((c) => c.slice(0, -1))}><Icon name="back" size={22} /></button>
        </div>
        <button type="button" className="btn primary" onClick={verify}>{mode === 'create' && !first ? 'Next' : 'Verify'}</button>
      </div>
    </div>
  );
}

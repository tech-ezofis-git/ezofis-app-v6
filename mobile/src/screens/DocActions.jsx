// Document actions on the MOBILE_APP_REPOSITORY_API (Oct 2026):
//  • ShareSheet           POST .../items/{itemId}/share (by email, can view / can edit), DELETE /repositories/share/{shareId}
//  • SignRequestSheet     POST .../items/{itemId}/sign-requests (PDF only; one by one or all at once)
//  • SignStatus           GET  .../items/{itemId}/sign-requests, POST /sign-requests/{id}/cancel
//  • ToSign / SignDoc     GET /sign-requests/pending-for-me, GET .../{id}/file, POST .../{id}/sign | /decline
//  • SmartUpload          intelligent upload: document-intelligent-agent/upload → uploadForOcr → uploadWithOcr → index/{fileId}
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { FileThumb, Icon, Sheet, Sparkle, TopBar } from '../ui.jsx';
import { SignaturePad } from '../controls.jsx';
import { apiErrorMessage } from '../api.js';
import { ago, fmtDate, isTechnicalLabel, prettyName } from '../wf.js';
import FileViewer, { loadPdfjs } from './FileViewer.jsx';
import { Skeleton, ErrorNote } from './LiveWorkflow.jsx';
import { docApi, repoApi, SIGNER, SIGN_STATUS, extOf, sizeOf, trackDraftRepo } from '../repo.js';
import MetaForm, { toSchema, valuesFromOcr, toMetadata, toStageFields, validate } from './MetaForm.jsx';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const Tone = ({ s, map }) => { const v = map[s] || { label: s || '—', tone: 'neu' }; return <span className={'pill solid ' + v.tone}>{v.label}</span>; };

// ---------- 3. share by email ----------
export function ShareSheet({ open, onClose, repoId, item }) {
  const { showToast } = useStore();
  const [emails, setEmails] = useState([]);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState([]);
  useEffect(() => { if (open) { setEmails([]); setDraft(''); setMessage(''); setAction(0); setErr(''); } }, [open]);
  const addDraft = () => {
    const parts = draft.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    const bad = parts.filter((x) => !EMAIL.test(x));
    if (bad.length) { setErr(`${bad.join(', ')} ${bad.length > 1 ? "aren't" : "isn't"} a valid email`); return false; }
    setEmails((l) => [...l, ...parts.filter((x) => !l.includes(x.toLowerCase())).map((x) => x.toLowerCase())]); setDraft(''); setErr(''); return true;
  };
  const send = async () => {
    if (draft.trim() && !addDraft()) return;
    const list = [...emails, ...(draft.trim() && EMAIL.test(draft.trim()) ? [draft.trim().toLowerCase()] : [])].filter((x, i, a) => a.indexOf(x) === i);
    if (!list.length) { setErr('Add at least one email'); return; }
    setBusy(true); setErr('');
    const ok = []; const failed = [];
    for (const email of list) {
      try { const r = await docApi.share(repoId, item.id, { email, message, action }); ok.push({ ...r, email: (r && r.recipientEmail) || email }); } catch (e) { failed.push(`${email} (${apiErrorMessage(e, 'the share')})`); }
    }
    setBusy(false);
    setDone((d) => [...ok, ...d]);
    if (failed.length) setErr(`Couldn't share with ${failed.join(', ')}`);
    if (ok.length) { showToast(`Shared with ${ok.length === 1 ? ok[0].email : ok.length + ' people'}`, { tone: 'ok' }); setEmails([]); setDraft(''); }
  };
  const revoke = async (s) => {
    try { await docApi.revokeShare(s.shareId); setDone((d) => d.filter((x) => x.shareId !== s.shareId)); showToast(`Access removed for ${s.email}`); } catch (e) { showToast(apiErrorMessage(e, 'the share'), { tone: 'bad' }); }
  };
  const copy = async (u) => { try { await navigator.clipboard.writeText(u); showToast('Link copied'); } catch (e) { /* clipboard unavailable */ } };
  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title={`Share ${item.fileName || 'document'}`}>
      <div className="field">
        <label htmlFor="sh-email">People inside or outside your company</label>
        <div className="email-box">
          {emails.map((e) => <span key={e} className="email-chip">{e}<button type="button" aria-label={'Remove ' + e} onClick={() => setEmails((l) => l.filter((x) => x !== e))}><Icon name="close" size={12} stroke={2.6} /></button></span>)}
          <input id="sh-email" type="email" inputMode="email" autoComplete="off" placeholder={emails.length ? 'Add another email' : 'name@company.com'} value={draft} onChange={(e) => { setDraft(e.target.value); setErr(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { if (draft.trim()) { e.preventDefault(); addDraft(); } } }} onBlur={() => { if (draft.trim()) addDraft(); }} />
        </div>
      </div>
      <div className="seg" style={{ gridTemplateColumns: '1fr 1fr' }} role="radiogroup" aria-label="Permission">
        <button type="button" role="radio" aria-checked={action === 0} className={action === 0 ? 'on' : ''} onClick={() => setAction(0)}><Icon name="eye" size={16} /> Can view</button>
        <button type="button" role="radio" aria-checked={action === 1} className={action === 1 ? 'on' : ''} onClick={() => setAction(1)}><Icon name="edit" size={16} /> Can edit</button>
      </div>
      <div className="field"><label htmlFor="sh-msg">Message <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><textarea id="sh-msg" className="input" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please review" /></div>
      {err ? <div className="notice bad" role="alert"><Icon name="warn" size={18} /><span className="grow">{err}</span></div> : null}
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>They get an email with a secure link. People outside your company confirm their email with a one-time code.</p>
      <button type="button" className="btn primary" disabled={busy} onClick={send}>{busy ? <><span className="spinner" />Sharing…</> : <><Icon name="share" size={18} />Share</>}</button>
      {done.length ? (
        <div className="share-done">
          <div className="sec-label" style={{ margin: 0 }}>Shared now</div>
          {done.map((s) => (
            <div key={s.shareId || s.email} className="share-row">
              <span className="avatar">{(s.email || '?')[0].toUpperCase()}</span>
              <span className="grow"><b>{s.email}</b><span>{s.permission || (s.action === 1 ? 'Can Edit' : 'Can View')}{s.expiresAtUtc ? ' · until ' + fmtDate(s.expiresAtUtc) : ''}</span></span>
              {s.shareUrl ? <button type="button" className="icon-btn" aria-label={'Copy link for ' + s.email} onClick={() => copy(s.shareUrl)}><Icon name="clip" size={18} /></button> : null}
              {s.shareId ? <button type="button" className="text-btn danger-t" onClick={() => revoke(s)}>Remove</button> : null}
            </div>
          ))}
        </div>
      ) : null}
    </Sheet>
  );
}

// ---------- 4. request signatures ----------
export function SignRequestSheet({ open, onClose, repoId, item, onSent }) {
  const { showToast, me } = useStore();
  const [signers, setSigners] = useState([{ email: '', name: '' }]);
  const [mode, setMode] = useState('sequential');
  const [message, setMessage] = useState('');
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState({});
  useEffect(() => { if (open) { setSigners([{ email: '', name: '' }]); setMode('sequential'); setMessage(''); setDays(14); setErrs({}); } }, [open]);
  const set = (i, k, v) => { setSigners((l) => l.map((s, j) => (j === i ? { ...s, [k]: v } : s))); setErrs((e) => ({ ...e, [i]: '' })); };
  const move = (i, d) => setSigners((l) => { const n = [...l]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); return n; });
  const addMe = () => { if (me && me.email && !signers.some((s) => s.email.toLowerCase() === me.email.toLowerCase())) setSigners((l) => [...l.filter((s) => s.email.trim()), { email: me.email, name: me.displayName || '' }]); };
  const send = async () => {
    const list = signers.map((s) => ({ email: s.email.trim().toLowerCase(), name: s.name.trim() })).filter((s) => s.email);
    const e = {};
    signers.forEach((s, i) => { if (s.email.trim() && !EMAIL.test(s.email.trim())) e[i] = 'Enter a valid email'; });
    if (!list.length) e[0] = 'Add at least one signer';
    list.forEach((s, i) => { if (list.findIndex((x) => x.email === s.email) !== i) e[i] = 'This person is already a signer'; });
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await docApi.requestSign(repoId, item.id, { signingMode: mode, signers: list.map((s, i) => ({ email: s.email, name: s.name || undefined, order: i + 1 })), message: message.trim() || undefined, expiresInDays: days });
      showToast(mode === 'sequential' ? `Sent to ${list[0].email}. Others are emailed in order.` : `Sent to ${list.length} signer${list.length > 1 ? 's' : ''}`, { tone: 'ok' });
      onSent(r); onClose();
    } catch (x) { showToast(x && x.status === 400 ? (x.message && !/^Request failed/.test(x.message) ? x.message : 'Only PDF documents can be sent for signature.') : apiErrorMessage(x, 'the sign request'), { tone: 'bad' }); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title="Request signatures">
      <div className="muted" style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><FileThumb ext="PDF" /><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.fileName}</span></div>
      <div className="seg" style={{ gridTemplateColumns: '1fr 1fr' }} role="radiogroup" aria-label="Signing order">
        <button type="button" role="radio" aria-checked={mode === 'sequential'} className={mode === 'sequential' ? 'on' : ''} onClick={() => setMode('sequential')}>One by one</button>
        <button type="button" role="radio" aria-checked={mode === 'parallel'} className={mode === 'parallel' ? 'on' : ''} onClick={() => setMode('parallel')}>All at once</button>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>{mode === 'sequential' ? 'Each signer is emailed after the one before signs.' : 'Everyone is emailed now and can sign in any order.'}</p>
      <div className="signers">
        {signers.map((s, i) => (
          <div key={i} className="signer-row" data-err={errs[i] ? '1' : undefined}>
            <span className="signer-n">{mode === 'sequential' ? i + 1 : <Icon name="user" size={14} />}</span>
            <div className="grow">
              <input className={'input' + (errs[i] ? ' error' : '')} type="email" inputMode="email" placeholder="Signer email" aria-label={`Signer ${i + 1} email`} value={s.email} onChange={(e) => set(i, 'email', e.target.value)} />
              <input className="input" placeholder="Name (optional)" aria-label={`Signer ${i + 1} name`} value={s.name} onChange={(e) => set(i, 'name', e.target.value)} />
              {errs[i] ? <span className="err" role="alert">{errs[i]}</span> : null}
            </div>
            <div className="signer-tools">
              {mode === 'sequential' && i > 0 ? <button type="button" className="icon-btn" aria-label="Move up" onClick={() => move(i, -1)}><Icon name="chevD" size={16} style={{ transform: 'rotate(180deg)' }} /></button> : null}
              {signers.length > 1 ? <button type="button" className="icon-btn" aria-label={`Remove signer ${i + 1}`} onClick={() => setSigners((l) => l.filter((_, j) => j !== i))}><Icon name="close" size={16} /></button> : null}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="chip" onClick={() => setSigners((l) => [...l, { email: '', name: '' }])}><Icon name="plus" size={14} />Add signer</button>
        {me && me.email ? <button type="button" className="chip" onClick={addMe}><Icon name="user" size={14} />Add me</button> : null}
      </div>
      <div className="field"><label htmlFor="sr-msg">Message <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><textarea id="sr-msg" className="input" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please sign" /></div>
      <div className="field"><label htmlFor="sr-days">Signers have</label><select id="sr-days" className="input strong" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 14, 30].map((d) => <option key={d} value={d}>{d} days to sign</option>)}</select></div>
      <button type="button" className="btn primary" disabled={busy} onClick={send}>{busy ? <><span className="spinner" />Sending…</> : <><Icon name="send" size={18} />Send for signature</>}</button>
    </Sheet>
  );
}

// Sign requests on one document (sender view), shown in the file viewer.
export function SignStatus({ repoId, itemId, tick }) {
  const { showToast } = useStore();
  const [list, setList] = useState(null);
  const [n, setN] = useState(0);
  useEffect(() => { let off = false; docApi.signRequests(repoId, itemId).then((l) => { if (!off) setList(l); }).catch(() => { if (!off) setList([]); }); return () => { off = true; }; }, [repoId, itemId, tick, n]);
  if (!list || !list.length) return null;
  const cancel = async (r) => { try { await docApi.cancelSign(r.signRequestId); showToast('Sign request cancelled'); setN((x) => x + 1); } catch (e) { showToast(apiErrorMessage(e, 'the sign request'), { tone: 'bad' }); } };
  return (
    <div className="sign-status">
      <div className="fv-h" style={{ marginTop: 8 }}><span>Signatures</span></div>
      {list.map((r) => (
        <div key={r.signRequestId} className="sr-card">
          <div className="row-between" style={{ alignItems: 'center' }}><span className="muted" style={{ fontSize: 12 }}>{r.signingMode === 'parallel' ? 'All at once' : 'One by one'} · sent {ago(r.createdAtUtc)}</span><Tone s={r.status} map={SIGN_STATUS} /></div>
          {(r.signers || []).slice().sort((a, b) => a.order - b.order).map((s) => (
            <div key={s.signerId || s.email} className="sr-signer"><span className="signer-n small">{s.order}</span><span className="grow">{s.name || s.email}{s.name ? <small> {s.email}</small> : null}</span>{s.signedAtUtc ? <span className="muted" style={{ fontSize: 11 }}>{fmtDate(s.signedAtUtc)}</span> : null}<Tone s={s.status} map={SIGNER} /></div>
          ))}
          {r.status === 'InProgress' ? <button type="button" className="text-btn danger-t" style={{ alignSelf: 'flex-start', height: 30 }} onClick={() => cancel(r)}>Cancel request</button> : null}
        </div>
      ))}
    </div>
  );
}

// ---------- 5. documents to sign ----------
export function usePendingSigns(tick) {
  const { live, liveTick } = useStore();
  const [list, setList] = useState(null);
  useEffect(() => { if (!live) return undefined; let off = false; docApi.pendingForMe().then((l) => { if (!off) setList(l); }).catch(() => { if (!off) setList([]); }); return () => { off = true; }; }, [live, liveTick, tick]);
  return list;
}

export function ToSignCard({ list, onOpen }) {
  const open = (list || []).filter((r) => r.status === 'InProgress' || !r.status);
  if (!open.length) return null;
  const ready = open.filter((r) => r.signerStatus !== 'Waiting').length;
  return (
    <button type="button" className="sign-banner" onClick={onOpen}>
      <span className="up-ic"><Icon name="edit" size={20} /></span>
      <span className="grow"><b>{ready ? `${ready} document${ready > 1 ? 's' : ''} to sign` : `${open.length} waiting for others to sign first`}</b><span>{open[0].fileName}{open[0].senderName ? ' · from ' + open[0].senderName : ''}</span></span>
      <Icon name="chevR" size={18} />
    </button>
  );
}

export function ToSign() {
  const nav = useNavigate();
  const [tick, setTick] = useState(0);
  const list = usePendingSigns(tick);
  const open = (list || []).filter((r) => r.status === 'InProgress' || !r.status);
  return (
    <div className="screen">
      <TopBar title="To sign" sub={list ? `${open.length} document${open.length === 1 ? '' : 's'}` : ''} back right={<button type="button" className="icon-btn" aria-label="Refresh" onClick={() => setTick((x) => x + 1)}><Icon name="refresh" size={22} /></button>} />
      <div className="content">
        {list === null ? <Skeleton n={3} h={76} /> : null}
        <div className="files-list">
          {open.map((r) => {
            const waiting = r.signerStatus === 'Waiting';
            return (
              <button key={r.signRequestId} type="button" className="file-row" onClick={() => nav('/app/sign/' + r.signRequestId)} aria-label={'Sign ' + r.fileName}>
                <FileThumb ext={extOf(r.fileName)} />
                <span className="grow"><span className="fr-n">{r.fileName}</span><span className="fr-s">From {r.senderName || r.senderEmail}{r.message ? ' · “' + r.message + '”' : ''}</span><span className={'fr-m' + (waiting ? '' : ' due')}>{waiting ? 'Waiting for an earlier signer' : 'Due ' + fmtDate(r.expiresAtUtc)}</span></span>
                <span className={'pill solid ' + (waiting ? 'neu' : 'p')}>{waiting ? 'Waiting' : 'Sign'}</span>
              </button>
            );
          })}
        </div>
        {list && !open.length ? <div className="empty"><Icon name="checkCircle" size={40} color="#CFC8DC" />Nothing waiting for your signature.</div> : null}
      </div>
    </div>
  );
}

// Draw a signature (transparent PNG).
// Render the PDF; tapping a page places the signature there (stored in PDF points from the page's top-left).
function SignPdf({ blob, sig, place, onPlace }) {
  const box = useRef(null);
  const [pages, setPages] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let off = false; let doc = null;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
        const width = Math.min((box.current && box.current.clientWidth) || 360, 900);
        const out = [];
        for (let i = 1; i <= doc.numPages && !off; i += 1) {
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const vp = page.getViewport({ scale: (width / base.width) * dpr });
          const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
          await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
          out.push({ n: i, src: cv.toDataURL('image/png'), ptW: base.width, ptH: base.height });
        }
        if (!off) setPages(out);
      } catch (e) { if (!off) setErr("This PDF couldn't be displayed."); }
    })();
    return () => { off = true; if (doc) doc.destroy(); };
  }, [blob]);
  const tap = (p, e) => {
    if (!sig) return;
    const r = e.currentTarget.getBoundingClientRect();
    const k = p.ptW / r.width; // points per rendered pixel (same factor for x, y, width, height)
    const w = Math.min(160, p.ptW * 0.45); const h = w / sig.ratio;
    const x = Math.max(0, Math.min(p.ptW - w, (e.clientX - r.left) * k - w / 2));
    const y = Math.max(0, Math.min(p.ptH - h, (e.clientY - r.top) * k - h / 2));
    onPlace({ pageNumber: p.n, x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h), ptW: p.ptW, ptH: p.ptH });
  };
  if (err) return <div className="notice bad">{err}</div>;
  return (
    <div ref={box} className="sign-pages">
      {!pages ? <div className="muted" style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 30 }}><span className="spinner" />Opening PDF…</div> : null}
      {(pages || []).map((p) => (
        <div key={p.n} className={'sign-page' + (sig ? ' armed' : '')} onClick={(e) => tap(p, e)} role={sig ? 'button' : undefined} aria-label={sig ? `Place signature on page ${p.n}` : `Page ${p.n}`}>
          <img src={p.src} alt={`Page ${p.n}`} draggable={false} />
          {place && place.pageNumber === p.n && sig ? <img className="sig-stamp" src={sig.dataUrl} alt="Your signature" style={{ left: (place.x / p.ptW) * 100 + '%', top: (place.y / p.ptH) * 100 + '%', width: (place.width / p.ptW) * 100 + '%', height: (place.height / p.ptH) * 100 + '%' }} /> : null}
          <span className="sign-pn">Page {p.n}</span>
        </div>
      ))}
    </div>
  );
}

let savedSig = null; // reuse the last drawn signature while the app is open
export function SignDoc() {
  const { id } = useParams();
  const nav = useNavigate();
  const { showToast } = useStore();
  const list = usePendingSigns(0);
  const req = (list || []).find((r) => r.signRequestId === id);
  const [blob, setBlob] = useState(null);
  const [err, setErr] = useState('');
  const [sig, setSig] = useState(savedSig);
  const [padOpen, setPadOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const [busy, setBusy] = useState('');
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');
  useEffect(() => { let off = false; docApi.signFile(id).then((b) => { if (!off) setBlob(b); }).catch((e) => { if (!off) setErr(apiErrorMessage(e, 'this document')); }); return () => { off = true; }; }, [id]);
  const waiting = req && req.signerStatus === 'Waiting';
  const submit = async () => {
    if (!place || !sig) return;
    setBusy('sign');
    try {
      const r = await docApi.sign(id, { pageNumber: place.pageNumber, x: place.x, y: place.y, width: place.width, height: place.height, signatureImageBase64: sig.dataUrl, signedAtClientUtc: new Date().toISOString() });
      showToast(r && r.status === 'Completed' ? 'Signed. Everyone has signed, so the document is complete.' : 'Signed. The next signer has been notified.', { tone: 'ok' });
      nav('/app/sign', { replace: true });
    } catch (e) { showToast(e && e.status === 400 ? (e.message && !/^Request failed/.test(e.message) ? e.message : "This document can't be signed right now.") : apiErrorMessage(e, 'your signature'), { tone: 'bad' }); } finally { setBusy(''); }
  };
  const decline = async () => {
    setBusy('decline');
    try { await docApi.decline(id, reason.trim()); showToast('You declined to sign. The sender has been told.'); nav('/app/sign', { replace: true }); } catch (e) { showToast(apiErrorMessage(e, 'the decline'), { tone: 'bad' }); } finally { setBusy(''); }
  };
  return (
    <div className="screen">
      <TopBar title={(req && req.fileName) || 'Sign document'} sub={req ? `From ${req.senderName || req.senderEmail}` : ''} back="/app/sign" right={<span />} />
      <div className="content" style={{ gap: 12 }}>
        {req && req.message ? <div className="card p"><div className="cb" style={{ marginTop: 0 }}>“{req.message}”</div></div> : null}
        {waiting ? <div className="notice info"><Icon name="clock" size={18} /><span className="grow">An earlier signer hasn't signed yet. You'll get an email when it's your turn.</span></div> : null}
        {!waiting ? (
          <div className="sign-steps">
            <span className={sig ? 'done' : 'on'}><b>1</b>Draw your signature</span>
            <span className={place ? 'done' : sig ? 'on' : ''}><b>2</b>Tap where it goes</span>
            <span className={place ? 'on' : ''}><b>3</b>Sign</span>
          </div>
        ) : null}
        {!waiting && sig ? <div className="sig-preview"><img src={sig.dataUrl} alt="Your signature" /><button type="button" className="text-btn" onClick={() => setPadOpen(true)}>Redraw</button></div> : null}
        {err ? <ErrorNote text={err} /> : null}
        {blob ? <SignPdf blob={blob} sig={waiting ? null : sig} place={place} onPlace={setPlace} /> : !err ? <Skeleton n={1} h={420} /> : null}
      </div>
      {!waiting ? (
        <div className="bottombar" style={{ gridTemplateColumns: '1fr 2fr' }}>
          <button type="button" className="btn neutral" disabled={!!busy} onClick={() => setDeclineOpen(true)}>Decline</button>
          {!sig ? <button type="button" className="btn primary" onClick={() => setPadOpen(true)}><Icon name="edit" size={18} />Draw signature</button>
            : <button type="button" className="btn primary" disabled={!place || !!busy} onClick={submit}>{busy === 'sign' ? <><span className="spinner" />Signing…</> : place ? `Sign on page ${place.pageNumber}` : 'Tap the page to place it'}</button>}
        </div>
      ) : null}
      <Sheet open={padOpen} onClose={() => setPadOpen(false)} title="Your signature">
        {padOpen ? <SignaturePad onCancel={() => setPadOpen(false)} onDone={(s) => { savedSig = s; setSig(s); setPadOpen(false); setPlace(null); }} /> : null}
      </Sheet>
      <Sheet open={declineOpen} onClose={() => !busy && setDeclineOpen(false)} title="Decline to sign?">
        <div className="field"><label htmlFor="dc-r">Reason <span className="muted" style={{ fontWeight: 400 }}>(shared with the sender)</span></label><textarea id="dc-r" className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The amount is wrong" /></div>
        <div className="grid2"><button type="button" className="btn outline-grey" disabled={!!busy} onClick={() => setDeclineOpen(false)}>Cancel</button><button type="button" className="btn danger" disabled={!!busy} onClick={decline}>{busy === 'decline' ? <><span className="spinner" />Declining…</> : 'Decline'}</button></div>
      </Sheet>
    </div>
  );
}

// ---------- 1. intelligent upload (one file at a time: AI picks the folder, OCR fills the details, user checks, archive) ----------
const toDate = (v) => { const s = String(v || ''); const m = /^(\d{4}-\d{2}-\d{2})/.exec(s); if (m) return m[1]; const d = new Date(s); return s && !isNaN(d) ? d.toISOString().slice(0, 10) : ''; };
export function SmartUpload({ files, repos, onFinished, onCancel }) {
  const { showToast, session } = useStore();
  const [errs, setErrs] = useState({});
  const [i, setI] = useState(0);
  const file = files[i];
  const [step, setStep] = useState('classify'); // classify → choose → ocr → review → saving → done
  const [ai, setAi] = useState(null);
  const [repoId, setRepoId] = useState('');
  const [ocr, setOcr] = useState(null);
  const [vals, setVals] = useState({});
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [pick, setPick] = useState(false);
  const [done, setDone] = useState([]);
  const repo = repos.find((r) => r.id === repoId);

  const classify = async () => {
    setStep('classify'); setErr(''); setAi(null); setOcr(null); setResult(null); setRepoId('');
    try {
      const r = await docApi.classify(file);
      setAi(r);
      const known = r.suggested && repos.find((x) => x.id === r.suggested.id || (r.suggested.name && x.name.toLowerCase() === String(r.suggested.name).toLowerCase()));
      setRepoId(known ? known.id : '');
      setStep('choose');
    } catch (e) { setErr(e && (e.status === 502 || e.status === 504) ? "The AI couldn't place this file right now. Choose a folder yourself." : apiErrorMessage(e, 'this file')); setStep('choose'); }
  };
  useEffect(() => { if (file) classify(); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  // OCR (EZOFIS uploadForOcr) → the file is staged right away as a draft (uploadWithOcr) so it survives leaving the
  // screen (Upload › Drafts); the reviewed values are saved to the draft and it is archived on Save.
  const readFields = async () => {
    setStep('ocr'); setErr(''); setErrs({});
    try {
      const sc = toSchema(await repoApi.detail(repoId));
      let r = { ocrFieldList: [] };
      try { r = await docApi.ocr(file, repoId); } catch (e) { setErr(e && (e.status === 502 || e.status === 504) ? "AI couldn't read the details. Fill them in yourself." : apiErrorMessage(e, 'the document details')); }
      const o = valuesFromOcr(sc, r.ocrFieldList || []);
      const full = [...sc, ...o.extra];
      const staged = await docApi.stage(file, repoId, toMetadata(full, o.values), r);
      trackDraftRepo(session && session.tenantId, repoId);
      setOcr({ ...r, ...o, schema: full, fileId: staged && staged.fileId });
      setVals(o.values);
      setStep('review');
    } catch (e) { setErr(e && e.status === 403 ? `You don't have permission to upload to ${repo ? repo.name : 'this folder'}.` : apiErrorMessage(e, 'the upload')); setStep('choose'); }
  };
  const save = async () => {
    const e = validate(ocr.schema, vals);
    setErrs(e);
    if (Object.keys(e).length) { setErr(`Fill in ${Object.keys(e).length} required detail${Object.keys(e).length > 1 ? 's' : ''} first.`); return; }
    setStep('saving'); setErr('');
    try {
      const fields = toStageFields(ocr.schema, vals);
      await repoApi.saveStaged(ocr.fileId, repoId, fields);
      const arch = await repoApi.exportStaged(ocr.fileId, repoId, fields);
      setResult({ itemId: arch && arch.itemId, fileName: (arch && arch.fileName) || file.name });
      setDone((d) => [...d, { name: file.name, repo: repo && repo.name }]);
      setStep('done');
    } catch (x) { setErr(x && x.status === 403 ? `You don't have permission to file documents in ${repo ? repo.name : 'this folder'}. It's kept in your drafts.` : `${apiErrorMessage(x, 'the upload')} It's kept in your drafts.`); setStep('review'); }
  };
  const next = () => { if (i + 1 < files.length) setI(i + 1); else { if (done.length) showToast(`${done.length} file${done.length === 1 ? '' : 's'} filed with AI`, { tone: 'ok' }); onFinished(done); } };

  const req = ocr ? ocr.schema.filter((f) => f.required && !f.readOnly).length : 0;
  return (
    <section className="smart" aria-live="polite">
      <div className="smart-head"><span className="smart-ic"><Sparkle size={18} color="#fff" /></span><span className="grow"><b>Intelligent upload</b><span>{files.length > 1 ? `File ${i + 1} of ${files.length}` : 'AI picks the folder and fills the details'}</span></span><button type="button" className="text-btn" onClick={onCancel}>Stop</button></div>
      <div className="file-row static"><FileThumb ext={extOf(file.name)} /><span className="grow"><span className="fr-n">{file.name}</span><span className="fr-m">{sizeOf(file.size)}</span></span></div>
      <div className="smart-steps">{[['classify', 'Folder'], ['ocr', 'Details'], ['saving', 'Save']].map(([k, l], n) => { const order = { classify: 0, choose: 0, ocr: 1, review: 1, saving: 2, done: 3 }; const at = order[step]; return <span key={k} className={at > n ? 'done' : at === n ? 'on' : ''}><b>{at > n ? <Icon name="check" size={12} stroke={3} /> : n + 1}</b>{l}</span>; })}</div>
      {err ? <div className="notice warn" role="alert"><Icon name="warn" size={18} /><span className="grow">{err}</span></div> : null}

      {step === 'classify' ? <div className="smart-wait"><span className="spinner" /><span><b>Finding the right folder…</b><span>AI is reading the document. This can take up to a minute.</span></span></div> : null}
      {step === 'choose' ? (
        <>
          {ai && ai.suggested ? (
            <div className="smart-pick">
              <span className="sec-label" style={{ margin: 0 }}>AI suggests</span>
              <button type="button" className={'repo-opt' + (repoId === (repos.find((x) => x.id === ai.suggested.id) || {}).id ? ' on' : '')} onClick={() => { const k = repos.find((x) => x.id === ai.suggested.id || x.name === ai.suggested.name); if (k) setRepoId(k.id); }}>
                <Icon name="folder" size={20} /><span className="grow"><b>{ai.suggested.name || 'Suggested folder'}</b>{ai.rationale ? <span>{ai.rationale}</span> : null}</span>{ai.suggested.score != null ? <span className="pill solid t">{ai.suggested.score}%</span> : null}
              </button>
              {ai.candidates.filter((c) => c.id !== ai.suggested.id).slice(0, 3).map((c) => { const k = repos.find((x) => x.id === c.id); return k ? <button key={c.id} type="button" className={'repo-opt' + (repoId === k.id ? ' on' : '')} onClick={() => setRepoId(k.id)}><Icon name="folder" size={20} /><span className="grow"><b>{k.name}</b></span>{c.score != null ? <span className="pill solid neu">{c.score}%</span> : null}</button> : null; })}
            </div>
          ) : <div className="muted" style={{ fontSize: 13 }}>{err ? '' : "AI couldn't suggest a folder for this file."} Choose where it goes.</div>}
          <button type="button" className="input strong" style={{ display: 'flex', alignItems: 'center', textAlign: 'left', gap: 8 }} onClick={() => setPick(true)}><Icon name="folder" size={18} color="#643094" /><span style={{ flex: 1 }}>{ai && ai.suggested ? 'Choose another folder' : repo ? repo.name : 'Choose a folder'}</span><Icon name="chevD" size={16} stroke={2.4} /></button>
          <button type="button" className="btn primary" disabled={!repoId} onClick={readFields}>Continue with {repo ? repo.name : 'this folder'}</button>
        </>
      ) : null}
      {step === 'ocr' ? <div className="smart-wait"><span className="spinner" /><span><b>Reading the details…</b><span>EZOFIS OCR is extracting the {repo ? repo.name : 'folder'} fields, then the file is saved as a draft.</span></span></div> : null}
      {(step === 'review' || step === 'saving') && ocr ? (
        <>
          <div className="rv-ai"><Sparkle size={18} color="#fff" /><span className="grow"><b>{ocr.found.size} of {ocr.schema.length} details found</b><span>Saved as a draft. Check the details, then save to {repo && repo.name}.</span></span></div>
          {req ? <p className="muted" style={{ margin: 0, fontSize: 12 }}><span className="req">*</span> {req} required detail{req > 1 ? 's' : ''}; the rest are optional.</p> : null}
          <MetaForm repoId={repoId} schema={ocr.schema} values={vals} base={ocr.values} found={ocr.found} errors={errs} disabled={step === 'saving'} idPrefix="sm" onChange={(v, name) => { setVals(v); setErrs((x) => ({ ...x, [name]: '' })); }} />
          <div className="grid2"><button type="button" className="btn outline-grey" disabled={step === 'saving'} onClick={next}>Finish later</button><button type="button" className="btn primary" disabled={step === 'saving'} onClick={save}>{step === 'saving' ? <><span className="spinner" />Saving…</> : 'Save to folder'}</button></div>
        </>
      ) : null}
      {step === 'done' && result ? (
        <>
          <div className="smart-done"><Icon name="checkCircle" size={28} /><span><b>Saved to {repo && repo.name}</b><span>{result.fileName} is filed with its details.</span></span></div>
          <div className="grid2">{result.itemId ? <button type="button" className="btn neutral" onClick={() => setViewing({ fileName: result.fileName, repositoryId: repoId, itemId: result.itemId })}><Icon name="eye" size={18} />Open</button> : <span />}<button type="button" className="btn primary" onClick={next}>{i + 1 < files.length ? 'Next file' : 'Done'}</button></div>
        </>
      ) : null}
      <Sheet open={pick} onClose={() => setPick(false)} title="Save to">
        <div className="sheet-list">{repos.map((r) => <button key={r.id} type="button" className={'opt' + (r.id === repoId ? ' on' : '')} onClick={() => { setRepoId(r.id); setPick(false); }}><Icon name="folder" size={20} /><span style={{ flex: 1 }}>{r.name}</span></button>)}</div>
      </Sheet>
      {viewing ? <FileViewer file={viewing} onClose={() => setViewing(null)} /> : null}
    </section>
  );
}

// Shared with me (GET /repositories/shared-with-me); opened through the share token.
export function SharedWithMe({ list, onOpen }) {
  if (!list || !list.length) return null;
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="sec-label">Shared with me · {list.length}</div>
      <div className="files-list">
        {list.slice(0, 5).map((s) => (
          <button key={s.shareId} type="button" className="file-row" onClick={() => onOpen(s)} aria-label={'Open ' + s.fileName}>
            <FileThumb ext={extOf(s.fileName)} />
            <span className="grow"><span className="fr-n">{s.fileName || 'Shared document'}</span><span className="fr-s">{[s.permission || 'Can View', s.sourceOrganizationName, s.sharedByName || (s.sharedByEmail && prettyName(s.sharedByEmail))].filter(Boolean).join(' · ')}</span><span className="fr-m">Shared {ago(s.sharedAtUtc)}{s.expiresAtUtc ? ' · until ' + fmtDate(s.expiresAtUtc) : ''}</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}

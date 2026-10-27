// In-app viewer for workflow files: GET /repositories/{repositoryId}/items/{itemId}/file?disposition=inline (§5.7).
// PDFs render with pdf.js, images inline, e-mails (.eml / message/rfc822) as a readable message with their own
// attachments, text files as text. Works inside the Android/iOS WebView (no external viewer needed).
import React, { useEffect, useRef, useState } from 'react';
import { Icon, FileThumb, Sheet, Sparkle } from '../ui.jsx';
import { useStore } from '../store.jsx';
import { wfApi, isTechnicalKey, toGuid } from '../wf.js';
import { docApi, parseSummary } from '../repo.js';
import { apiErrorMessage } from '../api.js';
import { DocxView, SheetView, PptxView, parseMsg } from './OfficeViewers.jsx';

export const kindOf = (name, type) => {
  const ext = String(name || '').split('.').pop().toLowerCase();
  const t = String(type || '').toLowerCase();
  if (t.includes('rfc822') || ext === 'eml') return 'email';
  if (ext === 'msg' || t.includes('vnd.ms-outlook')) return 'msg';
  if (ext === 'docx' || t.includes('wordprocessingml')) return 'docx';
  if (['xlsx', 'xlsm', 'xls', 'csv', 'ods'].includes(ext) || t.includes('spreadsheetml') || t.includes('ms-excel') || t === 'text/csv') return 'sheet';
  if (ext === 'pptx' || t.includes('presentationml')) return 'pptx';
  if (['doc', 'ppt', 'pps', 'rtf'].includes(ext) || t === 'application/msword' || t.includes('ms-powerpoint')) return 'legacy';
  if (t.includes('pdf') || ext === 'pdf') return 'pdf';
  if (t.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (t.startsWith('text/') || ['txt', 'csv', 'json', 'xml', 'log', 'md'].includes(ext)) return 'text';
  return 'other';
};
const kb = (n) => (n ? (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : '');
const extOf = (n) => (String(n || '').split('.').pop() || 'FILE').toUpperCase().slice(0, 4);

let pdfjsPromise = null;
export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([import('pdfjs-dist/legacy/build/pdf.js'), import('pdfjs-dist/legacy/build/pdf.worker.js')]).then(([lib, worker]) => {
      globalThis.pdfjsWorker = worker; // run pdf.js on the main thread (no separate worker file to ship)
      return lib.default && lib.default.getDocument ? lib.default : lib;
    });
  }
  return pdfjsPromise;
}

function Spin({ text }) {
  return <div className="muted" style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 30 }}><span className="spinner" />{text}</div>;
}

function PdfPages({ blob }) {
  const box = useRef(null);
  const [state, setState] = useState({ pages: 0, error: '' });
  useEffect(() => {
    let off = false; let doc = null;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const data = new Uint8Array(await blob.arrayBuffer());
        doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
        if (off) return;
        setState({ pages: doc.numPages, error: '' });
        const width = Math.min((box.current && box.current.clientWidth) || 360, 900);
        for (let i = 1; i <= doc.numPages && !off; i += 1) {
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const vp = page.getViewport({ scale: (width / base.width) * dpr });
          const c = document.createElement('canvas');
          c.width = vp.width; c.height = vp.height; c.style.width = '100%'; c.className = 'pdf-page'; c.setAttribute('aria-label', 'Page ' + i);
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          if (!off && box.current) box.current.appendChild(c);
        }
      } catch (e) { if (!off) setState({ pages: 0, error: "This PDF couldn't be displayed." }); }
    })();
    const el = box.current;
    return () => { off = true; if (doc) doc.destroy(); if (el) el.innerHTML = ''; };
  }, [blob]);
  return (
    <>
      {state.error ? <div className="notice bad">{state.error}</div> : null}
      {!state.pages && !state.error ? <Spin text="Opening PDF…" /> : null}
      <div ref={box} className="pdf-pages" />
    </>
  );
}

// HTML e-mail body in a sandboxed frame: no scripts run; inline (cid:) images are swapped for local copies.
function EmailHtml({ html, cidMap }) {
  const ref = useRef(null);
  const [h, setH] = useState(200);
  let doc = String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '');
  Object.entries(cidMap).forEach(([cid, url]) => { doc = doc.split('cid:' + cid).join(url); });
  const head = '<meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;padding:0;font-family:Poppins,Arial,sans-serif;font-size:14px;line-height:1.5;color:#14101F;word-wrap:break-word;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%!important}pre{white-space:pre-wrap}</style>';
  const srcDoc = /<head[^>]*>/i.test(doc) ? doc.replace(/<head[^>]*>/i, (m) => m + head) : head + doc;
  const fit = () => { try { const d = ref.current.contentDocument; setH(Math.max(120, d.documentElement.scrollHeight, d.body.scrollHeight) + 8); } catch (e) { setH(600); } };
  return <iframe ref={ref} title="Email message" className="mail-frame" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" srcDoc={srcDoc} style={{ height: h }} onLoad={() => { fit(); setTimeout(fit, 400); setTimeout(fit, 1500); }} />;
}

const addr = (a) => (a ? (a.name && a.address ? `${a.name} <${a.address}>` : a.address || a.name || '') : '');
const addrs = (l) => (l || []).flatMap((a) => (a.group ? a.group : [a])).map(addr).filter(Boolean).join(', ');

function EmailView({ blob, onOpenChild, outlook }) {
  const [mail, setMail] = useState(null);
  const [err, setErr] = useState('');
  const [cidMap, setCidMap] = useState({});
  useEffect(() => {
    let off = false; const urls = [];
    (async () => {
      try {
        let m;
        if (outlook) m = await parseMsg(blob);
        else { const { default: PostalMime } = await import('postal-mime'); m = await PostalMime.parse(await blob.arrayBuffer()); }
        if (off) return;
        const map = {};
        (m.attachments || []).forEach((a) => {
          if (a.contentId) { const u = URL.createObjectURL(new Blob([a.content], { type: a.mimeType })); urls.push(u); map[a.contentId.replace(/^<|>$/g, '')] = u; }
        });
        setCidMap(map); setMail(m);
      } catch (e) { if (!off) setErr("This email couldn't be read. Save a copy to open it in your mail app."); }
    })();
    return () => { off = true; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [blob, outlook]);
  if (err) return <div className="notice bad">{err}</div>;
  if (!mail) return <Spin text="Opening email…" />;
  const files = (mail.attachments || []).filter((a) => !(a.contentId && a.disposition === 'inline' && /^image\//.test(a.mimeType)));
  const date = mail.date ? new Date(mail.date) : null;
  return (
    <div className="mail">
      <div className="mail-head">
        <div className="mail-subj">{mail.subject || '(no subject)'}</div>
        <div className="mail-from"><span className="avatar" aria-hidden="true">{String((mail.from && (mail.from.name || mail.from.address)) || '?').trim()[0].toUpperCase()}</span>
          <div style={{ minWidth: 0 }}>
            <div className="mail-name">{(mail.from && (mail.from.name || mail.from.address)) || 'Unknown sender'}</div>
            {mail.from && mail.from.name && mail.from.address ? <div className="mail-meta">{mail.from.address}</div> : null}
          </div>
        </div>
        <dl className="mail-dl">
          {mail.to && mail.to.length ? <><dt>To</dt><dd>{addrs(mail.to)}</dd></> : null}
          {mail.cc && mail.cc.length ? <><dt>Cc</dt><dd>{addrs(mail.cc)}</dd></> : null}
          {date && !isNaN(date) ? <><dt>Date</dt><dd>{date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></> : null}
        </dl>
      </div>
      {files.length ? (
        <div className="mail-atts">
          <div className="sec-label" style={{ margin: 0 }}>Attachments · {files.length}</div>
          {files.map((a, i) => (
            <button key={i} type="button" className="card t list-row" style={{ textAlign: 'left' }} onClick={() => onOpenChild({ fileName: a.filename || `attachment-${i + 1}`, contentType: a.mimeType, fileSize: a.content && a.content.byteLength, blob: new Blob([a.content], { type: a.mimeType }) })}>
              <FileThumb ext={extOf(a.filename)} />
              <span style={{ flex: 1, minWidth: 0 }}><span className="ct" style={{ display: 'block', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename || `Attachment ${i + 1}`}</span><span className="cb" style={{ display: 'block', fontSize: 12 }}>{[a.mimeType, kb(a.content && a.content.byteLength)].filter(Boolean).join(' · ')}</span></span>
              <span className="open-chip"><Icon name="eye" size={16} />Open</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="mail-body">
        {mail.html ? <EmailHtml html={mail.html} cidMap={cidMap} /> : <pre className="mail-text">{mail.text || '(This email has no text.)'}</pre>}
      </div>
    </div>
  );
}

function FileBody({ file, blob, url, onOpenChild, save }) {
  const kind = kindOf(file.fileName, file.contentType || (blob && blob.type));
  const [text, setText] = useState('');
  useEffect(() => { let off = false; if (kind === 'text') blob.text().then((t) => !off && setText(t.slice(0, 200000))); return () => { off = true; }; }, [blob, kind]);
  if (kind === 'email' || kind === 'msg') return <EmailView blob={blob} onOpenChild={onOpenChild} outlook={kind === 'msg'} />;
  if (kind === 'docx') return <DocxView blob={blob} />;
  if (kind === 'sheet') return <SheetView blob={blob} name={file.fileName} />;
  if (kind === 'pptx') return <PptxView blob={blob} />;
  if (kind === 'legacy') return <div className="empty"><Icon name="file" size={44} color="#CFC8DC" />Older Office files (.doc, .ppt) can't be previewed in the app.<button type="button" className="btn primary small" style={{ width: 'auto', padding: '0 18px' }} onClick={save}><Icon name="download" size={18} />Save a copy</button></div>;
  if (kind === 'pdf') return <PdfPages blob={blob} />;
  if (kind === 'image') return <img src={url} alt={file.fileName} className="viewer-img" />;
  if (kind === 'text') return <pre className="viewer-text">{text}</pre>;
  return <div className="empty"><Icon name="file" size={44} color="#CFC8DC" />No preview for this file type.<button type="button" className="btn primary small" style={{ width: 'auto', padding: '0 18px' }} onClick={save}><Icon name="download" size={18} />Save a copy</button></div>;
}

// ---------- shared layout: file on top (70%), metadata below (30%, scrolls), AI Summary as a floating button ----------
export function FileShell({ title, sub, onBack, backIcon = 'back', onDownload, canDownload = true, onShare, preview, meta, ai, page }) {
  const [aiOpen, setAiOpen] = useState(false);
  return (
    <div className={'fv' + (page ? ' page' : '')} role={page ? undefined : 'dialog'} aria-modal={page ? undefined : 'true'} aria-label={title}>
      <header className="fv-bar">
        <button type="button" className="circle-btn" aria-label={backIcon === 'close' ? 'Close' : 'Back'} onClick={onBack}><Icon name={backIcon} size={20} stroke={2.2} /></button>
        <div style={{ minWidth: 0, flex: 1 }}><div className="viewer-t">{title}</div>{sub ? <div className="viewer-s">{sub}</div> : null}</div>
        {onDownload ? <button type="button" className="fv-ic" aria-label="Download" disabled={!canDownload} onClick={onDownload}><Icon name="download" size={20} /></button> : null}
        {onShare ? <button type="button" className="fv-ic" aria-label="Share" onClick={onShare}><Icon name="share" size={19} /></button> : null}
      </header>
      <div className="fv-scroll">
        <div className="fv-preview">{preview}</div>
        <section className="fv-meta" aria-label="Metadata">
          <span className="fv-grab" aria-hidden="true" />
          {meta}
        </section>
      </div>
      {ai ? <button type="button" className="fv-ai" onClick={() => setAiOpen(true)}><Sparkle size={18} color="#fff" />AI Summary</button> : null}
      {ai ? <Sheet open={aiOpen} onClose={() => setAiOpen(false)} title="AI summary">{typeof ai === 'function' ? ai(() => setAiOpen(false)) : ai}<button type="button" className="btn neutral" onClick={() => setAiOpen(false)}>Back to file</button></Sheet> : null}
    </div>
  );
}

export function MetaList({ rows, empty: emptyText }) {
  if (!rows || !rows.length) return <div className="muted" style={{ fontSize: 13 }}>{emptyText || 'No metadata for this file.'}</div>;
  return <div className="fv-kv">{rows.map(([l, v, c]) => <div key={l} className={'field-card' + (c === 0 ? ' warn' : '')}><div className="l">{l}{c ? <span className="conf">{c}%</span> : null}</div><div className="v">{v || '—'}</div></div>)}</div>;
}

// <b><u>highlight</u></b> from the summary agent → bold text; any other markup is dropped (never rendered as HTML).
function Marked({ text }) {
  const parts = String(text || '').replace(/<(?!\/?(b|u)>)[^>]*>/gi, '').split(/(<b><u>[\s\S]*?<\/u><\/b>|<b>[\s\S]*?<\/b>)/i);
  return parts.map((p, i) => { const m = /^<b>(?:<u>)?([\s\S]*?)(?:<\/u>)?<\/b>$/i.exec(p); return m ? <b key={i} className="hl">{m[1]}</b> : p.replace(/<\/?[bu]>/gi, ''); });
}

const summaryCache = new Map();
function AiSummaryBody({ file }) {
  const key = file.repositoryId && file.itemId ? `${file.repositoryId}:${file.itemId}` : '';
  const [state, setState] = useState(() => (key && summaryCache.has(key) ? summaryCache.get(key) : null));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // POST .../ai-summary: the first call generates and saves the summary (1 credit); later calls return it free.
  const run = async () => {
    setBusy(true); setErr('');
    try { const s = parseSummary(await docApi.summary(file.repositoryId, toGuid(file.itemId))); summaryCache.set(key, s); setState(s); } catch (e) { setErr(e && e.status === 400 ? "This document has no readable text to summarise." : e && (e.status === 502 || e.status === 504) ? 'The AI service is busy. Try again in a moment.' : apiErrorMessage(e, 'the AI summary')); } finally { setBusy(false); }
  };
  const a = file.ai;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
      {a ? (
        <div className="ai-card">
          <div className="row-between" style={{ alignItems: 'center' }}><span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, color: 'var(--teal-dark)' }}><Sparkle size={18} />From the AI agent</span>{a.decision ? <span className={'pill solid ' + (a.tone || 'neu')}>{a.decision}{a.score != null ? ` · ${a.score}%` : ''}</span> : null}</div>
          {a.insight ? <div style={{ fontSize: 14, fontWeight: 600 }}>{a.insight}</div> : null}
          {a.reason ? <div className="r">{a.reason}</div> : null}
        </div>
      ) : null}
      {state && (state.text || state.facts.length) ? (
        <div className="sum-card">
          <div className="row-between" style={{ alignItems: 'center' }}><span className="sum-h"><Sparkle size={16} />Document summary</span>{state.score != null ? <span className="pill solid t">{state.score}%</span> : null}</div>
          {state.title || state.type ? <div className="sum-t">{state.title}{state.type ? <span className="pill solid neu" style={{ marginLeft: 8 }}>{state.type}</span> : null}</div> : null}
          {state.text ? <p className="sum-p"><Marked text={state.text} /></p> : null}
          {state.facts.length ? <><div className="sec-label" style={{ margin: 0 }}>Key facts</div><ul className="sum-facts">{state.facts.map((f, i) => <li key={i}><Marked text={f} /></li>)}</ul></> : null}
          <p className="muted" style={{ margin: 0, fontSize: 11 }}>{state.credit ? 'Generated now · 1 AI credit used. ' : ''}AI summaries can be wrong. Check the document before you act.</p>
        </div>
      ) : null}
      {err ? <div className="notice bad" role="alert"><span className="grow">{err}</span></div> : null}
      {key && !(state && (state.text || state.facts.length)) ? (
        <button type="button" className="btn primary" disabled={busy} onClick={run}>{busy ? <><span className="spinner" />Reading the document… this can take a minute</> : <><Sparkle size={16} color="#fff" />Summarise this document</>}</button>
      ) : null}
      {key && !(state && (state.text || state.facts.length)) ? <p className="muted" style={{ margin: 0, fontSize: 12 }}>The first summary uses 1 AI credit and is saved on the document; opening it again is free.</p> : null}
      {!key && !a ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>AI summary is available for files stored in EZOFIS.</p> : null}
    </div>
  );
}

const DATE_KEY = /(date|utc|at)$/i;
function fmtMeta(k, v) {
  if (v === null || v === undefined || v === '' || typeof v === 'object') return '';
  const s = String(v);
  if (DATE_KEY.test(k) && /^\d{4}-\d{2}-\d{2}/.test(s)) { const d = new Date(s); if (!isNaN(d)) return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  return s;
}
const prettyKey = (k) => k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+(At\s+)?Utc$/i, '').replace(/\s+/g, ' ').trim();

// `file` is either a repository file { fileName, contentType, fileSize, repositoryId, itemId, uploadedBy?, createdAtUtc?, ai? } or an in-memory one { fileName, blob }.
// `actions(item, reloadMeta)` adds buttons under the file details (Folders: edit details, delete).
export default function FileViewer({ file, onClose, actions }) {
  const { showToast } = useStore();
  const [blob, setBlob] = useState(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const [child, setChild] = useState(null);
  const [item, setItem] = useState(undefined);
  const [metaTick, setMetaTick] = useState(0);

  useEffect(() => {
    if (!file) return undefined;
    let off = false; let u = '';
    setBlob(null); setUrl(''); setErr('');
    const done = (b) => { if (off) return; u = URL.createObjectURL(b); setBlob(b); setUrl(u); };
    if (file.blob) done(file.blob);
    else if (!file.repositoryId || !file.itemId) setErr("This file isn't linked to a repository item, so it can't be opened here.");
    else wfApi.file(file.repositoryId, file.itemId, 'inline', file.shareToken).then(done).catch((e) => { if (!off) setErr(apiErrorMessage(e, 'this file')); });
    return () => { off = true; if (u) URL.revokeObjectURL(u); };
  }, [file, tick]);

  // metadata: GET /repositories/{repositoryId}/items/{itemId} → fields
  useEffect(() => {
    let off = false;
    setItem(undefined);
    if (file && file.repositoryId && file.itemId) wfApi.item(file.repositoryId, file.itemId, file.shareToken).then((d) => { if (!off) setItem(d && d.fields ? d : null); }).catch(() => { if (!off) setItem(null); });
    else setItem(null);
    return () => { off = true; };
  }, [file, metaTick]);

  useEffect(() => {
    if (child) return undefined;
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose, child]);

  if (!file) return null;
  const save = () => { if (!url) return; const a = document.createElement('a'); a.href = url; a.download = file.fileName || 'file'; document.body.appendChild(a); a.click(); a.remove(); };
  const share = async () => {
    try {
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], file.fileName, { type: blob.type })] })) { await navigator.share({ files: [new File([blob], file.fileName, { type: blob.type })], title: file.fileName }); return; }
      if (navigator.share) { await navigator.share({ title: file.fileName, text: file.fileName }); return; }
      showToast("Sharing isn't available on this device yet. Download the file to share it.", { tone: 'bad' });
    } catch (e) { /* share sheet dismissed */ }
  };
  const kind = kindOf(file.fileName, file.contentType);
  const typeLabel = { email: 'Email', msg: 'Outlook email', pdf: 'PDF', image: 'Image', docx: 'Word document', sheet: 'Spreadsheet', pptx: 'Presentation' }[kind] || file.contentType;
  const fields = item && item.fields ? Object.entries(item.fields).filter(([k, v]) => !isTechnicalKey(k) && fmtMeta(k, v)).map(([k, v]) => [prettyKey(k), fmtMeta(k, v)]) : [];
  const info = [['File name', file.fileName], ['Type', typeLabel], ['Size', kb(file.fileSize || (blob && blob.size) || (item && item.fileSize))], file.uploadedBy ? ['Uploaded by', file.uploadedBy] : null, file.createdAtUtc ? ['Uploaded', new Date(file.createdAtUtc).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })] : null, item && item.fields && item.fields.FileVersion ? ['Version', String(item.fields.FileVersion)] : null,
    item && item.fields && item.fields.OcrPercent != null && item.fields.OcrPercent !== '' ? ['OCR confidence', item.fields.OcrPercent + '%'] : null].filter((r) => r && r[1]);
  const preview = (
    <>
      {err ? <div className="notice bad" role="alert"><span className="grow">{err}</span><button type="button" onClick={() => setTick((x) => x + 1)}>Retry</button></div> : null}
      {!err && !blob ? <Spin text="Downloading…" /> : null}
      {blob ? <FileBody file={file} blob={blob} url={url} onOpenChild={setChild} save={save} /> : null}
    </>
  );
  const meta = (
    <>
      <div className="fv-h"><span>Metadata</span>{fields.length > 3 ? <span className="muted" style={{ fontSize: 12 }}>Scroll for more</span> : null}</div>
      {item === undefined ? <Spin text="Loading metadata…" /> : <MetaList rows={fields} empty={file.blob ? 'Files inside an email have no EZOFIS metadata.' : 'No metadata was captured for this file.'} />}
      <div className="fv-h" style={{ marginTop: 8 }}><span>File details</span></div>
      <div className="fv-info">{info.map(([l, v]) => <div key={l}><span>{l}</span><b>{v}</b></div>)}</div>
      {actions && item ? actions(item, () => setMetaTick((x) => x + 1)) : null}
    </>
  );
  return (
    <>
      <FileShell title={file.fileName} sub={[typeLabel, kb(file.fileSize || (blob && blob.size))].filter(Boolean).join(' · ')} onBack={onClose} backIcon={file.blob ? 'back' : 'close'}
        onDownload={save} canDownload={!!url} onShare={share} preview={preview} meta={meta}
        ai={file.ai || (file.repositoryId && file.itemId && !file.shareToken) ? <AiSummaryBody file={file} /> : null} />
      {child ? <FileViewer file={child} onClose={() => setChild(null)} /> : null}
    </>
  );
}

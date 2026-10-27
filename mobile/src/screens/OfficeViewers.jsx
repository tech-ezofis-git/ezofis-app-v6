// Office / Outlook previews inside the app (no external viewer, works offline in the Android/iOS WebView).
// Word .docx → mammoth (HTML), Excel .xlsx/.xls/.csv → SheetJS (tables), PowerPoint .pptx → slide text + images (JSZip),
// Outlook .msg → msgreader (same e-mail view as .eml). Legacy binary .doc / .ppt have no in-app preview.
import React, { useEffect, useRef, useState } from 'react';

function Spin({ text }) {
  return <div className="muted" style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 30 }}><span className="spinner" />{text}</div>;
}

// Sandboxed HTML frame (no scripts) that grows to its content height.
export function HtmlFrame({ html, css = '', title = 'Document' }) {
  const ref = useRef(null);
  const [h, setH] = useState(200);
  const doc = String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '');
  const head = `<meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;padding:0;font-family:Poppins,Arial,sans-serif;font-size:14px;line-height:1.5;color:#14101F;word-wrap:break-word;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}pre{white-space:pre-wrap}${css}</style>`;
  const srcDoc = /<head[^>]*>/i.test(doc) ? doc.replace(/<head[^>]*>/i, (m) => m + head) : head + doc;
  const fit = () => { try { const d = ref.current.contentDocument; setH(Math.max(120, d.documentElement.scrollHeight, d.body.scrollHeight) + 8); } catch (e) { setH(600); } };
  return <iframe ref={ref} title={title} className="mail-frame" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" srcDoc={srcDoc} style={{ height: h }} onLoad={() => { fit(); setTimeout(fit, 400); setTimeout(fit, 1500); }} />;
}

export function DocxView({ blob }) {
  const [html, setHtml] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const mod = await import('mammoth/mammoth.browser.min.js');
        const mammoth = mod.default || mod;
        const r = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
        if (!off) setHtml(r.value || '<p><i>This document is empty.</i></p>');
      } catch (e) { if (!off) setErr("This Word document couldn't be displayed. Save a copy to open it in Word."); }
    })();
    return () => { off = true; };
  }, [blob]);
  if (err) return <div className="notice bad">{err}</div>;
  if (html === null) return <Spin text="Opening document…" />;
  return <div className="doc-page"><HtmlFrame html={html} title="Word document" css="h1,h2,h3{font-family:Poppins,Arial,sans-serif;line-height:1.3}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:4px 6px}" /></div>;
}

const MAX_ROWS = 500;
export function SheetView({ blob, name }) {
  const [wb, setWb] = useState(null);
  const [active, setActive] = useState(0);
  const [err, setErr] = useState('');
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const XLSX = await import('xlsx');
        const isCsv = /\.csv$/i.test(name || '');
        const book = isCsv ? XLSX.read(await blob.text(), { type: 'string' }) : XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: 'array', cellDates: true });
        const sheets = book.SheetNames.map((n) => {
          const ws = book.Sheets[n];
          let truncated = false;
          if (ws['!ref']) {
            const range = XLSX.utils.decode_range(ws['!ref']);
            if (range.e.r - range.s.r + 1 > MAX_ROWS) { range.e.r = range.s.r + MAX_ROWS - 1; ws['!ref'] = XLSX.utils.encode_range(range); truncated = true; }
          }
          return { name: n, html: ws['!ref'] ? XLSX.utils.sheet_to_html(ws, { header: '', footer: '' }) : '<p><i>This sheet is empty.</i></p>', truncated };
        });
        if (!off) setWb(sheets);
      } catch (e) { if (!off) setErr("This spreadsheet couldn't be displayed. Save a copy to open it in Excel."); }
    })();
    return () => { off = true; };
  }, [blob, name]);
  if (err) return <div className="notice bad">{err}</div>;
  if (!wb) return <Spin text="Opening spreadsheet…" />;
  const sh = wb[Math.min(active, wb.length - 1)];
  return (
    <div className="sheet-view">
      {wb.length > 1 ? <div className="chips" role="tablist" aria-label="Sheets">{wb.map((s, i) => <button key={s.name} type="button" role="tab" aria-selected={i === active} className={'chip' + (i === active ? ' on' : '')} onClick={() => setActive(i)}>{s.name}</button>)}</div> : null}
      {sh.truncated ? <div className="notice info">Showing the first {MAX_ROWS} rows. Save a copy to see everything.</div> : null}
      <div className="sheet-scroll"><HtmlFrame key={sh.name} html={sh.html} title={'Sheet ' + sh.name} css="body{padding:0}table{border-collapse:collapse;font-size:12px;max-width:none;white-space:nowrap}td,th{border:1px solid #E2D8F0;padding:5px 8px}tr:first-child td{background:#F8F3FF;font-weight:600;color:#643094}" /></div>
    </div>
  );
}

export function PptxView({ blob }) {
  const [slides, setSlides] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let off = false; const urls = [];
    (async () => {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]));
        const parser = new DOMParser();
        const out = [];
        for (const n of names) {
          const xml = parser.parseFromString(await zip.file(n).async('string'), 'application/xml');
          const paras = [...xml.getElementsByTagName('a:p')].map((p) => [...p.getElementsByTagName('a:t')].map((t) => t.textContent).join('')).filter((x) => x.trim());
          const relName = n.replace('slides/', 'slides/_rels/') + '.rels';
          const imgs = [];
          if (zip.file(relName)) {
            const rels = parser.parseFromString(await zip.file(relName).async('string'), 'application/xml');
            for (const r of [...rels.getElementsByTagName('Relationship')]) {
              const target = r.getAttribute('Target') || '';
              if (/\/image$/.test(r.getAttribute('Type') || '') && /\.(png|jpe?g|gif|bmp|webp)$/i.test(target)) {
                const path = ('ppt/slides/' + target).replace(/[^/]+\/\.\.\//g, '');
                if (zip.file(path)) { const u = URL.createObjectURL(await zip.file(path).async('blob')); urls.push(u); imgs.push(u); }
              }
            }
          }
          out.push({ title: paras[0] || '', body: paras.slice(1), imgs });
        }
        if (!off) setSlides(out);
      } catch (e) { if (!off) setErr("This presentation couldn't be displayed. Save a copy to open it in PowerPoint."); }
    })();
    return () => { off = true; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [blob]);
  if (err) return <div className="notice bad">{err}</div>;
  if (!slides) return <Spin text="Opening presentation…" />;
  return (
    <div className="slides">
      <div className="notice info">Slide text and pictures. Layout and animations are shown in PowerPoint.</div>
      {slides.map((s, i) => (
        <section key={i} className="slide" aria-label={'Slide ' + (i + 1)}>
          <span className="slide-n">{i + 1}</span>
          {s.title ? <h3>{s.title}</h3> : null}
          {s.body.map((t, j) => <p key={j}>{t}</p>)}
          {s.imgs.map((u, j) => <img key={j} src={u} alt="" />)}
          {!s.title && !s.body.length && !s.imgs.length ? <p className="muted"><i>No text on this slide.</i></p> : null}
        </section>
      ))}
    </div>
  );
}

// Outlook .msg → the same shape the .eml viewer uses.
export async function parseMsg(blob) {
  const mod = await import('@kenjiuno/msgreader');
  const MsgReader = mod.default && mod.default.default ? mod.default.default : mod.default || mod.MsgReader || mod;
  const reader = new MsgReader(await blob.arrayBuffer());
  const d = reader.getFileData();
  const rc = (type) => (d.recipients || []).filter((r) => (r.recipType || 'to') === type).map((r) => ({ name: r.name || '', address: r.smtpAddress || r.email || '' }));
  let html = d.bodyHtml || '';
  if (!html && d.html && d.html.length) { try { html = new TextDecoder('utf-8').decode(d.html); } catch (e) { html = ''; } }
  const attachments = (d.attachments || []).filter((a) => !a.attachmentHidden || a.pidContentId).map((a) => {
    let content = new Uint8Array(0);
    try { content = reader.getAttachment(a).content; } catch (e) { /* unreadable part */ }
    return { filename: a.fileName || a.fileNameShort || a.name || 'attachment', mimeType: a.attachMimeTag || 'application/octet-stream', content, contentId: a.pidContentId || '', disposition: a.pidContentId ? 'inline' : 'attachment' };
  });
  return {
    subject: d.subject || '', from: { name: d.senderName || '', address: d.senderSmtpAddress || d.senderEmail || '' },
    to: rc('to'), cc: rc('cc'), date: d.messageDeliveryTime || d.clientSubmitTime || '',
    html, text: d.body || '', attachments,
  };
}

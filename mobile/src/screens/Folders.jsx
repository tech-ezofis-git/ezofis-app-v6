import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { FileThumb, Icon, IconBtn, Pill, Sheet, Sparkle, TopBar } from '../ui.jsx';
import { FileShell, MetaList } from './FileViewer.jsx';
import { FOLDER_DEFS, SAMPLE_FOLDER_FILES, fileValue } from '../data.js';

const FOLDERS = FOLDER_DEFS.map((f) => f.name);

function FileCard({ f, onClick }) {
  const tone = f.status === 'Indexed' ? (f.isNew ? 't' : 'p') : 'a';
  return (
    <button type="button" className={'card ' + tone + ' list-row'} onClick={onClick} style={f.isNew ? { boxShadow: '0 0 0 1.5px #19C1D4' } : undefined}>
      <FileThumb ext={f.ext} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="row-between" style={{ alignItems: 'center' }}><span className="ct" style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>{f.isNew ? <span className="pill new">New</span> : null}</span>
        <span className="cb" style={{ display: 'block', fontSize: 13 }}>{(f.attrs ? [f.type, ...Object.values(f.attrs).slice(0, 2)] : [f.type, f.supplier, f.po]).filter(Boolean).join(' | ')}</span>
        <span style={{ display: 'block', fontSize: 12, marginTop: 4, fontWeight: 600, color: tone === 'a' ? 'var(--warn-t)' : 'var(--teal-dark)' }}>{f.status}{f.amount ? ' · ' + f.amount : ''} · {f.when}</span>
      </span>
    </button>
  );
}

export function Folders() {
  const nav = useNavigate();
  const { files, staged, live } = useStore();
  const [folder, setFolder] = useState(FOLDER_DEFS[0].name);
  const [view, setView] = useState('all');
  const [q, setQ] = useState(null);
  const [sel, setSel] = useState({});
  const [picker, setPicker] = useState(null);
  const [group, setGroup] = useState(null);
  const def = FOLDER_DEFS.find((f) => f.name === folder);
  const folderFiles = (d) => (d.live ? files : d.files || []);
  const inFolder = folderFiles(def);

  const choose = (name) => { setFolder(name); setSel({}); setGroup(null); setView('all'); };
  const list = useMemo(() => {
    let l = view === 'staged' ? staged.map((s) => ({ ...s, status: s.stage === 'Ready' || s.stage === 'Check type' ? 'Staged · ' + s.stage : s.stage, when: 'just now' })) : inFolder;
    if (view === 'archived') l = inFolder.filter((f) => !f.isNew);
    if (q) l = l.filter((f) => [f.name, f.type, f.supplier, f.po, f.amount, ...Object.values(f.attrs || {})].join(' ').toLowerCase().includes(q.toLowerCase()));
    Object.entries(sel).forEach(([k, v]) => { if (v) l = l.filter((f) => fileValue(f, k) === v); });
    return l;
  }, [view, staged, inFolder, q, sel]);
  const valuesFor = (key) => {
    const counts = {};
    inFolder.forEach((f) => { const v = fileValue(f, key); counts[v] = (counts[v] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  };
  const pickerDef = picker ? def.filters.find((x) => x.key === picker) : null;
  const activeFilters = Object.values(sel).filter(Boolean).length;

  return (
    <div className="screen">
      <TopBar title="Folders" sub={`${FOLDER_DEFS.length} folders`} back={false} right={<IconBtn name="search" label="Search in folder" onClick={() => setQ(q === null ? '' : null)} />} />
      <div style={{ background: 'var(--surface)', padding: '0 0 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="folder-strip" role="listbox" aria-label="Choose a folder">
          {FOLDER_DEFS.map((d) => {
            const on = d.name === folder;
            const n = folderFiles(d).length;
            return (
              <button key={d.name} type="button" role="option" aria-selected={on} className={'folder-card ' + d.tone + (on ? ' on' : '')} onClick={() => choose(d.name)}>
                <span className="fc-ic"><Icon name="folder" size={20} /></span>
                <span className="fc-name">{d.name}</span>
                <span className="fc-meta">{n} file{n === 1 ? '' : 's'}{d.live && staged.length ? ` · ${staged.length} staged` : ''}</span>
              </button>
            );
          })}
        </div>
        {q !== null ? <div style={{ padding: '0 var(--gutter)' }}><input className="input" autoFocus placeholder={`Search in ${folder}`} aria-label={`Search in ${folder}`} value={q} onChange={(e) => setQ(e.target.value)} /></div> : null}
        <div className="chips" style={{ padding: '0 var(--gutter)' }}>
          <button type="button" className={'chip' + (view === 'all' && !activeFilters ? ' on' : '')} onClick={() => { setView('all'); setSel({}); setGroup(null); }}>All files</button>
          {def.live ? <button type="button" className={'chip' + (view === 'staged' ? ' on' : '')} onClick={() => setView('staged')}>Staged · {staged.length}</button> : null}
          {def.filters.map((f) => (
            <button key={f.key} type="button" className={'chip' + (sel[f.key] ? ' on' : '')} onClick={() => setPicker(f.key)}>
              {sel[f.key] ? `${f.label}: ${sel[f.key]}` : f.label}<Icon name="chevD" size={14} stroke={2.6} />
            </button>
          ))}
        </div>
      </div>

      <div className="content wide" style={{ paddingBottom: 110 }}>
        {live ? <div className="notice info"><Icon name="folder" size={18} /><span className="grow">Folders show sample files for now. They switch to your EZOFIS folders once the Folder API is connected.</span></div> : null}
        {view === 'all' && !q ? (
          <>
            <h2 className="sec-title" style={{ margin: 0 }}>Browse {folder}</h2>
            <div className="grid2 wide4">
              {def.groups.map((g, i) => <button key={g.key} type="button" className={'tile ' + ['p', 't', 'd', 'a'][i % 4]} style={group === g.key ? { boxShadow: '0 0 0 2px #8300E6' } : undefined} onClick={() => setGroup(group === g.key ? null : g.key)}><Icon name={g.icon} size={26} />{g.label}</button>)}
              {def.live ? <button type="button" className="tile a" onClick={() => setView('staged')}><Icon name="clock" size={26} />Staged for review</button> : null}
            </div>
            {group ? (
              <div className="chips">{valuesFor(group).map(([v, n]) => <button key={v} type="button" className={'chip' + (sel[group] === v ? ' on' : '')} onClick={() => setSel({ ...sel, [group]: sel[group] === v ? null : v })}>{v} · {n}</button>)}</div>
            ) : null}
          </>
        ) : null}
        <div className="row-between"><h2 className="sec-title" style={{ margin: 0 }}>{view === 'staged' ? 'Staged files' : activeFilters ? 'Matching files' : 'Recent files'}</h2><span className="muted" style={{ fontSize: 12 }}>{list.length} of {inFolder.length}</span></div>
        <div className="files-grid" style={{ display: 'grid', gap: 12 }}>
          {list.map((f) => <FileCard key={f.id} f={f} onClick={() => (view === 'staged' ? nav('/app/review?id=' + f.id) : nav('/app/folders/file/' + f.id))} />)}
        </div>
        {!list.length ? <div className="empty"><Icon name="folder" size={40} color="#CFC8DC" />{view === 'staged' ? 'No files waiting for review.' : 'No files match these filters.'}</div> : null}
      </div>

      <button type="button" className="fab" aria-label={`Upload to ${folder}`} onClick={() => nav('/app/upload')} style={{ position: 'fixed', right: 20, bottom: 'calc(var(--sab) + 100px)', margin: 0 }}><Icon name="upload" size={28} stroke={2.4} /></button>

      <Sheet open={!!pickerDef} onClose={() => setPicker(null)} title={pickerDef ? `${pickerDef.label} · ${folder}` : ''}>
        <div className="sheet-list">
          <button type="button" className={'opt' + (pickerDef && !sel[pickerDef.key] ? ' on' : '')} onClick={() => { setSel({ ...sel, [picker]: null }); setPicker(null); }}>All</button>
          {pickerDef ? valuesFor(pickerDef.key).map(([v, n]) => (
            <button key={v} type="button" className={'opt' + (sel[picker] === v ? ' on' : '')} onClick={() => { setSel({ ...sel, [picker]: v }); setPicker(null); }}><span style={{ flex: 1 }}>{v}</span><span className="muted" style={{ fontSize: 13 }}>{n}</span></button>
          )) : null}
        </div>
      </Sheet>
    </div>
  );
}

export function FileView() {
  const { id } = useParams();
  const nav = useNavigate();
  const { files, showToast } = useStore();
  const f = files.find((x) => x.id === id) || SAMPLE_FOLDER_FILES.find((x) => x.id === id);
  if (!f) return <div className="screen"><TopBar title="File" back="/app/folders" /><div className="empty">File not found.</div></div>;
  const preview = (
    <div className="docprev" aria-label="Document preview" style={{ minHeight: '100%', boxSizing: 'border-box' }}>
      <span style={{ width: '40%' }} /><span className="hl" style={{ width: '70%' }} /><span style={{ width: '55%' }} /><span className="hl" style={{ width: '45%' }} />
      <span style={{ width: '92%' }} /><span style={{ width: '88%' }} /><span style={{ width: '90%' }} /><span style={{ width: '60%' }} /><span className="hp" style={{ width: '35%', alignSelf: 'flex-end' }} />
    </div>
  );
  const meta = (
    <>
      <div className="fv-h"><span>Metadata</span>{(f.fields || []).length > 3 ? <span className="muted" style={{ fontSize: 12 }}>Scroll for more</span> : null}</div>
      <MetaList rows={(f.fields || []).map(([l, v, c]) => [l, v, c])} />
      <div className="fv-h" style={{ marginTop: 8 }}><span>File details</span></div>
      <div className="fv-info">{[['Uploaded by', 'Arun E.'], ['Upload date', '26-Oct-2026'], ['Document ID', f.id.toUpperCase()], ['Status', f.status]].map(([l, v]) => <div key={l}><span>{l}</span><b>{v}</b></div>)}</div>
    </>
  );
  const ai = (
    <div className="card t"><div className="ct" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Sparkle size={18} />{f.type}</div><div className="cb">{f.type} from {f.supplier || (f.attrs && (f.attrs.vendor || f.attrs.employee || f.attrs.department)) || 'an unknown source'}{f.po ? `, referencing ${f.po}` : ''}{f.amount ? `, for ${f.amount}` : ''}. Extracted fields match the folder's metadata; no duplicates found.</div></div>
  );
  return (
    <FileShell page title={f.name} sub={`${f.type} · ${f.status}`} onBack={() => nav('/app/folders')} onDownload={() => showToast(f.name + ' downloaded')} onShare={() => showToast('Share link copied')} preview={preview} meta={meta} ai={ai} />
  );
}

export function Upload() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { staged, addUpload, showToast } = useStore();
  const [dest, setDest] = useState(FOLDERS[0]);
  const [destOpen, setDestOpen] = useState(false);
  const [ai, setAi] = useState(true);
  const fired = useRef(false);
  useEffect(() => {
    if (params.get('source') === 'scan' && !fired.current) { fired.current = true; addUpload('scan'); showToast('Scanned 1 page'); }
  }, [params, addUpload, showToast]);
  const ready = staged.filter((s) => s.stage === 'Ready' || s.stage === 'Check type').length;
  const add = (src) => { addUpload(src); };
  return (
    <div className="screen">
      <TopBar title="Add documents" back right={<span />} />
      <div className="content" style={{ gap: 16 }}>
        <div className="field">
          <span className="lab">Upload to <span className="req">*</span></span>
          <button type="button" className="input strong" style={{ display: 'flex', alignItems: 'center', textAlign: 'left' }} onClick={() => setDestOpen(true)}><span style={{ flex: 1 }}>{dest}</span><Icon name="chevD" size={16} stroke={2.4} /></button>
        </div>
        <div className="card w" style={{ background: 'linear-gradient(160deg, #fff, #F4EDFE)', borderColor: '#ECE2FA', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6, padding: '18px 8px 16px' }}>
          <button type="button" className="qa" onClick={() => add('scan')}><span className="c solid" style={{ width: 62, height: 62 }}><Icon name="camera" size={26} /></span>Scan</button>
          <button type="button" className="qa" onClick={() => add('photos')}><span className="c" style={{ width: 62, height: 62 }}><Icon name="image" size={26} /></span>Photos</button>
          <button type="button" className="qa" onClick={() => add('files')}><span className="c" style={{ width: 62, height: 62 }}><Icon name="file" size={26} /></span>Files</button>
        </div>
        <div className="update-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <span style={{ flex: 'none', width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkle size={20} color="#fff" /></span>
          <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>Intelligent classification</span><span style={{ display: 'block', fontSize: 13, opacity: 0.92 }}>AI sets the type and fills folder fields</span></span>
          <button type="button" role="switch" aria-checked={ai} aria-label="Intelligent classification" className="switch teal" onClick={() => setAi(!ai)} />
        </div>
        <h2 className="sec-title">Processing · {staged.length} file{staged.length === 1 ? '' : 's'}</h2>
        {staged.length ? staged.map((s) => {
          const tone = s.stage === 'Check type' ? 'a' : s.stage === 'Ready' ? 't' : 'p';
          return (
            <div key={s.id} className={'card ' + tone}>
              <div className="row-between" style={{ alignItems: 'center' }}><span className="ct" style={{ fontSize: 15 }}>{s.name}</span><span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{s.progress < 100 ? <span className="spinner" /> : null}{s.stage}</span></div>
              {s.progress < 100 ? <div style={{ height: 6, borderRadius: 999, background: '#E6DAF7', overflow: 'hidden', marginTop: 8 }}><div style={{ width: s.progress + '%', height: '100%', background: 'linear-gradient(90deg, #8300E6, #19C1D4)', transition: 'width .5s' }} /></div>
                : <div className="cb" style={{ fontSize: 13 }}>{ai ? `${s.type} | ${s.conf}% | ${s.fields.filter((x) => x[2]).length} fields extracted` : 'Uploaded without classification'}{s.low ? ' · review the type' : ''}</div>}
            </div>
          );
        }) : <div className="empty" style={{ padding: 20 }}>Scan, pick photos or choose files to start.<br /><span style={{ fontSize: 12 }}>Prototype: each tap adds a sample document.</span></div>}
      </div>
      <div className="bottombar">
        <button type="button" className="btn primary" disabled={!ready} onClick={() => nav('/app/review')}>{ready ? `Review ${ready} staged file${ready > 1 ? 's' : ''}` : staged.length ? 'Processing…' : 'Review staged files'}</button>
      </div>
      <Sheet open={destOpen} onClose={() => setDestOpen(false)} title="Upload to">
        <div className="sheet-list">{FOLDERS.map((f) => <button key={f} type="button" className={'opt' + (f === dest ? ' on' : '')} onClick={() => { setDest(f); setDestOpen(false); }}><Icon name="folder" size={20} />{f}</button>)}</div>
      </Sheet>
    </div>
  );
}

export function Review() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { staged, exportStaged, skipStaged } = useStore();
  const ready = staged.filter((s) => s.progress >= 100);
  const s = ready.find((x) => x.id === params.get('id')) || ready[0];
  const [showConf, setShowConf] = useState(true);
  if (!s) {
    return (
      <div className="screen">
        <TopBar title="Summary" back="/app/folders" right={<span />} />
        <div className="empty"><Icon name="checkCircle" size={44} color="#CFC8DC" />No staged files to review.<button type="button" className="btn primary" style={{ marginTop: 10, width: 220 }} onClick={() => nav('/app/upload')}>Add documents</button></div>
      </div>
    );
  }
  const idx = ready.indexOf(s) + 1;
  const doExport = () => {
    exportStaged([s.id]);
    const left = ready.filter((x) => x.id !== s.id);
    if (left.length) nav('/app/review?id=' + left[0].id, { replace: true }); else nav('/app/folders', { replace: true });
  };
  const fields = [...s.fields, ['Buyer', s.buyer, s.buyer ? 100 : 0]];
  return (
    <div className="screen">
      <TopBar title="Summary" sub={`${idx} of ${ready.length} · Accounts Payable`} back right={<span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--deep)' }}>AI %<button type="button" role="switch" aria-checked={showConf} aria-label="Show confidence" className="switch" onClick={() => setShowConf(!showConf)} /></span>} />
      <div className="content">
        <div className="update-card" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 12, opacity: 0.9 }}>{s.name} · AI classified as</span><span style={{ display: 'block', fontFamily: 'var(--head)', fontWeight: 700, fontSize: 20 }}>{s.type}</span></span>
          {showConf ? <span className="pill t">{s.conf}%</span> : null}
        </div>
        {s.low ? <div className="card a"><div className="ct">Low confidence</div><div className="cb">Check the document type before exporting.</div></div> : null}
        {fields.map(([l, v, c]) => (
          <div key={l} className={'field-card' + (!c ? ' warn' : '')}><div className="l">{l}{showConf && c ? <span className="conf">{c}%</span> : null}</div><div className="v">{c ? v : 'Not found · tap edit to add'}</div></div>
        ))}
      </div>
      <button type="button" className="fab" aria-label="Edit metadata" onClick={() => nav('/app/review/edit?id=' + s.id)} style={{ position: 'fixed', right: 20, bottom: 'calc(var(--sab) + 112px)', margin: 0 }}><Icon name="edit" size={26} stroke={2.2} /></button>
      <div className="bottombar" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <button type="button" className="btn neutral" onClick={() => { skipStaged(s.id); const n = ready.find((x) => x.id !== s.id); if (n) nav('/app/review?id=' + n.id, { replace: true }); }}>Skip</button>
        <button type="button" className="btn primary" onClick={doExport}>Export to folder</button>
      </div>
    </div>
  );
}

export function EditMeta() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { staged, updateStaged, showToast } = useStore();
  const s = staged.find((x) => x.id === params.get('id'));
  const [v, setV] = useState(() => (s ? { supplier: s.supplier, type: s.type, po: s.po, amount: (s.amount || '').replace(/^[A-Z]+\s*/, ''), cur: (s.amount || 'CAD').split(' ')[0] || 'CAD', buyer: s.buyer, dd: '20', mm: 'Aug', yy: '2026' } : {}));
  const [err, setErr] = useState({});
  if (!s) return <div className="screen"><TopBar title="Edit metadata" back="/app/review" /><div className="empty">Nothing to edit.</div></div>;
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const save = () => {
    const e = {};
    ['supplier', 'type', 'buyer'].forEach((k) => { if (!String(v[k] || '').trim()) e[k] = true; });
    setErr(e);
    if (Object.keys(e).length) return;
    updateStaged(s.id, { supplier: v.supplier, type: v.type, po: v.po, amount: v.amount ? `${v.cur} ${v.amount}` : '', buyer: v.buyer, low: false, stage: 'Ready',
      fields: [['Supplier', v.supplier, 100], ['Invoice number', s.fields[1][1], s.fields[1][2]], ['PO number', v.po || '—', v.po ? 100 : 0], ['Amount', v.amount ? `${v.amount} | ${v.cur}` : '—', v.amount ? 100 : 0]] });
    showToast('Metadata updated');
    nav('/app/review?id=' + s.id, { replace: true });
  };
  return (
    <div className="screen" style={{ background: 'var(--surface)' }}>
      <TopBar title="Edit metadata" sub={s.name} back right={<span />} />
      <div className="content" style={{ gap: 16 }}>
        <div className="field"><label htmlFor="m-sup">Supplier <span className="req">*</span></label><input id="m-sup" className={'input strong' + (err.supplier ? ' error' : '')} value={v.supplier} onChange={set('supplier')} /></div>
        <div className="field"><label htmlFor="m-type">Document type <span className="req">*</span></label>
          <select id="m-type" className="input strong" value={v.type} onChange={set('type')}>{['Invoice', 'Delivery note', 'Receipt', 'Purchase order', 'Credit note'].map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="field"><span className="lab">Invoice date <span className="req">*</span></span>
          <div className="split3">
            <select aria-label="Day" className="input strong" value={v.dd} onChange={set('dd')}>{Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => <option key={d}>{d}</option>)}</select>
            <select aria-label="Month" className="input strong" value={v.mm} onChange={set('mm')}>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((d) => <option key={d}>{d}</option>)}</select>
            <select aria-label="Year" className="input strong" value={v.yy} onChange={set('yy')}>{['2024', '2025', '2026'].map((d) => <option key={d}>{d}</option>)}</select>
          </div></div>
        <div className="field"><span className="lab">PO &amp; amount</span>
          <input aria-label="PO number" className="input strong" value={v.po} onChange={set('po')} placeholder="PO number" />
          <div className="split-amt"><input aria-label="Amount" className="input strong" inputMode="decimal" value={v.amount} onChange={set('amount')} placeholder="0.00" />
            <select aria-label="Currency" className="input strong" value={v.cur} onChange={set('cur')}>{['CAD', 'USD', 'INR', 'EUR'].map((c) => <option key={c}>{c}</option>)}</select></div></div>
        <button type="button" className="btn neutral small" style={{ alignSelf: 'flex-end', padding: '0 16px' }} onClick={() => { setV({ ...v, buyer: 'Procurement', po: v.po || 'PO-31001' }); showToast('Copied from previous upload'); }}><Icon name="history" size={18} />Copy from previous</button>
        <div className="field"><label htmlFor="m-buy">Buyer <span className="req">*</span></label>
          <select id="m-buy" className={'input strong' + (err.buyer ? ' error' : '')} value={v.buyer} onChange={set('buyer')}><option value="">Select buyer</option>{['Procurement', 'Finance', 'Operations'].map((b) => <option key={b}>{b}</option>)}</select>
          {err.buyer ? <span className="err" role="alert">Buyer is required</span> : null}</div>
      </div>
      <div className="bottombar"><button type="button" className="btn primary" onClick={save}>Save changes</button></div>
    </div>
  );
}

// Start a new workflow request: POST /api/Workflows/{id}/start/json (same payload as cloud.ezofis.com),
// then optional attachments via POST /api/Workflows/{id}/instances/{instanceId}/attachments.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { Icon, TopBar, FileThumb, Sparkle } from '../ui.jsx';
import { apiErrorMessage } from '../api.js';
import { wfApi, getWorkflows, getMeta, getForm, canStart, isTechnicalLabel, MAX_FILE_MB, tooBig } from '../wf.js';
import { buildSchema, initialValues, newRow, recompute, loadMaster, validate, fileProblem, ocrExtract, ocrTargets, uploadWithOcr, toPayload, empty, NO_INPUT, FILE_TYPES } from '../formEngine.js';
import { Skeleton, ErrorNote } from './LiveWorkflow.jsx';
import { Control, KNOWN_TYPES } from '../controls.jsx';

function PickWorkflow() {
  const nav = useNavigate();
  const { me, liveTick } = useStore();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let off = false;
    setErr(''); setList(null);
    (async () => {
      try {
        const wfs = (await getWorkflows()).filter((w) => w.status === 1); // Active only (start returns 400 otherwise)
        const metas = await Promise.all(wfs.map((w) => getMeta(w.id).catch(() => null)));
        if (!off) setList(wfs.map((w, i) => ({ ...w, meta: metas[i] })).filter((w) => w.meta && canStart(w.meta, me && me.id)));
      } catch (e) { if (!off) setErr(apiErrorMessage(e, 'workflows')); }
    })();
    return () => { off = true; };
  }, [me, liveTick, tick]);
  const [q, setQ] = useState('');
  const shown = (list || []).filter((w) => !q.trim() || (w.name + ' ' + (w.description || '')).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="screen">
      <TopBar title="New request" back="/app/inbox" right={<span />} />
      <div className="content nr-pick">
        <p className="nr-lead">What would you like to start?</p>
        {list && list.length > 5 ? (
          <label className="nr-search"><Icon name="search" size={18} color="#8A84A0" /><input type="search" placeholder="Search workflows" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search workflows" /></label>
        ) : null}
        {err ? <ErrorNote text={err} onRetry={() => setTick((x) => x + 1)} /> : null}
        {list === null && !err ? <Skeleton n={4} h={64} /> : null}
        {shown.length ? (
          <div className="nr-list" role="list">
            {shown.map((w, i) => (
              <button key={w.id} type="button" role="listitem" className="nr-row" onClick={() => nav('/app/new/' + w.id)}>
                <span className={'nr-badge t' + (i % 4)} aria-hidden="true">{initials(w.name)}</span>
                <span className="nr-text"><span className="nr-name">{w.name}</span>{w.description ? <span className="nr-desc">{w.description}</span> : null}</span>
                <Icon name="chevR" size={18} color="#A39DB5" />
              </button>
            ))}
          </div>
        ) : null}
        {list && list.length && !shown.length ? <div className="empty">No workflow matches “{q}”.</div> : null}
        {list && !list.length ? <div className="empty"><Icon name="inbox" size={40} color="#CFC8DC" />There are no workflows you can start from the app.</div> : null}
        {list && list.length ? <p className="nr-foot">Only workflows you're allowed to start are listed.</p> : null}
      </div>
    </div>
  );
}
function initials(name) {
  const w = String(name || '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
}

// One control, rendered the way the web form does (options from master data / custom lists / people).
function FieldInput({ f, value, options, onChange, error, required, ocrBusy, onFile }) {
  const id = 'nf-' + f.id + (f.table ? '-' + Math.random().toString(36).slice(2, 6) : '');
  const ro = f.readOnly;
  const label = <label htmlFor={id}>{f.label} {required ? <span className="req">*</span> : null}{ro && f.type !== 'CALCULATED' ? <Icon name="lock" size={12} color="#9C96AB" style={{ marginLeft: 4 }} /> : null}</label>;
  let input;
  const opts = (options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  if (FILE_TYPES.has(f.type)) {
    const v = value || null;
    input = (
      <div className="file-field">
        {v && (v.file || v.fileId) ? (
          <div className="file-chip-row"><FileThumb ext={(String(v.fileName || '').split('.').pop() || 'FILE').toUpperCase().slice(0, 4)} /><span className="ct" style={{ flex: 1, minWidth: 0, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.fileName}</span>
            {ocrBusy ? <span className="ocr-pill"><span className="spinner" />Reading…</span> : v.ocrCount ? <span className="ocr-pill done"><Sparkle size={12} color="#0A6E7A" />{v.ocrCount} filled</span> : null}
            <button type="button" className="icon-btn" aria-label={'Remove ' + v.fileName} onClick={() => onChange(null)}><Icon name="close" size={18} /></button></div>
        ) : (
          <label className="upload-btn" htmlFor={id}><Icon name="upload" size={18} />Upload file<span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> · max 20 MB</span>{f.assignOtherControls.length ? <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> · AI fills {f.assignOtherControls.length} fields</span> : null}</label>
        )}
        <input id={id} type="file" hidden accept={f.allowedFileTypes.length ? f.allowedFileTypes.map((x) => '.' + String(x).replace(/^\./, '')).join(',') : undefined} onChange={(e) => { const file = e.target.files && e.target.files[0]; e.target.value = ''; if (file) onFile(file); }} />
      </div>
    );
  } else if (f.type === 'CALCULATED') {
    input = <div className="input locked calc" id={id}>{value === undefined || value === '' ? '0.00' : Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
  } else if (f.choice && (f.type === 'MULTI_SELECT' || f.type === 'MULTIPLE_CHOICE')) {
    const arr = Array.isArray(value) ? value : value ? String(value).split(',').map((x) => x.trim()).filter(Boolean) : [];
    input = options === null ? <div className="input locked">Loading options…</div> : <div className="choice-row">{opts.map((o) => { const on = arr.includes(o.value); return <button key={o.value} type="button" disabled={ro} aria-pressed={on} className={'chip' + (on ? ' on' : '')} onClick={() => onChange(on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}>{o.label}</button>; })}</div>;
  } else if (f.choice) {
    if (options === null) input = <div className="input locked"><span className="spinner" style={{ width: 14, height: 14 }} /> Loading options…</div>;
    else if (ro) input = <div className="input locked" id={id}>{value || '—'}</div>;
    else if (f.type === 'SINGLE_CHOICE' && opts.length && opts.length <= 5) input = <div className="choice-row" role="radiogroup">{opts.map((o) => <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={'chip' + (value === o.value ? ' on' : '')} onClick={() => onChange(value === o.value ? '' : o.value)}>{o.label}</button>)}</div>;
    else input = <select id={id} className="input strong" value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={!opts.length}><option value="">{opts.length ? 'Select…' : f.parent ? 'Choose the field above first' : 'No options'}</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  } else {
    input = <Control kind={f.kind} id={id} value={value} readOnly={ro} error={!!error} settings={f.settings} label={f.kind === 'consent' ? undefined : f.label} placeholder={f.placeholder || (f.fill ? 'Filled from master data' : '')} onChange={onChange} />;
  }
  if (f.kind === 'divider') return input;
  return <div className="field" data-err={error ? '1' : undefined}>{label}{input}{error ? <span className="err" role="alert">{error}</span> : null}</div>;
}

function StartForm({ workflowId }) {
  const nav = useNavigate();
  const { showToast, bumpLive, addNotif, me, session } = useStore();
  const [meta, setMeta] = useState(null);
  const [schema, setSchema] = useState(null);
  const [err, setErr] = useState('');
  const [state, setState] = useState(null); // { vals, options, rowOptions, required }
  const [masters, setMasters] = useState({});
  const [masterErr, setMasterErr] = useState('');
  const [users, setUsers] = useState(null);
  const [errs, setErrs] = useState({});
  const [files, setFiles] = useState([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState('');
  const [submitErr, setSubmitErr] = useState('');
  const [ocrBusy, setOcrBusy] = useState({});
  const [open, setOpen] = useState({});
  const manual = useRef(new Set());
  const fileRef = useRef(null);
  const valsRef = useRef({});

  // 1) workflow + form schema + defaults
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const m = await getMeta(workflowId);
        const f = await getForm(m.formId);
        if (off) return;
        const sc = buildSchema(f && f.json);
        setMeta(m); setSchema(sc);
        valsRef.current = initialValues(sc, me, session);
        setState(recompute(sc, valsRef.current, {}, null, manual.current));
        // 2) master forms used by this form (only the referenced columns are kept)
        Object.entries(sc.need).forEach(([fid, cols]) => loadMaster(fid, [...cols]).then((rows) => { if (!off) setMasters((x) => ({ ...x, [fid]: rows })); }).catch(() => { if (!off) { setMasterErr("Some lists couldn't load. You can still type values or try again."); setMasters((x) => ({ ...x, [fid]: [] })); } }));
        if (Object.values(sc.byId).some((x) => x.userList)) wfApi.users().then((u) => !off && setUsers(u)).catch(() => !off && setUsers([]));
      } catch (e) { if (!off) setErr(apiErrorMessage(e, 'this workflow')); }
    })();
    return () => { off = true; };
  }, [workflowId]); // eslint-disable-line react-hooks/exhaustive-deps

  // re-run fills / options / calculations when lists arrive
  useEffect(() => { if (schema) { const r = recompute(schema, valsRef.current, masters, users, manual.current); valsRef.current = r.vals; setState(r); } }, [masters, users, schema]);

  const apply = (next) => { const r = recompute(schema, next, masters, users, manual.current); valsRef.current = r.vals; setState(r); };
  // children of a changed field go back to automatic filling
  const releaseChildren = (id) => Object.values(schema.byId).forEach((x) => { if (x.parent === id) { manual.current.delete(x.id); [...manual.current].forEach((k) => { if (k.endsWith(':' + x.id)) manual.current.delete(k); }); } });
  const setField = (f, v) => { manual.current.add(f.id); releaseChildren(f.id); setErrs((e) => ({ ...e, [f.id]: '' })); apply({ ...valsRef.current, [f.id]: v }); };
  const setCell = (t, i, c, v) => {
    const rows = (valsRef.current[t.id] || []).map((r, j) => (j === i ? { ...r, [c.id]: v } : r));
    manual.current.add(`${rows[i]._key}:${c.id}`); releaseChildren(c.id);
    setErrs((e) => ({ ...e, [`${t.id}:${i}:${c.id}`]: '' }));
    apply({ ...valsRef.current, [t.id]: rows });
  };
  const addRow = (t) => { const r = newRow(t, me, session); setOpen((o) => ({ ...o, [r._key]: true })); apply({ ...valsRef.current, [t.id]: [...(valsRef.current[t.id] || []), r] }); };
  const removeRow = (t, i) => apply({ ...valsRef.current, [t.id]: (valsRef.current[t.id] || []).filter((_, j) => j !== i) });

  // File control: check type/size, then OCR → fill the assigned controls that are still empty (as the web form does)
  const pickFile = async (f, file, t, i) => {
    const problem = fileProblem(f, file);
    if (problem) { showToast(problem, { tone: 'bad' }); return; }
    const entry = { file, fileName: file.name };
    const key = t ? `${t.id}:${i}:${f.id}` : f.id;
    if (t) setCell(t, i, f, entry); else setField(f, entry);
    const targets = ocrTargets(f, schema);
    if (!targets.length || !meta.repositoryId) return;
    setOcrBusy((b) => ({ ...b, [key]: true }));
    try {
      const res = await ocrExtract(meta.repositoryId, file, targets);
      const cur = valsRef.current;
      const filled = Object.keys(res.values).length;
      const withOcr = { ...entry, ocrFieldList: res.ocrFieldList, ocrJson: res.ocrJson, ocrCount: filled };
      if (t) {
        const rows = (cur[t.id] || []).map((r, j) => {
          if (j !== i) return r;
          const n = { ...r, [f.id]: withOcr };
          Object.entries(res.values).forEach(([cid, v]) => { if (empty(n[cid]) || !manual.current.has(`${r._key}:${cid}`)) n[cid] = v; });
          return n;
        });
        apply({ ...cur, [t.id]: rows });
      } else {
        const n = { ...cur, [f.id]: withOcr };
        Object.entries(res.values).forEach(([fid, v]) => { if (empty(n[fid])) n[fid] = v; });
        apply(n);
      }
      showToast(filled ? `AI filled ${filled} field${filled > 1 ? 's' : ''} from ${file.name}` : `${file.name} attached. Fill in the details.`);
    } catch (e) {
      showToast(`${file.name} attached. Couldn't read it automatically, so fill in the details.`, { tone: 'bad' });
    } finally { setOcrBusy((b) => ({ ...b, [key]: false })); }
  };

  if (err) return <div className="screen"><TopBar title="New request" back="/app/new" /><div className="content"><ErrorNote text={err} /></div></div>;
  if (!meta || !schema || !state) return <div className="screen"><TopBar title="New request" back="/app/new" /><div className="content"><Skeleton n={6} h={64} /></div></div>;

  const { vals, options, rowOptions, required } = state;
  const visible = schema.fields.filter((f) => !f.hidden && (!NO_INPUT.has(f.type) || f.type === 'DIVIDER') && !isTechnicalLabel(f.label));
  const unsupported = visible.filter((f) => !SUPPORTED.has(f.type) && required.has(f.id));
  const budgetField = schema.fields.find((f) => /budget/i.test(f.label) && !empty(vals[f.id]));
  const loadingLists = Object.keys(schema.need).some((k) => !masters[k]);

  const submit = async () => {
    const e = validate(schema, vals, required);
    setErrs(e); setSubmitErr('');
    if (Object.keys(e).length) {
      showToast(`${Object.keys(e).length} required field${Object.keys(e).length > 1 ? 's are' : ' is'} missing`, { tone: 'bad' });
      const firstTable = Object.keys(e).find((k) => k.includes(':'));
      if (firstTable) { const [tid, idx] = firstTable.split(':'); const r = (vals[tid] || [])[Number(idx)]; if (r) setOpen((o) => ({ ...o, [r._key]: true })); }
      setTimeout(() => { const el = document.querySelector('[data-err="1"]'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 50);
      return;
    }
    try {
      // files inside the form: store them in the workflow repository first (uploadWithOcr), then reference them
      let cur = valsRef.current;
      const staged = [];
      const fileJobs = [];
      schema.fields.forEach((f) => {
        if (FILE_TYPES.has(f.type) && cur[f.id] && cur[f.id].file && !cur[f.id].fileId) fileJobs.push({ f, at: null });
        if (f.type === 'TABLE') (cur[f.id] || []).forEach((r, i) => f.columns.forEach((c) => { if (FILE_TYPES.has(c.type) && r[c.id] && r[c.id].file && !r[c.id].fileId) fileJobs.push({ f: c, at: { t: f, i } }); }));
      });
      for (let k = 0; k < fileJobs.length; k += 1) {
        const { f, at } = fileJobs[k];
        setBusy(`Uploading file ${k + 1} of ${fileJobs.length}…`);
        const entry = at ? cur[at.t.id][at.i][f.id] : cur[f.id];
        const up = await uploadWithOcr(meta.repositoryId, entry, ocrTargets(f, schema));
        const done = { ...entry, fileId: up.fileId, repositoryId: up.repositoryId };
        if (at) { cur = { ...cur, [at.t.id]: cur[at.t.id].map((r, j) => (j === at.i ? { ...r, [f.id]: done } : r)) }; staged.push({ fieldId: f.id, fieldName: f.label, fileId: up.fileId, fileName: entry.fileName, jsonId: f.id, repositoryId: up.repositoryId }); } else cur = { ...cur, [f.id]: done };
      }
      valsRef.current = cur;
      const formData = toPayload(schema, cur);
      setBusy(files.length ? 'Uploading and starting…' : 'Starting request…');
      const res = files.length ? await wfApi.startWithFile(workflowId, files[0], formData, staged) : await wfApi.startJson(workflowId, formData, staged);
      const instanceId = res && (res.instanceId || res.workflowInstanceId || res.id);
      const ref = (res && (res.requestNo || res.referenceNumber)) || 'New request';
      let failed = 0;
      for (let i = 1; i < files.length && instanceId; i += 1) {
        setBusy(`Attaching ${i + 1} of ${files.length}…`);
        try { await wfApi.uploadAttachment(workflowId, instanceId, files[i], meta.repositoryId); } catch (x) { failed += 1; }
      }
      if (comment.trim() && instanceId) { try { await wfApi.addComment(workflowId, instanceId, comment.trim()); } catch (x) { /* the request itself started */ } }
      bumpLive();
      const to = instanceId ? '/app/inbox/' + encodeURIComponent(workflowId + '~' + instanceId) : '/app/inbox?tab=sent';
      if (res && res.apAgentJobId) addNotif({ type: 'wf', title: `AI agent is reading ${ref}`, body: `${meta.name} · the document is being checked`, tone: 't', to });
      addNotif({ type: 'wf', title: `${ref} started`, body: meta.name, tone: 'p', to });
      showToast(failed ? `${ref} started, but ${failed} file${failed > 1 ? 's' : ''} didn't attach` : `${ref} started`, { tone: failed ? 'bad' : 'ok' });
      nav(to, { replace: true });
    } catch (x) {
      setBusy('');
      const msg = x && x.status === 403 ? "You don't have access to start this workflow."
        : x && x.status === 400 ? `EZOFIS couldn't start it${x.message && !/^Request failed/.test(x.message) ? ': ' + x.message : '. The workflow may not be active, or a value is invalid.'}`
          : apiErrorMessage(x, 'the new request');
      setSubmitErr(msg); showToast(msg, { tone: 'bad' });
    }
  };

  const rowStats = (t, r) => {
    const cols = t.columns.filter((c) => !c.hidden && !NO_INPUT.has(c.type));
    const filled = cols.filter((c) => (FILE_TYPES.has(c.type) ? r[c.id] && (r[c.id].file || r[c.id].fileId) : !empty(r[c.id]))).length;
    const missing = cols.filter((c) => required.has(c.id) && !c.readOnly && (FILE_TYPES.has(c.type) ? !(r[c.id] && (r[c.id].file || r[c.id].fileId)) : empty(r[c.id]))).length;
    return { filled, total: cols.length, missing };
  };

  return (
    <div className="screen">
      <TopBar title={meta.name} sub="New request" back="/app/new" right={budgetField ? <span className="budget-chip"><small>Budget</small>{Number(vals[budgetField.id]).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span> : <span />} />
      <div className="content" style={{ gap: 16 }}>
        {unsupported.length ? <div className="notice warn" role="alert"><Icon name="warn" size={18} /><span className="grow">This form has required fields the app can't fill yet ({unsupported.map((f) => f.label).join(', ')}). Start this request on cloud.ezofis.com.</span></div> : null}
        {masterErr ? <div className="notice warn"><Icon name="warn" size={18} /><span className="grow">{masterErr}</span></div> : null}
        {loadingLists ? <div className="notice info"><span className="spinner" /><span className="grow">Loading your details and lists…</span></div> : null}
        {visible.map((f) => {
          if (f.type === 'TABLE') {
            const rows = vals[f.id] || [];
            return (
              <section key={f.id} className="nr-table" data-err={errs[f.id] ? '1' : undefined}>
                <div className="row-between" style={{ alignItems: 'center' }}><b style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="grid" size={18} color="#643094" />{f.label}{required.has(f.id) ? <span className="req">*</span> : null}</b><button type="button" className="btn neutral small" style={{ width: 'auto', padding: '0 14px' }} onClick={() => addRow(f)}><Icon name="plus" size={16} />Add row</button></div>
                {errs[f.id] ? <span className="err" role="alert">{errs[f.id]}</span> : null}
                {!rows.length ? <button type="button" className="nr-empty-row" onClick={() => addRow(f)}>No rows yet · tap to add {f.label}</button> : null}
                {rows.map((r, i) => {
                  const st = rowStats(f, r);
                  const isOpen = open[r._key] !== false;
                  return (
                    <div key={r._key} className="nr-trow">
                      <div className="nr-row-h">
                        <span className="nr-row-n">{i + 1}</span>
                        <button type="button" className="nr-row-t" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [r._key]: !isOpen }))}>
                          <b>{f.label} {i + 1}</b>
                          <span><span className="pill neu solid" style={{ height: 20, fontSize: 11 }}>{st.filled} of {st.total} filled</span>{st.missing ? <span style={{ color: 'var(--bad)', fontSize: 11, fontWeight: 600 }}>{st.missing} required missing</span> : null}</span>
                        </button>
                        <button type="button" className="icon-btn" aria-label={`Delete row ${i + 1}`} onClick={() => removeRow(f, i)}><Icon name="close" size={18} color="#C2264B" /></button>
                      </div>
                      {isOpen ? (
                        <div className="nr-row-b">
                          {f.columns.filter((c) => !c.hidden && !NO_INPUT.has(c.type)).map((c) => (
                            <FieldInput key={c.id} f={c} value={r[c.id]} options={(rowOptions[f.id] && rowOptions[f.id][i] && rowOptions[f.id][i][c.id]) !== undefined ? rowOptions[f.id][i][c.id] : c.customOptions} required={required.has(c.id)} error={errs[`${f.id}:${i}:${c.id}`]} ocrBusy={ocrBusy[`${f.id}:${i}:${c.id}`]} onChange={(v) => setCell(f, i, c, v)} onFile={(file) => pickFile(c, file, f, i)} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            );
          }
          return <FieldInput key={f.id} f={f} value={vals[f.id]} options={options[f.id] !== undefined ? options[f.id] : f.customOptions} required={required.has(f.id)} error={errs[f.id]} ocrBusy={ocrBusy[f.id]} onChange={(v) => setField(f, v)} onFile={(file) => pickFile(f, file)} />;
        })}
        <section className="nr-card">
          <b style={{ fontSize: 15 }}>Attachments <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></b>
          {files.map((f, i) => (
            <div key={i} className="card t list-row"><FileThumb ext={(f.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4)} /><span className="ct" style={{ flex: 1, minWidth: 0, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span><button type="button" className="icon-btn" aria-label={'Remove ' + f.name} onClick={() => setFiles((l) => l.filter((_, j) => j !== i))}><Icon name="close" size={18} /></button></div>
          ))}
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => { const l = [...(e.target.files || [])]; e.target.value = ''; const big = l.filter(tooBig); if (big.length) showToast(`${big.map((f) => f.name).join(', ')} ${big.length > 1 ? 'are' : 'is'} over ${MAX_FILE_MB} MB and wasn't added`, { tone: 'bad' }); setFiles((x) => [...x, ...l.filter((f) => !tooBig(f))]); }} aria-label="Choose files" />
          <button type="button" className="upload-btn" onClick={() => fileRef.current && fileRef.current.click()}><Icon name="clip" size={18} />Add files<span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> · PDF, Office, images · max {MAX_FILE_MB} MB each</span></button>
        </section>
        <section className="nr-card">
          <label htmlFor="nr-comment" style={{ fontSize: 15, fontWeight: 600 }}>Comment <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
          <textarea id="nr-comment" className="input" rows={2} placeholder="Add a note for the approver" value={comment} onChange={(e) => setComment(e.target.value)} />
        </section>
        {submitErr ? <div className="notice bad" role="alert"><Icon name="warn" size={18} /><span className="grow">{submitErr}</span></div> : null}
      </div>
      <div className="bottombar" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <button type="button" className="btn neutral" disabled={!!busy} onClick={() => nav(-1)}>Cancel</button>
        <button type="button" className="btn primary" disabled={!!busy || unsupported.length > 0 || Object.values(ocrBusy).some(Boolean)} onClick={submit}>{busy ? <><span className="spinner" />{busy}</> : 'Submit'}</button>
      </div>
    </div>
  );
}

// Controls the app can fill in on New request: the shared control kinds plus choices, files and tables.
const SUPPORTED = new Set([...KNOWN_TYPES, 'SINGLE_SELECT', 'SINGLE_CHOICE', 'MULTI_SELECT', 'MULTIPLE_CHOICE', 'TABLE', 'FILE_UPLOAD', 'IMAGE_UPLOAD']);

export default function NewRequest() {
  const { wfId } = useParams();
  const { live } = useStore();
  const nav = useNavigate();
  if (!live) {
    return <div className="screen"><TopBar title="New request" back="/app/inbox" /><div className="content"><div className="notice info"><Icon name="user" size={18} /><span className="grow">Sign in to start a request in your EZOFIS workflows.</span><button type="button" onClick={() => nav('/login')}>Sign in</button></div></div></div>;
  }
  return wfId ? <StartForm workflowId={wfId} /> : <PickWorkflow />;
}

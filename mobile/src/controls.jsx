// Shared field controls for every screen that takes input: New request (formEngine), the approver's Edit form
// and the folder metadata form (MetaForm). Each V6 field type maps to one control "kind"; values are kept in the
// same shape the web stores (FieldRenderer.tsx / runtimeFieldAdapter.ts):
//   toggle / consent → true | false; time → 'HH:mm'; date → 'YYYY-MM-DD'; date-time → 'YYYY-MM-DD HH:mm';
//   currency → amount (or the V5 { currency, value } object when the stored value already has that shape);
//   phone → string (or the V5 { code, phoneNo } object when stored that way).
import React, { useEffect, useRef, useState } from 'react';

// own icons, so this module doesn't import ui.jsx (ui → store → wf → controls would be a cycle)
const PATH = { star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z', pen: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8v.01', minus: 'M5 12h14', plus: 'M12 5v14M5 12h14', external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5' };
const Icon = ({ name, size = 18, fill = 'none' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATH[name]} /></svg>;

const str = (v) => (v === undefined || v === null ? '' : String(v));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const pad = (n) => String(n).padStart(2, '0');

// ---------- type → control kind ----------
const KIND = {
  LONG_TEXT: 'long', TEXT_BUILDER: 'long', HTML_EDITOR: 'long', JSON_EDITOR: 'long', MULTI_LINE: 'long', TEXTAREA: 'long',
  NUMBER: 'number', DECIMAL: 'number', INTEGER: 'number',
  CURRENCY_AMOUNT: 'currency', CURRENCY: 'currency',
  COUNTER: 'counter',
  DATE: 'date', TIME: 'time', DATE_TIME: 'datetime', DATETIME: 'datetime',
  EMAIL: 'email', PHONE: 'phone', PHONE_NUMBER: 'phone',
  URL: 'url', LINK: 'url', REDIRECT_TO_URL: 'url',
  PASSWORD: 'password',
  YES_NO_TOGGLE: 'toggle', CONSENT: 'consent',
  // smart templates: the V6 builder splits these into separate fields; older single fields are text, as on the web
  FULL_NAME: 'text', CONTACT_INFO: 'text', ADDRESS: 'long', ADDRESS_INFO: 'long',
  COUNTRY_CODE: 'dialcode', RATING: 'rating', OPINION_SCALE: 'scale', SIGNATURE: 'signature',
  CALCULATED: 'readonly', AUTO_GENERATED: 'readonly', OMR: 'readonly', SCORE: 'readonly', INVOICE_REPORT: 'readonly', FINANCIAL_AUDIT: 'readonly',
  DIVIDER: 'divider',
};
export const kindOf = (type) => KIND[str(type).toUpperCase()] || 'text';
// field types these controls fill in (choices, files and tables are rendered by the screens themselves)
export const KNOWN_TYPES = new Set([...Object.keys(KIND), 'SHORT_TEXT']);
// kinds a user can type into or toggle (everything except display-only ones)
export const isInputKind = (k) => k !== 'readonly' && k !== 'divider';

// ---------- value helpers ----------
export function toDate(v) {
  const s = str(v).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m) return m[1];
  const d = new Date(s);
  return s && !isNaN(d) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';
}
// 'HH:mm' from '14:05', '14:05:00', '2:05 PM' or an ISO date-time
export function toTime(v) {
  const s = str(v).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) { const d = new Date(s); return isNaN(d) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  const m = /(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*([AaPp][Mm])?/.exec(s);
  if (m) {
    let h = Number(m[1]);
    if (m[3]) { const pm = /p/i.test(m[3]); if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
    return h < 24 ? `${pad(h)}:${m[2]}` : '';
  }
  const d = new Date(s);
  return isNaN(d) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// stored date-time 'YYYY-MM-DD HH:mm' (web contract); ISO values with a zone are shown in local time
export function toDateTime(v) {
  const s = str(v).trim();
  if (!s) return '';
  if (/[T ]\d{1,2}:\d{2}.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const date = toDate(s);
  if (!date) return '';
  const rest = s.replace(/^\d{4}-\d{2}-\d{2}[T ]?/, '');
  return `${date} ${toTime(rest) || '00:00'}`;
}
export const isOn = (v) => v === true || /^(true|yes|1|on)$/i.test(str(v).trim());

export function phoneText(v) {
  let x = v;
  if (typeof x === 'string' && /^\s*\{/.test(x)) { try { x = JSON.parse(x); } catch (e) { return x; } }
  if (!isObj(x)) return str(x);
  const phone = str(x.phoneNo || x.phone || x.number).trim();
  const code = str(x.code || x.dialCode).trim();
  return phone && code && !phone.startsWith('+') && !phone.startsWith(code) ? `${code} ${phone}` : phone;
}
function nextPhone(prev, text) {
  if (!isObj(prev) || !('phoneNo' in prev || 'code' in prev)) return text;
  const m = /^(\+\d{1,4})[\s-]*(.*)$/.exec(text.trim());
  return { ...prev, code: m ? m[1] : prev.code || '+1', phoneNo: m ? m[2] : text.trim() };
}

export function currencyCode(v, settings) {
  if (isObj(v) && str(v.currency).trim()) return str(v.currency).trim().toUpperCase();
  const sp = (settings && settings.specific) || {};
  const c = sp.defaultCurrency || sp.currency || (Array.isArray(sp.specificCurrencies) ? sp.specificCurrencies[0] : '');
  return str(c).trim().toUpperCase() || 'USD';
}
export function currencyAmount(v) {
  let x = v;
  if (typeof x === 'string' && /^\s*\{/.test(x)) { try { x = JSON.parse(x); } catch (e) { /* plain text */ } }
  if (isObj(x)) x = x.value ?? x.amount ?? '';
  return str(x).trim().replace(/^[A-Z]{3}\s*/i, '').replace(/[$,\s]/g, '');
}
function nextCurrency(prev, amount) {
  return isObj(prev) && ('currency' in prev || 'value' in prev) ? { ...prev, value: amount } : amount;
}

const fmtNum = (n, digits) => Number(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
// read-only text for a value of this kind (detail screens, locked fields)
export function displayValue(kind, v, settings) {
  if (v === undefined || v === null || v === '') return '';
  if (kind === 'toggle' || kind === 'consent') return isOn(v) ? 'Yes' : 'No';
  if (kind === 'phone') return phoneText(v);
  if (kind === 'currency') { const a = currencyAmount(v); return a === '' ? '' : `${currencyCode(v, settings)} ${isNaN(Number(a)) ? a : fmtNum(a, 2)}`; }
  if (kind === 'time') { const t = toTime(v); return t ? fmtTime(t, settings) : str(v); }
  if (kind === 'datetime') { const dt = toDateTime(v); return dt ? `${fmtDay(dt.slice(0, 10))}, ${fmtTime(dt.slice(11), settings)}` : str(v); }
  if (kind === 'date') { const d = toDate(v); return d ? fmtDay(d) : str(v); }
  if (kind === 'password') return '••••••';
  if (kind === 'rating') return `${v} of ${ratingCount(settings)}`;
  if (kind === 'scale') return `${v} of 10`;
  if (kind === 'signature') return str(v).startsWith('data:image') ? 'Signed' : str(v);
  if (isObj(v)) return str(v.value ?? v.label ?? v.name ?? '');
  return str(v);
}
const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
function fmtTime(t, settings) {
  const [h, m] = t.split(':').map(Number);
  if (str(settings && settings.validation && settings.validation.timeFormat) === '24') return t;
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

// is the value empty for this kind? (a switched-off toggle still counts as answered; consent must be on)
export function isEmptyFor(kind, v) {
  if (kind === 'consent') return !isOn(v);
  if (kind === 'toggle' || kind === 'scale') return v === undefined || v === null || v === '';
  if (kind === 'rating') return !(Number(v) > 0);
  if (kind === 'currency') return currencyAmount(v) === '';
  if (kind === 'phone') return !phoneText(v).trim();
  if (Array.isArray(v)) return !v.length;
  return v === undefined || v === null || str(v).trim() === '';
}
// format problems the kind can check by itself (empty values are fine here; required is checked separately)
export function formatError(kind, v) {
  if (isEmptyFor(kind, v)) return '';
  if (kind === 'number' || kind === 'counter') return isNaN(Number(str(v).replace(/,/g, ''))) ? 'Enter a number' : '';
  if (kind === 'currency') return isNaN(Number(currencyAmount(v))) ? 'Enter an amount' : '';
  if (kind === 'email') return /^\S+@\S+\.\S+$/.test(str(v).trim()) ? '' : 'Enter a valid email';
  if (kind === 'url') return /^(https?:\/\/)?[^\s/]+\.[^\s]{2,}/i.test(str(v).trim()) ? '' : 'Enter a web address, like example.com';
  if (kind === 'phone') return /^\+?[\d\s()-]{5,}$/.test(phoneText(v).trim()) ? '' : 'Enter a phone number';
  return '';
}
// ---------- field settings rules (web runtimeValidation.ts / getDateTimeLimits) ----------
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// settings.validation date / time limits: MIN_* / MAX_* are years (date) or hours (time) from now, RANGE uses fixed bounds
export function limits(settings) {
  const v = (settings && settings.validation) || {};
  const out = {};
  const now = new Date();
  const years = (n) => { const d = new Date(now); d.setFullYear(d.getFullYear() + (Number(n) || 0)); return ymd(d); };
  const hours = (n) => { const d = new Date(now.getTime() + (Number(n) || 0) * 3600000); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  if (v.dateLimitType === 'MIN_DATE') out.minDate = years(v.minDateOffset);
  else if (v.dateLimitType === 'MAX_DATE') out.maxDate = years(v.maxDateOffset);
  else if (v.dateLimitType === 'RANGE') { if (v.fixedStartDate) out.minDate = toDate(v.fixedStartDate); if (v.fixedEndDate) out.maxDate = toDate(v.fixedEndDate); }
  if (v.minDate && !out.minDate) out.minDate = toDate(v.minDate);
  if (v.maxDate && !out.maxDate) out.maxDate = toDate(v.maxDate);
  if (v.timeLimitType === 'MIN_TIME') out.minTime = hours(v.minTimeOffset);
  else if (v.timeLimitType === 'MAX_TIME') out.maxTime = hours(v.maxTimeOffset);
  else if (v.timeLimitType === 'RANGE') { if (v.fixedStartTime) out.minTime = toTime(v.fixedStartTime); if (v.fixedEndTime) out.maxTime = toTime(v.fixedEndTime); }
  return out;
}
const EMAIL_RE = /^(?!\.)((?!.*\.{2})[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+)@(?!\.)([a-zA-Z0-9-]+)((\.([a-zA-Z0-9-]){2,63})+)$/i;
const URL_RE = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.?)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i;
const TEXT_RULES = {
  ALPHA: [/^[a-zA-Z\s]*$/, 'Use letters only'], ALPHABETIC: [/^[a-zA-Z\s]*$/, 'Use letters only'],
  ALPHA_SPACES: [/^[a-zA-Z\s]*$/, 'Use letters and spaces only'],
  ALPHA_DASH: [/^[a-zA-Z0-9_-]*$/, 'Use letters, numbers, hyphens and underscores only'],
  ALPHA_NUMERIC: [/^[a-zA-Z0-9\s]*$/, 'Use letters and numbers only'], ALPHANUMERIC: [/^[a-zA-Z0-9\s]*$/, 'Use letters and numbers only'], ALPHA_NUM: [/^[a-zA-Z0-9\s]*$/, 'Use letters and numbers only'],
  EMAIL: [EMAIL_RE, 'Enter a valid email'], WEB: [URL_RE, 'Enter a web address, like example.com'], URL: [URL_RE, 'Enter a web address, like example.com'],
};
const bound = (b) => (b === undefined || b === null || b === '' || !Number.isFinite(Number(b)) ? null : Number(b));
// settings-driven problem with a non-empty value (content rule, length, range, decimals, phone digits, date / time limits)
export function ruleError(type, kind, v, settings, vals = {}) {
  if (isEmptyFor(kind, v) || kind === 'toggle' || kind === 'consent' || kind === 'readonly') return '';
  const val = (settings && settings.validation) || {};
  const t = str(type).toUpperCase();
  const rule = str(val.contentRule || (kind === 'email' ? 'EMAIL' : kind === 'url' ? 'WEB' : '')).toUpperCase();
  const s = str(v).trim();
  if (kind === 'number' || kind === 'counter' || kind === 'currency') {
    const raw = str(currencyAmount(v)).replace(/,/g, ''); const n = Number(raw);
    if (!raw || !Number.isFinite(n)) return kind === 'currency' ? 'Enter an amount' : 'Enter a number';
    if ((rule === 'INTEGER' || rule === 'COMMAS') && !/^-?\d+$/.test(raw)) return 'Use a whole number (no decimals)';
    const lo = val.minimumNumberField ? bound(currencyAmount(vals[val.minimumNumberField])) : bound(val.minimum);
    const hi = val.maximumNumberField ? bound(currencyAmount(vals[val.maximumNumberField])) : bound(val.maximum);
    if (lo !== null && n < lo) return `Should be at least ${lo}`;
    if (hi !== null && n > hi) return `Should be at most ${hi}`;
    const dd = bound(val.decimalValue ?? val.decimalDigits);
    if (dd !== null && dd >= 0 && (raw.split('.')[1] || '').length > dd) return dd ? `Use at most ${dd} decimal place${dd > 1 ? 's' : ''}` : 'Use a whole number (no decimals)';
    return '';
  }
  if (kind === 'phone') { const d = phoneText(v).replace(/\D/g, ''); return d.length < 7 || d.length > 15 ? 'Enter a valid phone number' : ''; }
  if (kind === 'dialcode') return /^\+\d{1,4}$/.test(s) ? '' : 'Enter a dialing code, like +971';
  if (kind === 'rating' || kind === 'scale' || kind === 'signature') return '';
  if (kind === 'date' || kind === 'datetime') {
    const l = limits(settings); const d = toDate(kind === 'datetime' ? toDateTime(v) : v);
    if (l.minDate && d && d < l.minDate) return `Pick a date on or after ${displayValue('date', l.minDate)}`;
    if (l.maxDate && d && d > l.maxDate) return `Pick a date on or before ${displayValue('date', l.maxDate)}`;
    return '';
  }
  if (kind === 'time') {
    const l = limits(settings); const tm = toTime(v);
    if (l.minTime && tm && tm < l.minTime) return `Pick a time at or after ${fmtTime(l.minTime, settings)}`;
    if (l.maxTime && tm && tm > l.maxTime) return `Pick a time at or before ${fmtTime(l.maxTime, settings)}`;
    return '';
  }
  if (TEXT_RULES[rule] && !TEXT_RULES[rule][0].test(s)) return TEXT_RULES[rule][1];
  if ((rule === 'CUSTOM_REGEX' || val.customRegex) && (val.customRegex || val.regex)) { try { if (!new RegExp(val.customRegex || val.regex).test(str(v))) return val.customRegexMessage || 'This format is not valid'; } catch (e) { /* bad pattern in the form settings */ } }
  if (/^(SHORT_TEXT|LONG_TEXT|ADDRESS|PASSWORD)$/.test(t)) {
    const rt = str(val.rangeType).toUpperCase(); const lo = bound(val.minimum); const hi = bound(val.maximum);
    if (/^(MINIMUM|RANGE|MIN_FIXED_MAX_FLEX)$/.test(rt) && lo && s.length < lo) return `Use at least ${lo} characters`;
    if (/^(MAXIMUM|RANGE|MIN_FLEX_MAX_FIXED)$/.test(rt) && hi && s.length > hi) return `Use at most ${hi} characters`;
  }
  return formatError(kind, v);
}

// help text under a field (settings.general.description) and the tooltip behind an info button (no hover on phones)
export function TipButton({ settings, label }) {
  const [open, setOpen] = useState(false);
  const tip = str(settings && settings.general && settings.general.tooltip).trim();
  if (!tip) return null;
  return (
    <span className="ctl-tip">
      <button type="button" className="ctl-tip-btn" aria-label={`About ${label || 'this field'}`} aria-expanded={open} onClick={(e) => { e.preventDefault(); setOpen(!open); }}><Icon name="info" size={15} /></button>
      {open ? <span className="ctl-tip-text" role="note">{tip}</span> : null}
    </span>
  );
}
export function HelpText({ settings }) {
  const d = str(settings && settings.general && settings.general.description).trim();
  return d ? <span className="ctl-help">{d}</span> : null;
}
export const labelHidden = (settings) => !!(settings && settings.general && settings.general.hideLabel);

const openUrl = (v) => { const s = str(v).trim(); if (s) window.open(/^https?:\/\//i.test(s) ? s : 'https://' + s, '_blank', 'noopener'); };

// ---------- dial codes, rating, signature ----------
const DIAL = [['+1', 'United States / Canada'], ['+44', 'United Kingdom'], ['+61', 'Australia'], ['+64', 'New Zealand'], ['+91', 'India'], ['+971', 'United Arab Emirates'],
  ['+966', 'Saudi Arabia'], ['+974', 'Qatar'], ['+965', 'Kuwait'], ['+973', 'Bahrain'], ['+968', 'Oman'], ['+65', 'Singapore'], ['+60', 'Malaysia'], ['+62', 'Indonesia'],
  ['+63', 'Philippines'], ['+66', 'Thailand'], ['+84', 'Vietnam'], ['+86', 'China'], ['+852', 'Hong Kong'], ['+81', 'Japan'], ['+82', 'South Korea'], ['+92', 'Pakistan'],
  ['+880', 'Bangladesh'], ['+94', 'Sri Lanka'], ['+977', 'Nepal'], ['+20', 'Egypt'], ['+27', 'South Africa'], ['+234', 'Nigeria'], ['+254', 'Kenya'], ['+33', 'France'],
  ['+49', 'Germany'], ['+39', 'Italy'], ['+34', 'Spain'], ['+31', 'Netherlands'], ['+32', 'Belgium'], ['+41', 'Switzerland'], ['+46', 'Sweden'], ['+47', 'Norway'],
  ['+45', 'Denmark'], ['+353', 'Ireland'], ['+351', 'Portugal'], ['+48', 'Poland'], ['+90', 'Turkey'], ['+7', 'Russia / Kazakhstan'], ['+52', 'Mexico'], ['+55', 'Brazil'],
  ['+54', 'Argentina'], ['+57', 'Colombia'], ['+56', 'Chile']];
export const ratingCount = (settings) => { const sp = (settings && settings.specific) || {}; const n = Number(sp.iconCount || sp.ratingIconCount); return n > 0 && n <= 10 ? n : 5; };

// Draw-with-finger pad, cropped to the strokes → { dataUrl, ratio }. Also used for signing PDFs (DocActions).
export function SignaturePad({ onDone, onCancel, color = '#14101F' }) {
  const c = useRef(null);
  const [blank, setBlank] = useState(true);
  const last = useRef(null);
  useEffect(() => {
    const cv = c.current; const r = cv.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr); g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color;
  }, [color]);
  const pt = (e) => { const r = c.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e) => { e.preventDefault(); c.current.setPointerCapture(e.pointerId); last.current = pt(e); };
  const move = (e) => { if (!last.current) return; const g = c.current.getContext('2d'); const p = pt(e); g.beginPath(); g.moveTo(...last.current); g.lineTo(...p); g.stroke(); last.current = p; setBlank(false); };
  const up = () => { last.current = null; };
  const clear = () => { const cv = c.current; cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); setBlank(true); };
  // crop to the drawn area so the stamp isn't mostly empty space
  const use = () => {
    const cv = c.current; const g = cv.getContext('2d'); const { data, width, height } = g.getImageData(0, 0, cv.width, cv.height);
    let x0 = width; let y0 = height; let x1 = 0; let y1 = 0;
    for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) if (data[(y * width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const pad = 8; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(width, x1 + pad); y1 = Math.min(height, y1 + pad);
    const out = document.createElement('canvas'); out.width = Math.max(1, x1 - x0); out.height = Math.max(1, y1 - y0);
    out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    onDone({ dataUrl: out.toDataURL('image/png'), ratio: out.width / out.height });
  };
  return (
    <>
      <div className="sigpad-wrap"><canvas ref={c} className="sigpad" aria-label="Draw your signature" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} /><span className="sigpad-line" aria-hidden="true" />{blank ? <span className="sigpad-hint">Sign here with your finger</span> : null}</div>
      <div className="grid2"><button type="button" className="btn outline-grey" onClick={blank ? onCancel : clear}>{blank ? 'Cancel' : 'Clear'}</button><button type="button" className="btn primary" disabled={blank} onClick={use}>Use signature</button></div>
    </>
  );
}
// signature field: stored as a PNG data URL (the web has no drawing pad yet and keeps the value as text)
function SignatureField({ id, value, onChange, readOnly, error, settings }) {
  const [open, setOpen] = useState(false);
  const sp = (settings && settings.specific) || {};
  const v = str(value);
  if (open) return <div className="ctl-sign-pad" id={id}><SignaturePad color={sp.signaturePenColor || '#14101F'} onCancel={() => setOpen(false)} onDone={(s) => { onChange(s.dataUrl); setOpen(false); }} /></div>;
  return (
    <div className={'ctl-sign' + (error ? ' error' : '') + (readOnly ? ' locked' : '')} id={id}>
      {v.startsWith('data:image') ? <img src={v} alt="Signature" /> : v ? <span className="tx">{v}</span> : <span className="tx muted">{readOnly ? 'Not signed' : 'Not signed yet'}</span>}
      {!readOnly ? <span className="acts">{v ? <button type="button" className="chip" onClick={() => onChange('')}>Clear</button> : null}<button type="button" className="chip on" onClick={() => setOpen(true)}><Icon name="pen" size={14} />{v ? 'Sign again' : 'Sign'}</button></span> : null}
    </div>
  );
}

// ---------- the control ----------
// props: kind, id, value, onChange(value), readOnly, error (bool), placeholder, settings (field settings: general /
// specific / validation), label (consent / toggle text), found / onFocus are passed through.
export function Control({ kind, id, value, onChange, readOnly, error, placeholder, settings, label }) {
  const cls = 'input ' + (readOnly ? 'locked' : 'strong') + (error ? ' error' : '');
  const sp = (settings && settings.specific) || {};
  const lim = limits(settings);
  const pre = str(sp.prefixLabel); const suf = str(sp.suffixLabel);
  // prefix / suffix labels are shown around the box; the stored value stays as typed
  const text = (props) => {
    const input = <input id={id} className={pre || suf ? undefined : cls} readOnly={readOnly} placeholder={placeholder} value={str(value)} onChange={(e) => onChange(e.target.value)} {...props} />;
    if (!pre && !suf) return input;
    return <div className={'ctl-money' + (readOnly ? ' locked' : '') + (error ? ' error' : '')}>{pre ? <span className="cur">{pre}</span> : null}{input}{suf ? <span className="cur suf">{suf}</span> : null}</div>;
  };

  if (kind === 'divider') return <hr className="ctl-divider" />;
  if (kind === 'readonly') return <div className="input locked calc" id={id}>{displayValue('text', value) || '—'}</div>;

  if (kind === 'toggle' || kind === 'consent') {
    const on = isOn(value);
    const yes = sp.yesLabel || 'Yes';
    const no = sp.noLabel || 'No';
    const caption = kind === 'consent' ? (label || str(sp.customOptions).split(/\r?\n|,/)[0] || 'I agree') : on ? yes : value === false || /^(false|no)$/i.test(str(value)) ? no : 'Not set';
    return (
      <div className={'ctl-switch' + (error ? ' error' : '') + (readOnly ? ' locked' : '')}>
        <span className="tx">{caption}</span>
        <button type="button" id={id} role="switch" aria-checked={on} aria-label={label || caption} className="switch" disabled={readOnly} onClick={() => onChange(!on)} />
      </div>
    );
  }
  if (kind === 'signature') return <SignatureField id={id} value={value} onChange={onChange} readOnly={readOnly} error={error} settings={settings} />;
  if (kind === 'rating') {
    const n = ratingCount(settings); const cur = Number(value) || 0; const half = !!sp.allowHalfRating;
    // with half ratings, tapping the current star again switches between full and half
    const pick = (i) => onChange(half && cur === i ? i - 0.5 : half && cur === i - 0.5 ? i : cur === i ? 0 : i);
    return (
      <div className={'ctl-rating' + (error ? ' error' : '')} id={id} role="radiogroup">
        {Array.from({ length: n }, (_, k) => k + 1).map((i) => <button key={i} type="button" role="radio" aria-checked={cur >= i - 0.5 && cur <= i} aria-label={`${i} of ${n}`} disabled={readOnly} className={'star' + (cur >= i ? ' on' : cur >= i - 0.5 ? ' half' : '')} onClick={() => pick(i)}><Icon name="star" size={28} fill="currentColor" /></button>)}
        <span className="val">{cur ? `${cur} / ${n}` : ''}</span>
      </div>
    );
  }
  if (kind === 'scale') {
    const lab = sp.opinionLabels || {}; const cur = value === '' || value == null ? null : Number(value);
    return (
      <div className={'ctl-scale' + (error ? ' error' : '')} id={id}>
        <div className="nums" role="radiogroup">{Array.from({ length: 11 }, (_, i) => <button key={i} type="button" role="radio" aria-checked={cur === i} disabled={readOnly} className={cur === i ? 'on' : ''} onClick={() => onChange(cur === i ? '' : i)}>{i}</button>)}</div>
        {lab.min || lab.mid || lab.max ? <div className="labs"><span>{lab.min || ''}</span><span>{lab.mid || ''}</span><span>{lab.max || ''}</span></div> : null}
      </div>
    );
  }
  if (kind === 'dialcode') {
    return <><input id={id} className={cls} inputMode="tel" list={id + '-dial'} readOnly={readOnly} placeholder={placeholder || 'e.g. +971'} value={str(value)} onChange={(e) => onChange(e.target.value)} /><datalist id={id + '-dial'}>{DIAL.map(([c, n]) => <option key={c + n} value={c}>{n}</option>)}</datalist></>;
  }
  if (kind === 'long') return <textarea id={id} className={cls} rows={3} readOnly={readOnly} placeholder={placeholder} value={typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : str(value)} onChange={(e) => onChange(e.target.value)} />;
  if (kind === 'date') return <input id={id} className={cls} type="date" readOnly={readOnly} min={lim.minDate} max={lim.maxDate} value={toDate(value)} onChange={(e) => onChange(e.target.value)} />;
  if (kind === 'time') return <input id={id} className={cls} type="time" readOnly={readOnly} min={lim.minTime} max={lim.maxTime} value={toTime(value)} onChange={(e) => onChange(e.target.value)} />;
  if (kind === 'datetime') {
    const dt = toDateTime(value);
    return <input id={id} className={cls} type="datetime-local" readOnly={readOnly} min={lim.minDate ? lim.minDate + 'T00:00' : undefined} max={lim.maxDate ? lim.maxDate + 'T23:59' : undefined} value={dt.replace(' ', 'T')} onChange={(e) => onChange(e.target.value ? e.target.value.replace('T', ' ').slice(0, 16) : '')} />;
  }
  if (kind === 'number') { const r = str(settings && settings.validation && settings.validation.contentRule).toUpperCase(); return text({ inputMode: r === 'INTEGER' || r === 'COMMAS' ? 'numeric' : 'decimal' }); }
  if (kind === 'email') return text({ type: 'email', inputMode: 'email', autoCapitalize: 'off' });
  if (kind === 'password') return text({ type: 'password', autoComplete: 'off' });
  if (kind === 'phone') return <input id={id} className={cls} type="tel" inputMode="tel" readOnly={readOnly} placeholder={placeholder} value={phoneText(value)} onChange={(e) => onChange(nextPhone(value, e.target.value))} />;
  if (kind === 'url') {
    return (
      <div className="ctl-affix">
        <input id={id} className={cls} type="url" inputMode="url" autoCapitalize="off" readOnly={readOnly} placeholder={placeholder || 'https://'} value={str(value)} onChange={(e) => onChange(e.target.value)} />
        {str(value).trim() ? <button type="button" className="ctl-btn" aria-label="Open link" onClick={() => openUrl(value)}><Icon name="external" size={18} /></button> : null}
      </div>
    );
  }
  if (kind === 'currency') {
    return (
      <div className={'ctl-money' + (readOnly ? ' locked' : '') + (error ? ' error' : '')}>
        <span className="cur">{currencyCode(value, settings)}</span>
        <input id={id} inputMode="decimal" readOnly={readOnly} placeholder={placeholder || '0.00'} value={currencyAmount(value)} onChange={(e) => onChange(nextCurrency(value, e.target.value.replace(/[^\d.,-]/g, '')))} />
      </div>
    );
  }
  if (kind === 'counter') {
    const n = Number(str(value).replace(/,/g, '')) || 0;
    const min = sp.preventNegative ? 0 : -Infinity;
    const step = (d) => onChange(String(Math.max(min, n + d)));
    return (
      <div className={'ctl-counter' + (error ? ' error' : '')}>
        <button type="button" className="ctl-btn" aria-label="Decrease" disabled={readOnly || n <= min} onClick={() => step(-1)}><Icon name="minus" size={18} /></button>
        <input id={id} inputMode="numeric" readOnly={readOnly} value={str(value)} placeholder="0" onChange={(e) => { const v = e.target.value.replace(sp.preventNegative ? /[^\d]/g : /[^\d-]/g, ''); onChange(v); }} />
        <button type="button" className="ctl-btn" aria-label="Increase" disabled={readOnly} onClick={() => step(1)}><Icon name="plus" size={18} /></button>
      </div>
    );
  }
  return text({});
}

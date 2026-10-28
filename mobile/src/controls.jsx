// Shared field controls for every screen that takes input: New request (formEngine), the approver's Edit form
// and the folder metadata form (MetaForm). Each V6 field type maps to one control "kind"; values are kept in the
// same shape the web stores (FieldRenderer.tsx / runtimeFieldAdapter.ts):
//   toggle / consent → true | false; time → 'HH:mm'; date → 'YYYY-MM-DD'; date-time → 'YYYY-MM-DD HH:mm';
//   currency → amount (or the V5 { currency, value } object when the stored value already has that shape);
//   phone → string (or the V5 { code, phoneNo } object when stored that way).
import React from 'react';

// own icons, so this module doesn't import ui.jsx (ui → store → wf → controls would be a cycle)
const PATH = { minus: 'M5 12h14', plus: 'M12 5v14M5 12h14', external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5' };
const Icon = ({ name, size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATH[name]} /></svg>;

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
  if (kind === 'toggle') return v === undefined || v === null || v === '';
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
const openUrl = (v) => { const s = str(v).trim(); if (s) window.open(/^https?:\/\//i.test(s) ? s : 'https://' + s, '_blank', 'noopener'); };

// ---------- the control ----------
// props: kind, id, value, onChange(value), readOnly, error (bool), placeholder, settings (field settings: general /
// specific / validation), label (consent / toggle text), found / onFocus are passed through.
export function Control({ kind, id, value, onChange, readOnly, error, placeholder, settings, label }) {
  const cls = 'input ' + (readOnly ? 'locked' : 'strong') + (error ? ' error' : '');
  const sp = (settings && settings.specific) || {};
  const text = (props) => <input id={id} className={cls} readOnly={readOnly} placeholder={placeholder} value={str(value)} onChange={(e) => onChange(e.target.value)} {...props} />;

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
  if (kind === 'long') return <textarea id={id} className={cls} rows={3} readOnly={readOnly} placeholder={placeholder} value={typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : str(value)} onChange={(e) => onChange(e.target.value)} />;
  if (kind === 'date') return <input id={id} className={cls} type="date" readOnly={readOnly} value={toDate(value)} onChange={(e) => onChange(e.target.value)} />;
  if (kind === 'time') return <input id={id} className={cls} type="time" readOnly={readOnly} value={toTime(value)} onChange={(e) => onChange(e.target.value)} />;
  if (kind === 'datetime') {
    const dt = toDateTime(value);
    return <input id={id} className={cls} type="datetime-local" readOnly={readOnly} value={dt.replace(' ', 'T')} onChange={(e) => onChange(e.target.value ? e.target.value.replace('T', ' ').slice(0, 16) : '')} />;
  }
  if (kind === 'number') return text({ inputMode: 'decimal' });
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

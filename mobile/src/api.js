// EZOFIS Signup & Login API (see "Signup & Login API", 26 Oct 2026).
// Base path https://cloud.ezofis.com/api. Anonymous endpoints except /me/tenants.

// Login channel (LOGIN_CHANNEL_LOGGEDFROM_API, 26 Oct 2026): sent on POST /auth/ezofis/login only.
// Not sent on /auth/2fa/complete (server remembers it) or /auth/social/login (not accepted yet).
export const LOGGED_FROM = 'MOBILE';

export const API_BASE = 'https://cloud.ezofis.com/api';
const SESSION_KEY = 'ezofis.session';

// The app reaches the API only from the Android/iOS app (native HTTP) or the test APK. In a normal browser page
// (e.g. the Claude artifact preview) the browser blocks the calls: the page's security policy forbids outside
// connections, and cloud.ezofis.com rejects the CORS preflight that the X-Tenant-Id header triggers.
export const IS_BROWSER_PREVIEW = (() => {
  try {
    const cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) return false;
    if (location.protocol === 'file:') return false; // test APK loads the app from file:///android_asset
    return !/(^|\.)ezofis\.com$/.test(location.hostname);
  } catch (e) { return false; }
})();
export const PREVIEW_MSG = "This web preview can't connect to EZOFIS. Sign in from the Android app (APK), or tap \"Explore with sample data\" to try the screens.";

export class ApiError extends Error {
  constructor(status, message, body) { super(message); this.status = status; this.body = body; }
}

export async function request(path, { method = 'GET', body, tenantId, token, timeout = 20000 } = {}) {
  const headers = { Accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  if (token) headers.Authorization = 'Bearer ' + token;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined, signal: ctrl.signal });
  } catch (e) {
    throw new ApiError(0, ctrl.signal.aborted ? 'EZOFIS is taking too long to respond. Try again.' : IS_BROWSER_PREVIEW ? PREVIEW_MSG : "Can't reach EZOFIS. Check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { message: text }; }
  if (!res.ok) {
    const serverMsg = data && (data.message || data.error || data.title || data.detail);
    throw new ApiError(res.status, serverMsg || `Request failed (${res.status})`, data);
  }
  return data;
}

// Authenticated call with the stored session (Bearer + X-Tenant-Id on every call, per the Workflow API doc).
// 401 means the token expired or was revoked: the session is cleared and the app returns to sign-in.
// Some endpoints answer 401 for "not allowed" too, so before signing out the token is checked once against
// /me/tenants (cached for 5 seconds, so a burst of calls checks once); a token that still works keeps the session and the call fails as "no access".
export const SESSION_EXPIRED = 'ezofis:session-expired';
let lastCheck = { token: '', at: 0, ok: false };
async function tokenStillValid(s) {
  if (lastCheck.token === s.accessToken && Date.now() - lastCheck.at < 5000) return lastCheck.ok;
  let ok = false;
  try { await request('/me/tenants', { token: s.accessToken }); ok = true; } catch (e) { ok = !(e instanceof ApiError && e.status === 401); }
  lastCheck = { token: s.accessToken, at: Date.now(), ok };
  return ok;
}
async function on401(s, e) {
  if (s && s.expiresAt > Date.now() && await tokenStillValid(s)) { e.status = 403; e.message = "You don't have access to this in EZOFIS."; return e; }
  clearSession(); window.dispatchEvent(new Event(SESSION_EXPIRED)); e.message = 'Your session has ended. Sign in again.'; return e;
}
export async function authed(path, opts = {}) {
  const s = loadSession();
  if (!s) { window.dispatchEvent(new Event(SESSION_EXPIRED)); throw new ApiError(401, 'Your session has ended. Sign in again.'); }
  try {
    return await request(path, { ...opts, token: s.accessToken, tenantId: s.tenantId });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) await on401(s, e);
    throw e;
  }
}

// Authenticated binary download (attachments). Returns a Blob.
export async function authedBlob(path, { timeout = 60000 } = {}) {
  const s = loadSession();
  if (!s) { window.dispatchEvent(new Event(SESSION_EXPIRED)); throw new ApiError(401, 'Your session has ended. Sign in again.'); }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(API_BASE + path, { headers: { Accept: '*/*', Authorization: 'Bearer ' + s.accessToken, 'X-Tenant-Id': s.tenantId }, signal: ctrl.signal });
  } catch (e) {
    throw new ApiError(0, ctrl.signal.aborted ? 'The file is taking too long to download. Try again.' : IS_BROWSER_PREVIEW ? PREVIEW_MSG : "Can't reach EZOFIS. Check your internet connection and try again.");
  } finally { clearTimeout(timer); }
  if (res.status === 401) throw await on401(s, new ApiError(401, 'Your session has ended. Sign in again.'));
  if (!res.ok) throw new ApiError(res.status, `Download failed (${res.status})`);
  return res.blob();
}

// Friendly text for any non-auth API failure.
export function apiErrorMessage(e, what = 'this') {
  if (!(e instanceof ApiError)) return `Couldn't load ${what}. Try again.`;
  if (e.status === 0 || e.status === 401) return e.message;
  if (e.status === 403) return "You don't have access to " + what + '.';
  if (e.status === 404) return what[0].toUpperCase() + what.slice(1) + " wasn't found. It may have moved on.";
  if (e.status >= 500) return 'EZOFIS had a problem loading ' + what + '. Try again in a moment.';
  return e.message || `Couldn't load ${what}.`;
}

// Same token lookup as the cloud.ezofis.com web client: accessToken | token | access_token,
// at the top level or inside identity / data / result.
function flatten(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const inner = [raw.identity, raw.data, raw.result].find((x) => x && typeof x === 'object' && !Array.isArray(x)) || {};
  const pick = (o) => [o.accessToken, o.token, o.access_token].map((v) => String(v || '').trim()).find(Boolean) || '';
  const token = pick(raw) || pick(inner);
  const merged = { ...inner, ...raw };
  return token ? { ...merged, accessToken: token } : merged;
}

// Only tenantId / name / role are read from tenant objects (never databaseName or connectionString).
const cleanTenants = (list) => (list || []).map((t) => ({ tenantId: t.tenantId, name: t.name, role: t.role }));

export const authApi = {
  async tenants(email) {
    const d = await request('/auth/tenants?email=' + encodeURIComponent(email.trim()));
    return { tenants: cleanTenants(d && d.tenants), requiresOrgSelection: !!(d && d.requiresOrgSelection) };
  },
  // Returns { kind: 'success' | '2fa' | 'setPassword', ...data }
  async login(email, password, tenantId) {
    const raw = await request('/auth/ezofis/login', { method: 'POST', body: { email: email.trim(), password, loggedFrom: LOGGED_FROM }, tenantId });
    const d = flatten(raw);
    // A token in the response always means signed in; the code screen appears only when the API sends a 2FA challenge.
    if (d && d.accessToken) return { kind: 'success', ...d };
    if (d && d.tempToken) return { kind: '2fa', ...d };
    if (d && d.shareToken) return { kind: 'setPassword', ...d };
    throw new ApiError(500, 'Unexpected sign-in response.', d);
  },
  async complete2fa(tempToken, code, tenantId) {
    const d = flatten(await request('/auth/2fa/complete', { method: 'POST', body: { tempToken, code: code.trim() }, tenantId }));
    if (!d || !d.accessToken) throw new ApiError(500, 'Unexpected verification response.', d);
    return d;
  },
  async social(email, provider, tenantId) {
    // The web client sends GOOGLE / MICROSOFT in upper case.
    const d = flatten(await request('/auth/social/login', { method: 'POST', body: { email: email.trim(), provider: String(provider).toUpperCase() }, tenantId }));
    if (!d || !d.accessToken) throw new ApiError(500, 'Unexpected sign-in response.', d);
    return d;
  },
  async meTenants(token) {
    const d = await request('/me/tenants', { token });
    return cleanTenants(d && d.tenants);
  },
};

// Friendly messages for each endpoint's documented errors.
export function loginErrorMessage(err, stage) {
  if (!(err instanceof ApiError)) return 'Something went wrong. Try again.';
  if (err.status === 0) return err.message;
  if (err.status === 401) {
    if (stage === '2fa') return 'That code is wrong or has expired. Check it, or sign in again for a new code.';
    if (stage === 'social') return err.message && /password/i.test(err.message) ? 'This email signs in with a password. Use your email and password instead.' : 'This account isn\'t set up for this sign-in method in your organization.';
    return 'Email or password is incorrect.';
  }
  if (err.status === 400) return 'Some details are missing or invalid. Check them and try again.';
  if (err.status >= 500) return 'EZOFIS couldn\'t sign you in right now. Try again in a few minutes' + (err.message ? ` (${err.message})` : '') + '.';
  return err.message || 'Sign-in failed. Try again.';
}

// ---- session (production: move to secure storage, e.g. Android Keystore / iOS Keychain)
export function saveSession(login, tenant, email) {
  const s = {
    accessToken: login.accessToken, tokenType: login.tokenType || 'Bearer', userId: login.userId,
    expiresAt: Date.now() + (Number(login.expiresIn) || 86400) * 1000,
    tenantId: tenant.tenantId, tenantName: tenant.name, role: tenant.role, email,
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); localStorage.setItem(LAST_KEY, JSON.stringify({ email, tenantId: tenant.tenantId })); } catch (e) { /* storage unavailable */ }
  return s;
}
// last signed-in email and organization, to prefill the sign-in screen (no token or password)
const LAST_KEY = 'ezofis.lastLogin';
export function lastLogin() { try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null') || {}; } catch (e) { return {}; } }
export function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return s && s.accessToken && s.expiresAt > Date.now() ? s : null;
  } catch (e) { return null; }
}
export function updateSession(patch) {
  const s = loadSession();
  if (!s) return null;
  const n = { ...s, ...patch };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(n)); } catch (e) { /* storage unavailable */ }
  return n;
}
export function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* storage unavailable */ } }

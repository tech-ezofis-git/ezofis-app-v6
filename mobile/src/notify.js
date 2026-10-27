// Phone (system) notifications, separate from the in-app notification list.
//  • Capacitor build (release): @capacitor/local-notifications
//  • Test APK shell: a native bridge in the WebView client, reached through window.prompt('ezofis:…')
//  • Browser / preview: the Web Notification API when the browser allows it
// Preference is stored per device: ezofis.phoneNotify = 'on' | 'off' (default on once permission is granted).

const PREF = 'ezofis.phoneNotify';
const isCapNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const isShell = () => !isCapNative() && location.protocol === 'file:' && /Android/i.test(navigator.userAgent);

let capPlugin = null;
async function cap() {
  if (!capPlugin) capPlugin = (await import('@capacitor/local-notifications')).LocalNotifications;
  return capPlugin;
}
function shell(cmd, arg) {
  try { const r = window.prompt('ezofis:' + cmd, arg == null ? '' : String(arg)); return r == null ? null : String(r); } catch (e) { return null; }
}

export function phonePref() { try { return localStorage.getItem(PREF) !== 'off'; } catch (e) { return true; } }
export function setPhonePref(on) { try { localStorage.setItem(PREF, on ? 'on' : 'off'); } catch (e) { /* ignore */ } }

// 'granted' | 'denied' | 'prompt' | 'unsupported'
export async function permission() {
  try {
    if (isCapNative()) { const p = await (await cap()).checkPermissions(); return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'prompt'; }
    if (isShell()) { const r = shell('perm', 'check'); return r === 'granted' ? 'granted' : r === 'denied' ? 'prompt' : 'unsupported'; }
    if ('Notification' in window) return Notification.permission === 'default' ? 'prompt' : Notification.permission;
  } catch (e) { /* fall through */ }
  return 'unsupported';
}

export async function requestPermission() {
  try {
    if (isCapNative()) { const p = await (await cap()).requestPermissions(); return p.display === 'granted' ? 'granted' : 'denied'; }
    if (isShell()) {
      shell('perm', 'ask'); // Android shows its own dialog; the answer is read back when the app regains focus
      await new Promise((res) => setTimeout(res, 400));
      return await waitForShellAnswer();
    }
    if ('Notification' in window) { const r = await Notification.requestPermission(); return r === 'default' ? 'prompt' : r; }
  } catch (e) { /* fall through */ }
  return 'unsupported';
}
function waitForShellAnswer() {
  return new Promise((resolve) => {
    let n = 0;
    const t = setInterval(() => {
      const r = shell('perm', 'check');
      if (r === 'granted' || ++n > 40) { clearInterval(t); resolve(r === 'granted' ? 'granted' : 'denied'); }
    }, 500);
  });
}

let nid = 1;
// Shows a phone notification. Returns true when one was posted.
export async function phoneNotify(title, body, extra = {}) {
  if (!phonePref()) return false;
  try {
    if (isCapNative()) {
      await (await cap()).schedule({ notifications: [{ id: (Date.now() % 2147483000) + (nid++), title, body, extra, smallIcon: 'ic_launcher', autoCancel: true }] });
      return true;
    }
    if (isShell()) return shell('notify', `${title}\n${body}`) === 'ok';
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, { body, tag: extra.tag || undefined });
      n.onclick = () => { window.focus(); if (extra.route) location.hash = extra.route; n.close(); };
      return true;
    }
  } catch (e) { /* notifications are best-effort */ }
  return false;
}

// Taps on a Capacitor notification open the request it is about.
export async function onNotificationTap(go) {
  if (!isCapNative()) return () => {};
  const h = await (await cap()).addListener('localNotificationActionPerformed', (a) => { const r = a && a.notification && a.notification.extra && a.notification.extra.route; if (r) go(r); });
  return () => h.remove();
}

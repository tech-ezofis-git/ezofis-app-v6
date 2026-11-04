// Server push (Firebase Cloud Messaging) for new inbox requests: the only notification Android delivers while the
// phone is locked (Doze). The app registers this phone's push token with EZOFIS (POST /api/me/push-devices) after
// sign-in and removes it on sign-out; the server's recurring inbox check sends the pushes.
// Built in only when android/app/google-services.json exists (__PUSH__, set in vite.config.js): without it Firebase
// isn't initialised and registering would crash. Until the server confirms push is on, the background check
// (background.js) keeps notifying; once it's on, that check is paused so nothing is announced twice.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { request } from './api.js';
import { bgSession } from './background.js';

/* global __PUSH__ */
const TOKEN_KEY = 'ezofis.pushToken'; // registered with EZOFIS
const SEEN_TOKEN = 'ezofis.pushTokenLocal'; // issued by Firebase (shown in Settings for a Firebase console test)
export const pushToken = () => { try { return localStorage.getItem(SEEN_TOKEN) || ''; } catch (e) { return ''; } };
export const pushRegistered = () => { try { return !!localStorage.getItem(TOKEN_KEY); } catch (e) { return false; } };
export const pushAvailable = () => (typeof __PUSH__ !== 'undefined' && __PUSH__) && Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('PushNotifications');

let listening = false;
let current = null; // session the token is being registered for

async function sendToken(token, s) {
  try {
    const r = await request('/me/push-devices', { method: 'POST', body: { token, platform: Capacitor.getPlatform() }, token: s.accessToken, tenantId: s.tenantId });
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* storage unavailable */ }
    // server push is on: pause the local background check so each request is announced once
    if (r && r.pushEnabled) bgSession(s, false);
  } catch (e) { /* server without the endpoint yet: the background check keeps notifying */ }
}

// Called with the session after sign-in / app start (notifications on), and with null to stop.
export async function pushRegister(s) {
  current = s;
  if (!pushAvailable() || !s) return;
  try {
    let p = await PushNotifications.checkPermissions();
    if (p.receive !== 'granted') p = await PushNotifications.requestPermissions();
    if (p.receive !== 'granted') return;
    // channel named in the server's message (android.notification.channel_id)
    await PushNotifications.createChannel({ id: 'ezofis-requests', name: 'New requests', description: 'Requests waiting for your action', importance: 4, visibility: 1 }).catch(() => {});
    if (!listening) {
      listening = true;
      await PushNotifications.addListener('registration', (t) => {
        if (!t || !t.value) return;
        try { localStorage.setItem(SEEN_TOKEN, t.value); } catch (e) { /* storage unavailable */ }
        if (current) sendToken(t.value, current);
      });
      await PushNotifications.addListener('registrationError', () => { /* the background check stays on */ });
    }
    await PushNotifications.register();
  } catch (e) { /* push unavailable on this phone: the background check stays on */ }
}

// Sign-out or notifications off: the server forgets this phone (needs the session still in hand).
export async function pushUnregister(s) {
  let token = null;
  try { token = localStorage.getItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) { /* storage unavailable */ }
  current = null;
  if (!pushAvailable() || !token || !s) return;
  try { await request('/me/push-devices', { method: 'DELETE', body: { token }, token: s.accessToken, tenantId: s.tenantId }); } catch (e) { /* the server drops dead tokens itself */ }
}

// Tapping a push opens the request it is about (route set by the server).
export async function onPushTap(go) {
  if (!pushAvailable()) return () => {};
  const h = await PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
    const r = a && a.notification && a.notification.data && a.notification.data.route;
    if (r) go(r);
  });
  return () => h.remove();
}

// Bridge to the background inbox check (public/runners/inbox.js, Capacitor Background Runner). It runs about every
// 15 minutes while the app is closed and posts a phone notification for new requests. The app hands it the session
// and the requests already shown; on the web or the SDK-free test APK (no plugin) these calls do nothing.
import { Capacitor } from '@capacitor/core';
import { BackgroundRunner } from '@capacitor/background-runner';

export const RUNNER = 'com.ezofis.mobile.inbox';
export const bgAvailable = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('BackgroundRunner');
const send = (event, details = {}) => (bgAvailable() ? BackgroundRunner.dispatchEvent({ label: RUNNER, event, details }).catch(() => null) : Promise.resolve(null));

// signed in → the runner may check; signed out (or notifications off) → it stops and forgets the token
export const bgSession = (s, enabled = true) => send('session', s ? { token: s.accessToken, tenantId: s.tenantId, expiresAt: s.expiresAt, enabled } : {});
export const bgSeen = (keys) => send('seen', { keys });
// Settings → Background check
export const bgStatus = () => send('status');
export const bgCheckNow = (by = 'check now') => send('checkInbox', { by });
export const bgTestNotification = () => send('testNotify');
export async function bgPermission() {
  if (!bgAvailable()) return 'unsupported';
  try { return (await BackgroundRunner.checkPermissions()).notifications || 'prompt'; } catch (e) { return 'prompt'; }
}
export async function bgAllowNotifications() {
  if (!bgAvailable()) return 'unsupported';
  try {
    const p = await BackgroundRunner.checkPermissions();
    if (p.notifications === 'granted') return 'granted';
    return (await BackgroundRunner.requestPermissions({ apis: ['notifications'] })).notifications || 'denied';
  } catch (e) { return 'denied'; }
}

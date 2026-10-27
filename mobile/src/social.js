// Native Google / Microsoft sign-in adapter.
//
// Per the API doc (section 7) the app completes native sign-in first to get a VERIFIED email, then calls
// POST /auth/social/login with that email + provider. The email is never typed by the user: the endpoint
// does not verify identity yet (documented known gap), so only an email returned by the provider SDK is sent.
//
// Android: android/app/src/main/java/com/ezofis/mobile/EzofisSocialAuthPlugin.java — Google via Credential Manager,
// Microsoft (Office 365 / Entra work accounts) via MSAL (res/raw/msal_config.json). iOS is not wired yet.
import { Capacitor, registerPlugin } from '@capacitor/core';

const EzofisSocialAuth = registerPlugin('EzofisSocialAuth');

export class SocialUnavailable extends Error {}
export class SocialCancelled extends Error {}

export function socialAvailable(provider) {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('EzofisSocialAuth') && (provider === 'google' || provider === 'microsoft');
}

export async function getProviderEmail(provider) {
  if (!socialAvailable(provider)) throw new SocialUnavailable(provider);
  const name = provider === 'microsoft' ? 'Microsoft' : 'Google';
  try {
    const res = await EzofisSocialAuth.signIn({ provider });
    if (!res || !res.email) throw new Error(`${name} didn't return an email address.`);
    return { email: res.email, name: res.displayName || '', idToken: res.idToken || '' };
  } catch (e) {
    if (e && e.code === 'CANCELLED') throw new SocialCancelled();
    if (e && (e.code === 'UNAVAILABLE' || e.code === 'NOT_CONFIGURED' || e.code === 'UNIMPLEMENTED')) throw new SocialUnavailable(provider);
    throw new Error(e && e.message ? `${name} sign-in failed: ${e.message}` : `${name} sign-in failed.`);
  }
}

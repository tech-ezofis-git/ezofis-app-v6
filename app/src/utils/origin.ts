/**
 * Checks if the current window origin / host is https://demoapp.ezofis.com
 */
export function isDemoAppOrigin(): boolean {
  if (typeof window === 'undefined') return false
  const origin = (window.location.origin || '').toLowerCase().replace(/\/$/, '')
  const hostname = (window.location.hostname || '').toLowerCase()
  return (
    origin === 'https://demoapp.ezofis.com' ||
    origin === 'https://demoapp.ezois.com' ||
    hostname === 'demoapp.ezofis.com' ||
    hostname === 'demoapp.ezois.com'
  )
}

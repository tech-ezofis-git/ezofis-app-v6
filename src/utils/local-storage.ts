// src/helpers/local-storage.ts (or .js)

// Small helpers to handle UTF-8 safely in the browser
const encodeBase64 = (value: string): string =>
  typeof window === 'undefined'
    ? Buffer.from(value, 'utf8').toString('base64') // SSR / Node fallback (if ever used)
    : btoa(unescape(encodeURIComponent(value)))

const decodeBase64 = (value: string): string =>
  typeof window === 'undefined'
    ? Buffer.from(value, 'base64').toString('utf8') // SSR / Node fallback
    : decodeURIComponent(escape(atob(value)))

/**
 * Save the given data to localStorage in base64 format
 *
 * 1. Serialize to string if dataType === 'OBJECT'
 * 2. Encode to base64
 * 3. Persist under the given key
 */
export const setToLocalStorage = (
  data: unknown,
  key: string,
  dataType: 'OBJECT' | 'STRING' = 'OBJECT',
): void => {
  if (!data || !key) return

  let value = data as string

  if (dataType === 'OBJECT') {
    value = JSON.stringify(data)
  }

  const payload = encodeBase64(String(value))
  window.localStorage.setItem(key, payload)
}

/**
 * Fetch and deserialize data from localStorage
 *
 * 1. Read base64 string
 * 2. Decode to UTF-8 string
 * 3. JSON.parse if dataType === 'OBJECT'
 */
export const getFromLocalStorage = <T = unknown>(
  key: string,
  dataType: 'OBJECT' | 'STRING' = 'OBJECT',
): T | string | undefined => {
  if (!key) return

  const stored = window.localStorage.getItem(key)
  if (!stored) return

  const decoded = decodeBase64(stored)

  if (dataType === 'OBJECT') {
    try {
      return JSON.parse(decoded) as T
    } catch (e) {
      console.error('Failed to parse localStorage JSON for key:', key, e)
      return undefined
    }
  }

  return decoded
}

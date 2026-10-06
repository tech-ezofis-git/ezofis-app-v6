/** Mask a value as ******789 (keep last `visibleChars` characters). */
export const maskPiiValue = (value: string, visibleChars = 3): string => {
  const raw = String(value ?? '')
  if (!raw) return ''
  if (raw.length <= visibleChars) {
    return '*'.repeat(raw.length)
  }
  const keep = raw.slice(-visibleChars)
  return `${'*'.repeat(raw.length - visibleChars)}${keep}`
}

export const normalizePiiToken = (value: string) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/** Digits-only form for loose matching of account numbers / phones. */
export const digitsOnly = (value: string) =>
  String(value || '').replace(/\D+/g, '')

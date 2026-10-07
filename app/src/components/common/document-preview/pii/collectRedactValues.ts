/** Common document labels / status words — never treat as PII. */
const SKIP_LABELS = new Set([
  'account',
  'active',
  'address',
  'amount',
  'bill',
  'billing',
  'branch',
  'canada',
  'company',
  'confidential',
  'currency',
  'customer',
  'date',
  'description',
  'document',
  'dubai',
  'email',
  'expired',
  'false',
  'from',
  'inactive',
  'invoice',
  'item',
  'items',
  'ltd',
  'n/a',
  'na',
  'name',
  'no',
  'none',
  'number',
  'order',
  'passport',
  'pending',
  'phone',
  'quantity',
  'ship',
  'shipping',
  'solutions',
  'status',
  'subtotal',
  'tax',
  'total',
  'true',
  'type',
  'vendor',
  'yes',
])

/** Heuristic: value looks like PII worth covering in the viewer. */
export const isLikelyPiiValue = (value: unknown): value is string => {
  if (value == null) return false
  const raw = String(value).trim()
  // Allow long addresses / multi-line PII chosen from folder field settings.
  if (raw.length < 4 || raw.length > 400) return false
  const lower = raw.toLowerCase()
  if (SKIP_LABELS.has(lower)) return false

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return true // ISO dates (DOB)
  if (/\S+@\S+\.\S+/.test(raw)) return true
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(raw)) return true

  // Digit-heavy identifiers (account / passport / CIF). Require 7+ digits
  // so short order nos like 80311 are not treated as PII by default.
  const digits = raw.replace(/\D+/g, '')
  if (digits.length >= 7) return true

  // Long opaque tokens that mix letters + digits (doc ids), but not
  // invoice-style labels like INV-2026-3101 when short alpha prefix only —
  // still allow if digit run is long enough (above) or token is opaque.
  if (
    /^[A-Z0-9][A-Z0-9_-]{7,}$/i.test(raw) &&
    /\d/.test(raw) &&
    /[A-Za-z]/.test(raw) &&
    digits.length >= 6
  ) {
    return true
  }

  // Person / company names (allow Ltd/Inc/LLC suffixes on the full string).
  if (/^[A-Za-z][A-Za-z0-9.'\-\s&,]{2,80}$/.test(raw)) {
    const words = raw.split(/\s+/).filter(Boolean)
    const companySuffix = new Set([
      'co',
      'company',
      'corp',
      'corporation',
      'inc',
      'incorporated',
      'limited',
      'llc',
      'llp',
      'ltd',
      'plc',
      'pvt',
    ])
    const coreWords = words.filter((w) => !companySuffix.has(w.toLowerCase()))
    if (coreWords.some((w) => SKIP_LABELS.has(w.toLowerCase()))) return false
    if (coreWords.length >= 2 && coreWords.every((w) => w.length >= 2)) {
      return true
    }
    // Single all-caps token (e.g. SCHNUR) — not a document label.
    if (
      words.length === 1 &&
      words[0].length >= 5 &&
      words[0] === words[0].toUpperCase() &&
      !SKIP_LABELS.has(words[0].toLowerCase())
    ) {
      return true
    }
  }
  return false
}

export const collectRedactValues = (
  values: Iterable<unknown> | Record<string, unknown> | null | undefined,
): string[] => {
  const out: string[] = []
  const seen = new Set<string>()

  const push = (value: unknown) => {
    if (!isLikelyPiiValue(value)) return
    const raw = String(value).trim()
    const key = raw.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(raw)
    // Individual tokens from multi-word person names only.
    if (/^[A-Za-z][A-Za-z.'\-\s]+$/.test(raw)) {
      const words = raw.split(/\s+/).filter(Boolean)
      if (words.length < 2) return
      for (const part of words) {
        if (part.length < 4 || SKIP_LABELS.has(part.toLowerCase())) continue
        const partKey = part.toLowerCase()
        if (seen.has(partKey)) continue
        seen.add(partKey)
        out.push(part)
      }
    }
  }

  if (!values) return out
  if (Array.isArray(values) || values instanceof Set) {
    for (const value of values) push(value)
    return out
  }
  if (typeof values === 'object') {
    for (const value of Object.values(values as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry && typeof entry === 'object') {
            for (const nested of Object.values(
              entry as Record<string, unknown>,
            )) {
              push(nested)
            }
          } else {
            push(entry)
          }
        }
      } else {
        push(value)
      }
    }
  }
  return out
}

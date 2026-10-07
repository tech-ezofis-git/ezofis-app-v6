import { digitsOnly, normalizePiiToken } from './maskPii'

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
/** UPI / handle-style ids (e.g. PAYTM@ICICI) — no TLD required. */
const UPI_RE = /\b[A-Z0-9][A-Z0-9._-]{1,64}@[A-Z][A-Z0-9._-]{1,64}\b/gi
/** Indian IFSC / similar bank routing codes. */
const IFSC_RE = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g
/** Account / MICR / phone-like digit runs (7+). Skip short dates/codes. */
const LONG_DIGIT_RE = /\b\d{7,}\b/g
/** Indian Aadhaar — 12 digits, optional spaces/hyphens. */
const AADHAAR_RE = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g
/** Indian PAN. */
const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/g
/** Capture values that sit next to common bank / ID document labels. */
const LABELED_VALUE_PATTERNS: RegExp[] = [
  /ACCOUNT\s*NO\.?\s*[:.]?\s*([0-9]{6,})/gi,
  /A\/C\s*(?:NO\.?|NUMBER)?\s*[:.]?\s*([0-9]{6,})/gi,
  /MICR\s*[:.]?\s*([0-9]{6,})/gi,
  /IFSC\s*(?:CODE)?\s*[:.]?\s*([A-Z]{4}0[A-Z0-9]{6})/gi,
  /(?:MOBILE|PHONE|TEL(?:EPHONE)?)\s*(?:NO\.?|NUMBER)?\s*[:.]?\s*([0-9+\-\s]{8,})/gi,
  /(?:CUSTOMER\s*ID|CUST\s*ID)\s*[:.]?\s*([A-Z0-9]{4,})/gi,
  /(?:PASSPORT|DOCUMENT)\s*(?:NO\.?|NUMBER|#)?\s*[:.]?\s*([A-Z]{1,2}\d{6,9}|[A-Z0-9]{6,})/gi,
  /Passport\s*No\.?\s*[:.]?\s*([A-Z]{1,2}\d{6,9})/gi,
  /Passeport\s*No\.?\s*[:.]?\s*([A-Z]{1,2}\d{6,9}|\d{8,9})/gi,
  /(?:AADHAAR|AADHAR|UIDAI|UID)\s*(?:NO\.?|NUMBER|#)?\s*[:.]?\s*([0-9\s-]{12,})/gi,
  /(?:PAN)\s*(?:NO\.?|NUMBER|#|CARD)?\s*[:.]?\s*([A-Z]{5}\d{4}[A-Z])/gi,
  /(?:DATE\s*OF\s*BIRTH|DOB|DATE\s*DE\s*NAISSANCE)\s*[/:]?\s*([0-9]{1,2}\s*[A-Z]{3,9}\s*[/A-Z\s]*[0-9]{2,4})/gi,
]

/**
 * Passport MRZ lines (TD3): P<BGDNAME<<GIVEN...
 * Real lines are ~44 chars; OCR/cropped text is often shorter — keep a low floor.
 * No trailing \b: lines end with `<`, which is not a word char.
 */
const MRZ_LINE_RE = /P<[A-Z]{3}[A-Z0-9<]{8,}/g
const MRZ_DATA_LINE_RE =
  /[A-Z0-9]{9}[0-9][A-Z]{3}[0-9]{7}[A-Z][0-9]{7}[A-Z0-9<]{6,}/g
/** Passport / travel doc numbers (e.g. AG8148412 or UK 304653070). */
const PASSPORT_NUMBER_RE = /\b(?:[A-Z]{1,2}\d{6,9}|\d{9})\b/g

/** Honorific + name lines common on Indian statements. */
const HONORIFIC_NAME_RE =
  /\b(?:MR|MRS|MS|MISS|DR|SHRI|SMT)\.?\s+([A-Z][A-Z.'\-\s]{2,48})/g

const MIN_KNOWN_LENGTH = 4

/** Document chrome that NER / loose patterns sometimes flag — never redact. */
const SKIP_PII_TOKENS = new Set([
  'account',
  'authority',
  'bangladesh',
  'bangladeshi',
  'bgd',
  'bill',
  'british',
  'citizen',
  'code',
  'country',
  'date',
  'document',
  'expiry',
  'gbr',
  'india',
  'invoice',
  'issue',
  'item',
  'items',
  'liverpool',
  'ltd',
  'nationality',
  'number',
  'order',
  'passeport',
  'passport',
  'place',
  'republic',
  'sex',
  'solutions',
  'surname',
  'total',
  'type',
  'ukpa',
  'united',
  'usa',
  'vendor',
])

/** ISO-ish 3-letter country / doc codes — never redact alone. */
const ISO_CODE_RE = /^[a-z]{3}$/i

const uniquePreserve = (values: string[]) => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const key = normalizePiiToken(value)
    if (!key || seen.has(key)) continue
    if (SKIP_PII_TOKENS.has(key)) continue
    if (ISO_CODE_RE.test(key.replace(/\s+/g, ''))) continue
    // Skip tiny alpha tokens — they match inside labels (INV ⊂ INVOICE).
    const letters = key.replace(/[^a-z]/g, '')
    const digits = key.replace(/\D+/g, '')
    if (letters.length > 0 && letters.length < 5 && digits.length < 6) continue
    // Skip bare MRZ country prefixes like P<GBR without a name body.
    if (/^p<[a-z]{3}$/i.test(key.replace(/\s+/g, ''))) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

const collectLabeledHits = (text: string): string[] => {
  const hits: string[] = []
  for (const pattern of LABELED_VALUE_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const raw = String(match[1] || '').trim()
      if (raw.length >= MIN_KNOWN_LENGTH) hits.push(raw)
    }
  }

  for (const pattern of [MRZ_LINE_RE, MRZ_DATA_LINE_RE]) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const raw = String(match[0] || '').trim()
      // Keep full MRZ lines only — fragment names (SCHNUR, GBR…) cause false boxes.
      if (raw.length >= 18) hits.push(raw)
      // Passport number is the first 9 chars of the MRZ data line.
      if (pattern === MRZ_DATA_LINE_RE && raw.length >= 9) {
        const passportNo = raw.slice(0, 9).replace(/</g, '')
        if (passportNo.length >= 8) hits.push(passportNo)
      }
    }
  }

  HONORIFIC_NAME_RE.lastIndex = 0
  let nameMatch: RegExpExecArray | null
  while ((nameMatch = HONORIFIC_NAME_RE.exec(text)) !== null) {
    const name = String(nameMatch[1] || '').trim()
    // Keep only the personal name — stop before address / flat numbers.
    const cleanedName = name
      .split(/,|\d+|INDIA|TAMIL|CHENNAI|\//i)[0]
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .join(' ')
    const honorific = String(nameMatch[0] || '')
      .split(/\s+/)[0]
      ?.replace(/\.$/, '')
    const full =
      honorific && cleanedName ? `${honorific} ${cleanedName}` : cleanedName
    if (full.length >= MIN_KNOWN_LENGTH && full.length <= 40) hits.push(full)
    if (cleanedName.length >= MIN_KNOWN_LENGTH) hits.push(cleanedName)
  }
  return hits
}

const collectRegexHits = (text: string): string[] => {
  if (!text) return []
  const hits: string[] = [...collectLabeledHits(text)]
  // Do not auto-match bare amounts — they paint wrong/shifted boxes on ledgers.
  const patterns = [
    EMAIL_RE,
    UPI_RE,
    IFSC_RE,
    PHONE_RE,
    SSN_RE,
    CARD_RE,
    AADHAAR_RE,
    PAN_RE,
    PASSPORT_NUMBER_RE,
    LONG_DIGIT_RE,
  ]
  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const raw = String(match[0] || '').trim()
      if (!raw) continue
      if (pattern === CARD_RE && digitsOnly(raw).length < 13) continue
      if (pattern === AADHAAR_RE && digitsOnly(raw).length !== 12) continue
      // Account / card style ids only (skip short cheque nos & statement crumbs).
      if (pattern === LONG_DIGIT_RE && digitsOnly(raw).length < 9) continue
      hits.push(raw)
    }
  }
  return hits
}

let nerPipelinePromise: Promise<
  | ((text: string) => Promise<Array<{ entity_group?: string; word?: string }>>)
  | null
> | null = null

const loadNerPipeline = async () => {
  if (nerPipelinePromise) return nerPipelinePromise
  nerPipelinePromise = (async () => {
    try {
      const { pipeline } = await import('@xenova/transformers')
      const ner = await pipeline(
        'token-classification',
        'Xenova/bert-base-NER',
        { aggregation_strategy: 'simple' } as any,
      )
      return ner as any
    } catch (error) {
      console.warn('[pii] NER model unavailable', error)
      return null
    }
  })()
  return nerPipelinePromise
}

const NER_ENTITY_GROUPS = new Set([
  'PER',
  'PERSON',
  'ORG',
  'LOC',
  'MISC',
  'PHONE',
  'EMAIL',
])

const collectNerHits = async (text: string): Promise<string[]> => {
  if (!text || text.length < 8) return []
  const sample = text.slice(0, 4000)
  try {
    const ner = await loadNerPipeline()
    if (!ner) return []
    const results = await ner(sample)
    if (!Array.isArray(results)) return []
    return results
      .filter((entry) => {
        const group = String(entry.entity_group || '')
          .toUpperCase()
          .replace(/^B-|^I-/, '')
        return NER_ENTITY_GROUPS.has(group)
      })
      .map((entry) =>
        String(entry.word || '')
          .replace(/^##/, '')
          .trim(),
      )
      .filter((word) => word.length >= MIN_KNOWN_LENGTH)
  } catch (error) {
    console.warn('[pii] NER inference failed', error)
    return []
  }
}

/**
 * Build the list of strings that should be redacted from page text.
 * Known values + regex run first (fast). NER is optional and must not
 * block redaction of form/OCR hits — transformers model download is slow.
 */
export const detectPiiValues = async (
  pageText: string,
  options: {
    enableNer?: boolean
    /** When set, only the supplied field values are redacted. */
    knownOnly?: boolean
    knownValues?: string[]
  } = {},
): Promise<string[]> => {
  const known = (options.knownValues || [])
    .map((value) => String(value || '').trim())
    .filter((value) => value.length >= MIN_KNOWN_LENGTH)

  if (options.knownOnly) {
    return uniquePreserve(known).sort((a, b) => b.length - a.length)
  }

  const regexHits = collectRegexHits(pageText)
  const fast = uniquePreserve([...known, ...regexHits]).sort(
    (a, b) => b.length - a.length,
  )

  if (!options.enableNer) return fast

  // Cap NER wait so scanned docs still redact via known/regex values.
  try {
    const nerHits = await Promise.race([
      collectNerHits(pageText),
      new Promise<string[]>((resolve) => {
        window.setTimeout(() => resolve([]), 2500)
      }),
    ])
    return uniquePreserve([...fast, ...nerHits]).sort(
      (a, b) => b.length - a.length,
    )
  } catch {
    return fast
  }
}

export const textContainsPiiValue = (haystack: string, needle: string) => {
  const h = normalizePiiToken(haystack)
  const n = normalizePiiToken(needle)
  if (!h || !n) return false
  if (h.includes(n)) return true
  const hd = digitsOnly(haystack)
  const nd = digitsOnly(needle)
  return Boolean(nd.length >= 6 && hd.includes(nd))
}

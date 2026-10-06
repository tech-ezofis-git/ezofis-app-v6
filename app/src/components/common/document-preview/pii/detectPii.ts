import { digitsOnly, normalizePiiToken } from './maskPii'

const EMAIL_RE =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
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

/** Capture values that sit next to common bank / ID document labels. */
const LABELED_VALUE_PATTERNS: RegExp[] = [
  /ACCOUNT\s*NO\.?\s*[:.]?\s*([0-9]{6,})/gi,
  /A\/C\s*(?:NO\.?|NUMBER)?\s*[:.]?\s*([0-9]{6,})/gi,
  /MICR\s*[:.]?\s*([0-9]{6,})/gi,
  /IFSC\s*(?:CODE)?\s*[:.]?\s*([A-Z]{4}0[A-Z0-9]{6})/gi,
  /(?:MOBILE|PHONE|TEL(?:EPHONE)?)\s*(?:NO\.?|NUMBER)?\s*[:.]?\s*([0-9+\-\s]{8,})/gi,
  /(?:CUSTOMER\s*ID|CUST\s*ID)\s*[:.]?\s*([A-Z0-9]{4,})/gi,
  /(?:PASSPORT|DOCUMENT)\s*(?:NO\.?|NUMBER|#)?\s*[:.]?\s*([A-Z0-9]{6,})/gi,
  /(?:SURNAME|GIVEN\s*NAMES?|NOM)\s*[/:]?\s*([A-Z][A-Z\s'-]{1,40})/gi,
  /(?:DATE\s*OF\s*BIRTH|DOB|DATE\s*DE\s*NAISSANCE)\s*[/:]?\s*([0-9]{1,2}\s*[A-Z]{3,9}\s*[/A-Z\s]*[0-9]{2,4})/gi,
]

/** Passport MRZ lines (TD3): P<GBRNAME<<GIVEN... */
const MRZ_LINE_RE = /\bP<[A-Z]{3}[A-Z0-9<]{39,}\b/g
const MRZ_DATA_LINE_RE = /\b[A-Z0-9]{9}[0-9][A-Z]{3}[0-9]{7}[A-Z][0-9]{7}[A-Z0-9<]{14,}[0-9]\b/g

/** Honorific + name lines common on Indian statements. */
const HONORIFIC_NAME_RE =
  /\b(?:MR|MRS|MS|MISS|DR|SHRI|SMT)\.?\s+([A-Z][A-Z.'\-\s]{2,48})/g

const MIN_KNOWN_LENGTH = 4

/** Document chrome that NER / loose patterns sometimes flag — never redact. */
const SKIP_PII_TOKENS = new Set([
  'account',
  'bill',
  'date',
  'document',
  'invoice',
  'item',
  'items',
  'ltd',
  'number',
  'order',
  'solutions',
  'total',
  'vendor',
])

const uniquePreserve = (values: string[]) => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const key = normalizePiiToken(value)
    if (!key || seen.has(key)) continue
    if (SKIP_PII_TOKENS.has(key)) continue
    // Skip tiny alpha tokens — they match inside labels (INV ⊂ INVOICE).
    const letters = key.replace(/[^a-z]/g, '')
    const digits = key.replace(/\D+/g, '')
    if (letters.length > 0 && letters.length < 5 && digits.length < 6) continue
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
      if (raw.length >= 20) hits.push(raw)
      // Passport number is the first 9 chars of the MRZ data line.
      if (pattern === MRZ_DATA_LINE_RE && raw.length >= 9) {
        hits.push(raw.slice(0, 9))
      }
      // Names from MRZ name line: P<GBRSCHNUR<<DANIEL<MARC<<
      if (pattern === MRZ_LINE_RE) {
        const namePart = raw.slice(5).replace(/</g, ' ').replace(/\s+/g, ' ').trim()
        for (const part of namePart.split(' ')) {
          if (part.length >= 4) hits.push(part)
        }
        if (namePart.length >= 4) hits.push(namePart)
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
  const patterns = [
    EMAIL_RE,
    UPI_RE,
    IFSC_RE,
    PHONE_RE,
    SSN_RE,
    CARD_RE,
    LONG_DIGIT_RE,
  ]
  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const raw = String(match[0] || '').trim()
      if (!raw) continue
      if (pattern === CARD_RE && digitsOnly(raw).length < 13) continue
      // Skip short years / dates mistaken as accounts (e.g. 20190616 alone is ok 8 digits)
      if (pattern === LONG_DIGIT_RE && digitsOnly(raw).length < 7) continue
      hits.push(raw)
    }
  }
  return hits
}

let nerPipelinePromise: Promise<
  ((text: string) => Promise<Array<{ entity_group?: string; word?: string }>>) | null
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
      .map((entry) => String(entry.word || '').replace(/^##/, '').trim())
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
    knownValues?: string[]
  } = {},
): Promise<string[]> => {
  const known = (options.knownValues || [])
    .map((value) => String(value || '').trim())
    .filter((value) => value.length >= MIN_KNOWN_LENGTH)

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

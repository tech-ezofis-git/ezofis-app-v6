/** Corporate suffixes — keep the company name, drop these as standalone tokens. */
const COMPANY_SUFFIXES = new Set([
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
  'sa',
  'sarl',
])

/** Field labels that imply company / party names on the document. */
const ORG_FIELD_RE =
  /supplier|vendor|company|organisation|organization|billfrom|billto|soldby|seller|buyer|customer|client|payee|payer|remitto|shipto/

export const normalizeFieldKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

/** True when selected folder field and sidebar label refer to the same field. */
export const fieldKeysMatch = (selectedKey: string, labelKey: string) => {
  if (!selectedKey || !labelKey) return false
  if (selectedKey === labelKey) return true
  if (selectedKey.length >= 4 && labelKey.includes(selectedKey)) return true
  if (labelKey.length >= 4 && selectedKey.includes(labelKey)) return true
  return false
}

export const isOrgLikeFieldKey = (key: string) => ORG_FIELD_RE.test(key)

/**
 * Expand a selected-field value so the viewer can grey it on the PDF.
 * Keeps the full string and significant words (company / person names).
 */
export const expandKnownValueTokens = (value: string): string[] => {
  const raw = String(value || '').trim()
  if (!raw || raw === '-') return []
  const out: string[] = [raw]
  const seen = new Set([raw.toLowerCase()])

  const push = (token: string) => {
    const t = token.trim()
    if (t.length < 3) return
    const key = t.toLowerCase()
    if (seen.has(key) || COMPANY_SUFFIXES.has(key)) return
    seen.add(key)
    out.push(t)
  }

  // Significant words from multi-word names / company titles.
  const words = raw.split(/[\s,/|]+/).filter(Boolean)
  if (words.length >= 2) {
    for (const word of words) {
      const cleaned = word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')
      if (cleaned.length >= 4) push(cleaned)
    }
    // Keep 2–3 word phrases (APEX INDUSTRIAL, STERLING MANUFACTURING…).
    for (let i = 0; i < words.length - 1; i++) {
      const a = words[i].replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')
      const b = words[i + 1].replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')
      if (
        a.length >= 3 &&
        b.length >= 3 &&
        !COMPANY_SUFFIXES.has(a.toLowerCase()) &&
        !COMPANY_SUFFIXES.has(b.toLowerCase())
      ) {
        push(`${a} ${b}`)
      }
    }
  }

  return out
}

/**
 * Collect mentioned (selected) field values from sidebar rows, with fuzzy
 * label matching and token expansion for company names.
 */
export const collectMentionedFieldValues = (
  rows: Iterable<{ label?: string; value?: unknown }>,
  selectedFieldKeys: Set<string>,
  getDisplayValue: (value: unknown) => string | null | undefined,
): string[] => {
  if (selectedFieldKeys.size === 0) return []
  const selected = [...selectedFieldKeys]
  const out: string[] = []
  const seen = new Set<string>()

  const pushAll = (value: string) => {
    for (const token of expandKnownValueTokens(value)) {
      const key = token.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(token)
    }
  }

  for (const row of rows) {
    const labelKey = normalizeFieldKey(String(row.label || ''))
    if (!labelKey) continue
    const matched = selected.some((key) => fieldKeysMatch(key, labelKey))
    if (!matched) continue
    const display = String(getDisplayValue(row.value) ?? '').trim()
    if (!display || display === '-') continue
    pushAll(display)
  }

  return out
}

export const selectedFieldsIncludeOrg = (selectedFieldKeys: Set<string>) =>
  [...selectedFieldKeys].some((key) => isOrgLikeFieldKey(key))

import type { FlagKeyword, SingleKeyword } from '@react-pdf-viewer/search'

/** Build PDF search keywords that prefer exact value matches over label fragments. */
export function buildFieldSearchKeyword(value: string): SingleKeyword | null {
  const keywords = buildFieldSearchKeywords(value)
  return keywords[0] ?? null
}

/** One or more keyword variants for a field value (amounts, dates, etc.). */
export function buildFieldSearchKeywords(value: string): SingleKeyword[] {
  const trimmed = getFieldDisplayValue(value)
  if (!trimmed) return []

  const keywords: SingleKeyword[] = []
  const seen = new Set<string>()

  const pushFlag = (keyword: string, options: Omit<FlagKeyword, 'keyword'>) => {
    const key = `f|${options.matchCase ? 'c' : 'i'}|${options.wholeWords ? 'w' : 'p'}|${keyword}`
    if (seen.has(key) || !keyword.trim()) return
    seen.add(key)
    keywords.push({ keyword, ...options })
  }

  const pushRegExp = (pattern: RegExp) => {
    const key = `r|${pattern.flags}|${pattern.source}`
    if (seen.has(key)) return
    seen.add(key)
    keywords.push(pattern)
  }

  // Single alphabetic word (e.g. INVOICE, Verifier).
  // All-caps: case-sensitive literal so "INVOICE" ≠ "Invoice" in "Invoice No".
  if (/^[A-Za-z]+$/i.test(trimmed)) {
    const isAllCaps =
      trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase()
    if (isAllCaps) {
      pushFlag(trimmed, { matchCase: true, wholeWords: false })
      pushFlag(trimmed, { matchCase: true, wholeWords: true })
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pushRegExp(new RegExp(escaped))
    } else {
      pushFlag(trimmed, { matchCase: false, wholeWords: true })
    }
    return keywords
  }

  // Exact value (codes, amounts, multi-word).
  pushFlag(trimmed, { matchCase: false, wholeWords: false })

  // 3-letter currency codes only — whole word (avoid partial matches).
  if (/^[A-Za-z]{3}$/.test(trimmed)) {
    pushFlag(trimmed, { matchCase: false, wholeWords: true })
    return keywords
  }

  // Amount variants: keep full phrase only — bare numbers match table lines/cells.
  const currencyMatch = trimmed.match(
    /^([A-Z]{3}|\$|€|£)\s*([\d,]+(?:\.\d+)?)$/i,
  )
  if (currencyMatch) {
    return keywords
  }

  if (/^[\d,]+(?:\.\d+)?$/.test(trimmed)) {
    return keywords
  }

  // ISO date → common PDF formats (e.g. 2026-07-24 → Jul 24 2026)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year, month - 1, day))
      const shortMonth = date.toLocaleString('en-US', {
        month: 'short',
        timeZone: 'UTC',
      })
      const longMonth = date.toLocaleString('en-US', {
        month: 'long',
        timeZone: 'UTC',
      })
      pushFlag(`${shortMonth} ${day} ${year}`, {
        matchCase: false,
        wholeWords: false,
      })
      pushFlag(`${shortMonth} ${String(day).padStart(2, '0')} ${year}`, {
        matchCase: false,
        wholeWords: false,
      })
      pushFlag(`${longMonth} ${day} ${year}`, {
        matchCase: false,
        wholeWords: false,
      })
      pushFlag(
        `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`,
        { matchCase: false, wholeWords: false },
      )
    }
  }

  return keywords
}

export function getFieldDisplayValue(value: unknown): string | null {
  const trimmed = String(value ?? '').trim()
  if (!trimmed || trimmed === '-' || trimmed.length < 2) return null
  return trimmed
}

/** All string variants used when searching a field value in the PDF. */
export function getFieldSearchVariantStrings(value: string): string[] {
  const keywords = buildFieldSearchKeywords(value)
  const variants: string[] = []
  const seen = new Set<string>()
  for (const keyword of keywords) {
    const source = keywordSource(keyword).trim()
    if (!source || seen.has(source)) continue
    seen.add(source)
    variants.push(source)
  }
  return variants
}

function keywordSource(keyword: SingleKeyword): string {
  if (typeof keyword === 'string') return keyword
  if (keyword instanceof RegExp) return keyword.source
  return String(keyword.keyword || '')
}

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

  // Amount / Currency value matching (e.g. 1582, $1,582.00, ₹1,582, Rs. 1582, etc.)
  const amountMatch = trimmed.match(
    /^(?:([A-Za-z]{3}|\$|€|£|₹|Rs\.?|INR)\s*)?([\d,]+(?:\.\d+)?)(?:\s*([A-Za-z]{3}|\$|€|£|₹|Rs\.?|INR))?$/i,
  )
  if (amountMatch && amountMatch[2]) {
    const rawNum = amountMatch[2]
    const cleanDigits = rawNum.replace(/,/g, '')
    const numFloat = Number.parseFloat(cleanDigits)

    if (!Number.isNaN(numFloat) && numFloat > 0) {
      const parts = cleanDigits.split('.')
      const intPart = parts[0]
      const decPart = parts[1]

      const intWithCommas = Number(intPart).toLocaleString('en-US')
      const intWithIndianCommas = Number(intPart).toLocaleString('en-IN')

      const numVariants = new Set<string>()
      numVariants.add(rawNum)
      numVariants.add(cleanDigits)

      if (decPart !== undefined) {
        numVariants.add(`${intWithCommas}.${decPart}`)
        numVariants.add(`${intWithIndianCommas}.${decPart}`)
        if (decPart === '00' || decPart === '0') {
          numVariants.add(intPart)
          numVariants.add(intWithCommas)
          numVariants.add(intWithIndianCommas)
        }
      } else {
        numVariants.add(intWithCommas)
        numVariants.add(intWithIndianCommas)
        numVariants.add(`${intWithCommas}.00`)
        numVariants.add(`${intWithIndianCommas}.00`)
        numVariants.add(`${cleanDigits}.00`)
      }

      const providedSym = amountMatch[1] || amountMatch[3]
      const symbolsToTry = new Set<string>()
      if (providedSym) {
        symbolsToTry.add(providedSym)
        const lower = providedSym.toLowerCase()
        if (lower === '$' || lower === 'usd') {
          symbolsToTry.add('$')
          symbolsToTry.add('USD')
        } else if (
          lower === '₹' ||
          lower === 'rs' ||
          lower === 'rs.' ||
          lower === 'inr'
        ) {
          symbolsToTry.add('₹')
          symbolsToTry.add('Rs.')
          symbolsToTry.add('Rs')
          symbolsToTry.add('INR')
        }
      } else {
        // When bare number is provided (e.g. 1582), check with common symbols present on invoice PDFs
        symbolsToTry.add('$')
        symbolsToTry.add('₹')
        symbolsToTry.add('Rs.')
        symbolsToTry.add('Rs')
        symbolsToTry.add('USD')
        symbolsToTry.add('CAD')
        symbolsToTry.add('INR')
      }

      // 1. Currency-prefixed variants (e.g. $1,582.00, ₹1,582.00, Rs. 1,582.00)
      for (const sym of symbolsToTry) {
        for (const num of numVariants) {
          pushFlag(`${sym}${num}`, { matchCase: false, wholeWords: false })
          pushFlag(`${sym} ${num}`, { matchCase: false, wholeWords: false })
        }
      }

      // 2. Bare number variants (e.g. 1,582.00, 1582.00, 1,582, 1582)
      for (const num of numVariants) {
        pushFlag(num, { matchCase: false, wholeWords: false })
      }

      return keywords
    }
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

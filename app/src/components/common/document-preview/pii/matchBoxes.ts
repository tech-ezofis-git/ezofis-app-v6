import { digitsOnly, maskPiiValue, normalizePiiToken } from './maskPii'
import type { RedactionArea, TextBox } from './types'

const sameLine = (a: TextBox, b: TextBox) =>
  Math.abs(a.top + a.height / 2 - (b.top + b.height / 2)) <=
  Math.max(a.height, b.height) * 0.45

/** Tight gap only — loose adjacency was joining description→amount columns. */
const adjacent = (left: TextBox, right: TextBox) => {
  const gap = right.left - (left.left + left.width)
  const maxGap = Math.min(
    0.9,
    Math.max(0.12, Math.min(left.height, right.height) * 0.35),
  )
  return gap >= -0.2 && gap <= maxGap
}

const mergeBoxes = (items: TextBox[]): TextBox => {
  const left = Math.min(...items.map((item) => item.left))
  const top = Math.min(...items.map((item) => item.top))
  const right = Math.max(...items.map((item) => item.left + item.width))
  const bottom = Math.max(...items.map((item) => item.top + item.height))
  return {
    height: bottom - top,
    left,
    pageIndex: items[0].pageIndex,
    text: items.map((item) => item.text).join(''),
    top,
    width: right - left,
  }
}

const boxesOverlap = (a: RedactionArea, b: RedactionArea) => {
  if (a.pageIndex !== b.pageIndex) return false
  const ax2 = a.left + a.width
  const ay2 = a.top + a.height
  const bx2 = b.left + b.width
  const by2 = b.top + b.height
  return a.left < bx2 && ax2 > b.left && a.top < by2 && ay2 > b.top
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * True when needle is the whole hay token, or a bounded token inside hay —
 * never a prefix/infix of a larger word (blocks INV⊂INVOICE).
 */
const isWholeTokenMatch = (hay: string, needle: string) => {
  if (!hay || !needle) return false
  if (hay === needle) return true
  try {
    const re = new RegExp(
      `(?:^|[^a-z0-9])${escapeRegExp(needle)}(?:[^a-z0-9]|$)`,
      'i',
    )
    return re.test(hay)
  } catch {
    return false
  }
}

/** Passport / travel doc ids like AG8148412 (1–2 letters + 6–9 digits). */
const isPassportStyleId = (value: string) =>
  /^[a-z]{1,2}\d{6,9}$/i.test(String(value || '').replace(/\s+/g, ''))

/** Numeric passport ids (UK etc.) — 8–9 digits. */
const isNumericPassportId = (value: string) =>
  /^\d{8,9}$/.test(String(value || '').replace(/\s+/g, ''))

const isPassportId = (value: string) =>
  isPassportStyleId(value) || isNumericPassportId(value)

/** Labels / chrome that must never receive a redaction box. */
const LABEL_BOX_RE =
  /^(type|code|nationality|surname|given|names?|sex|place|date|birth|issue|expiry|authority|passport|passeport|no\.?|number|#|of|de|du|des|the|and|or)$/i

const looksLikeMrz = (value: string) => {
  const raw = String(value || '').trim()
  if (!raw) return false
  if (/^P<[A-Z]{3}/i.test(raw)) return true
  const fillers = (raw.match(/</g) || []).length
  if (fillers >= 3 && raw.length >= 18) return true
  // TD3 data line: passport no (alpha or numeric) + rest.
  if (/^[A-Z]{1,2}\d{6,9}[0-9A-Z<]{10,}/i.test(raw)) return true
  if (/^\d{9}[0-9A-Z<]{15,}/i.test(raw)) return true
  return false
}

/**
 * OCR often splits MRZ into many tiny adjacent word boxes. Join only
 * contiguous runs that actually look like MRZ (must contain `<<` fillers).
 * Never join a whole page row — that paints full-width grey bars on statements.
 */
const coverMrzLineGroups = (
  ordered: TextBox[],
  pageIndex: number,
  visibleChars: number,
): RedactionArea[] => {
  const sortedAll = [...ordered].sort((a, b) => {
    if (Math.abs(a.top - b.top) > Math.max(a.height, b.height) * 0.5) {
      return a.top - b.top
    }
    return a.left - b.left
  })

  const areas: RedactionArea[] = []
  let run: TextBox[] = []

  const flush = () => {
    if (run.length === 0) return
    const joinedTight = run.map((box) => box.text).join('')
    const fillers = (joinedTight.match(/</g) || []).length
    // Real MRZ lines always use `<` fillers — bank rows never should match.
    if (fillers < 3 && !/^P<[A-Z]{3}/i.test(joinedTight)) {
      run = []
      return
    }
    if (!looksLikeMrz(joinedTight) && fillers < 6) {
      run = []
      return
    }
    const merged = mergeBoxes(run)
    areas.push({
      ...merged,
      maskedLabel: maskPiiValue(joinedTight, visibleChars),
      pageIndex,
      sourceValue: joinedTight,
    })
    run = []
  }

  for (const box of sortedAll) {
    const text = String(box.text || '')
    const mrzChar = /[A-Z0-9<]/i.test(text) && (/</.test(text) || /^P/i.test(text) || run.length > 0)
    if (!mrzChar) {
      flush()
      continue
    }
    if (run.length === 0) {
      run = [box]
      continue
    }
    const prev = run[run.length - 1]
    if (sameLine(prev, box) && adjacent(prev, box)) {
      run.push(box)
    } else {
      flush()
      run = /</.test(text) || /^P</i.test(text) ? [box] : []
    }
  }
  flush()
  return areas
}

/** Drop full-page / full-row paints that are not real MRZ lines. */
const isOversizedNonMrzArea = (area: RedactionArea) => {
  const value = String(area.sourceValue || '')
  const fillers = (value.match(/</g) || []).length
  if (fillers >= 3 || /^P</i.test(value)) return false
  // Bank statement rows / bad text-layer widths — keep covers compact.
  return area.width > 28 || area.height > 3.2
}

/**
 * PDF text items often report a box as wide as the whole column/row.
 * Clamp width from the matched string length + font height.
 */
const tightenBoxToContent = (box: TextBox, matchedText: string): TextBox => {
  const text = String(matchedText || box.text || '').trim()
  if (!text) return box
  const compactLen = Math.max(1, text.replace(/\s+/g, '').length)
  const estCharW = Math.max(0.32, Math.min(1.1, box.height * 0.52))
  const estWidth = Math.min(100 - box.left, compactLen * estCharW * 1.2)
  const perChar = box.width / compactLen

  // Reported box much wider than the glyphs → clamp to estimate.
  if (box.width > estWidth * 1.25 && (box.width > 6 || perChar > 1.4)) {
    return {
      ...box,
      text,
      width: Math.max(1.2, Math.min(box.width, estWidth)),
    }
  }
  return { ...box, text }
}

/** Slice a box to cover only a digit-run match inside mixed text. */
const sliceBoxToDigits = (
  box: TextBox,
  hayRaw: string,
  needleDigits: string,
): TextBox => {
  const hay = hayRaw
  const hayDigits = digitsOnly(hay)
  const dIdx = hayDigits.indexOf(needleDigits)
  if (dIdx < 0 || hay.length === 0) return box

  let seen = 0
  let startChar = 0
  for (let i = 0; i < hay.length; i++) {
    if (/\d/.test(hay[i])) {
      if (seen === dIdx) {
        startChar = i
        break
      }
      seen++
    }
  }
  let digitCount = 0
  let endChar = startChar
  for (
    let i = startChar;
    i < hay.length && digitCount < needleDigits.length;
    i++
  ) {
    if (/\d/.test(hay[i])) digitCount++
    endChar = i + 1
  }
  const startRatio = startChar / hay.length
  const widthRatio = Math.max(0.08, (endChar - startChar) / hay.length)
  return {
    ...box,
    left: box.left + box.width * startRatio,
    text: needleDigits,
    width: box.width * widthRatio,
  }
}

/** Slice a box to the full alphanumeric passport id (keeps the AG prefix). */
const sliceBoxToPassportId = (
  box: TextBox,
  hayRaw: string,
  passportId: string,
): TextBox => {
  const hay = String(hayRaw || '').replace(/\s+/g, '')
  const id = String(passportId || '').replace(/\s+/g, '')
  if (!hay || !id) return box
  const idx = hay.toLowerCase().indexOf(id.toLowerCase())
  if (idx < 0) return box
  const startRatio = idx / hay.length
  const widthRatio = Math.max(0.1, id.length / hay.length)
  return {
    ...box,
    left: box.left + box.width * startRatio,
    text: id,
    width: box.width * widthRatio,
  }
}

/**
 * Find contiguous word boxes that spell each PII value.
 * Alphabetic matches require whole-token equality (no substring of labels).
 */
export const matchPiiToBoxes = (
  boxes: TextBox[],
  piiValues: string[],
  visibleChars = 3,
): RedactionArea[] => {
  // Still cover MRZ / passport boxes when detectPii returned nothing (image PDFs).
  if (!boxes.length) return []
  if (!piiValues.length) {
    const mrzOnly: RedactionArea[] = []
    const byPage = new Map<number, TextBox[]>()
    for (const box of boxes) {
      const list = byPage.get(box.pageIndex) || []
      list.push(box)
      byPage.set(box.pageIndex, list)
    }
    for (const [pageIndex, pageBoxes] of byPage) {
      const ordered = [...pageBoxes].sort((a, b) => {
        if (Math.abs(a.top - b.top) > Math.max(a.height, b.height) * 0.5) {
          return a.top - b.top
        }
        return a.left - b.left
      })
      mrzOnly.push(...coverMrzLineGroups(ordered, pageIndex, visibleChars))
      for (const box of ordered) {
        const compact = String(box.text || '').replace(/\s+/g, '')
        if (!isPassportId(compact)) continue
        if (box.width > 48) continue
        mrzOnly.push({
          ...box,
          maskedLabel: maskPiiValue(compact, visibleChars),
          pageIndex,
          sourceValue: compact,
        })
      }
    }
    return mrzOnly.filter((area) => !isOversizedNonMrzArea(area))
  }

  const byPage = new Map<number, TextBox[]>()
  for (const box of boxes) {
    const list = byPage.get(box.pageIndex) || []
    list.push(box)
    byPage.set(box.pageIndex, list)
  }

  const areas: RedactionArea[] = []

  for (const [pageIndex, pageBoxes] of byPage) {
    const ordered = [...pageBoxes].sort((a, b) => {
      if (Math.abs(a.top - b.top) > Math.max(a.height, b.height) * 0.5) {
        return a.top - b.top
      }
      return a.left - b.left
    })

    for (const value of piiValues) {
      const needle = normalizePiiToken(value)
      const needleCompact = needle.replace(/\s+/g, '')
      const needleDigits = digitsOnly(value)
      const passportStyle = isPassportId(needleCompact)
      const needleIsMostlyDigits =
        !passportStyle &&
        needleDigits.length >= 6 &&
        needleDigits.length >= Math.floor(needleCompact.length * 0.6)
      if (!needle && !needleDigits) continue
      // Short alpha fragments from OCR cause false grey boxes on labels.
      if (
        !passportStyle &&
        !needle.includes('<') &&
        needleDigits.length < 6 &&
        needleCompact.length < 5
      ) {
        continue
      }

      // Single-box match.
      for (const box of ordered) {
        const hayRaw = String(box.text || '')
        const hay = normalizePiiToken(hayRaw)
        const hayCompact = hay.replace(/\s+/g, '')
        const hayDigits = digitsOnly(box.text)
        if (!hay) continue
        if (LABEL_BOX_RE.test(hayCompact)) continue

        // Alphabetic / mixed IDs: whole token only (never INV inside INVOICE).
        const textHit =
          Boolean(needle) &&
          !needleIsMostlyDigits &&
          !passportStyle &&
          needleCompact.length >= 5 &&
          isWholeTokenMatch(hay, needle)

        // Passport Nos (AG8148412 or 304653070) — full id, not a partial slice.
        const passportHit = Boolean(
          passportStyle &&
            (hayCompact === needleCompact ||
              hayCompact.includes(needleCompact) ||
              (needleDigits.length >= 8 &&
                hayDigits.includes(needleDigits) &&
                (hayCompact.length <= needleCompact.length + 2 ||
                  looksLikeMrz(hayRaw)))),
        )

        // Passport MRZ (P<BGD…): allow contains — OCR keeps fillers / splits oddly.
        const mrzHit = Boolean(
          needle.includes('<') &&
            needle.length >= 8 &&
            hay.includes('<') &&
            (hay.includes(needle) ||
              needle.includes(hay) ||
              (hay.startsWith('p<') &&
                needle.startsWith('p<') &&
                hay.length >= 8)),
        )

        // Digit IDs: exact or contained digit-run (account numbers).
        const digitHit = Boolean(
          !passportStyle &&
            needleDigits.length >= 6 &&
            (hayDigits === needleDigits ||
              (needleIsMostlyDigits &&
                hayDigits.includes(needleDigits) &&
                (hayDigits === needleDigits ||
                  needleDigits.length >= 7 ||
                  hayDigits.length === needleDigits.length))),
        )

        if (!textHit && !digitHit && !mrzHit && !passportHit) continue

        // Don't cover a long label that only embeds a short digit run.
        if (
          digitHit &&
          !textHit &&
          !mrzHit &&
          !passportHit &&
          hay.length > needleDigits.length * 2.5 &&
          hayDigits !== needleDigits
        ) {
          continue
        }

        let sliced = box
        if (passportHit) {
          // Whole MRZ / data line → cover the full line; short field → full box;
          // otherwise slice to the AG######## span (keeps letter prefix).
          sliced = looksLikeMrz(hayRaw)
            ? box
            : hayCompact === needleCompact && box.width <= 48
              ? box
              : sliceBoxToPassportId(box, hayRaw, needleCompact)
        } else if (
          digitHit &&
          (hayDigits !== needleDigits || box.width > 36) &&
          hayDigits.includes(needleDigits)
        ) {
          sliced = sliceBoxToDigits(box, hayRaw, needleDigits)
        }

        const tightened = looksLikeMrz(String(sliced.text || hayRaw))
          ? sliced
          : tightenBoxToContent(sliced, value)

        // Reject full-row paints from bad PDF text-layer widths.
        if (
          tightened.width > 28 &&
          !looksLikeMrz(String(tightened.text || hayRaw))
        ) {
          continue
        }

        areas.push({
          ...tightened,
          maskedLabel: maskPiiValue(value, visibleChars),
          pageIndex,
          sourceValue: value,
        })
      }

      // Multi-box contiguous match for passport ids (AG + 8148412) and digit runs.
      if (passportStyle || needleDigits.length >= 6) {
        for (let start = 0; start < ordered.length; start++) {
          let joinedDigits = ''
          let joinedCompact = ''
          const run: TextBox[] = []
          for (let end = start; end < ordered.length; end++) {
            const next = ordered[end]
            if (run.length) {
              const prev = run[run.length - 1]
              if (!sameLine(prev, next) || !adjacent(prev, next)) break
            }
            const chunk = String(next.text || '').replace(/\s+/g, '')
            const chunkDigits = digitsOnly(next.text)
            if (passportStyle) {
              if (!chunk) {
                if (run.length) break
                continue
              }
              // Allow letter-only prefix chunks (AG) then digits.
              if (!/[a-z0-9]/i.test(chunk)) {
                if (run.length) break
                continue
              }
              run.push(next)
              joinedCompact += chunk.toLowerCase()
              joinedDigits += chunkDigits
              if (
                joinedCompact === needleCompact ||
                joinedCompact.includes(needleCompact)
              ) {
                const merged = tightenBoxToContent(mergeBoxes(run), value)
                if (merged.width <= 28 || looksLikeMrz(merged.text)) {
                  areas.push({
                    ...merged,
                    maskedLabel: maskPiiValue(value, visibleChars),
                    pageIndex,
                    sourceValue: value,
                  })
                }
                break
              }
              if (joinedCompact.length > needleCompact.length + 4) break
              continue
            }

            if (!chunkDigits) {
              if (run.length) break
              continue
            }
            if (
              chunkDigits.length <
              String(next.text).replace(/\s/g, '').length * 0.6
            ) {
              if (run.length) break
              continue
            }
            run.push(next)
            joinedDigits += chunkDigits
            if (joinedDigits === needleDigits) {
              const merged = tightenBoxToContent(mergeBoxes(run), value)
              if (merged.width <= 28) {
                areas.push({
                  ...merged,
                  maskedLabel: maskPiiValue(value, visibleChars),
                  pageIndex,
                  sourceValue: value,
                })
              }
              break
            }
            if (joinedDigits.length > needleDigits.length) break
          }
        }
      }

      // Multi-box exact text join for person names and MRZ fragments.
      if (
        needle.length >= 4 &&
        needle.length <= 80 &&
        !needleIsMostlyDigits &&
        /[a-z]/i.test(needle)
      ) {
        const maxParts = needle.includes('<') ? 12 : 6
        for (let start = 0; start < ordered.length; start++) {
          const run: TextBox[] = []
          for (
            let end = start;
            end < Math.min(ordered.length, start + maxParts);
            end++
          ) {
            const next = ordered[end]
            if (run.length) {
              const prev = run[run.length - 1]
              if (!sameLine(prev, next) || !adjacent(prev, next)) break
            }
            run.push(next)
            const joinedSpaced = normalizePiiToken(
              run.map((item) => item.text).join(' '),
            )
            const joinedTight = normalizePiiToken(
              run.map((item) => item.text).join(''),
            )
            if (
              joinedSpaced === needle ||
              joinedTight === needle ||
              (needle.includes('<') &&
                (joinedTight.includes(needle) || needle.includes(joinedTight)))
            ) {
              const merged = mergeBoxes(run)
              areas.push({
                ...merged,
                maskedLabel: maskPiiValue(value, visibleChars),
                pageIndex,
                sourceValue: value,
              })
              break
            }
            if (joinedTight.length > needle.length + 4) break
          }
        }
      }
    }

    // Cover full MRZ lines (joined across OCR word boxes) even when detectPii
    // missed them — this is what fails on image-only passport PDFs.
    areas.push(...coverMrzLineGroups(ordered, pageIndex, visibleChars))

    // Standalone passport numbers on the biodata page.
    const passportNeedles = piiValues
      .map((value) => String(value || '').replace(/\s+/g, '').toLowerCase())
      .filter((value) => isPassportId(value))

    for (const box of ordered) {
      const raw = String(box.text || '').trim()
      const compact = raw.replace(/\s+/g, '')
      if (LABEL_BOX_RE.test(compact)) continue
      const isMrzLine = looksLikeMrz(raw)
      const isPassportField = isPassportId(compact)
      const containsKnownPassport = passportNeedles.some((id) => {
        const idDigits = digitsOnly(id)
        return (
          compact.toLowerCase().includes(id) ||
          (idDigits.length >= 8 && digitsOnly(compact).includes(idDigits))
        )
      })
      if (!isMrzLine && !isPassportField && !containsKnownPassport) continue

      const tight = isMrzLine
        ? box
        : tightenBoxToContent(box, compact)
      if (!isMrzLine && tight.width > 28) continue

      areas.push({
        ...tight,
        maskedLabel: maskPiiValue(raw, visibleChars),
        pageIndex,
        sourceValue: raw,
      })
    }
  }

  const sorted = [...areas].sort(
    (a, b) => b.sourceValue.length - a.sourceValue.length,
  )
  const kept: RedactionArea[] = []
  for (const area of sorted) {
    const fillers = (String(area.sourceValue || '').match(/</g) || []).length
    const normalized =
      fillers >= 3 || /^P</i.test(String(area.sourceValue || ''))
        ? area
        : {
            ...area,
            ...tightenBoxToContent(area, area.sourceValue),
          }
    if (isOversizedNonMrzArea(normalized)) continue
    if (kept.some((existing) => boxesOverlap(existing, normalized))) continue
    kept.push(normalized)
  }
  return kept
}

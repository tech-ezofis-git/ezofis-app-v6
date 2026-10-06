import { digitsOnly, maskPiiValue, normalizePiiToken } from './maskPii'
import type { RedactionArea, TextBox } from './types'

const sameLine = (a: TextBox, b: TextBox) =>
  Math.abs(a.top + a.height / 2 - (b.top + b.height / 2)) <=
  Math.max(a.height, b.height) * 0.55

const adjacent = (left: TextBox, right: TextBox) => {
  const gap = right.left - (left.left + left.width)
  return gap >= -0.4 && gap <= Math.max(left.width, right.width) * 0.55
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

/**
 * Find contiguous word boxes that spell each PII value.
 * Alphabetic matches require whole-token equality (no substring of labels).
 */
export const matchPiiToBoxes = (
  boxes: TextBox[],
  piiValues: string[],
  visibleChars = 3,
): RedactionArea[] => {
  if (!boxes.length || !piiValues.length) return []

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
      const needleDigits = digitsOnly(value)
      const needleIsMostlyDigits =
        needleDigits.length >= 6 &&
        needleDigits.length >= Math.floor(needle.replace(/\s/g, '').length * 0.6)
      if (!needle && !needleDigits) continue

      // Single-box match.
      for (const box of ordered) {
        const hay = normalizePiiToken(box.text)
        const hayDigits = digitsOnly(box.text)
        if (!hay) continue

        // Alphabetic / mixed IDs: whole token only (never INV inside INVOICE).
        const textHit =
          Boolean(needle) &&
          !needleIsMostlyDigits &&
          isWholeTokenMatch(hay, needle)

        // Digit IDs: exact or contained digit-run (account numbers).
        const digitHit = Boolean(
          needleDigits.length >= 6 &&
            (hayDigits === needleDigits ||
              (needleIsMostlyDigits &&
                hayDigits.includes(needleDigits) &&
                // Avoid matching 80311 inside a longer unrelated run unless equal.
                (hayDigits === needleDigits ||
                  needleDigits.length >= 7 ||
                  hayDigits.length === needleDigits.length))),
        )

        if (!textHit && !digitHit) continue

        // Don't cover a long label that only embeds a short digit run.
        if (
          digitHit &&
          !textHit &&
          hay.length > needleDigits.length * 2.5 &&
          hayDigits !== needleDigits
        ) {
          continue
        }

        const sliced =
          digitHit && hayDigits !== needleDigits && hayDigits.includes(needleDigits)
            ? sliceBoxToDigits(box, box.text, needleDigits)
            : box

        areas.push({
          ...sliced,
          maskedLabel: maskPiiValue(value, visibleChars),
          pageIndex,
          sourceValue: value,
        })
      }

      // Multi-box contiguous digit match.
      if (needleDigits.length >= 6) {
        for (let start = 0; start < ordered.length; start++) {
          let joinedDigits = ''
          const run: TextBox[] = []
          for (let end = start; end < ordered.length; end++) {
            const next = ordered[end]
            if (run.length) {
              const prev = run[run.length - 1]
              if (!sameLine(prev, next) || !adjacent(prev, next)) break
            }
            const chunkDigits = digitsOnly(next.text)
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
              const merged = mergeBoxes(run)
              areas.push({
                ...merged,
                maskedLabel: maskPiiValue(value, visibleChars),
                pageIndex,
                sourceValue: value,
              })
              break
            }
            if (joinedDigits.length > needleDigits.length) break
          }
        }
      }

      // Multi-box exact text join for person names only.
      if (
        needle.length >= 4 &&
        needle.length <= 40 &&
        !needleIsMostlyDigits &&
        /[a-z]/i.test(needle)
      ) {
        for (let start = 0; start < ordered.length; start++) {
          let joined = ''
          const run: TextBox[] = []
          for (
            let end = start;
            end < Math.min(ordered.length, start + 6);
            end++
          ) {
            const next = ordered[end]
            if (run.length) {
              const prev = run[run.length - 1]
              if (!sameLine(prev, next) || !adjacent(prev, next)) break
            }
            run.push(next)
            joined = normalizePiiToken(run.map((item) => item.text).join(' '))
            if (joined === needle) {
              const merged = mergeBoxes(run)
              areas.push({
                ...merged,
                maskedLabel: maskPiiValue(value, visibleChars),
                pageIndex,
                sourceValue: value,
              })
              break
            }
            if (joined.length > needle.length) break
          }
        }
      }
    }
  }

  const sorted = [...areas].sort(
    (a, b) => b.sourceValue.length - a.sourceValue.length,
  )
  const kept: RedactionArea[] = []
  for (const area of sorted) {
    if (kept.some((existing) => boxesOverlap(existing, area))) continue
    kept.push(area)
  }
  return kept
}

import type { RedactionArea, TextBox } from './types'
import { maskPiiValue } from './maskPii'

/**
 * Covers for extra sensitive *labels* (folder PII values that are not folder fields, e.g.
 * "Opening Balance"): the value written next to the label ("Opening Balance: 1,456") or the
 * values under it in the same table column. The label text itself stays visible.
 */

const MAX_COLUMN_ROWS = 200
/** Max gap (in line heights) before the first column value, and between values. */
const FIRST_VALUE_GAP_LINES = 6
const NEXT_VALUE_GAP_LINES = 12
/** Max horizontal gap (page %) between a label and an inline value. */
const MAX_INLINE_GAP = 12
const SEPARATOR_RE = /^[\s:：\-–—=]+$/

const toWords = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

const right = (box: TextBox) => box.left + box.width
const bottom = (box: TextBox) => box.top + box.height
const midY = (box: TextBox) => box.top + box.height / 2
const sameRow = (a: TextBox, b: TextBox) =>
  Math.abs(midY(a) - midY(b)) <= Math.max(a.height, b.height) * 0.5
const hasDigit = (value: string) => /\d/.test(value)
const xOverlap = (box: TextBox, from: number, to: number) =>
  Math.max(0, Math.min(right(box), to) - Math.max(box.left, from))

const startsWith = (words: string[], prefix: string[]) =>
  prefix.length > 0 &&
  prefix.length <= words.length &&
  prefix.every((word, i) => words[i] === word)

const indexOfWords = (words: string[], target: string[]) => {
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((word, j) => words[i + j] === word)) return i
  }
  return -1
}

const mergeBoxes = (items: TextBox[]): TextBox => {
  const left = Math.min(...items.map((b) => b.left))
  const top = Math.min(...items.map((b) => b.top))
  return {
    height: Math.max(...items.map(bottom)) - top,
    left,
    pageIndex: items[0].pageIndex,
    text: items.map((b) => b.text).join(' '),
    top,
    width: Math.max(...items.map(right)) - left,
  }
}

const toArea = (box: TextBox, precise: boolean): RedactionArea => ({
  ...box,
  maskedLabel: maskPiiValue(box.text, 0),
  precise,
  sourceValue: box.text,
})

type LabelHit = {
  /** Bounding box of the whole label (may span two stacked lines). */
  box: TextBox
  /** Text item holding the label plus more text, e.g. "Opening Balance: 1,456". */
  container?: TextBox
  /** Exactly the label (a header cell), not a label inside longer text. */
  exact: boolean
  /** The label's last line, for inline values to its right. */
  lastLine: TextBox
  parts: TextBox[]
}

/** Label words split across items: side by side on one row, or stacked on the next line. */
const isLabelContinuation = (prev: TextBox, next: TextBox) => {
  if (sameRow(prev, next)) {
    const gap = next.left - right(prev)
    return gap >= -0.5 && gap <= Math.max(2, prev.height * 1.5)
  }
  const vGap = next.top - bottom(prev)
  return (
    vGap >= -prev.height * 0.3 &&
    vGap <= prev.height * 1.2 &&
    xOverlap(next, prev.left - 1, right(prev) + 1) > 0 &&
    Math.abs(next.left - prev.left) <= Math.max(3, prev.width)
  )
}

const findLabelHits = (page: TextBox[], label: string): LabelHit[] => {
  const target = toWords(label)
  if (!target.length) return []
  const hits: LabelHit[] = []
  const used = new Set<TextBox>()

  for (const box of page) {
    if (used.has(box)) continue
    const words = toWords(box.text)
    if (!words.length) continue

    if (indexOfWords(words, target) >= 0) {
      const exact = words.length === target.length
      hits.push({
        box,
        container: exact ? undefined : box,
        exact,
        lastLine: box,
        parts: [box],
      })
      used.add(box)
      continue
    }

    if (words.length >= target.length || !startsWith(target, words)) continue
    const parts = [box]
    let consumed = words.length
    while (consumed < target.length) {
      const remaining = target.slice(consumed)
      const prev = parts[parts.length - 1]
      const next = page.find((candidate) => {
        if (parts.includes(candidate) || used.has(candidate)) return false
        const candidateWords = toWords(candidate.text)
        return (
          (startsWith(remaining, candidateWords) ||
            startsWith(candidateWords, remaining)) &&
          isLabelContinuation(prev, candidate)
        )
      })
      if (!next) break
      parts.push(next)
      consumed += toWords(next.text).length
    }
    if (consumed < target.length) continue
    parts.forEach((part) => used.add(part))
    const lastLine = parts.reduce((a, b) => (b.top > a.top ? b : a))
    hits.push({
      box: mergeBoxes(parts),
      exact: consumed === target.length,
      lastLine,
      parts,
    })
  }
  return hits
}

/** "Opening Balance: 1,456" inside one text item → cover only the part after the label. */
const valueInsideContainer = (
  container: TextBox,
  label: string,
): TextBox | null => {
  const raw = String(container.text || '')
  const pattern = toWords(label)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^a-z0-9]+')
  const match = new RegExp(pattern, 'i').exec(raw)
  if (!match) return null
  const after = raw.slice(match.index + match[0].length)
  const separator = /^[\s:：\-–—=]*/.exec(after)?.[0] || ''
  const value = after.slice(separator.length).trimEnd()
  if (!/[a-z0-9]/i.test(value)) return null
  // Only a real "label: value" — not a label word inside a sentence.
  if (!/[:：\-–—=]/.test(separator) && !hasDigit(value)) return null
  const start = match.index + match[0].length + separator.length
  const perChar = container.width / Math.max(1, raw.length)
  return {
    ...container,
    left: container.left + perChar * start,
    text: value,
    width: perChar * value.length,
  }
}

const inlineValues = (page: TextBox[], hit: LabelHit): TextBox[] => {
  const row = page
    .filter(
      (box) =>
        !hit.parts.includes(box) &&
        sameRow(hit.lastLine, box) &&
        box.left >= right(hit.lastLine) - 0.3 &&
        box.left - right(hit.lastLine) <= MAX_INLINE_GAP,
    )
    .sort((a, b) => a.left - b.left)

  let sawSeparator = /[:：]\s*$/.test(String(hit.lastLine.text || ''))
  const out: TextBox[] = []
  for (const box of row) {
    const text = String(box.text || '').trim()
    if (!out.length && SEPARATOR_RE.test(text)) {
      sawSeparator = true
      continue
    }
    if (!out.length) {
      // A header beside a header (e.g. "Points Accrued") is not a value.
      if (!sawSeparator && !hasDigit(text)) return []
      out.push(box)
      continue
    }
    const prev = out[out.length - 1]
    if (box.left - right(prev) > Math.max(1.2, prev.height * 1.2)) break
    out.push(box)
  }
  return out
}

const columnValues = (
  page: TextBox[],
  hit: LabelHit,
  otherLabels: string[][],
): TextBox[] => {
  const header = hit.box
  const lineHeight = Math.max(...hit.parts.map((part) => part.height))
  const tolerance = Math.max(1, header.width * 0.25)
  const from = header.left - tolerance
  const to = right(header) + tolerance

  // Everything below the header: gaps are measured across the whole page, so a column with
  // empty cells (deposit-only rows) keeps going while the table's other columns have rows.
  const below = page
    .filter(
      (box) =>
        !hit.parts.includes(box) &&
        box.top >= bottom(header) - lineHeight * 0.2,
    )
    .sort((a, b) => a.top - b.top || a.left - b.left)

  const out: TextBox[] = []
  let lastBottom = bottom(header)
  let digitValues = 0
  let textValues = 0
  for (const box of below) {
    const gap = box.top - lastBottom
    const maxGap =
      out.length === 0
        ? lineHeight * FIRST_VALUE_GAP_LINES
        : lineHeight * NEXT_VALUE_GAP_LINES
    if (gap > maxGap) break // nothing on the page for a while: the table has ended
    lastBottom = Math.max(lastBottom, bottom(box))
    if (xOverlap(box, from, to) < Math.min(box.width, header.width) * 0.3) {
      continue // another column
    }
    const words = toWords(box.text)
    if (!words.length) continue
    // Next table's header row: stop.
    if (otherLabels.some((label) => startsWith(words, label.slice(0, 1)))) break
    // A number column ends where plain text starts (text under the table).
    if (!hasDigit(box.text)) {
      if (digitValues >= 1 && textValues === 0) break
      textValues++
    } else {
      digitValues++
    }
    // A text item spanning several columns: keep only the part under this header.
    const clipped =
      box.width > (to - from) * 3
        ? {
            ...box,
            left: Math.max(box.left, from),
            width: Math.min(right(box), to) - Math.max(box.left, from),
          }
        : box
    out.push(clipped)
    lastBottom = Math.max(lastBottom, bottom(box))
    if (out.length >= MAX_COLUMN_ROWS) break
  }
  return out
}

/**
 * Areas for the values belonging to each label in `labels`, on every page in `boxes`.
 * `precise` marks exact text-layer boxes (pass false for OCR boxes).
 */
export const findLabelValueAreas = (
  boxes: TextBox[],
  labels: string[],
  precise = true,
): RedactionArea[] => {
  const cleanLabels = Array.from(
    new Set(labels.map((label) => String(label || '').trim()).filter(Boolean)),
  )
  if (!boxes.length || !cleanLabels.length) return []
  const labelWords = cleanLabels.map(toWords)

  const byPage = new Map<number, TextBox[]>()
  for (const box of boxes) {
    const list = byPage.get(box.pageIndex) || []
    list.push(box)
    byPage.set(box.pageIndex, list)
  }

  const areas: RedactionArea[] = []
  for (const page of byPage.values()) {
    const ordered = [...page].sort((a, b) =>
      sameRow(a, b) ? a.left - b.left : a.top - b.top,
    )
    for (const label of cleanLabels) {
      for (const hit of findLabelHits(ordered, label)) {
        if (hit.container) {
          const inside = valueInsideContainer(hit.container, label)
          if (inside) areas.push(toArea(inside, precise))
          continue
        }
        const inline = inlineValues(ordered, hit)
        if (inline.length) {
          inline.forEach((box) => areas.push(toArea(box, precise)))
          continue
        }
        if (!hit.exact) continue
        columnValues(ordered, hit, labelWords).forEach((box) =>
          areas.push(toArea(box, precise)),
        )
      }
    }
  }
  return areas
}

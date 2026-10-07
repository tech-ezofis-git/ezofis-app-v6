import type { RedactionArea, TextBox } from './types'
import { detectPiiValues } from './detectPii'
import { extractPdfTextBoxes, isSparsePdfText } from './extractPdfBoxes'
import { matchPiiToBoxes } from './matchBoxes'
import { extractOcrTextBoxes, extractPdfPageOcrBoxes } from './ocrBoxes'

const DEFAULT_BG = '#ffffff'

type ComputePiiAreasArgs = {
  boostOrg?: boolean
  enableNer?: boolean
  fileUrl: string
  knownOnly?: boolean
  knownValues?: string[]
  mode: 'pdf' | 'image'
  signal?: AbortSignal
  visibleChars?: number
}

const withBackground = (areas: RedactionArea[]): RedactionArea[] =>
  areas.map((area) => ({
    ...area,
    backgroundColor: DEFAULT_BG,
  }))

const mergeAreasByPage = (
  existing: RedactionArea[],
  incoming: RedactionArea[],
  pageIndex: number,
): RedactionArea[] => [
  ...existing.filter((area) => area.pageIndex !== pageIndex),
  ...incoming,
]

const overlapRatio = (a: RedactionArea, b: RedactionArea) => {
  if (a.pageIndex !== b.pageIndex) return 0
  const ax2 = a.left + a.width
  const ay2 = a.top + a.height
  const bx2 = b.left + b.width
  const by2 = b.top + b.height
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.left, b.left))
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.top, b.top))
  const inter = ix * iy
  if (inter <= 0) return 0
  const union = a.width * a.height + b.width * b.height - inter
  return union > 0 ? inter / union : 0
}

const dedupeAreas = (areas: RedactionArea[]): RedactionArea[] => {
  // Prefer tighter boxes so doubles collapse to the correct glyph size.
  const sorted = [...areas].sort(
    (a, b) => a.width * a.height - b.width * b.height,
  )
  const kept: RedactionArea[] = []
  for (const area of sorted) {
    if (area.width < 0.8 || area.height < 0.35) continue
    const value = String(area.sourceValue || '')
    const isMrz =
      /P</i.test(value) || (value.match(/</g) || []).length >= 3
    const isPassportId =
      /^[A-Z]{1,2}\d{6,9}$/i.test(value.replace(/\s+/g, '')) ||
      /^\d{8,9}$/.test(value.replace(/\s+/g, ''))
    // Folder-selected values (names, addresses) are often wide — keep them.
    const isLongFieldValue =
      value.trim().length >= 12 ||
      value.includes(',') ||
      value.trim().split(/\s+/).length >= 3
    // Keep wide MRZ / long field covers; drop accidental wide paints.
    if (area.width > 55 && !isMrz && !isLongFieldValue) continue
    if (area.width > 32 && !isMrz && !isPassportId && !isLongFieldValue)
      continue
    if (kept.some((existing) => overlapRatio(existing, area) > 0.25)) continue
    kept.push(area)
  }
  return kept
}

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
}

/**
 * Shared PII box detection used by the live overlay and redacted download/print.
 */
export const computePiiAreas = async ({
  boostOrg = false,
  enableNer = false,
  fileUrl,
  knownOnly = false,
  knownValues = [],
  mode,
  signal,
  visibleChars = 3,
}: ComputePiiAreasArgs): Promise<RedactionArea[]> => {
  throwIfAborted(signal)

  if (mode === 'image') {
    const page = await extractOcrTextBoxes(fileUrl, 0)
    throwIfAborted(signal)
    const piiValues = await detectPiiValues(page.pageText, {
      boostOrg,
      enableNer,
      knownOnly,
      knownValues,
    })
    throwIfAborted(signal)
    return withBackground(matchPiiToBoxes(page.boxes, piiValues, visibleChars))
  }

  let pageCount = 1
  let textBoxes: TextBox[] = []
  let textLayerTexts: string[] = []
  try {
    const extracted = await extractPdfTextBoxes(fileUrl)
    throwIfAborted(signal)
    pageCount = Math.max(1, extracted.pageCount)
    textBoxes = extracted.boxes
    textLayerTexts = extracted.pageTexts
  } catch (error) {
    console.warn('[pii] pdf text layer failed', error)
  }

  const sparse = isSparsePdfText(textBoxes, pageCount)
  const joinedText = textLayerTexts.join('\n')
  const textHasMrz = /P<[A-Z]{3}/i.test(joinedText) || /<{3,}/.test(joinedText)

  let textMatched: RedactionArea[] = []
  if (!sparse) {
    const textLayerPii = await detectPiiValues(joinedText, {
      boostOrg,
      enableNer,
      knownOnly,
      knownValues,
    })
    throwIfAborted(signal)
    textMatched = withBackground(
      matchPiiToBoxes(textBoxes, textLayerPii, visibleChars),
    )
    const knownDigits = knownValues
      .map((v) => String(v).replace(/\D+/g, ''))
      .filter((d) => d.length >= 6)
    const coveredKnown =
      knownDigits.length > 0 &&
      knownDigits.every((d) =>
        textMatched.some((a) =>
          String(a.sourceValue).replace(/\D+/g, '').includes(d),
        ),
      )
    const looksLikePassportDoc = /passport|passeport|personal\s*no/i.test(
      joinedText,
    )
    // Digital bank PDFs: text-layer boxes only. OCR merge caused double /
    // vertically shifted greys on withdrawal & description columns.
    if (!textHasMrz && !looksLikePassportDoc && textMatched.length > 0) {
      return dedupeAreas(textMatched)
    }
    if (
      textMatched.length > 0 &&
      coveredKnown &&
      !textHasMrz &&
      !looksLikePassportDoc
    ) {
      return dedupeAreas(textMatched)
    }
  }

  let accumulated: RedactionArea[] = [...textMatched]
  for (let i = 0; i < pageCount; i++) {
    throwIfAborted(signal)
    const page = await extractPdfPageOcrBoxes(fileUrl, i)
    throwIfAborted(signal)

    const boxText = page.boxes.map((box) => box.text).join(' ')
    const pageText = [page.pageText, textLayerTexts[i] || '', boxText].join(
      '\n',
    )
    const piiValues = await detectPiiValues(pageText, {
      boostOrg,
      enableNer,
      knownOnly,
      knownValues,
    })
    throwIfAborted(signal)

    const pageTextBoxes = textBoxes.filter((box) => box.pageIndex === i)
    // Passport / scan path: prefer OCR boxes; do not merge with text-layer
    // (overlapping pairs = double grey + wrong height).
    const boxesForPage = page.boxes.length > 0 ? page.boxes : pageTextBoxes
    let pageAreas = withBackground(
      matchPiiToBoxes(boxesForPage, piiValues, visibleChars),
    )
    if (pageAreas.length === 0 && pageTextBoxes.length > 0) {
      pageAreas = withBackground(
        matchPiiToBoxes(pageTextBoxes, piiValues, visibleChars),
      )
    }
    accumulated = mergeAreasByPage(accumulated, pageAreas, i)
  }

  return dedupeAreas(accumulated)
}

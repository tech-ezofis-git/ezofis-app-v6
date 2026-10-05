import { detectPiiValues } from './detectPii'
import {
  extractPdfTextBoxes,
  isSparsePdfText,
} from './extractPdfBoxes'
import { matchPiiToBoxes } from './matchBoxes'
import { extractOcrTextBoxes, extractPdfPageOcrBoxes } from './ocrBoxes'
import type { RedactionArea, TextBox } from './types'

const DEFAULT_BG = '#ffffff'

type ComputePiiAreasArgs = {
  enableNer?: boolean
  fileUrl: string
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

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
}

/**
 * Shared PII box detection used by the live overlay and redacted download/print.
 */
export const computePiiAreas = async ({
  enableNer = false,
  fileUrl,
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
      enableNer,
      knownValues,
    })
    throwIfAborted(signal)
    return withBackground(
      matchPiiToBoxes(page.boxes, piiValues, visibleChars),
    )
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

  if (!sparse) {
    const textLayerPii = await detectPiiValues(textLayerTexts.join('\n'), {
      enableNer: false,
      knownValues,
    })
    throwIfAborted(signal)
    const textMatched = withBackground(
      matchPiiToBoxes(textBoxes, textLayerPii, visibleChars),
    )
    if (textMatched.length > 0) {
      const knownDigits = knownValues
        .map((v) => String(v).replace(/\D+/g, ''))
        .filter((d) => d.length >= 6)
      const covered =
        knownDigits.length === 0 ||
        knownDigits.every((d) =>
          textMatched.some((a) =>
            String(a.sourceValue).replace(/\D+/g, '').includes(d),
          ),
        )
      if (covered) return textMatched
    }
  }

  let accumulated: RedactionArea[] = []
  for (let i = 0; i < pageCount; i++) {
    throwIfAborted(signal)
    const page = await extractPdfPageOcrBoxes(fileUrl, i)
    throwIfAborted(signal)

    const pageText = [page.pageText, textLayerTexts[i] || ''].join('\n')
    const piiValues = await detectPiiValues(pageText, {
      enableNer: false,
      knownValues,
    })
    throwIfAborted(signal)

    const pageTextBoxes = textBoxes.filter((box) => box.pageIndex === i)
    const boxesForPage = page.boxes.length > 0 ? page.boxes : pageTextBoxes
    const pageAreas = withBackground(
      matchPiiToBoxes(boxesForPage, piiValues, visibleChars),
    )
    accumulated = mergeAreasByPage(accumulated, pageAreas, i)
  }

  return accumulated
}

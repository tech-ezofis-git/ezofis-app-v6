import type { TextBox } from './types'

const PDF_WORKER_URL = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString()

type PdfJsModule = typeof import('pdfjs-dist')

let pdfjsPromise: Promise<PdfJsModule> | null = null

const loadPdfJs = async () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((mod) => {
      const pdfjs = mod as PdfJsModule
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL
      }
      return pdfjs
    })
  }
  return pdfjsPromise
}

/**
 * Extract word-level text boxes from a PDF using the text layer.
 * Coordinates are percentages of the page (0–100), top-left origin.
 */
export const extractPdfTextBoxes = async (
  fileUrl: string,
): Promise<{ boxes: TextBox[]; pageCount: number; pageTexts: string[] }> => {
  const pdfjs = await loadPdfJs()
  const loadingTask = pdfjs.getDocument({
    url: fileUrl,
    // Avoid range requests against blob/short-lived URLs.
    disableRange: true,
    disableStream: true,
  })
  const pdf = await loadingTask.promise
  const boxes: TextBox[] = []
  const pageTexts: string[] = []
  const Util = (pdfjs as any).Util

  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex + 1)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const pageChunks: string[] = []

    for (const item of content.items as any[]) {
      const str = String(item?.str || '').trim()
      if (!str) continue
      const transform = item.transform as number[] | undefined
      if (!transform || transform.length < 6) continue

      // Same transform path react-pdf-viewer / pdf.js text layer uses.
      const tx = Util?.transform
        ? Util.transform(viewport.transform, transform)
        : null

      let leftPx: number
      let topPx: number
      let widthPx: number
      let heightPx: number

      if (tx) {
        const fontHeight = Math.max(4, Math.hypot(tx[2] || 0, tx[3] || 0))
        const fontWidthScale = Math.max(0.01, Math.hypot(tx[0] || 0, tx[1] || 0))
        widthPx =
          Number(item.width) > 0
            ? Number(item.width) * fontWidthScale
            : str.length * fontHeight * 0.5
        heightPx = fontHeight
        leftPx = tx[4]
        // tx[5] is baseline; glyphs sit above it in viewport space.
        topPx = tx[5] - fontHeight
      } else {
        const fontHeight = Math.max(
          4,
          Math.hypot(transform[2] || 0, transform[3] || 0) ||
            Math.abs(transform[0] || 10),
        )
        widthPx =
          Number(item.width) > 0
            ? Number(item.width)
            : str.length * fontHeight * 0.5
        heightPx = fontHeight
        leftPx = transform[4]
        topPx = viewport.height - transform[5] - fontHeight
      }

      const left = (leftPx / viewport.width) * 100
      const top = (topPx / viewport.height) * 100
      const width = (widthPx / viewport.width) * 100
      const height = (heightPx / viewport.height) * 100

      if (
        !Number.isFinite(left) ||
        !Number.isFinite(top) ||
        width <= 0 ||
        height <= 0
      ) {
        continue
      }

      pageChunks.push(str)
      boxes.push({
        height: Math.min(100, Math.max(0.35, height)),
        left: Math.min(100, Math.max(0, left)),
        pageIndex,
        text: str,
        top: Math.min(100, Math.max(0, top)),
        width: Math.min(100, Math.max(0.2, width)),
      })
    }

    pageTexts.push(pageChunks.join(' '))
  }

  return { boxes, pageCount: pdf.numPages, pageTexts }
}

/** True when the PDF text layer is too sparse (likely a scan / image PDF). */
export const isSparsePdfText = (boxes: TextBox[], pageCount: number) => {
  if (pageCount <= 0) return true
  if (!boxes.length) return true
  const avg = boxes.length / pageCount
  const totalChars = boxes.reduce((sum, box) => sum + box.text.length, 0)
  const avgChars = totalChars / pageCount
  // Image-only or thin embedded OCR layers.
  return avg < 12 || avgChars < 40
}

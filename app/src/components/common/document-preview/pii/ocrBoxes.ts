import type { TextBox } from './types'

type TesseractBbox = { x0: number; y0: number; x1: number; y1: number }
type TesseractWord = { text?: string; bbox?: TesseractBbox; confidence?: number }
type TesseractLine = { words?: TesseractWord[] }
type TesseractParagraph = { lines?: TesseractLine[] }
type TesseractBlock = { paragraphs?: TesseractParagraph[] }

type TesseractModule = typeof import('tesseract.js')

let workerPromise: Promise<Awaited<
  ReturnType<TesseractModule['createWorker']>
> | null> | null = null

const loadWorker = async () => {
  if (workerPromise) return workerPromise
  workerPromise = (async () => {
    try {
      const tesseract = await import('tesseract.js')
      // Reuse one worker — creating per page is too slow for multi-page PDFs.
      const worker = await tesseract.createWorker('eng', undefined, {
        logger: () => undefined,
      })
      return worker
    } catch (error) {
      console.warn('[pii] tesseract worker failed to load', error)
      workerPromise = null
      return null
    }
  })()
  return workerPromise
}

/** Flatten tesseract v7 blocks → words (words are not top-level by default). */
const flattenWords = (blocks: TesseractBlock[] | null | undefined): TesseractWord[] => {
  if (!Array.isArray(blocks)) return []
  const words: TesseractWord[] = []
  for (const block of blocks) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        for (const word of line.words || []) {
          if (word?.text && word?.bbox) words.push(word)
        }
      }
    }
  }
  return words
}

/** Load any image URL/blob into a canvas so OCR uses true page dimensions. */
export const loadImageToCanvas = async (
  source: string | Blob,
): Promise<HTMLCanvasElement> => {
  let objectUrl: string | null = null
  try {
    let blob: Blob
    if (typeof source === 'string') {
      const response = await fetch(source)
      if (!response.ok) {
        throw new Error(`Failed to fetch image (${response.status})`)
      }
      blob = await response.blob()
    } else {
      blob = source
    }
    objectUrl = URL.createObjectURL(blob)

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Failed to decode image for OCR'))
      el.src = objectUrl!
    })

    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height
    if (width <= 0 || height <= 0) {
      throw new Error('Image has invalid dimensions')
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    ctx.drawImage(img, 0, 0)
    return canvas
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

/**
 * OCR an image (URL, blob URL, blob, or canvas) and return word boxes as page %.
 * Requests `blocks` output — required in tesseract.js v7 for bounding boxes.
 */
export const extractOcrTextBoxes = async (
  source: string | HTMLCanvasElement | Blob,
  pageIndex = 0,
): Promise<{
  boxes: TextBox[]
  canvas: HTMLCanvasElement | null
  pageText: string
}> => {
  let canvas: HTMLCanvasElement | null =
    source instanceof HTMLCanvasElement ? source : null

  if (!canvas) {
    try {
      canvas = await loadImageToCanvas(source as string | Blob)
    } catch (error) {
      console.warn('[pii] image→canvas failed, OCR via raw source', error)
    }
  }

  const worker = await loadWorker()
  if (!worker) {
    return { boxes: [], canvas, pageText: '' }
  }

  const result = await worker.recognize(
    (canvas || source) as any,
    {},
    // v7 default is text-only; blocks carry word bboxes.
    { text: true, blocks: true },
  )

  const data = result?.data as {
    text?: string | null
    blocks?: TesseractBlock[] | null
  }
  const words = flattenWords(data?.blocks)
  const pageText = String(data?.text || '')

  let pageWidth = canvas?.width || 0
  let pageHeight = canvas?.height || 0
  if (pageWidth <= 0 || pageHeight <= 0) {
    for (const word of words) {
      pageWidth = Math.max(pageWidth, word.bbox?.x1 || 0)
      pageHeight = Math.max(pageHeight, word.bbox?.y1 || 0)
    }
  }
  if (pageWidth <= 0 || pageHeight <= 0) {
    return { boxes: [], canvas, pageText }
  }

  const boxes: TextBox[] = []
  for (const word of words) {
    const text = String(word.text || '').trim()
    const bbox = word.bbox
    if (!text || !bbox) continue
    // Drop very low-confidence OCR noise.
    if (typeof word.confidence === 'number' && word.confidence < 20) continue
    const widthPx = bbox.x1 - bbox.x0
    const heightPx = bbox.y1 - bbox.y0
    if (widthPx <= 0 || heightPx <= 0) continue

    boxes.push({
      height: (heightPx / pageHeight) * 100,
      left: (bbox.x0 / pageWidth) * 100,
      pageIndex,
      text,
      top: (bbox.y0 / pageHeight) * 100,
      width: (widthPx / pageWidth) * 100,
    })
  }

  return { boxes, canvas, pageText }
}

/**
 * Render a PDF page to canvas then OCR it (scanned / PNG→PDF / passport).
 */
export const extractPdfPageOcrBoxes = async (
  fileUrl: string,
  pageIndex: number,
): Promise<{
  boxes: TextBox[]
  canvas: HTMLCanvasElement | null
  pageText: string
}> => {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
  ).toString()
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  }

  const pdf = await pdfjs.getDocument({
    disableRange: true,
    disableStream: true,
    url: fileUrl,
  }).promise
  const page = await pdf.getPage(pageIndex + 1)
  // Scale 2.5 balances OCR accuracy vs canvas memory on large scans.
  const viewport = page.getViewport({ scale: 2.5 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) return { boxes: [], canvas: null, pageText: '' }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: context, viewport } as any).promise
  return extractOcrTextBoxes(canvas, pageIndex)
}

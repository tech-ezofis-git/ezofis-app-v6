import {
  LARGE_UPLOAD_OCR_PAGES,
  LARGE_UPLOAD_THRESHOLD_BYTES,
} from './constants'
import { prepareLocalPdf, rangeDocumentParams } from './pdfSource'

const PDF_WORKER_URL = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString()

/**
 * Longest side of a rendered page (~190 dpi for A4): enough for OCR, small enough for canvas memory
 * and for the OCR service, which drops large uploads on slow connections.
 */
const MAX_RENDER_SIDE = 2200

/** JPEG quality of rendered pages; text stays sharp, the preview stays a few MB. */
const PAGE_JPEG_QUALITY = 0.75

export interface OcrPreview {
  /** Small file to send to OCR (first pages of a PDF, or the image itself); null = skip OCR. */
  previewFile: File | null
  /** Pages in `previewFile` (what OCR reads). */
  sentPages?: number
  totalPages?: number
}

const isPdfFile = (file: File) =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

const isOcrImage = (file: File) =>
  /^image\/(png|jpeg|webp|tiff)$/.test(file.type) ||
  /\.(png|jpe?g|webp|tiff?)$/i.test(file.name)

const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || 'document'

/**
 * Builds what OCR / AI extraction reads for a large upload: the first pages of a PDF re-rendered into
 * a small PDF (read from disk piece by piece, never the whole file), or the image itself when it is
 * small enough. Other file types are stored without OCR.
 */
export const buildOcrPreview = async (
  file: File,
  signal: AbortSignal,
  maxPages = LARGE_UPLOAD_OCR_PAGES,
): Promise<OcrPreview> => {
  if (!isPdfFile(file)) {
    return {
      previewFile:
        isOcrImage(file) && file.size <= LARGE_UPLOAD_THRESHOLD_BYTES
          ? file
          : null,
    }
  }

  const [pdfjs, { default: JsPdf }] = await Promise.all([
    import('pdfjs-dist'),
    import('jspdf'),
  ])
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL
  }

  // Read in pieces and cut at the real end of the PDF (junk after %%EOF is skipped).
  const source = await prepareLocalPdf(file)
  if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError')
  const loadingTask = pdfjs.getDocument(
    rangeDocumentParams(source) as Parameters<typeof pdfjs.getDocument>[0],
  )
  const onAbort = () => void loadingTask.destroy()
  signal.addEventListener('abort', onAbort, { once: true })

  try {
    const pdf = await loadingTask.promise
    const pageCount = Math.min(maxPages, pdf.numPages)
    let doc: InstanceType<typeof JsPdf> | null = null
    let sentPages = 0

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      if (signal.aborted)
        throw new DOMException('Upload cancelled', 'AbortError')
      const page = await pdf.getPage(pageNumber)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(
        2,
        MAX_RENDER_SIDE / Math.max(base.width, base.height),
      )
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) continue

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport } as Parameters<
        typeof page.render
      >[0]).promise
      page.cleanup()

      const orientation = base.width > base.height ? 'landscape' : 'portrait'
      if (doc) {
        doc.addPage([base.width, base.height], orientation)
      } else {
        doc = new JsPdf({
          format: [base.width, base.height],
          orientation,
          unit: 'pt',
        })
      }
      doc.addImage(
        canvas.toDataURL('image/jpeg', PAGE_JPEG_QUALITY),
        'JPEG',
        0,
        0,
        base.width,
        base.height,
      )
      canvas.width = 0
      canvas.height = 0
      sentPages++
    }

    const totalPages = pdf.numPages
    await pdf.destroy()
    if (!doc) return { previewFile: null, totalPages }

    const blob = doc.output('blob') as Blob
    return {
      previewFile: new File([blob], `${baseName(file.name)}.pdf`, {
        type: 'application/pdf',
      }),
      sentPages,
      totalPages,
    }
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

/** True only on a local development host (localhost, 127.0.0.1, ::1, *.localhost). */
export const isLocalDevHost = (hostname = window.location.hostname) =>
  ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname) ||
  hostname.endsWith('.localhost')

/**
 * Local development only: logs how many pages go to OCR and saves the exact file sent,
 * so it can be checked. Does nothing on any other host.
 */
export const debugOcrPreviewOnLocalhost = (
  originalName: string,
  { previewFile, sentPages, totalPages }: OcrPreview,
) => {
  if (!isLocalDevHost() || !previewFile) return
  console.info(
    `[largeUpload] OCR file for "${originalName}": ${sentPages ?? '?'} of ${totalPages ?? '?'} pages, ${(previewFile.size / 1024).toFixed(0)} KB`,
  )
  const url = URL.createObjectURL(previewFile)
  const link = document.createElement('a')
  link.href = url
  link.download = `${baseName(originalName)}-ocr-${sentPages ?? 0}-of-${totalPages ?? 0}-pages.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

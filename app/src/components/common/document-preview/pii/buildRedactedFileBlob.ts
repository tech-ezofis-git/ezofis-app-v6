import type { RedactionArea } from './types'
import { computePiiAreas } from './computePiiAreas'

type BuildRedactedFileArgs = {
  enableNer?: boolean
  fileName?: string
  fileUrl: string
  knownOnly?: boolean
  knownValues?: string[]
  mode: 'pdf' | 'image'
  visibleChars?: number
}

const PDF_WORKER_URL = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString()

/** Same pad math as RedactionOverlay so download/print matches the preview. */
const padArea = (area: RedactionArea) => {
  const fillers = (String(area.sourceValue || '').match(/</g) || []).length
  const isMrz = fillers >= 3 || /^P</i.test(String(area.sourceValue || ''))
  const padX = isMrz ? 0.25 : Math.min(0.12, area.width * 0.02)
  const padY = isMrz ? 0.12 : Math.min(0.08, area.height * 0.08)
  const left = Math.max(0, area.left - padX)
  const top = Math.max(0, area.top - padY)
  const right = Math.min(100, area.left + area.width + padX)
  const bottom = Math.min(100, area.top + area.height + padY)
  return {
    height: Math.max(0.35, bottom - top),
    left,
    top,
    width: Math.max(0.35, right - left),
  }
}

const drawRedactions = (
  ctx: CanvasRenderingContext2D,
  areas: RedactionArea[],
  canvasWidth: number,
  canvasHeight: number,
) => {
  for (const area of areas) {
    const box = padArea(area)
    const x = (box.left / 100) * canvasWidth
    const y = (box.top / 100) * canvasHeight
    const w = (box.width / 100) * canvasWidth
    const h = (box.height / 100) * canvasHeight

    ctx.save()
    ctx.fillStyle = '#e6e6ef'
    ctx.fillRect(x, y, w, h)
    ctx.restore()
  }
}

const withRedactedSuffix = (fileName: string, ext: string) => {
  const base = fileName.replace(/\.[^.]+$/, '') || 'document'
  return `${base}-redacted.${ext}`
}

const blobFromDataUrl = async (
  dataUrl: string,
  mime: string,
): Promise<Blob> => {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  if (blob.type === mime) return blob
  return new Blob([blob], { type: mime })
}

/**
 * Burns preview-matching PII covers into a downloadable/printable blob.
 * PDFs become a flattened redacted PDF; images become a redacted PNG.
 */
export const buildRedactedFileBlob = async ({
  enableNer = false,
  fileName = 'document',
  fileUrl,
  knownOnly = false,
  knownValues = [],
  mode,
  visibleChars = 3,
}: BuildRedactedFileArgs): Promise<{ blob: Blob; fileName: string }> => {
  const areas = await computePiiAreas({
    enableNer,
    fileUrl,
    knownOnly,
    knownValues,
    mode,
    visibleChars,
  })

  if (mode === 'image') {
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error('Failed to load image for redaction')
    const sourceBlob = await response.blob()
    const objectUrl = URL.createObjectURL(sourceBlob)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('Failed to decode image'))
        el.src = objectUrl
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')
      ctx.drawImage(img, 0, 0)
      drawRedactions(
        ctx,
        areas.filter((a) => a.pageIndex === 0),
        canvas.width,
        canvas.height,
      )
      const dataUrl = canvas.toDataURL('image/png')
      const blob = await blobFromDataUrl(dataUrl, 'image/png')
      return { blob, fileName: withRedactedSuffix(fileName, 'png') }
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  const [pdfjs, { default: JsPdf }] = await Promise.all([
    import('pdfjs-dist'),
    import('jspdf'),
  ])
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL
  }

  const pdf = await pdfjs.getDocument({
    disableRange: true,
    disableStream: true,
    url: fileUrl,
  }).promise

  let doc: InstanceType<typeof JsPdf> | null = null

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const baseViewport = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport } as any).promise

    drawRedactions(
      ctx,
      areas.filter((a) => a.pageIndex === pageNumber - 1),
      canvas.width,
      canvas.height,
    )

    const orientation =
      baseViewport.width > baseViewport.height ? 'landscape' : 'portrait'
    if (!doc) {
      doc = new JsPdf({
        format: [baseViewport.width, baseViewport.height],
        orientation,
        unit: 'pt',
      })
    } else {
      doc.addPage([baseViewport.width, baseViewport.height], orientation)
    }
    doc.addImage(
      canvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      0,
      0,
      baseViewport.width,
      baseViewport.height,
    )
  }

  if (!doc) throw new Error('Unable to build redacted PDF')

  const pdfBlob = doc.output('blob') as Blob
  return {
    blob: new Blob([pdfBlob], { type: 'application/pdf' }),
    fileName: withRedactedSuffix(fileName, 'pdf'),
  }
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Skeleton from '@/components/base/Skeleton'
import cn from '@/utils/cn'

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

type PdfThumbnailProps = {
  className?: string
  fallback?: ReactNode
  fileName: string
  fileUrl: string
}

/** Renders page 1 of a PDF as a compact card thumbnail. */
export default function PdfThumbnail({
  className,
  fallback = null,
  fileName,
  fileUrl,
}: PdfThumbnailProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const thumbUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const revokeThumb = () => {
      if (thumbUrlRef.current) {
        URL.revokeObjectURL(thumbUrlRef.current)
        thumbUrlRef.current = null
      }
    }

    const render = async () => {
      revokeThumb()
      setThumbUrl(null)
      setFailed(false)
      try {
        const pdfjs = await loadPdfJs()
        const loadingTask = pdfjs.getDocument({
          disableRange: true,
          disableStream: true,
          url: fileUrl,
        })
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 0.6 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.floor(viewport.width))
        canvas.height = Math.max(1, Math.floor(viewport.height))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas unavailable')

        await page
          .render({
            canvasContext: context,
            viewport,
          })
          .promise

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.75),
        )
        await pdf.destroy()
        if (cancelled) return
        if (!blob) throw new Error('Thumbnail encode failed')

        const objectUrl = URL.createObjectURL(blob)
        thumbUrlRef.current = objectUrl
        setThumbUrl(objectUrl)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void render()

    return () => {
      cancelled = true
      revokeThumb()
    }
  }, [fileUrl])

  if (failed) return <>{fallback}</>
  if (!thumbUrl) {
    return <Skeleton className={cn('h-full w-full rounded-none', className)} />
  }

  return (
    <img
      alt={fileName}
      className={cn('h-full w-full object-cover', className)}
      src={thumbUrl}
    />
  )
}

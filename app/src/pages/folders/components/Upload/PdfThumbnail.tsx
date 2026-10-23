import { type ReactNode, useEffect, useRef, useState } from 'react'
import { getStageFilePreviewSource } from '@/api/v6/uploadAndIndex'
import Skeleton from '@/components/base/Skeleton'
import cn from '@/utils/cn'
import { getCachedThumbnail, setCachedThumbnail } from './thumbnailCache'
import {
  acquireThumbSlot,
  isLocalFileUrl,
  releaseThumbSlot,
  useNearViewport,
} from './thumbnailQueue'

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
  cacheKey?: string
  className?: string
  fallback?: ReactNode
  fileName: string
  fileUrl?: string
  /** Render ahead of other cards (files from the current upload). */
  priority?: boolean
  stageFileId?: string
}

/** Renders page 1 of a PDF as a compact card thumbnail. */
export default function PdfThumbnail({
  cacheKey,
  className,
  fallback = null,
  fileName,
  fileUrl,
  priority = false,
  stageFileId,
}: PdfThumbnailProps) {
  const key = cacheKey || stageFileId || fileUrl || fileName
  const [thumbUrl, setThumbUrl] = useState<string | null>(() =>
    getCachedThumbnail(key),
  )
  const [failed, setFailed] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)
  // Off-screen cards wait until scrolled near, so visible ones render first.
  const nearViewport = useNearViewport(hostRef)

  useEffect(() => {
    const cached = getCachedThumbnail(key)
    if (cached) {
      setThumbUrl(cached)
      setFailed(false)
      return
    }
    if (!nearViewport) return

    let cancelled = false
    setFailed(false)

    const render = async () => {
      await acquireThumbSlot(priority)
      if (cancelled) {
        releaseThumbSlot()
        return
      }

      let pdf: Awaited<
        ReturnType<PdfJsModule['getDocument']>['promise']
      > | null = null
      try {
        const pdfjs = await loadPdfJs()
        // A just-uploaded file is already in memory: no download needed.
        const remote =
          stageFileId && !isLocalFileUrl(fileUrl)
            ? getStageFilePreviewSource(stageFileId)
            : null
        const task = pdfjs.getDocument({
          disableAutoFetch: Boolean(remote),
          disableRange: !remote,
          disableStream: !remote,
          httpHeaders: remote?.httpHeaders,
          rangeChunkSize: 65536,
          url: remote?.url || fileUrl || '',
        })
        pdf = await task.promise
        if (cancelled) return

        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 0.22 })
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
        if (cancelled) return

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.72),
        )
        if (!blob) throw new Error('Thumbnail encode failed')

        const objectUrl = URL.createObjectURL(blob)
        setCachedThumbnail(key, objectUrl)
        if (!cancelled) setThumbUrl(objectUrl)
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (pdf) void pdf.destroy().catch(() => undefined)
        releaseThumbSlot()
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [fileUrl, key, nearViewport, priority, stageFileId])

  if (failed) return <>{fallback}</>
  if (!thumbUrl) {
    return (
      <div className='h-full w-full' ref={hostRef}>
        <Skeleton className={cn('h-full w-full rounded-none', className)} />
      </div>
    )
  }

  return (
    <img
      alt={fileName}
      className={cn('h-full w-full object-cover', className)}
      src={thumbUrl}
    />
  )
}

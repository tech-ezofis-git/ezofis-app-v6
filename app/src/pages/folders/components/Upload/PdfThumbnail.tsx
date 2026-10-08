import { useEffect, useState, type ReactNode } from 'react'
import { getStageFilePreviewSource } from '@/api/v6/uploadAndIndex'
import Skeleton from '@/components/base/Skeleton'
import cn from '@/utils/cn'
import { getCachedThumbnail, setCachedThumbnail } from './thumbnailCache'

const PDF_WORKER_URL = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString()

type PdfJsModule = typeof import('pdfjs-dist')

let pdfjsPromise: Promise<PdfJsModule> | null = null

const THUMB_CONCURRENCY = 4
let activeThumbRenders = 0
const thumbWaiters: Array<() => void> = []

const acquireThumbSlot = () =>
  new Promise<void>((resolve) => {
    if (activeThumbRenders < THUMB_CONCURRENCY) {
      activeThumbRenders += 1
      resolve()
      return
    }
    thumbWaiters.push(() => {
      activeThumbRenders += 1
      resolve()
    })
  })

const releaseThumbSlot = () => {
  activeThumbRenders = Math.max(0, activeThumbRenders - 1)
  const next = thumbWaiters.shift()
  if (next) next()
}

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
  stageFileId?: string
}

/** Renders page 1 of a PDF as a compact card thumbnail. */
export default function PdfThumbnail({
  cacheKey,
  className,
  fallback = null,
  fileName,
  fileUrl,
  stageFileId,
}: PdfThumbnailProps) {
  const key = cacheKey || stageFileId || fileUrl || fileName
  const [thumbUrl, setThumbUrl] = useState<string | null>(() =>
    getCachedThumbnail(key),
  )
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const cached = getCachedThumbnail(key)
    if (cached) {
      setThumbUrl(cached)
      setFailed(false)
      return
    }

    let cancelled = false
    setFailed(false)

    const render = async () => {
      await acquireThumbSlot()
      if (cancelled) {
        releaseThumbSlot()
        return
      }

      let pdf: Awaited<
        ReturnType<PdfJsModule['getDocument']>['promise']
      > | null = null
      try {
        const pdfjs = await loadPdfJs()
        const remote = stageFileId
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
        const viewport = page.getViewport({ scale: 0.45 })
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
  }, [fileUrl, key, stageFileId])

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

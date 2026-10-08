import { useEffect, useRef, useState, type ReactNode } from 'react'
import { fetchStageFileBlob } from '@/api/v6/uploadAndIndex'
import Skeleton from '@/components/base/Skeleton'
import cn from '@/utils/cn'

type WordThumbnailProps = {
  cacheKey?: string
  className?: string
  fallback?: ReactNode
  fileName: string
  fileUrl?: string
  stageFileId?: string
}

const isDirectUrl = (url: string) =>
  url.startsWith('blob:') ||
  url.startsWith('http://') ||
  url.startsWith('https://') ||
  url.startsWith('data:')

const loadDocxBuffer = async (stageFileId?: string, fileUrl?: string) => {
  if (fileUrl && isDirectUrl(fileUrl)) {
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error('Unable to load document')
    return response.arrayBuffer()
  }
  if (!stageFileId) throw new Error('No document source')
  const blob = await fetchStageFileBlob(stageFileId)
  if (!blob || blob.size < 32) throw new Error('Unable to load document')
  return blob.arrayBuffer()
}

/** Renders the first page of a .docx inside the card. */
export default function WordThumbnail({
  className,
  fallback = null,
  fileName,
  fileUrl,
  stageFileId,
}: WordThumbnailProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    setFailed(false)
    setReady(false)
    host.replaceChildren()

    const render = async () => {
      try {
        const buffer = await loadDocxBuffer(stageFileId, fileUrl)
        if (cancelled) return

        const { renderAsync } = await import('docx-preview')
        await renderAsync(buffer, host, host, {
          breakPages: true,
          ignoreHeight: false,
          ignoreWidth: false,
          inWrapper: true,
          renderEndnotes: false,
          renderFooters: false,
          renderFootnotes: false,
          renderHeaders: true,
          useBase64URL: true,
        })
        if (cancelled) return

        const pages = host.querySelectorAll('section')
        if (!pages.length) throw new Error('No pages')

        const width = host.clientWidth || host.getBoundingClientRect().width
        pages.forEach((page, index) => {
          const el = page as HTMLElement
          if (index > 0) {
            el.style.display = 'none'
            return
          }
          const pageWidth = el.scrollWidth || el.offsetWidth || 794
          const scale = width > 0 ? width / pageWidth : 0.22
          el.style.transformOrigin = 'top left'
          el.style.transform = `scale(${scale})`
          el.style.margin = '0'
          el.style.boxShadow = 'none'
          el.style.background = '#fff'
        })
        if (!cancelled) setReady(true)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [fileUrl, stageFileId])

  if (failed) return <>{fallback}</>

  return (
    <div
      aria-label={fileName}
      className={cn(
        'relative h-full w-full overflow-hidden bg-white',
        className,
      )}
    >
      {!ready ? (
        <Skeleton className='absolute inset-0 z-10 h-full w-full rounded-none' />
      ) : null}
      <div
        className='pointer-events-none h-full w-full overflow-hidden bg-white [&_.docx-wrapper]:bg-white [&_.docx-wrapper]:p-0'
        ref={hostRef}
      />
    </div>
  )
}

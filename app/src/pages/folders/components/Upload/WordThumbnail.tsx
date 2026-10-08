import { useEffect, useRef, useState, type ReactNode } from 'react'
import Skeleton from '@/components/base/Skeleton'
import cn from '@/utils/cn'

type WordThumbnailProps = {
  className?: string
  fallback?: ReactNode
  fileName: string
  fileUrl: string
}

/** Renders the first page of a .docx as a compact card thumbnail. */
export default function WordThumbnail({
  className,
  fallback = null,
  fileName,
  fileUrl,
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
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error('Unable to load document')
        const buffer = await response.arrayBuffer()
        if (cancelled) return

        const { renderAsync } = await import('docx-preview')
        await renderAsync(buffer, host, undefined, {
          breakPages: true,
          ignoreHeight: false,
          ignoreWidth: false,
          inWrapper: false,
          renderEndnotes: false,
          renderFooters: false,
          renderFootnotes: false,
          renderHeaders: false,
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
          const scale = width > 0 ? width / pageWidth : 0.28
          el.style.transformOrigin = 'top left'
          el.style.transform = `scale(${scale})`
          el.style.margin = '0'
          el.style.boxShadow = 'none'
        })

        setReady(true)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void render()

    return () => {
      cancelled = true
      host.replaceChildren()
    }
  }, [fileUrl])

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
        className='pointer-events-none h-full w-full overflow-hidden bg-white'
        ref={hostRef}
      />
    </div>
  )
}

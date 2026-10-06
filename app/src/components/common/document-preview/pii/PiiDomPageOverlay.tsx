import { useEffect, useRef, useState } from 'react'
import { detectPiiValues } from './detectPii'
import { matchPiiToBoxes } from './matchBoxes'
import { measureTextLayerBoxes } from './measureTextLayerBoxes'
import RedactionOverlay from './RedactionOverlay'
import type { RedactionArea } from './types'

type PiiDomPageOverlayProps = {
  enableNer?: boolean
  /** OCR / precomputed fallback areas when the text layer is empty (scans). */
  fallbackAreas?: RedactionArea[]
  /** True while usePiiRedaction OCR is still running. */
  isOcrScanning?: boolean
  knownValues?: string[]
  pageIndex: number
  scale?: number
  textLayerRendered: boolean
  visibleChars?: number
}

/**
 * Digital PDFs: measure the live text layer for pixel-perfect boxes.
 * Scanned / JPG→PDF: fall back to OCR areas from usePiiRedaction.
 */
const PiiDomPageOverlay = ({
  enableNer = false,
  fallbackAreas = [],
  isOcrScanning = false,
  knownValues = [],
  pageIndex,
  scale = 1,
  textLayerRendered,
  visibleChars = 3,
}: PiiDomPageOverlayProps) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const [areas, setAreas] = useState<RedactionArea[]>([])
  const knownKey = (knownValues || []).join('\u0001')
  const pageFallback = fallbackAreas.filter((a) => a.pageIndex === pageIndex)
  const fallbackKey = pageFallback
    .map(
      (a) =>
        `${a.left.toFixed(2)}:${a.top.toFixed(2)}:${a.width.toFixed(2)}:${a.maskedLabel}`,
    )
    .join('|')
  const runIdRef = useRef(0)

  useEffect(() => {
    const host = hostRef.current
    const runId = ++runIdRef.current
    let cancelled = false

    const applyFallback = () => {
      if (!cancelled && runId === runIdRef.current) {
        // Prefer waiting for OCR on scans so we don't flash empty then cover.
        if (!isOcrScanning || pageFallback.length > 0) {
          setAreas(pageFallback)
        }
      }
    }

    const run = async () => {
      if (!textLayerRendered || !host) {
        applyFallback()
        return
      }

      const pageLayer =
        host.closest('.rpv-core__page-layer') || host.parentElement
      const textLayer = pageLayer?.querySelector(
        '.rpv-core__text-layer',
      ) as HTMLElement | null

      if (!textLayer) {
        applyFallback()
        return
      }

      const { boxes, pageText } = measureTextLayerBoxes(textLayer, pageIndex)

      if (boxes.length < 3 || pageText.trim().length < 12) {
        applyFallback()
        return
      }

      const piiValues = await detectPiiValues(pageText, {
        enableNer,
        knownValues,
      })
      if (cancelled || runId !== runIdRef.current) return

      const matched = matchPiiToBoxes(boxes, piiValues, visibleChars).map(
        (area) => ({
          ...area,
          backgroundColor: '#ffffff',
        }),
      )

      if (!matched.length) {
        applyFallback()
        return
      }

      if (!cancelled && runId === runIdRef.current) {
        setAreas(matched)
      }
    }

    const frame = window.requestAnimationFrame(() => {
      void run()
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enableNer,
    fallbackKey,
    isOcrScanning,
    knownKey,
    pageIndex,
    scale,
    textLayerRendered,
    visibleChars,
  ])

  return (
    <div
      ref={hostRef}
      aria-hidden='true'
      className='pointer-events-none absolute inset-0 z-[30]'
    >
      <RedactionOverlay areas={areas} pageIndex={pageIndex} />
    </div>
  )
}

export default PiiDomPageOverlay

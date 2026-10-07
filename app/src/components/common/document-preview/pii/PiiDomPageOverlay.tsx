import { useEffect, useRef, useState } from 'react'
import type { RedactionArea } from './types'
import { detectPiiValues } from './detectPii'
import { matchPiiToBoxes } from './matchBoxes'
import { measureTextLayerBoxes } from './measureTextLayerBoxes'
import RedactionOverlay from './RedactionOverlay'

type PiiDomPageOverlayProps = {
  boostOrg?: boolean
  enableNer?: boolean
  /** OCR / precomputed fallback areas when the text layer is empty (scans). */
  fallbackAreas?: RedactionArea[]
  /** True while usePiiRedaction OCR is still running. */
  isOcrScanning?: boolean
  knownOnly?: boolean
  knownValues?: string[]
  pageIndex: number
  scale?: number
  textLayerRendered: boolean
  visibleChars?: number
}

const isPassportIdValue = (value: string) => {
  const compact = String(value || '').replace(/\s+/g, '')
  return /^[A-Z]{1,2}\d{6,9}$/i.test(compact) || /^\d{8,9}$/.test(compact)
}

const isMrzOrPassportArea = (area: RedactionArea) => {
  const value = String(area.sourceValue || '')
  const fillers = (value.match(/</g) || []).length
  if (fillers >= 3 || /P</i.test(value)) return true
  return isPassportIdValue(value)
}

const overlapRatio = (a: RedactionArea, b: RedactionArea) => {
  if (a.pageIndex !== b.pageIndex) return 0
  const ax2 = a.left + a.width
  const ay2 = a.top + a.height
  const bx2 = b.left + b.width
  const by2 = b.top + b.height
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.left, b.left))
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.top, b.top))
  const inter = ix * iy
  if (inter <= 0) return 0
  const union = a.width * a.height + b.width * b.height - inter
  return union > 0 ? inter / union : 0
}

/** Keep one box per region — doubles came from merging OCR + text layer. */
const dedupeAreas = (areas: RedactionArea[]): RedactionArea[] => {
  const sorted = [...areas].sort(
    (a, b) => a.width * a.height - b.width * b.height,
  )
  const kept: RedactionArea[] = []
  for (const area of sorted) {
    if (area.width < 0.8 || area.height < 0.35) continue
    const value = String(area.sourceValue || '')
    const isMrz =
      /P</i.test(value) || (value.match(/</g) || []).length >= 3
    const isLongFieldValue =
      value.trim().length >= 12 ||
      value.includes(',') ||
      value.trim().split(/\s+/).length >= 3
    // Allow wide MRZ / long field covers; reject accidental wide paints.
    if (area.width > 55 && !isMrz && !isLongFieldValue) continue
    if (
      area.width > 32 &&
      !isMrz &&
      !isPassportIdValue(value) &&
      !isLongFieldValue
    )
      continue
    const duplicate = kept.some(
      (existing) =>
        overlapRatio(existing, area) > 0.25 ||
        (Math.abs(existing.left - area.left) < 1.2 &&
          Math.abs(existing.top - area.top) < 1.2 &&
          Math.abs(existing.width - area.width) < 3),
    )
    if (duplicate) continue
    kept.push(area)
  }
  return kept
}

/**
 * Prefer live DOM text-layer boxes (correct zoom alignment).
 * On passports, add OCR covers for MRZ / passport number when the bitmap
 * has them but the text layer does not.
 */
const PiiDomPageOverlay = ({
  boostOrg = false,
  enableNer = false,
  fallbackAreas = [],
  isOcrScanning = false,
  knownOnly = false,
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

    const applyAreas = (next: RedactionArea[]) => {
      if (!cancelled && runId === runIdRef.current) {
        setAreas(dedupeAreas(next))
      }
    }

    const run = async () => {
      let textMatched: RedactionArea[] = []
      let pageText = ''
      let boxCount = 0

      if (textLayerRendered && host) {
        const pageLayer =
          host.closest('.rpv-core__page-layer') || host.parentElement
        const textLayer = pageLayer?.querySelector(
          '.rpv-core__text-layer',
        ) as HTMLElement | null
        if (textLayer) {
          const measured = measureTextLayerBoxes(textLayer, pageIndex)
          pageText = measured.pageText
          boxCount = measured.boxes.length
          if (boxCount >= 3 && pageText.trim().length >= 12) {
            const piiValues = await detectPiiValues(pageText, {
              boostOrg,
              enableNer,
              knownOnly,
              knownValues,
            })
            if (cancelled || runId !== runIdRef.current) return
            textMatched = matchPiiToBoxes(
              measured.boxes,
              piiValues,
              visibleChars,
            ).map((area) => ({
              ...area,
              backgroundColor: '#ffffff',
            }))
          }
        }
      }

      const textHasMrz =
        /P<[A-Z]{3}/i.test(pageText) || (pageText.match(/</g) || []).length >= 6
      const knownHasPassport = (knownValues || []).some((value) =>
        isPassportIdValue(value),
      )
      const looksLikePassport =
        /passport|passeport/i.test(pageText) ||
        /P<[A-Z]{3}/i.test(pageText) ||
        /\b[A-Z]{1,2}\d{6,9}\b/.test(pageText) ||
        knownHasPassport
      const textLayerDense = boxCount >= 20 && pageText.trim().length >= 80
      const textHasPassportNo = textMatched.some((area) =>
        isMrzOrPassportArea(area),
      )

      // Bank statements / digital PDFs: prefer DOM text layer.
      // If known folder-field values didn't match in the text layer, fall
      // back to OCR boxes so invoice addresses / supplier names still grey.
      if (textLayerDense && !textHasMrz && !looksLikePassport) {
        if (textMatched.length > 0) {
          applyAreas(textMatched)
          return
        }
        if (pageFallback.length > 0) {
          applyAreas(pageFallback)
          return
        }
        // Wait for OCR — clearing here left invoices unredacted on the PDF.
        if (isOcrScanning) return
        applyAreas([])
        return
      }

      // Passport / ID: keep DOM hits (correct alignment) and add OCR only for
      // MRZ + passport numbers that the text layer missed.
      if (looksLikePassport || textHasMrz || knownHasPassport) {
        const ocrPassportAreas = pageFallback.filter(isMrzOrPassportArea)
        if (textMatched.length > 0 || ocrPassportAreas.length > 0) {
          // Prefer DOM; fill gaps from OCR (MRZ / passport no.).
          applyAreas(
            textHasPassportNo
              ? [
                  ...textMatched,
                  ...ocrPassportAreas.filter(
                    (area) =>
                      !textMatched.some(
                        (existing) => overlapRatio(existing, area) > 0.2,
                      ),
                  ),
                ]
              : [...textMatched, ...ocrPassportAreas],
          )
          return
        }
        if (pageFallback.length > 0) {
          applyAreas(pageFallback.filter(isMrzOrPassportArea))
          return
        }
        if (!isOcrScanning) applyAreas(textMatched)
        return
      }

      // Sparse scans: OCR fallback.
      if (!textLayerDense && pageFallback.length > 0) {
        applyAreas(pageFallback)
        return
      }

      if (textMatched.length > 0) {
        applyAreas(textMatched)
        return
      }

      if (!isOcrScanning && pageFallback.length > 0) {
        applyAreas(pageFallback)
        return
      }

      if (!isOcrScanning) applyAreas([])
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
    boostOrg,
    enableNer,
    fallbackKey,
    isOcrScanning,
    knownKey,
    knownOnly,
    pageIndex,
    scale,
    textLayerRendered,
    visibleChars,
  ])

  return (
    <div
      aria-hidden='true'
      className='pointer-events-none absolute inset-0 z-[30]'
      ref={hostRef}
    >
      <RedactionOverlay areas={areas} pageIndex={pageIndex} />
    </div>
  )
}

export default PiiDomPageOverlay

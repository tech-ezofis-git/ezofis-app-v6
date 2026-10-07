import { useEffect, useRef, useState } from 'react'
import type { RedactionArea } from './types'
import { computePiiAreas } from './computePiiAreas'

type UsePiiRedactionArgs = {
  enable?: boolean
  enableNer?: boolean
  fileUrl?: string | null
  knownOnly?: boolean
  knownValues?: string[]
  mode?: 'pdf' | 'image' | 'word' | string
  visibleChars?: number
}

/**
 * OCR path for images + scanned / PNG→PDF files.
 * Digital PDFs with a dense text layer are refined by PiiDomPageOverlay.
 */
export const usePiiRedaction = ({
  enable = false,
  enableNer = false,
  fileUrl,
  knownOnly = false,
  knownValues = [],
  mode,
  visibleChars = 3,
}: UsePiiRedactionArgs) => {
  const [areas, setAreas] = useState<RedactionArea[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const runIdRef = useRef(0)

  const knownKey = knownValues.join('\u0001')

  useEffect(() => {
    if (!enable || !fileUrl || (mode !== 'pdf' && mode !== 'image')) {
      setAreas([])
      setIsScanning(false)
      return
    }

    const runId = ++runIdRef.current
    const controller = new AbortController()

    const run = async () => {
      setIsScanning(true)
      // Keep prior covers while OCR runs so passports don't flash unredacted.
      try {
        const matched = await computePiiAreas({
          enableNer,
          fileUrl,
          knownOnly,
          knownValues,
          mode,
          signal: controller.signal,
          visibleChars,
        })
        if (runId !== runIdRef.current) return
        setAreas(matched)
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return
        console.warn('[pii] redaction scan failed', error)
      } finally {
        if (runId === runIdRef.current) setIsScanning(false)
      }
    }

    void run()
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enable, enableNer, fileUrl, knownKey, knownOnly, mode, visibleChars])

  return { areas, isScanning }
}

export default usePiiRedaction

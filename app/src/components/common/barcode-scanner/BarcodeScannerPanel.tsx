import { useLingui } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'

interface Props {
  onClose: () => void
  onScan: (rawValue: string) => void
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
    }
  }
}

const BarcodeScannerPanel = ({ onClose, onScan }: Props) => {
  const { t } = useLingui()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isSupported =
    typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    if (!isSupported) {
      setError(t`Barcode/QR scanning isn't supported in this browser.`)
      return
    }

    let cancelled = false
    let rafId: number | undefined

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const detector = new window.BarcodeDetector!()
        const tick = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const results = await detector.detect(videoRef.current)
            if (results[0]?.rawValue) {
              onScan(results[0].rawValue)
              return
            }
          } catch {
            // keep polling — a single failed detect pass isn't fatal
          }
          rafId = requestAnimationFrame(() => void tick())
        }
        void tick()
      } catch {
        if (!cancelled) {
          setError(t`Camera access was denied or is unavailable.`)
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
    }
  }, [isSupported])

  return (
    <div className='space-y-2 rounded-lg border border-gray-3 bg-gray-1 p-3'>
      <div className='flex items-center justify-between'>
        <span className='text-13 font-bold text-gray-12'>{t`Scan QR / Barcode`}</span>
        <IconButton
          color='gray'
          icon='lucide:x'
          size='xs'
          variant='ghost'
          onClick={onClose}
        />
      </div>
      {error ? (
        <div className='flex items-center gap-2 rounded-md border border-dashed border-gray-3 bg-white p-3 text-12 text-gray-9'>
          <Icon height={14} name='lucide:camera-off' width={14} />
          {error}
        </div>
      ) : (
        <video
          className='w-full max-w-sm rounded-md bg-black'
          ref={videoRef}
          muted
          playsInline
        />
      )}
    </div>
  )
}

BarcodeScannerPanel.displayName = 'BarcodeScannerPanel'
export default BarcodeScannerPanel

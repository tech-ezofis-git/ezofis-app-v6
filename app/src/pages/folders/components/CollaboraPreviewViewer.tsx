import { useCallback, useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { AlertCircle, Loader2 } from 'lucide-react'
import {
  buildViewerUrl,
  buildWopiSrc,
  uploadDocumentToCollabora,
} from '@/api/collabora/collabora'

export interface CollaboraPreviewViewerProps {
  className?: string
  fileBlob?: Blob | null
  fileName?: string
  fileUrl?: string | null
}

export default function CollaboraPreviewViewer({
  className = '',
  fileBlob,
  fileName,
  fileUrl,
}: CollaboraPreviewViewerProps) {
  const { t } = useLingui()

  const [viewerUrl, setViewerUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (!fileBlob && !fileUrl) {
        setIsLoading(false)
        setLoadError(t`No document provided for preview`)
        return
      }

      setIsLoading(true)
      setLoadError(null)
      setViewerUrl('')

      try {
        let blob = fileBlob
        if (!blob && fileUrl) {
          const response = await fetch(fileUrl)
          if (!response.ok) {
            throw new Error(t`Failed to fetch document`)
          }
          blob = await response.blob()
        }

        if (!blob) {
          throw new Error(t`Document data could not be loaded`)
        }

        const safeFileName = fileName || 'document.docx'
        const { fileId } = await uploadDocumentToCollabora(blob, safeFileName)
        if (cancelled) return

        const wopiSrc = buildWopiSrc(fileId)
        const url = buildViewerUrl({
          permission: 'readonly',
          ui: 'compact',
          wopiSrc,
        })

        if (cancelled) return
        setViewerUrl(url)
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : t`Failed to initialize document preview`,
          )
          setIsLoading(false)
        }
      }
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [fileBlob, fileName, fileUrl, t])

  const postToCollabora = useCallback((message: Record<string, unknown>) => {
    const iframeWindow = iframeRef.current?.contentWindow
    if (!iframeWindow) return
    iframeWindow.postMessage(JSON.stringify(message), '*')
  }, [])

  const handleIframeLoad = () => {
    postToCollabora({ MessageId: 'Host_PostmessageReady' })
    // Fallback in case Document_Loaded postMessage doesn't fire from iframe
    window.setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let message: any
      try {
        message =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }

      if (!message || typeof message !== 'object') return

      const msgId = message?.MessageId || message?.msg || message?.action

      if (
        msgId === 'App_LoadingStatus' &&
        (message.Values?.Status === 'Document_Loaded' ||
          message.status === 'Document_Loaded')
      ) {
        setIsLoading(false)
        postToCollabora({ MessageId: 'Host_PostmessageReady' })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [postToCollabora])

  // Failsafe timeout in case iframe loads without firing Document_Loaded
  useEffect(() => {
    if (!isLoading || loadError || !viewerUrl) return
    const timer = window.setTimeout(() => {
      setIsLoading(false)
    }, 15000)
    return () => window.clearTimeout(timer)
  }, [isLoading, loadError, viewerUrl])

  return (
    <div
      className={`relative h-full min-h-[320px] w-full overflow-hidden bg-[var(--gray-1)] ${className}`}
    >
      {isLoading && (
        <div className='absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[var(--gray-1)]/90 backdrop-blur-xs'>
          <Loader2 className='size-8 animate-spin text-[var(--primary-9)]' />
          <p className='text-xs font-medium text-[var(--gray-10)]'>{t`Loading preview...`}</p>
        </div>
      )}

      {loadError && (
        <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--gray-1)] px-6 text-center'>
          <AlertCircle className='text-[var(--primary-9)]' size={40} />
          <p className='text-sm font-semibold text-[var(--gray-13)]'>
            {t`Unable to preview document`}
          </p>
          <p className='max-w-md text-xs text-[var(--gray-10)]'>{loadError}</p>
        </div>
      )}

      {viewerUrl && !loadError && (
        <iframe
          allow='clipboard-read; clipboard-write'
          className={`h-full w-full border-0 transition-opacity duration-200 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          ref={iframeRef}
          src={viewerUrl}
          title={fileName || t`Document Preview`}
          onLoad={handleIframeLoad}
        />
      )}
    </div>
  )
}

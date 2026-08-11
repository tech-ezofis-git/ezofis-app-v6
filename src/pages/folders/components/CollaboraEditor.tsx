import { useCallback, useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import { Loader2, ScanLine, X } from 'lucide-react'
import {
  buildViewerUrl,
  buildWopiSrc,
  downloadEditedDocument,
  uploadDocumentToCollabora,
} from '@/api/collabora/collabora'
import showToast from '@/components/base/toast/showToast'

interface CollaboraEditorProps {
  fileBlob: Blob
  fileName: string
  fileType: string
  onClose: () => void
  onSave: (blob: Blob) => void
}

const CollaboraEditor: React.FC<CollaboraEditorProps> = ({
  fileBlob,
  fileName,
  fileType,
  onClose,
  onSave,
}) => {
  const { t } = useLingui()

  const [viewerUrl, setViewerUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadTimedOut, setLoadTimedOut] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fileIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setIsLoading(true)
      setLoadError(false)
      setLoadTimedOut(false)
      try {
        const { fileId, token } = await uploadDocumentToCollabora(
          fileBlob,
          fileName,
        )
        if (cancelled) return

        fileIdRef.current = fileId
        const wopiSrc = buildWopiSrc(fileId)
        const url = buildViewerUrl({ accessToken: token, wopiSrc })
        // eslint-disable-next-line no-console
        console.log('[collabora] viewer URL', url)
        setViewerUrl(url)
      } catch (error) {
        console.error('[collabora] failed to open document for editing', error)
        if (!cancelled) {
          setLoadError(true)
          setIsLoading(false)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [fileBlob, fileName])

  // Document_Loaded never fires if the WOPI handshake to the Collabora
  // backend fails silently inside the iframe — surface that instead of
  // spinning forever with the loading overlay hiding whatever Collabora
  // actually rendered.
  useEffect(() => {
    if (!isLoading || loadError) return
    const timer = window.setTimeout(() => setLoadTimedOut(true), 20000)
    return () => window.clearTimeout(timer)
  }, [isLoading, loadError])

  const postToCollabora = useCallback((message: Record<string, unknown>) => {
    const iframeWindow = iframeRef.current?.contentWindow
    iframeWindow?.postMessage(JSON.stringify(message), '*')
  }, [])

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      let message: any
      try {
        message =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }
      if (!message?.MessageId) return

      // eslint-disable-next-line no-console
      console.log('[collabora] message', message)

      if (
        message.MessageId === 'App_LoadingStatus' &&
        message.Values?.Status === 'Document_Loaded'
      ) {
        setIsLoading(false)
        postToCollabora({ MessageId: 'Host_PostmessageReady' })
      }

      if (message.MessageId === 'Action_Save_Resp') {
        if (message.Values?.success && fileIdRef.current) {
          try {
            const editedBlob = await downloadEditedDocument(
              fileIdRef.current,
              fileType,
            )
            onSave(editedBlob)
          } catch (error) {
            console.error('[collabora] failed to download edited document', error)
            showToast({
              message: t`Couldn't retrieve the edited document.`,
              variant: 'error',
            })
          } finally {
            setIsSaving(false)
          }
        } else {
          setIsSaving(false)
          showToast({
            message: t`Save failed inside the document editor.`,
            variant: 'error',
          })
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [fileType, onSave, postToCollabora, t])

  const handleSave = () => {
    setIsSaving(true)
    postToCollabora({ MessageId: 'Action_Save', Values: { Notify: true } })
  }

  return (
    <div className='relative flex h-full w-full flex-col bg-gray-1'>
      <div className='flex items-center justify-between border-b border-gray-3 bg-white px-3 py-2'>
        <span className='truncate text-[13px] font-semibold text-gray-12'>
          {fileName}
        </span>
        <div className='flex items-center gap-2'>
          <button
            className='inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-primary-9 px-3.5 text-[13px] font-semibold text-white transition-all hover:bg-primary-10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
            disabled={isLoading || isSaving || loadError}
            type='button'
            onClick={handleSave}
          >
            {isSaving ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              t`Save`
            )}
          </button>
          <button
            aria-label={t`Close`}
            className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-3 hover:text-gray-13 active:scale-95'
            type='button'
            onClick={onClose}
          >
            <X className='h-4 w-4' />
          </button>
        </div>
      </div>

      <div className='relative min-h-0 flex-1'>
        <AnimatePresence>
          {isLoading && !loadError ? (
            <motion.div
              animate={{ opacity: 1 }}
              className='pointer-events-none absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gray-4 bg-white/95 px-4 py-2 shadow-md backdrop-blur-sm'
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              <ScanLine className='h-4 w-4 animate-pulse text-primary-9' />
              <span className='text-[12px] font-medium text-gray-10'>
                {loadTimedOut
                  ? t`Still opening... this is taking longer than expected. Check the browser console / the document editor below for details.`
                  : t`Opening document...`}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {loadError ? (
          <div className='flex h-full flex-col items-center justify-center gap-2 p-6 text-center'>
            <span className='text-[14px] font-semibold text-gray-12'>
              {t`Couldn't open the document editor.`}
            </span>
            <span className='text-[12px] text-gray-10'>
              {t`Please try again.`}
            </span>
          </div>
        ) : viewerUrl ? (
          <iframe
            ref={iframeRef}
            allowFullScreen
            className='h-full w-full border-none'
            src={viewerUrl}
            title='collabora-editor'
          />
        ) : null}
      </div>
    </div>
  )
}

export default CollaboraEditor

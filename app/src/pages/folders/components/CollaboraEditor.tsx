import { useLingui } from '@lingui/react/macro'
import { ArrowLeft, Loader2, ScanLine } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildViewerUrl,
  buildWopiSrc,
  downloadEditedDocument,
  fetchUpdatedPdfBlob,
  uploadDocumentToCollabora,
} from '@/api/collabora/collabora'
import showToast from '@/components/base/toast/showToast'
import { Button, PrimaryButton } from './Ui'

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
  const versionRef = useRef<number>(1)

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
        versionRef.current = 1
        const wopiSrc = buildWopiSrc(fileId)
        const url = buildViewerUrl({
          accessToken: token,
          permission: 'edit',
          ui: 'classic',
          wopiSrc,
        })

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
  const saveTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isLoading || loadError) return
    const timer = window.setTimeout(() => {
      setLoadTimedOut(true)
      setIsLoading(false)
    }, 15000)
    return () => window.clearTimeout(timer)
  }, [isLoading, loadError])

  const postToCollabora = useCallback((message: Record<string, unknown>) => {
    const iframeWindow = iframeRef.current?.contentWindow
    if (!iframeWindow) {
      console.warn(
        '[collabora-debug] Cannot send postMessage: iframe contentWindow is null!',
      )
      return
    }
    const str = JSON.stringify(message)

    console.log('[collabora-debug] Sending postMessage to iframe window:', str)
    iframeWindow.postMessage(str, '*')
  }, [])

  const handleIframeLoad = () => {
    console.log(
      '[collabora-debug] iframe onLoad event fired. Sending Host_PostmessageReady...',
    )
    postToCollabora({ MessageId: 'Host_PostmessageReady' })
    // Fallback in case Document_Loaded postmessage doesn't fire from iframe
    window.setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log(
        '[collabora-debug] Incoming window postMessage raw event:',
        event.data,
        'origin:',
        event.origin,
      )

      let message: any
      try {
        message =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch (err) {
        console.log(
          '[collabora-debug] Could not parse postMessage data as JSON string:',
          event.data,
        )
        return
      }

      console.log('[collabora-debug] Parsed message object:', message)

      if (!message || typeof message !== 'object') return

      const msgId = message?.MessageId || message?.msg || message?.action

      if (
        msgId === 'App_LoadingStatus' &&
        (message.Values?.Status === 'Document_Loaded' ||
          message.status === 'Document_Loaded')
      ) {
        console.log(
          '[collabora-debug] App_LoadingStatus Document_Loaded received!',
        )
        setIsLoading(false)
        postToCollabora({ MessageId: 'Host_PostmessageReady' })
      }

      if (
        msgId === 'Action_Save_Resp' ||
        msgId === 'Action_Save' ||
        msgId === 'Doc_Saved'
      ) {
        console.log(
          '[collabora-debug] STEP 3: Received Save Response message from Collabora:',
          message,
        )
        if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)

        const isSuccess =
          message.Values?.success !== false && message.result !== 'error'

        if (isSuccess && fileIdRef.current) {
          try {
            const isPdf = String(fileType || '').toLowerCase() === 'pdf'
            if (isPdf) {
              console.log(
                '[collabora-debug] Fetching updated PDF blob version >',
                versionRef.current,
              )
              const { blob, version } = await fetchUpdatedPdfBlob(
                fileIdRef.current,
                versionRef.current,
              )
              versionRef.current = version
              onSave(blob)
            } else {
              console.log(
                '[collabora-debug] STEP 4: Downloading edited document for fileId:',
                fileIdRef.current,
                'fileType:',
                fileType,
              )
              const editedBlob = await downloadEditedDocument(
                fileIdRef.current,
                fileType,
              )
              onSave(editedBlob)
            }
          } catch (error) {
            console.error(
              '[collabora-debug] ERROR: Failed to download edited document:',
              error,
            )
            showToast({
              message: t`Couldn't retrieve the edited document.`,
              variant: 'error',
            })
          } finally {
            setIsSaving(false)
          }
        } else {
          console.warn(
            '[collabora-debug] ERROR: Save returned non-success:',
            message,
          )
          setIsSaving(false)
          showToast({
            message: t`Save failed inside the document editor.`,
            variant: 'error',
          })
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
    }
  }, [fileType, onSave, postToCollabora, t])

  const handleSave = async () => {
    if (!fileIdRef.current) return
    setIsSaving(true)

    // All types go through Collabora's save. PDFs are edited as ODG
    // server-side and emit Action_Save_Resp like any other document.
    postToCollabora({
      MessageId: 'Action_Save',
      Values: { DontSaveIfUnmodified: false, Notify: true },
    })

    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(() => {
      setIsSaving(false)
      showToast({
        message: t`Save request timed out inside the document editor.`,
        variant: 'error',
      })
    }, 30000)
  }

  return (
    <div className='relative flex h-full min-h-0 w-full flex-1 flex-col bg-gray-1'>
      <div className='flex h-[60px] shrink-0 items-center justify-between gap-2 border-b border-gray-3 bg-surface-primary px-5'>
        <Button
          className='h-8 border-transparent px-3 text-[13px] shadow-none'
          type='button'
          onClick={onClose}
        >
          <ArrowLeft size={12} /> {t`Back`}
        </Button>

        <span className='truncate text-[13px] font-semibold text-gray-12'>
          {fileName}
        </span>

        <PrimaryButton
          className='h-8 px-3.5 text-[13px]'
          disabled={!viewerUrl || isSaving || loadError}
          type='button'
          onClick={handleSave}
        >
          {isSaving ? <Loader2 className='h-4 w-4 animate-spin' /> : t`Save`}
        </PrimaryButton>
      </div>

      <div className='relative min-h-0 flex-1'>
        <AnimatePresence>
          {isLoading && !loadError ? (
            <motion.div
              animate={{ opacity: 1 }}
              className='pointer-events-none absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gray-4 bg-surface/95 px-4 py-2 shadow-md backdrop-blur-sm'
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
            <span className='text-[12px] text-gray-10'>{t`Please try again.`}</span>
          </div>
        ) : viewerUrl ? (
          <iframe
            className='h-full w-full border-none'
            ref={iframeRef}
            src={viewerUrl}
            title='collabora-editor'
            allowFullScreen
            onLoad={handleIframeLoad}
          />
        ) : null}
      </div>
    </div>
  )
}

export default CollaboraEditor

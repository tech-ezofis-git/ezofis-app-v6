import { useCallback, useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Loader2, ScanLine } from 'lucide-react'
import {
  buildViewerUrl,
  buildWopiSrc,
  downloadEditedDocument,
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
      // eslint-disable-next-line no-console
      console.warn('[collabora-debug] Cannot send postMessage: iframe contentWindow is null!')
      return
    }
    const str = JSON.stringify(message)
    // eslint-disable-next-line no-console
    console.log('[collabora-debug] Sending postMessage to iframe window:', str)
    iframeWindow.postMessage(str, '*')
    try {
      iframeWindow.postMessage(message, '*')
    } catch {
      // ignore object postMessage clone errors if any
    }
  }, [])

  const handleIframeLoad = () => {
    // eslint-disable-next-line no-console
    console.log('[collabora-debug] iframe onLoad event fired. Sending Host_PostmessageReady...')
    postToCollabora({ MessageId: 'Host_PostmessageReady' })
    // Fallback in case Document_Loaded postmessage doesn't fire from iframe
    window.setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // eslint-disable-next-line no-console
      console.log('[collabora-debug] Incoming window postMessage raw event:', event.data, 'origin:', event.origin)

      let message: any
      try {
        message =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('[collabora-debug] Could not parse postMessage data as JSON string:', event.data)
        return
      }

      // eslint-disable-next-line no-console
      console.log('[collabora-debug] Parsed message object:', message)

      if (!message || typeof message !== 'object') return

      const msgId = message?.MessageId || message?.msg || message?.action

      if (
        msgId === 'App_LoadingStatus' &&
        (message.Values?.Status === 'Document_Loaded' || message.status === 'Document_Loaded')
      ) {
        // eslint-disable-next-line no-console
        console.log('[collabora-debug] App_LoadingStatus Document_Loaded received!')
        setIsLoading(false)
        postToCollabora({ MessageId: 'Host_PostmessageReady' })
      }

      if (
        msgId === 'Action_Save_Resp' ||
        msgId === 'Action_Save' ||
        msgId === 'Doc_Saved'
      ) {
        // eslint-disable-next-line no-console
        console.log('[collabora-debug] STEP 3: Received Save Response message from Collabora:', message)
        if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)

        const isSuccess =
          message.Values?.success !== false &&
          message.result !== 'error'

        if (isSuccess && fileIdRef.current) {
          try {
            // eslint-disable-next-line no-console
            console.log('[collabora-debug] STEP 4: Downloading edited document for fileId:', fileIdRef.current, 'fileType:', fileType)
            const editedBlob = await downloadEditedDocument(
              fileIdRef.current,
              fileType,
            )
            // eslint-disable-next-line no-console
            console.log('[collabora-debug] STEP 5: Downloaded edited blob. Size:', editedBlob?.size, 'type:', editedBlob?.type)
            // eslint-disable-next-line no-console
            console.log('[collabora-debug] STEP 6: Invoking onSave callback with blob...')
            onSave(editedBlob)
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[collabora-debug] ERROR: Failed to download edited document:', error)
            showToast({
              message: t`Couldn't retrieve the edited document.`,
              variant: 'error',
            })
          } finally {
            setIsSaving(false)
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn('[collabora-debug] ERROR: Save returned non-success:', message)
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
    // eslint-disable-next-line no-console
    console.log('[collabora-debug] STEP 1: Save button clicked in top bar! fileId:', fileIdRef.current, 'fileType:', fileType)
    setIsSaving(true)

    if (!fileIdRef.current) {
      // eslint-disable-next-line no-console
      console.warn('[collabora-debug] No fileIdRef found!')
      setIsSaving(false)
      return
    }

    const normalizedType = String(fileType || '').toLowerCase()

    // For PDF files or non-office files, Collabora Online is in viewer mode and does not emit Action_Save_Resp.
    // Download the document blob directly from the Collabora WOPI service and proceed with save.
    if (normalizedType === 'pdf') {
      // eslint-disable-next-line no-console
      console.log('[collabora-debug] STEP 2 (PDF Mode): Direct download from Collabora container for fileId:', fileIdRef.current)
      try {
        const editedBlob = await downloadEditedDocument(fileIdRef.current, fileType)
        // eslint-disable-next-line no-console
        console.log('[collabora-debug] STEP 5: Successfully retrieved PDF blob. Size:', editedBlob?.size, 'bytes. Invoking onSave...')
        onSave(editedBlob)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[collabora-debug] ERROR: Failed to download PDF blob:', err)
        showToast({
          message: t`Couldn't retrieve the document file.`,
          variant: 'error',
        })
      } finally {
        setIsSaving(false)
      }
      return
    }

    // For docx / xlsx / pptx editable files, post Action_Save to Collabora iframe:
    // eslint-disable-next-line no-console
    console.log('[collabora-debug] STEP 2: Posting Action_Save to Collabora iframe...')
    postToCollabora({ MessageId: 'Action_Save', Values: { Notify: true, DontSaveIfUnmodified: false } })

    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(async () => {
      // eslint-disable-next-line no-console
      console.warn('[collabora-debug] Action_Save_Resp timeout (3s). Triggering automatic direct download fallback...')
      try {
        if (fileIdRef.current) {
          const editedBlob = await downloadEditedDocument(fileIdRef.current, fileType)
          // eslint-disable-next-line no-console
          console.log('[collabora-debug] Fallback download successful! Blob size:', editedBlob?.size, 'bytes. Invoking onSave...')
          onSave(editedBlob)
          return
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[collabora-debug] Direct download fallback failed:', err)
      } finally {
        setIsSaving(false)
      }
      showToast({
        message: t`Save request timed out inside the document editor.`,
        variant: 'error',
      })
    }, 3000)
  }

  return (
    <div className='relative flex h-full w-full flex-1 flex-col min-h-0 bg-gray-1'>
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
            onLoad={handleIframeLoad}
          />
        ) : null}
      </div>
    </div>
  )
}

export default CollaboraEditor

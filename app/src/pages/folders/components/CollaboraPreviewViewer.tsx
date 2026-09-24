import { useCallback, useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { AlertCircle, Check, FileSignature, Loader2, Plus, Trash2 } from 'lucide-react'
import { Rnd } from 'react-rnd'
import {
  buildViewerUrl,
  buildWopiSrc,
  downloadEditedDocument,
  uploadDocumentToCollabora,
} from '@/api/collabora/collabora'
import showToast from '@/components/base/toast/showToast'
import type { FolderPermissionFlags } from '@/api/v6/folder/security'

export interface PlacedSignatureField {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  signatureData?: string
  signerName?: string
}

export interface CollaboraPreviewViewerProps {
  className?: string
  fileBlob?: Blob | null
  fileName?: string
  fileUrl?: string | null
  permission?: 'edit' | 'readonly'
  // Signature props
  isSigningMode?: boolean
  signRequestId?: string
  permissions?: FolderPermissionFlags
  restrictToFields?: boolean
  signatureFields?: PlacedSignatureField[]
  signerName?: string
  signerEmail?: string
  onCompleteSigning?: (placements: PlacedSignatureField[]) => Promise<void>
}

export default function CollaboraPreviewViewer({
  className = '',
  fileBlob,
  fileName,
  fileUrl,
  permission = 'readonly',
  isSigningMode = false,
  permissions,
  signatureFields: initialSignatureFields = [],
  signerName,
  onCompleteSigning,
}: CollaboraPreviewViewerProps) {
  const { t } = useLingui()

  const [viewerUrl, setViewerUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [collaboraFileId, setCollaboraFileId] = useState<string | null>(null)

  // Signing state
  const [internalSigning, setInternalSigning] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [placedFields, setPlacedFields] = useState<PlacedSignatureField[]>(
    initialSignatureFields,
  )
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const canSendForSignature = permissions?.sendForSignature === true
  const activeSigningMode = isSigningMode || internalSigning

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

        setCollaboraFileId(fileId)
        const wopiSrc = buildWopiSrc(fileId)
        const url = buildViewerUrl({
          permission,
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
  }, [fileBlob, fileName, fileUrl, permission, t])

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

      if (msgId === 'Page_Changed' || message?.Values?.Page) {
        const pageNum = Number(message?.Values?.Page || message?.page)
        if (pageNum && !Number.isNaN(pageNum)) {
          setCurrentPage(pageNum)
        }
      }

      if (message?.Values?.TotalPages) {
        const total = Number(message.Values.TotalPages)
        if (total && !Number.isNaN(total)) {
          setTotalPages(total)
        }
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

  const handleAddSignatureField = () => {
    const newField: PlacedSignatureField = {
      id: `sign-field-${Date.now()}`,
      page: currentPage,
      x: 100,
      y: 150,
      width: 200,
      height: 70,
      signerName: signerName || 'Signer',
    }
    setPlacedFields((prev) => [...prev, newField])
    setSelectedFieldId(newField.id)
    showToast({
      message: t`Signature box placed on Page ${currentPage}`,
      variant: 'success',
    })
  }

  const handleRemoveField = (id: string) => {
    setPlacedFields((prev) => prev.filter((f) => f.id !== id))
    if (selectedFieldId === id) setSelectedFieldId(null)
  }

  const handleFinishSigning = async () => {
    if (placedFields.length === 0) {
      showToast({
        message: t`Please place at least one signature box before submitting.`,
        variant: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)
      if (collaboraFileId) {
        // Attempt PDF export download from Collabora WOPI host if available
        try {
          await downloadEditedDocument(collaboraFileId, 'pdf')
        } catch {
          // Non-blocking if pdf conversion host endpoint is unavailable
        }
      }

      if (onCompleteSigning) {
        await onCompleteSigning(placedFields)
      }
      showToast({
        message: t`Signature workflow completed successfully!`,
        variant: 'success',
      })
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? err.message
            : t`Failed to complete signing process`,
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const showSigningOverlay =
    activeSigningMode && (canSendForSignature || isSigningMode)

  return (
    <div
      ref={containerRef}
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

      {/* Floating Quick Action Button when Sign Mode is inactive */}
      {!activeSigningMode && canSendForSignature && !isLoading && !loadError && (
        <div className='pointer-events-auto absolute top-4 right-4 z-30 animate-in fade-in zoom-in-95 duration-300'>
          <button
            type='button'
            onClick={() => setInternalSigning(true)}
            className='flex items-center gap-2 rounded-xl border border-gray-3/80 bg-surface-primary/95 px-3.5 py-2 text-xs font-semibold text-gray-12 shadow-xl backdrop-blur-md transition-all hover:bg-surface-secondary hover:scale-105 active:scale-95'
          >
            <FileSignature className='size-4 text-accent-primary' />
            <span>{t`Sign Document`}</span>
          </button>
        </div>
      )}

      {/* Signature Placement Overlay */}
      {showSigningOverlay && !isLoading && !loadError && (
        <div className='pointer-events-none absolute inset-0 z-30'>
          {/* Floating Action Toolbar */}
          <div className='pointer-events-auto absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-surface-secondary/80 bg-surface-primary/95 px-4 py-2 shadow-2xl backdrop-blur-md transition-all'>
            <div className='flex items-center gap-2 pr-2 border-r border-gray-4 text-xs font-semibold text-gray-12'>
              <FileSignature className='size-4 text-accent-primary' />
              <span>{t`Sign Mode`}</span>
              <span className='rounded bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent-primary'>
                {t`Page ${currentPage} / ${totalPages}`}
              </span>
            </div>

            <button
              type='button'
              onClick={handleAddSignatureField}
              className='flex items-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-medium text-gray-12 hover:bg-surface-secondary/80 active:scale-95 transition-all'
            >
              <Plus className='size-3.5 text-accent-primary' />
              <span>{t`Add Signature Box`}</span>
            </button>

            {placedFields.length > 0 && (
              <button
                type='button'
                onClick={() => setPlacedFields([])}
                className='flex items-center gap-1.5 rounded-lg bg-error-subtle/40 px-2.5 py-1.5 text-xs font-medium text-error-main hover:bg-error-subtle active:scale-95 transition-all'
              >
                <Trash2 className='size-3.5' />
                <span>{t`Clear All`}</span>
              </button>
            )}

            <button
              type='button'
              disabled={isSubmitting || placedFields.length === 0}
              onClick={handleFinishSigning}
              className='flex items-center gap-1.5 rounded-lg bg-accent-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-opacity-90 active:scale-95 disabled:opacity-50 transition-all'
            >
              {isSubmitting ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <Check className='size-3.5' />
              )}
              <span>{t`Finish & Save`}</span>
            </button>
          </div>

          {/* Interactive Rnd Placement Boxes */}
          {placedFields.map((field) => {
            const isSelected = selectedFieldId === field.id
            return (
              <Rnd
                key={field.id}
                bounds='parent'
                className={`pointer-events-auto flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-accent-soft/30 p-2 shadow-md transition-shadow ${
                  isSelected
                    ? 'border-accent-primary ring-2 ring-accent-primary/40'
                    : 'border-accent-primary/60 hover:border-accent-primary'
                }`}
                position={{ x: field.x, y: field.y }}
                size={{ width: field.width, height: field.height }}
                onDragStart={() => setSelectedFieldId(field.id)}
                onDragStop={(_e, d) => {
                  setPlacedFields((prev) =>
                    prev.map((f) =>
                      f.id === field.id ? { ...f, x: d.x, y: d.y } : f,
                    ),
                  )
                }}
                onResizeStop={(_e, _dir, ref, _delta, pos) => {
                  setPlacedFields((prev) =>
                    prev.map((f) =>
                      f.id === field.id
                        ? {
                            ...f,
                            width: ref.offsetWidth,
                            height: ref.offsetHeight,
                            x: pos.x,
                            y: pos.y,
                          }
                        : f,
                    ),
                  )
                }}
              >
                <div className='flex h-full w-full flex-col items-center justify-center gap-1 text-center select-none'>
                  <div className='flex items-center gap-1 text-[11px] font-bold text-accent-primary'>
                    <FileSignature className='size-3' />
                    <span>{field.signerName || t`Signature`}</span>
                  </div>
                  <span className='text-[10px] text-gray-10'>
                    {t`Page ${field.page}`}
                  </span>

                  <button
                    type='button'
                    aria-label={t`Delete signature box`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveField(field.id)
                    }}
                    className='absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-error-main text-white shadow hover:scale-110 transition-all'
                  >
                    <Trash2 className='size-3' />
                  </button>
                </div>
              </Rnd>
            )
          })}
        </div>
      )}
    </div>
  )
}


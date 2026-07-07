import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core'
import { searchPlugin } from '@react-pdf-viewer/search'
import { FileText } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import BarLoader from '@/components/base/BarLoader'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/search/lib/styles/index.css'

const PDF_WORKER_URL =
  'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js'

type DocumentPreviewViewerProps = {
  className?: string
  enableHighlight?: boolean
  fileName?: string
  fileUrl: string | null
  highlightTerms?: string[]
  isImage?: boolean
  isLoading?: boolean
  isPdf?: boolean
  showScanOverlay?: boolean
}

type PdfViewerProps = {
  fileUrl: string
  highlightTerms?: string[]
}

export default function DocumentPreviewViewer({
  className = '',
  enableHighlight = false,
  fileName,
  fileUrl,
  highlightTerms = [],
  isImage = false,
  isLoading = false,
  isPdf = false,
  showScanOverlay = false,
}: DocumentPreviewViewerProps) {
  let content = null

  if (isLoading) {
    content = (
      <div className='flex h-full min-h-[320px] flex-col items-center justify-center gap-4 bg-[var(--gray-1)]'>
        <BarLoader />
        <p className='text-xs font-bold tracking-widest text-[var(--gray-10)] uppercase'>
          Loading Preview...
        </p>
      </div>
    )
  } else if (!fileUrl) {
    content = (
      <div className='flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center'>
        <FileText className='text-[var(--primary-9)]' size={40} />
        <p className='text-sm font-semibold text-[var(--gray-13)]'>
          Preview not available
        </p>
        {fileName ? (
          <p className='text-xs font-medium text-[var(--gray-9)]'>{fileName}</p>
        ) : null}
      </div>
    )
  } else if (isPdf) {
    content = enableHighlight ? (
      <PdfViewer
        fileUrl={fileUrl}
        highlightTerms={highlightTerms}
        key={fileUrl}
      />
    ) : (
      <SimplePdfViewer fileUrl={fileUrl} key={fileUrl} />
    )
  } else if (isImage) {
    content = (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <img
          alt={fileName || 'Document Preview'}
          className='max-h-full max-w-full object-contain'
          src={fileUrl}
        />
      </div>
    )
  } else {
    content = (
      <div className='flex h-full flex-col items-center justify-center gap-2 text-center'>
        <FileText className='text-[var(--primary-9)]' size={40} />
        <p className='text-sm font-semibold text-[var(--gray-13)]'>
          Preview not available
        </p>
      </div>
    )
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {content}

      {showScanOverlay && fileUrl ? (
        <div className='pointer-events-none absolute inset-0 z-10 overflow-hidden'>
          <div className='bg-[color-mix(in srgb,var(--primary-9)_3%,transparent)] absolute inset-0' />
          <div className='animate-scan absolute right-0 left-0 h-[2px] bg-[var(--primary-9)] shadow-[0_0_8px_var(--primary-9),_0_0_16px_var(--primary-9)]' />
        </div>
      ) : null}
    </div>
  )
}

function PdfViewer({ fileUrl, highlightTerms = [] }: PdfViewerProps) {
  const currentSearchPluginInstance = searchPlugin()
  const searchPluginInstanceRef = useRef<ReturnType<
    typeof searchPlugin
  > | null>(null)

  if (!searchPluginInstanceRef.current) {
    searchPluginInstanceRef.current = currentSearchPluginInstance
  } else {
    Object.assign(searchPluginInstanceRef.current, currentSearchPluginInstance)
  }

  const searchPluginInstance = searchPluginInstanceRef.current
  const { clearHighlights, highlight } = currentSearchPluginInstance

  const [documentReady, setDocumentReady] = useState(false)
  const lastHighlightKeyRef = useRef('')

  const highlightKey = useMemo(() => {
    return highlightTerms
      .map((term) => String(term || '').trim())
      .filter((term) => term && term !== '-')
      .join('|')
  }, [highlightTerms])

  useEffect(() => {
    setDocumentReady(false)
    lastHighlightKeyRef.current = ''
  }, [fileUrl])

  useEffect(() => {
    if (!documentReady) return
    if (lastHighlightKeyRef.current === highlightKey) return
    lastHighlightKeyRef.current = highlightKey

    try {
      if (!highlightKey) {
        clearHighlights()
        return
      }
      highlight(highlightKey.split('|'))
    } catch {
      // Search plugin not ready yet
    }
  }, [highlightKey, documentReady, clearHighlights, highlight])

  return (
    <Worker workerUrl={PDF_WORKER_URL}>
      <Viewer
        defaultScale={SpecialZoomLevel.PageWidth}
        fileUrl={fileUrl}
        plugins={[searchPluginInstance]}
        onDocumentLoad={() => setDocumentReady(true)}
      />
    </Worker>
  )
}

function SimplePdfViewer({ fileUrl }: { fileUrl: string }) {
  return (
    <Worker workerUrl={PDF_WORKER_URL}>
      <Viewer defaultScale={SpecialZoomLevel.PageWidth} fileUrl={fileUrl} />
    </Worker>
  )
}

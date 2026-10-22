import { ArrowLeft, Download, Eye, FileText } from 'lucide-react'
import PostalMime from 'postal-mime'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import SkeletonDocumentPreview from '@/components/common/skeletons/SkeletonDocumentPreview'

// Lazy: DocumentPreviewViewer itself renders EmlPreview for .eml files.
const DocumentPreviewViewer = lazy(() => import('./DocumentPreviewViewer'))

type EmlAttachment = {
  filename: string
  mimeType: string
  size: string
  url: string
}

interface EmlPreviewProps {
  fileUrl: string
  fileName?: string
}

const getInitials = (name?: string, email?: string) => {
  const str = name || email || '?'
  return str.substring(0, 2).toUpperCase()
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 MB'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function EmlPreview({ fileName, fileUrl }: EmlPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [emailData, setEmailData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  /** Attachment opened in place of the email body (null = show email). */
  const [openAttachment, setOpenAttachment] = useState<EmlAttachment | null>(
    null,
  )

  useEffect(() => {
    let active = true

    const loadEml = async () => {
      try {
        setLoading(true)
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error('Failed to load email file')
        const arrayBuffer = await response.arrayBuffer()

        const parser = new PostalMime()
        const parsedEmail = await parser.parse(arrayBuffer)

        if (active) {
          setEmailData(parsedEmail)
          setLoading(false)
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to parse email file')
          setLoading(false)
        }
      }
    }

    loadEml()
    return () => {
      active = false
    }
  }, [fileUrl])

  const prepared = useMemo(() => {
    if (!emailData) return null
    const urls: string[] = []
    let processedHtml = emailData.html
    const displayAttachments: EmlAttachment[] = []

    const attachments = Array.isArray(emailData.attachments)
      ? emailData.attachments
      : []
    attachments.forEach((att: any, idx: number) => {
      if (!att?.content) return
      let isInlineReplaced = false
      if (att.contentId && processedHtml) {
        const cleanCid = String(att.contentId)
          .replace(/^</, '')
          .replace(/>$/, '')
        if (processedHtml.includes(`cid:${cleanCid}`)) {
          const url = URL.createObjectURL(
            new Blob([att.content], { type: att.mimeType }),
          )
          urls.push(url)
          processedHtml = processedHtml.split(`cid:${cleanCid}`).join(url)
          isInlineReplaced = true
        }
      }

      if (!isInlineReplaced) {
        const url = URL.createObjectURL(
          new Blob([att.content], { type: att.mimeType }),
        )
        urls.push(url)
        const byteLength =
          att.content.length ?? att.content.byteLength ?? att.content.size
        displayAttachments.push({
          filename: att.filename || `attachment-${idx}`,
          mimeType: String(att.mimeType || ''),
          size: typeof byteLength === 'number' ? formatBytes(byteLength) : '',
          url,
        })
      }
    })

    const htmlWithMargin = processedHtml
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"/><base target="_blank"/><style>
        html,body{margin:0;padding:0;background:#fff;}
        body{padding:20px 24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;line-height:1.5;color:#1f2937;word-break:break-word;}
        img{max-width:100%;height:auto;}
        table{max-width:100%;}
      </style></head><body>${processedHtml}</body></html>`
      : null

    return { displayAttachments, htmlWithMargin, urls }
  }, [emailData])

  useEffect(() => {
    const urls = prepared?.urls
    // A new email invalidates any open attachment's blob URL.
    setOpenAttachment(null)
    return () => {
      urls?.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [prepared])

  if (loading) return <SkeletonDocumentPreview flush />

  if (error || !emailData || !prepared) {
    return (
      <div className='flex h-full min-h-[320px] flex-col items-center justify-center gap-2 bg-surface px-6 text-center'>
        <FileText className='text-[var(--primary-9)]' size={40} />
        <p className='text-sm font-semibold text-[var(--gray-13)]'>
          Unable to preview email
        </p>
        <p className='max-w-sm text-xs text-[var(--gray-10)]'>{error}</p>
      </div>
    )
  }

  const { displayAttachments, htmlWithMargin } = prepared

  if (openAttachment) {
    const mime = openAttachment.mimeType.toLowerCase()
    return (
      <div className='animate-in fade-in flex h-full w-full flex-col overflow-hidden bg-surface text-[13px] duration-200'>
        <div className='flex shrink-0 items-center gap-2 border-b border-gray-3 px-3 py-2 sm:px-4'>
          <button
            className='inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-gray-12 transition-all hover:bg-gray-2 active:scale-95'
            type='button'
            onClick={() => setOpenAttachment(null)}
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div className='h-5 w-px shrink-0 bg-gray-4' />
          <FileText className='shrink-0 text-red-9' size={18} />
          <div className='flex min-w-0 flex-1 flex-col'>
            <span className='truncate text-[13px] font-medium text-gray-12'>
              {openAttachment.filename}
            </span>
            {openAttachment.size ? (
              <span className='text-[11px] leading-none text-gray-9'>
                {openAttachment.size}
              </span>
            ) : null}
          </div>
          <a
            aria-label='Download attachment'
            className='inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-2 hover:text-gray-12 active:scale-95'
            download={openAttachment.filename}
            href={openAttachment.url}
            title='Download'
          >
            <Download size={16} />
          </a>
        </div>
        <div className='min-h-0 flex-1'>
          <Suspense fallback={<SkeletonDocumentPreview flush />}>
            <DocumentPreviewViewer
              fileName={openAttachment.filename}
              fileUrl={openAttachment.url}
              isImage={mime.startsWith('image/')}
              isPdf={mime === 'application/pdf'}
            />
          </Suspense>
        </div>
      </div>
    )
  }

  const { from, text, to } = emailData
  const toList = Array.isArray(to) ? to : to ? [to] : []
  const initials = getInitials(from?.name, from?.address)

  return (
    <div className='flex h-full w-full flex-col overflow-hidden bg-surface font-sans text-[13px]'>
      <div className='flex-shrink-0 border-b border-gray-3'>
        <div className='px-4 pt-4 pb-3 sm:px-5 sm:pt-5'>
          <div className='flex items-start gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-4 text-sm font-semibold text-primary-12'>
              {initials}
            </div>
            <div className='flex min-w-0 flex-col pt-0.5'>
              <div className='truncate text-[14px] font-medium text-blue-11'>
                {from?.name ? `${from.name} <${from.address}>` : from?.address}
              </div>
              <div className='mt-1.5 flex gap-1.5 text-gray-11'>
                <span className='shrink-0'>To:</span>
                <span className='min-w-0 truncate'>
                  {toList.map((t: any) => t.address).join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {displayAttachments.length > 0 && (
          <div className='px-4 pb-3 sm:px-5'>
            <div className='flex flex-wrap gap-3'>
              {displayAttachments.map((att) => {
                return (
                  <button
                    className='group flex w-64 cursor-pointer items-center justify-between rounded-md border border-[var(--gray-3)] bg-[var(--gray-1)] p-2.5 text-left transition-colors hover:bg-[var(--gray-2)] active:scale-[0.99]'
                    key={att.url}
                    title={`Open ${att.filename}`}
                    type='button'
                    onClick={() => setOpenAttachment(att)}
                  >
                    <div className='flex items-center gap-3 overflow-hidden'>
                      <FileText className='shrink-0 text-red-9' size={20} />
                      <div className='flex min-w-0 flex-col'>
                        <span className='mb-0.5 truncate text-[13px] leading-tight text-[var(--gray-12)]'>
                          {att.filename}
                        </span>
                        <span className='text-[11px] leading-none text-[var(--gray-9)]'>
                          {att.size}
                        </span>
                      </div>
                    </div>
                    <Eye
                      className='ml-2 shrink-0 text-[var(--gray-8)] group-hover:text-[var(--gray-11)]'
                      size={18}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className='relative min-h-0 flex-1 overflow-auto'>
        {htmlWithMargin ? (
          <iframe
            className='h-full min-h-[280px] w-full border-none'
            sandbox='allow-same-origin'
            srcDoc={htmlWithMargin}
            title={fileName || 'Email Content'}
          />
        ) : (
          <pre className='px-4 pb-5 font-sans text-[13px] whitespace-pre-wrap text-[var(--gray-12)] sm:px-5'>
            {text}
          </pre>
        )}
      </div>
    </div>
  )
}

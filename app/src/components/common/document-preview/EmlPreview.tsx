import { ChevronDown, FileText } from 'lucide-react'
import PostalMime from 'postal-mime'
import { useEffect, useMemo, useState } from 'react'
import SkeletonDocumentPreview from '@/components/common/skeletons/SkeletonDocumentPreview'

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
    const displayAttachments: {
      filename?: string
      size: string
      url: string
    }[] = []

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
                  <a
                    className='group flex w-64 cursor-pointer items-center justify-between rounded-md border border-[var(--gray-3)] bg-[var(--gray-1)] p-2.5 transition-colors hover:bg-[var(--gray-2)]'
                    download={att.filename}
                    href={att.url}
                    key={att.url}
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
                    <ChevronDown
                      className='ml-2 shrink-0 text-[var(--gray-8)] group-hover:text-[var(--gray-11)]'
                      size={18}
                    />
                  </a>
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

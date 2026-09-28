import { useEffect, useState } from 'react'
import PostalMime from 'postal-mime'
import { FileText, ChevronDown } from 'lucide-react'
import SkeletonDocumentPreview from '@/components/common/skeletons/SkeletonDocumentPreview'

interface EmlPreviewProps {
  fileName?: string
  fileUrl: string
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
    return () => { active = false }
  }, [fileUrl])

  if (loading) return <SkeletonDocumentPreview />

  if (error) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 bg-white px-6 text-center">
        <FileText className="text-[var(--primary-9)]" size={40} />
        <p className="text-sm font-semibold text-[var(--gray-13)]">Unable to preview email</p>
        <p className="max-w-sm text-xs text-[var(--gray-10)]">{error}</p>
      </div>
    )
  }

  let processedHtml = emailData.html
  const displayAttachments: any[] = []

  if (emailData.attachments) {
    emailData.attachments.forEach((att: any) => {
      let isInlineReplaced = false
      if (att.contentId && processedHtml) {
        const cleanCid = att.contentId.replace(/^</, '').replace(/>$/, '')
        if (processedHtml.includes(`cid:${cleanCid}`)) {
          const blob = new Blob([att.content], { type: att.mimeType })
          const url = URL.createObjectURL(blob)
          processedHtml = processedHtml.split(`cid:${cleanCid}`).join(url)
          isInlineReplaced = true
        }
      }
      
      if (!isInlineReplaced) {
        displayAttachments.push(att)
      }
    })
  }

  const { from, to, text } = emailData
  const toList = Array.isArray(to) ? to : to ? [to] : []
  const initials = getInitials(from?.name, from?.address)

  return (
    <div className="flex h-full w-full flex-col bg-white overflow-hidden text-[13px] font-sans">
      <div className="flex-shrink-0 px-6 pt-6 pb-2">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d7caed] text-[#4f4270] font-semibold text-sm">
            {initials}
          </div>
          <div className="flex flex-col pt-0.5">
            <div className="text-[#0a58ca] font-medium text-[14px]">
              {from?.name ? `${from.name}<${from.address}>` : from?.address}
            </div>
            <div className="text-gray-700 mt-1.5 flex gap-1.5">
              <span>To:</span>
              <span>{toList.map((t: any) => t.address).join(', ')}</span>
            </div>
          </div>
        </div>
      </div>

      {displayAttachments.length > 0 && (
        <div className="flex-shrink-0 px-6 py-4">
          <div className="flex flex-wrap gap-3">
            {displayAttachments.map((att: any, idx: number) => {
              const url = URL.createObjectURL(new Blob([att.content], { type: att.mimeType }))
              const size = att.content ? formatBytes(att.content.length || att.content.byteLength) : ''
              return (
                <a
                  key={idx}
                  href={url}
                  download={att.filename || `attachment-${idx}`}
                  className="flex items-center justify-between w-64 rounded-md border border-gray-200 bg-white p-2.5 hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText size={20} className="text-red-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-gray-800 text-[13px] leading-tight mb-0.5">{att.filename || `attachment-${idx}`}</span>
                      <span className="text-[11px] text-gray-500 leading-none">{size}</span>
                    </div>
                  </div>
                  <ChevronDown size={18} className="text-gray-400 group-hover:text-gray-600 shrink-0 ml-2" />
                </a>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white px-6 pb-6 relative">
        {processedHtml ? (
          <iframe
            srcDoc={processedHtml}
            title="Email Content"
            className="w-full h-full border-none"
            sandbox="allow-same-origin"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-[13px] text-gray-800">{text}</pre>
        )}
      </div>
    </div>
  )
}

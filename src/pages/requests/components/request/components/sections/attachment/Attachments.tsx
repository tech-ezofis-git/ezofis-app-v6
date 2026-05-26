// import { useState } from 'react'
import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Icon from '@/components/base/icon/Icon'
import {
  type AttachmentItem,
  useAttachments,
} from '@/pages/requests/hooks/useAttachments'
import authUserStore from '@/stores/authUserStore'

type FileLike = AttachmentItem

type Props = {
  canUpload?: boolean
  enabled?: boolean
  processId?: number
  repositoryDetails?: { fieldsType?: string }
  repositoryId?: number | string
  selectedChecklistName?: string | null
  transactionId?: number | string
  workflowId?: number
  onClose?: () => void
  onOpenComments?: (file: AttachmentItem) => void
  onOpenHistory?: (file: AttachmentItem) => void
  onOpenMailShare?: (
    files: Array<{ id: string | number; name: string }>,
  ) => void
  onSelect?: (file: AttachmentItem) => void
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// function TooltipButton({
//     icon,
//     label,
//     onClick,
//     disabled,
//     active
// }: {
//     icon: string
//     label: string
//     onClick: () => void
//     disabled?: boolean
//     active?: boolean
// }) {
//     return (
//         <button
//             onClick={onClick}
//             disabled={disabled}
//             title={label}
//             className={cn(
//                 "group relative rounded-xl p-2 transition-all hover:bg-surface/20 disabled:opacity-40 disabled:hover:bg-transparent",
//                 active && "bg-surface/20"
//             )}
//         >
//             <Icon name={icon} className="size-5" />
//             <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--gray-13)] px-2 py-1 text-[10px] font-bold text-[var(--text-on-accent)] opacity-0 transition-opacity group-hover:opacity-100 Pointer-events-none">
//                 {label}
//             </span>
//         </button>
//     )
// }

function resolveApiBaseUrl() {
  const v = (import.meta as any)?.env?.VITE_BASE_URL
  return String(v || '').replace(/\/$/, '')
}

const getExt = (name?: string) => (name?.split('.').pop() || '').toLowerCase()

// const fileSupport = (ext: string) => {
//     const allowed = [
//         'pdf',
//         'doc',
//         'docx',
//         'xls',
//         'xlsx',
//         'ppt',
//         'pptx',
//         'png',
//         'jpg',
//         'jpeg',
//         'webp',
//         'gif',
//         'csv',
//         'txt',
//         'rtf',
//     ]
//     return allowed.includes(ext.toLowerCase())
// }

const getFileIcon = (ext: string): string => {
  const iconMap: Record<string, string> = {
    csv: 'tabler:file-type-csv',
    doc: 'tabler:file-type-doc',
    docx: 'tabler:file-type-doc',
    gif: 'tabler:photo',
    jpeg: 'tabler:photo',
    jpg: 'tabler:photo',
    pdf: 'tabler:file-type-pdf',
    png: 'tabler:photo',
    ppt: 'tabler:file-type-ppt',
    pptx: 'tabler:file-type-ppt',
    rtf: 'tabler:file-text',
    txt: 'tabler:file-type-txt',
    webp: 'tabler:photo',
    xls: 'tabler:file-type-xls',
    xlsx: 'tabler:file-type-xls',
  }
  return iconMap[ext] || 'tabler:file'
}

const getFileIconClasses = (ext: string) => {
  const map: Record<string, { badge: string; wrap: string }> = {
    doc: {
      badge: 'bg-blue-2 text-blue-11 ring-blue-8/30',
      wrap: 'bg-blue-2 text-blue-9',
    },
    docx: {
      badge: 'bg-blue-2 text-blue-11 ring-blue-8/30',
      wrap: 'bg-blue-2 text-blue-9',
    },
    jpeg: {
      badge: 'bg-primary-2 text-primary-11 ring-primary-8/30',
      wrap: 'bg-primary-2 text-primary-9',
    },
    jpg: {
      badge: 'bg-primary-2 text-primary-11 ring-primary-8/30',
      wrap: 'bg-primary-2 text-primary-9',
    },
    pdf: {
      badge: 'bg-red-2 text-red-11 ring-red-8/30',
      wrap: 'bg-red-2 text-red-9',
    },
    png: {
      badge: 'bg-primary-2 text-primary-11 ring-primary-8/30',
      wrap: 'bg-primary-2 text-primary-9',
    },
    ppt: {
      badge: 'bg-orange-2 text-orange-11 ring-orange-8/30',
      wrap: 'bg-orange-2 text-orange-9',
    },
    pptx: {
      badge: 'bg-orange-2 text-orange-11 ring-orange-8/30',
      wrap: 'bg-orange-2 text-orange-9',
    },
    webp: {
      badge: 'bg-primary-2 text-primary-11 ring-primary-8/30',
      wrap: 'bg-primary-2 text-primary-9',
    },
    xls: {
      badge: 'bg-green-2 text-green-11 ring-green-8/30',
      wrap: 'bg-green-2 text-green-9',
    },
    xlsx: {
      badge: 'bg-green-2 text-green-11 ring-green-8/30',
      wrap: 'bg-green-2 text-green-9',
    },
  }

  // Fallback
  return (
    map[ext] || {
      badge: 'bg-gray-2 text-gray-11 ring-gray-8/30',
      wrap: 'bg-gray-2 text-gray-9',
    }
  )
}

export default function Attachments({
  enabled = true,
  processId,
  workflowId,
  onSelect,
  // onClose
}: Props) {
  const { data: files, isLoading } = useAttachments(
    workflowId,
    processId,
    enabled,
  )
  const { session } = authUserStore.getState()
  const tenantId = session?.tenantId || ''
  const userId = session?.id || ''
  const apiBaseUrl = resolveApiBaseUrl()

  const handleDownload = (e: React.MouseEvent, file: FileLike) => {
    e.stopPropagation()
    const url = buildDownloadUrl({ apiBaseUrl, file, tenantId, userId })
    window.open(url, '_blank')
  }

  return (
    <div className='relative mx-auto mt-0 flex h-full w-full flex-col font-sans transition-all duration-300'>
      {/* Header */}
      {/* <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--gray-3)] shrink-0">
                <button 
                    onClick={onClose}
                    className="flex items-center justify-center size-8 rounded-lg hover:bg-[var(--gray-2)] text-[var(--gray-9)] transition-colors"
                >
                    <Icon name="tabler:arrow-left" className="size-5" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-[var(--blue-1)] text-[var(--blue-9)]">
                        <Icon name="tabler:paperclip" className="size-5" />
                    </div>
                    <span className="font-bold text-[var(--gray-12)]">Attachments</span>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--gray-2)] text-[11px] font-bold text-[var(--gray-9)]">
                        {files.length}
                    </span>
                </div>
            </div> */}

      {/* List */}
      <div className='flex flex-col gap-2'>
        {isLoading ? (
          <div className='flex flex-col items-center justify-center py-10 text-[var(--gray-8)]'>
            <Icon className='mb-2 size-6 animate-spin' name='tabler:loader' />
            <span className='text-12'>Loading attachments...</span>
          </div>
        ) : files.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-10 text-[var(--gray-8)]'>
            <div className='mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--gray-2)]'>
              <Icon
                className='size-6 text-[var(--gray-7)]'
                name='tabler:file-off'
              />
            </div>
            <span className='text-13 font-medium text-[var(--gray-10)]'>
              No attachments found
            </span>
          </div>
        ) : (
          files.map((file) => {
            const ext = getExt(file.name || '')
            const icon = getFileIcon(ext)
            const styles = getFileIconClasses(ext)

            return (
              <div
                className='group flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--gray-1)] bg-surface p-3 transition-all hover:border-[var(--blue-4)] hover:shadow-sm'
                key={file.id}
                onClick={() => onSelect?.(file)}
              >
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    styles.wrap,
                  )}
                >
                  <Icon className='size-5' name={icon} />
                </div>

                <div className='min-w-0 flex-1'>
                  <div
                    className='line-clamp-1 text-13 font-semibold break-all text-[var(--gray-12)] transition-all group-hover:line-clamp-none hover:underline'
                    title={file.name}
                  >
                    {file.name || 'Untitled'}
                  </div>
                  <div className='mt-0.5 flex items-center gap-2'>
                    <span className='text-[11px] font-medium tracking-wide text-[var(--gray-9)] uppercase'>
                      {ext}
                    </span>
                    <span className='size-0.5 rounded-full bg-[var(--gray-4)]' />
                    <span className='text-[11px] text-[var(--gray-8)]'>
                      {file.createdAt
                        ? new Date(file.createdAt).toLocaleDateString()
                        : 'Unknown date'}
                    </span>
                  </div>
                </div>

                <button
                  className='flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--gray-8)] opacity-0 transition-colors group-hover:opacity-100 hover:bg-[var(--gray-2)] hover:text-[var(--blue-9)]'
                  title='Download'
                  onClick={(e) => handleDownload(e, file)}
                >
                  <Icon className='size-4' name='tabler:download' />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// Download URL
function buildDownloadUrl(args: {
  apiBaseUrl: string
  file: FileLike
  tenantId: string | number
  type?: 1 | 2
  userId: string | number
}) {
  const { apiBaseUrl, file, tenantId, userId } = args
  const type = args.type ?? 2
  if (file.initiate)
    return `${apiBaseUrl}/uploadandindex/view/${tenantId}/${file.id}/${type}/2`
  const repositoryId = file.repositoryId ?? ''
  return `${apiBaseUrl}/menu/file/download/${tenantId}/${userId}/${repositoryId}/${file.id}/2`
}

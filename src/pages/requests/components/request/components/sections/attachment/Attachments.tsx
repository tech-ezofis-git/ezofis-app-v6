import { useRef, useState } from 'react'
import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Icon from '@/components/base/icon/Icon'
import {
  type AttachmentItem,
  useAttachments,
} from '@/pages/requests/hooks/useAttachments'
import authUserStore from '@/stores/authUserStore'
import { workflowsApiV6 } from '@/api/v6/workflows'
import fileApi from '@/api/file/file'

type FileLike = AttachmentItem

type Props = {
  canUpload?: boolean
  enabled?: boolean
  instanceId?: string | number
  processId?: number
  repositoryDetails?: { fieldsType?: string }
  repositoryId?: number | string
  selectedChecklistName?: string | null
  transactionId?: number | string
  workflowId?: number
  formModel?: any
  selectedItem?: any
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
  canUpload = true,
  enabled = true,
  instanceId,
  processId,
  repositoryId,
  workflowId,
  formModel,
  selectedItem,
  onSelect,
}: Props) {
  const targetInstanceId = instanceId || processId
  const { data: files = [], isLoading, refetch } = useAttachments(
    workflowId,
    targetInstanceId,
    enabled,
  )
  const { session } = authUserStore.getState()
  const tenantId = session?.tenantId || ''
  const userId = session?.id || ''
  const apiBaseUrl = resolveApiBaseUrl()

  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('[Attachments] Selected file:', file?.name, 'Size:', file?.size, 'Type:', file?.type)
    console.log('[Attachments] Upload Context:', { workflowId, targetInstanceId, repositoryId })

    if (
      !file ||
      !workflowId ||
      !targetInstanceId ||
      repositoryId === undefined ||
      repositoryId === null ||
      repositoryId === ''
    ) {
      console.warn('[Attachments] Upload prevented: missing required parameters.', {
        hasFile: !!file,
        workflowId,
        targetInstanceId,
        repositoryId,
      })
      return
    }

    setIsUploading(true)
    try {
      const getValueFromKeys = (obj: any, keys: string[]): string => {
        if (!obj) return ''
        for (const k of keys) {
          const val = obj[k]
          if (val !== undefined && val !== null) {
            if (typeof val === 'object' && 'Invoice Value' in val) {
              return String(val['Invoice Value'] ?? '')
            }
            return String(val)
          }
        }
        return ''
      }

      const rawAmount = getValueFromKeys(formModel, ['Invoice Amount', 'invoice_amount', 'Amount', 'amount', 'Total', 'total'])
      const parsedAmount = Number(rawAmount.replace(/[^0-9.-]+/g, ''))
      const amountVal = Number.isNaN(parsedAmount) ? 0 : parsedAmount

      const metadataObj = {
        Amount: amountVal,
        Department: getValueFromKeys(formModel, ['Department', 'department']),
        DocumentDate: getValueFromKeys(formModel, ['Invoice Date', 'invoice_date', 'Document Date', 'document_date', 'Date', 'date']),
        DocumentType: getValueFromKeys(formModel, ['Document Type', 'document_type', 'Doc Type', 'doc_type']) || 'Invoice',
        InvoiceNumber: getValueFromKeys(formModel, ['Invoice Number', 'invoice_number', 'Invoice No', 'invoice_no', 'Inv Number']),
        PoNumber: getValueFromKeys(formModel, ['PO Number', 'po_number', 'PO No', 'po_no', 'Purchase Order', 'pono', 'poNumber', 'PO No.']),
        RiskLevel: getValueFromKeys(formModel, ['Risk Level', 'risk_level', 'Risk', 'risk']),
        Source: getValueFromKeys(formModel, ['Source', 'source']) || 'Upload',
        Status: getValueFromKeys(formModel, ['Status', 'status']) || selectedItem?.status || selectedItem?.state || '',
        Supplier: getValueFromKeys(formModel, ['Supplier Name', 'supplier_name', 'Vendor Name', 'vendor_name', 'Supplier', 'Vendor']),
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('repositoryId', String(repositoryId))
      formData.append('repositoryld', String(repositoryId)) // Support backend field typo
      formData.append('metadata', JSON.stringify(metadataObj))

      const res = await workflowsApiV6.addInstanceAttachment(
        workflowId,
        targetInstanceId,
        formData
      )

      console.log('[Attachments] Upload response:', res)
      if (res.error) {
        console.error('[Attachments] Upload failed with response error:', res.error)
      } else {
        console.log('[Attachments] Upload succeeded, refetching...')
      }

      if (fileInputRef.current) fileInputRef.current.value = ''
      await refetch()
    } catch (err) {
      console.error('Error uploading file:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (e: React.MouseEvent, file: FileLike) => {
    e.stopPropagation()
    const repoId = String(file.repositoryId || repositoryId || '').trim()
    const itemId = String(file.itemId || file.id || '').trim()

    const isUuid = (val: string): boolean => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
    }

    if (isUuid(repoId) && isUuid(itemId)) {
      try {
        const response = await fileApi.viewBinaryV6(repoId, itemId, 'download')
        if (response?.data instanceof Blob) {
          const url = window.URL.createObjectURL(response.data)
          const a = document.createElement('a')
          a.href = url
          a.download = file.name || 'download'
          document.body.appendChild(a)
          a.click()
          a.remove()
          window.URL.revokeObjectURL(url)
        } else {
          console.error('File binary data not found or invalid format.')
        }
      } catch (err) {
        console.error('Error downloading attachment:', err)
      }
    } else {
      const url = buildDownloadUrl({ apiBaseUrl, file, tenantId, userId })
      window.open(url, '_blank')
    }
  }

  return (
    <div className='relative mx-auto mt-0 flex h-full w-full flex-col font-sans transition-all duration-300'>
      {/* Upload Zone */}
      {canUpload && (
        <div className='mb-4 shrink-0'>
          <input
            type='file'
            className='hidden'
            ref={fileInputRef}
            onChange={onFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-4 bg-surface py-5 px-4 text-center transition-all hover:border-primary-4 hover:bg-primary-2/10 active:scale-98',
              isUploading && 'pointer-events-none opacity-60',
            )}
          >
            {isUploading ? (
              <Icon
                className='size-6 animate-spin text-primary-9'
                name='tabler:loader'
              />
            ) : (
              <Icon className='size-6 text-gray-9' name='tabler:upload' />
            )}
            <div className='flex flex-col gap-0.5'>
              <span className='text-13 font-bold text-gray-12'>
                {isUploading ? 'Uploading...' : 'Upload attachment'}
              </span>
              <span className='text-11 text-gray-8'>Select file here</span>
            </div>
          </button>
        </div>
      )}

      {/* List */}
      <div className='flex flex-col gap-2'>
        {isLoading ? (
          <div className='flex flex-col items-center justify-center py-10 text-gray-8'>
            <Icon className='mb-2 size-6 animate-spin' name='tabler:loader' />
            <span className='text-12'>Loading attachments...</span>
          </div>
        ) : files.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-10 text-gray-8'>
            <div className='mb-3 flex size-12 items-center justify-center rounded-full bg-gray-2'>
              <Icon
                className='size-6 text-gray-7'
                name='tabler:file-off'
              />
            </div>
            <span className='text-13 font-medium text-gray-10'>
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
                className='group flex cursor-pointer items-start gap-3 rounded-xl border border-gray-1 bg-surface p-3 transition-all hover:border-blue-4 hover:shadow-sm'
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
                    className='line-clamp-1 text-13 font-semibold break-all text-gray-12 transition-all group-hover:line-clamp-none hover:underline'
                    title={file.name}
                  >
                    {file.name || 'Untitled'}
                  </div>
                  <div className='mt-0.5 flex items-center gap-2'>
                    <span className='text-[11px] font-medium tracking-wide text-gray-9 uppercase'>
                      {ext}
                    </span>
                    <span className='size-0.5 rounded-full bg-gray-4' />
                    <span className='text-[11px] text-gray-8'>
                      {file.createdAt
                        ? new Date(file.createdAt).toLocaleDateString()
                        : 'Unknown date'}
                    </span>
                  </div>
                </div>

                <button
                  className='flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-8 opacity-0 transition-colors group-hover:opacity-100 hover:bg-gray-2 hover:text-blue-9'
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

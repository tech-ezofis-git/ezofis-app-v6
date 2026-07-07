import clsx, { type ClassValue } from 'clsx'
import { useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import fileApi from '@/api/file/file'
import { workflowsApiV6 } from '@/api/v6/workflows'
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
  formModel?: any
  instanceId?: string | number
  processId?: number
  repositoryDetails?: { fieldsType?: string }
  repositoryId?: number | string
  selectedChecklistName?: string | null
  selectedItem?: any
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

const getExt = (file?: AttachmentItem) => {
  if (!file) return ''

  // 1. Try to extract from filePath if it exists and has a dot
  if (file.filePath && file.filePath.includes('.')) {
    const parts = file.filePath.split('.')
    const ext = parts.pop()?.toLowerCase()
    if (ext) return ext
  }

  // 2. Try to map from contentType
  if (file.contentType) {
    const mime = file.contentType.toLowerCase()
    if (mime.includes('pdf')) return 'pdf'
    if (mime.includes('png')) return 'png'
    if (mime.includes('jpg') || mime.includes('jpeg')) return 'jpg'
    if (mime.includes('gif')) return 'gif'
    if (mime.includes('webp')) return 'webp'
    if (mime.includes('csv')) return 'csv'
    if (mime.includes('text/plain') || mime.includes('txt')) return 'txt'
    if (mime.includes('word') || mime.includes('doc')) return 'docx'
    if (
      mime.includes('excel') ||
      mime.includes('sheet') ||
      mime.includes('xls')
    )
      return 'xlsx'
    if (
      mime.includes('powerpoint') ||
      mime.includes('presentation') ||
      mime.includes('ppt')
    )
      return 'pptx'
  }

  // 3. Try to extract from name (if it contains a dot)
  const name = file.name || file.fileName || ''
  if (name.includes('.')) {
    const parts = name.split('.')
    const ext = parts.pop()?.toLowerCase()
    if (ext) return ext
  }

  return ''
}

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return ''
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

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
  formModel,
  instanceId,
  processId,
  repositoryId,
  selectedItem,
  workflowId,
  onSelect,
}: Props) {
  const targetInstanceId = instanceId || processId
  const {
    data: files = [],
    isLoading,
    refetch,
  } = useAttachments(workflowId, targetInstanceId, enabled)
  console.log('[Attachments] Loaded files list:', files)
  const { session } = authUserStore.getState()
  const tenantId = session?.tenantId || ''
  const userId = session?.id || ''
  const apiBaseUrl = resolveApiBaseUrl()

  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log(
      '[Attachments] Selected file:',
      file?.name,
      'Size:',
      file?.size,
      'Type:',
      file?.type,
    )
    console.log('[Attachments] Upload Context:', {
      repositoryId,
      targetInstanceId,
      workflowId,
    })

    if (
      !file ||
      !workflowId ||
      !targetInstanceId ||
      repositoryId === undefined ||
      repositoryId === null ||
      repositoryId === ''
    ) {
      console.warn(
        '[Attachments] Upload prevented: missing required parameters.',
        {
          hasFile: !!file,
          repositoryId,
          targetInstanceId,
          workflowId,
        },
      )
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

      const rawAmount = getValueFromKeys(formModel, [
        'Invoice Amount',
        'invoice_amount',
        'Amount',
        'amount',
        'Total',
        'total',
      ])
      const parsedAmount = Number(rawAmount.replace(/[^0-9.-]+/g, ''))
      const amountVal = Number.isNaN(parsedAmount) ? 0 : parsedAmount

      const metadataObj = {
        Amount: amountVal,
        Department: getValueFromKeys(formModel, ['Department', 'department']),
        DocumentDate: getValueFromKeys(formModel, [
          'Invoice Date',
          'invoice_date',
          'Document Date',
          'document_date',
          'Date',
          'date',
        ]),
        DocumentType:
          getValueFromKeys(formModel, [
            'Document Type',
            'document_type',
            'Doc Type',
            'doc_type',
          ]) || 'Invoice',
        InvoiceNumber: getValueFromKeys(formModel, [
          'Invoice Number',
          'invoice_number',
          'Invoice No',
          'invoice_no',
          'Inv Number',
        ]),
        PoNumber: getValueFromKeys(formModel, [
          'PO Number',
          'po_number',
          'PO No',
          'po_no',
          'Purchase Order',
          'pono',
          'poNumber',
          'PO No.',
        ]),
        RiskLevel: getValueFromKeys(formModel, [
          'Risk Level',
          'risk_level',
          'Risk',
          'risk',
        ]),
        Source: getValueFromKeys(formModel, ['Source', 'source']) || 'Upload',
        Status:
          getValueFromKeys(formModel, ['Status', 'status']) ||
          selectedItem?.status ||
          selectedItem?.state ||
          '',
        Supplier: getValueFromKeys(formModel, [
          'Supplier Name',
          'supplier_name',
          'Vendor Name',
          'vendor_name',
          'Supplier',
          'Vendor',
        ]),
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('repositoryId', String(repositoryId))
      formData.append('repositoryld', String(repositoryId)) // Support backend field typo
      formData.append('metadata', JSON.stringify(metadataObj))

      const res = await workflowsApiV6.addInstanceAttachment(
        workflowId,
        targetInstanceId,
        formData,
      )

      console.log('[Attachments] Upload response:', res)
      if (res.error) {
        console.error(
          '[Attachments] Upload failed with response error:',
          res.error,
        )
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
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        val,
      )
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
      <input
        className='hidden'
        ref={fileInputRef}
        type='file'
        onChange={onFileChange}
      />

      {/* Upload Zone (Large dashed container when no files exist) */}
      {canUpload && !isLoading && files.length === 0 && (
        <div className='mb-4 shrink-0'>
          <button
            disabled={isUploading}
            className={cn(
              'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-4 bg-surface px-4 py-5 text-center transition-all hover:border-primary-4 hover:bg-primary-2/10 active:scale-98',
              isUploading && 'pointer-events-none opacity-60',
            )}
            onClick={() => fileInputRef.current?.click()}
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

      {/* Header Row (Small top-right button when attachments exist) */}
      {canUpload && !isLoading && files.length > 0 && (
        <div className='mb-3 flex shrink-0 items-center justify-between'>
          <h4 className='text-xs font-bold tracking-wider text-[var(--gray-10)] uppercase'>
            All Attachments
          </h4>
          <button
            disabled={isUploading}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--gray-3)] bg-surface px-2.5 py-1 text-[11px] font-semibold text-[var(--gray-12)] transition-all hover:bg-[var(--gray-2)] active:scale-95',
              isUploading && 'pointer-events-none opacity-60',
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Icon
                className='size-3.5 animate-spin text-[var(--primary-9)]'
                name='tabler:loader'
              />
            ) : (
              <Icon
                className='size-3.5 text-[var(--gray-9)]'
                name='tabler:upload'
              />
            )}
            <span>{isUploading ? 'Uploading...' : 'Upload attachment'}</span>
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
              <Icon className='size-6 text-gray-7' name='tabler:file-off' />
            </div>
            <span className='text-13 font-medium text-gray-10'>
              No attachments found
            </span>
          </div>
        ) : (
          files.map((file) => {
            const ext = getExt(file)
            const icon = getFileIcon(ext)
            const styles = getFileIconClasses(ext)
            const sizeStr = formatBytes(file.fileSize)
            const displayName = file.name || file.fileName || 'Untitled'
            const hasExt =
              ext && displayName.toLowerCase().endsWith('.' + ext.toLowerCase())
            const displayTitle =
              ext && !hasExt ? `${displayName}.${ext}` : displayName

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
                  <div className='flex flex-wrap items-baseline gap-1.5'>
                    <span
                      className='line-clamp-1 text-13 font-semibold break-all text-gray-12 transition-all group-hover:line-clamp-none hover:underline'
                      title={displayTitle}
                    >
                      {displayTitle}
                    </span>
                    {sizeStr && (
                      <span className='shrink-0 text-[11px] font-normal text-gray-8'>
                        ({sizeStr})
                      </span>
                    )}
                  </div>
                  <div className='mt-0.5 flex items-center gap-2'>
                    {/* {ext && (
                      <>
                        <span className='text-[11px] font-medium tracking-wide text-gray-9 uppercase'>
                          {ext}
                        </span>
                        <span className='size-0.5 rounded-full bg-gray-4' />
                      </>
                    )} */}
                    <span className='text-[11px] text-gray-8'>
                      {file.createdAt
                        ? new Date(file.createdAt).toLocaleDateString()
                        : 'Unknown date'}
                    </span>
                    {file.uploadedBy && (
                      <>
                        <span className='size-0.5 rounded-full bg-gray-4' />
                        <span
                          className='max-w-[250px] truncate text-[11px] text-gray-8'
                          title={`Uploaded by: ${file.uploadedBy}`}
                        >
                          {file.uploadedBy}
                        </span>
                      </>
                    )}
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

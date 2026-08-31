import { useLingui } from '@lingui/react/macro'
import clsx, { type ClassValue } from 'clsx'
import { useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import type { RepositoryFieldSchema } from '@/pages/requests/utils/repoFolderMetadata'
import fileApi from '@/api/file/file'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  type AttachmentItem,
  useAttachments,
} from '@/pages/requests/hooks/useAttachments'
import {
  planRepositoryFolderMetadata,
  uploadInstanceAttachment,
} from '@/pages/requests/utils/instanceAttachmentUpload'
import authUserStore from '@/stores/authUserStore'
import { formatUtcToLocalDate } from '@/utils/utcDate'
import RelatedDocumentsFinder from '../overview/RelatedDocumentsFinder'
import FolderFieldPrompt from './FolderFieldPrompt'

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
  showRelatedFinder?: boolean
  transactionId?: number | string
  workflowId?: number | string
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

export const getExt = (file?: AttachmentItem) => {
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

export const getFileIcon = (fileNameOrExt: string): string => {
  if (!fileNameOrExt) return 'vscode-icons:file-type-text'
  const parts = fileNameOrExt.split('.')
  const ext = (parts.length > 1 ? parts.pop() || '' : fileNameOrExt)
    .toLowerCase()
    .trim()
    .replace(/^\./, '')

  const iconMap: Record<string, string> = {
    '7z': 'vscode-icons:file-type-zip',
    'csv': 'vscode-icons:file-type-excel',
    'doc': 'vscode-icons:file-type-word',
    'docx': 'vscode-icons:file-type-word',
    'gif': 'vscode-icons:file-type-image',
    'jpeg': 'vscode-icons:file-type-image',
    'jpg': 'vscode-icons:file-type-image',
    'json': 'vscode-icons:file-type-json',
    'pdf': 'vscode-icons:file-type-pdf2',
    'png': 'vscode-icons:file-type-image',
    'ppt': 'vscode-icons:file-type-powerpoint',
    'pptx': 'vscode-icons:file-type-powerpoint',
    'rar': 'vscode-icons:file-type-zip',
    'rtf': 'vscode-icons:file-type-text',
    'svg': 'vscode-icons:file-type-image',
    'txt': 'vscode-icons:file-type-text',
    'webp': 'vscode-icons:file-type-image',
    'xls': 'vscode-icons:file-type-excel',
    'xlsx': 'vscode-icons:file-type-excel',
    'xml': 'vscode-icons:file-type-xml',
    'zip': 'vscode-icons:file-type-zip',
  }
  return iconMap[ext] || 'vscode-icons:file-type-text'
}

export const getFileIconClasses = (ext: string) => {
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
  initialData,
  instanceId,
  processId,
  repositoryId,
  selectedItem,
  // Hidden for now; pass showRelatedFinder={true} to restore Find related documents.
  showRelatedFinder = false,
  workflowId,
  onClose,
  onOpenHistory,
  onOpenMailShare,
  onSelect,
}: Props & { initialData?: any[] }) {
  const { t } = useLingui()
  const targetInstanceId = instanceId || processId
  const {
    data: files = [],
    isLoading,
    refetch,
  } = useAttachments(workflowId, targetInstanceId, enabled, initialData)

  console.log('[Attachments] Loaded files list:', files)
  const { session } = authUserStore.getState()
  const tenantId = session?.tenantId || ''
  const userId = session?.id || ''
  const apiBaseUrl = resolveApiBaseUrl()

  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // The repository field the uploader still needs to supply (the deepest
  // level of the folder hierarchy — see repoFolderMetadata.ts) before the
  // selected file can actually be posted.
  const [pendingUpload, setPendingUpload] = useState<{
    baseMetadata: Record<string, string>
    deepestField: RepositoryFieldSchema
    file: File
  } | null>(null)

  const attachedIds = useMemo(() => {
    const set = new Set<string>()
    files.forEach((f: any) => {
      if (f.itemId) set.add(String(f.itemId))
      if (f.id) set.add(String(f.id))
    })
    return set
  }, [files])

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

  const invoiceAmount = getValueFromKeys(formModel, [
    'Invoice Amount',
    'invoice_amount',
    'Amount',
    'amount',
    'Total',
    'total',
  ])
  const invoiceNumber = getValueFromKeys(formModel, [
    'Invoice Number',
    'invoice_number',
    'Invoice No',
    'invoice_no',
    'Inv Number',
  ])
  const poNumber = getValueFromKeys(formModel, [
    'PO Number',
    'po_number',
    'PO No',
    'po_no',
    'Purchase Order',
    'pono',
    'poNumber',
  ])
  const supplierName = getValueFromKeys(formModel, [
    'Supplier Name',
    'supplier_name',
    'Vendor Name',
    'vendor_name',
    'Supplier',
    'Vendor',
  ])

  // Legacy AP-style metadata, matched off the workflow's own form fields
  // (Invoice/PO/Supplier...). Kept as a base layer so Accounts Payable
  // repositories — whose fields really are named this way — keep working
  // unchanged; for a generic workflow none of these match anything and the
  // repository's OWN field schema (below) is what actually fills the
  // required folder-structure values instead of leaving them blank.
  const buildLegacyApMetadata = () => {
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

    return {
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
  }

  const performUpload = async (
    file: File,
    extraMetadata: Record<string, unknown> = {},
  ) => {
    if (!workflowId || !targetInstanceId || !repositoryId) return

    setIsUploading(true)
    try {
      const metadata = { ...buildLegacyApMetadata(), ...extraMetadata }
      const res = await uploadInstanceAttachment(
        workflowId,
        targetInstanceId,
        repositoryId,
        file,
        metadata,
      )

      if (res.error) {
        console.error(
          '[Attachments] Upload failed with response error:',
          res.error,
        )
      } else {
        await refetch()
      }
    } catch (err) {
      console.error('Error uploading file:', err)
    } finally {
      setIsUploading(false)
      setPendingUpload(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

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
      // Every attachment already on this instance shares the same folder,
      // so its metadata seeds every level except the deepest one (the
      // field that actually varies per document — see
      // repoFolderMetadata.ts). Only that field needs asking about.
      const existingItem = files.find((f) => f.itemId)
      const { baseMetadata, deepestField } = await planRepositoryFolderMetadata(
        String(repositoryId),
        existingItem
          ? {
              itemId: existingItem.itemId,
              repositoryId: existingItem.repositoryId || repositoryId,
            }
          : undefined,
      )

      if (deepestField) {
        setIsUploading(false)
        setPendingUpload({ baseMetadata, deepestField, file })
        return
      }

      await performUpload(file, baseMetadata)
    } catch (err) {
      console.error('Error preparing upload:', err)
      setIsUploading(false)
    }
  }

  const getMimeTypeFromBase64 = (base64: string): string => {
    if (base64.startsWith('/9j/')) return 'image/jpeg'
    if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
    return 'application/pdf'
  }

  const formatBase64Url = (base64: string, mimeType: string): string => {
    return base64.startsWith('data:')
      ? base64
      : `data:${mimeType};base64,${base64}`
  }

  const handleOpenFile = async (e: React.MouseEvent, file: FileLike) => {
    e.stopPropagation()
    if (onSelect) {
      onSelect(file)
      return
    }

    const localUrl = (file as any)._localFileUrl || (file as any).localUrl
    if (localUrl) {
      window.open(localUrl, '_blank')
      return
    }

    if ((file as any).rawFile instanceof File) {
      const url = URL.createObjectURL((file as any).rawFile)
      window.open(url, '_blank')
      return
    }

    const repoId = String(file.repositoryId || repositoryId || '').trim()
    const itemId = String(file.itemId || file.id || '').trim()

    const isUuid = (val: string): boolean => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        val,
      )
    }

    if (isUuid(repoId) && isUuid(itemId)) {
      try {
        const response = await fileApi.viewBinaryV6(repoId, itemId)
        if (response?.data instanceof Blob) {
          const url = window.URL.createObjectURL(response.data)
          window.open(url, '_blank')
          return
        }
      } catch (err) {
        console.error('Error viewing V6 attachment:', err)
      }
    } else {
      const rId = Number(repoId)
      if (!Number.isNaN(rId) && rId > 0) {
        try {
          const tId = session?.tenantId ? Number(session.tenantId) : 2
          const uId = session?.id ? String(session.id) : '2'
          const response = await fileApi.viewBinary(
            tId,
            uId,
            rId,
            Number(itemId || file.id || 0),
            2,
          )
          const base64 = response?.data?.file || response?.data
          if (typeof base64 === 'string') {
            const mimeType = getMimeTypeFromBase64(base64)
            const url = formatBase64Url(base64, mimeType)
            const win = window.open()
            if (win) {
              win.document.write(
                `<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`,
              )
            }
            return
          }
        } catch (err) {
          console.error('Error viewing legacy binary attachment:', err)
        }
      }
    }

    const url = buildDownloadUrl({ apiBaseUrl, file, tenantId, userId })
    window.open(url, '_blank')
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
    <div
      className={
        onClose
          ? 'flex h-full min-h-0 w-full flex-col font-sans'
          : 'relative mx-auto mt-0 flex h-full w-full flex-col font-sans transition-all duration-300'
      }
    >
      <input
        className='hidden'
        ref={fileInputRef}
        type='file'
        onChange={onFileChange}
      />

      {onClose && (
        <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3 py-2.5'>
          <span className='text-xs font-semibold text-gray-12'>
            {t`Attachments`} ({files.length})
          </span>
          <div className='flex items-center gap-1'>
            {canUpload && !isLoading && (
              <Button
                disabled={isUploading}
                icon='tabler:upload'
                label={isUploading ? t`Uploading...` : t`Upload`}
                loading={isUploading}
                size='sm'
                type='button'
                onClick={() => fileInputRef.current?.click()}
              />
            )}
            <IconButton
              ariaLabel={t`Close`}
              icon='tabler:x'
              size='sm'
              variant='ghost'
              onClick={onClose}
            />
          </div>
        </div>
      )}

      <div
        className={
          onClose
            ? 'relative min-h-0 flex-1 overflow-y-auto px-4 py-4'
            : 'contents'
        }
      >

      {showRelatedFinder ? (
        <RelatedDocumentsFinder
          agentData={selectedItem || formModel}
          attachedIds={attachedIds}
          instanceId={targetInstanceId}
          invoiceAmount={invoiceAmount}
          invoiceNumber={invoiceNumber}
          poNumber={poNumber}
          repositoryId={repositoryId}
          supplierName={supplierName}
          workflowId={
            workflowId != null ? Number(workflowId) || undefined : undefined
          }
          onAttached={refetch}
        />
      ) : null}

      {canUpload && !isLoading && !onClose && (
        <div className='mb-3 flex shrink-0 justify-end'>
          <Button
            disabled={isUploading}
            icon='tabler:upload'
            label={isUploading ? t`Uploading...` : t`Upload`}
            loading={isUploading}
            size='sm'
            type='button'
            onClick={() => fileInputRef.current?.click()}
          />
        </div>
      )}

      {pendingUpload && (
        <FolderFieldPrompt
          field={pendingUpload.deepestField}
          fileName={pendingUpload.file.name}
          isSubmitting={isUploading}
          onCancel={() => {
            setPendingUpload(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
          onConfirm={(value) =>
            performUpload(pendingUpload.file, {
              ...pendingUpload.baseMetadata,
              [pendingUpload.deepestField.sqlColumnName]: value,
            })
          }
        />
      )}

      {/* List */}
      <div className='flex flex-col gap-2'>
        {isLoading && files.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-10 text-gray-8'>
            <Icon className='mb-2 size-6 animate-spin' name='tabler:loader' />
            <span className='text-12'>Loading attachments...</span>
          </div>
        ) : files.length === 0 ? (
          !canUpload && (
            <div className='flex flex-col items-center justify-center py-10 text-gray-8'>
              <div className='mb-3 flex size-12 items-center justify-center rounded-full bg-gray-2'>
                <Icon className='size-6 text-gray-7' name='tabler:file-off' />
              </div>
              <span className='text-13 font-medium text-gray-10'>
                No attachments found
              </span>
            </div>
          )
        ) : (
          files.map((file) => {
            const ext = getExt(file)
            const icon = getFileIcon(ext)
            const styles = getFileIconClasses(ext)
            const sizeStr = formatBytes(file.fileSize)
            const displayName = file.name || file.name || 'Untitled'
            const hasExt =
              ext && displayName.toLowerCase().endsWith('.' + ext.toLowerCase())
            const displayTitle =
              ext && !hasExt ? `${displayName}.${ext}` : displayName

            return (
              <div
                className='group flex cursor-pointer items-start gap-3 rounded-xl border border-gray-1 bg-surface p-3 transition-all hover:border-blue-4 hover:shadow-sm'
                key={file.id}
                onClick={(e) => handleOpenFile(e, file)}
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
                      className='line-clamp-1 text-13 font-semibold break-all text-gray-12 transition-all group-hover:line-clamp-none hover:text-primary-9 hover:underline cursor-pointer'
                      title={displayTitle}
                      onClick={(e) => handleOpenFile(e, file)}
                    >
                      {displayTitle}
                    </span>
                    {file.isAiMatch && (
                      <span className='inline-flex shrink-0 items-center gap-1 rounded bg-[var(--primary-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary-9)]'>
                        <AiBrandIcon
                          className='size-3 shrink-0'
                          variant='outline-purple'
                        />
                        Added via AI match
                      </span>
                    )}
                    {sizeStr && (
                      <span className='shrink-0 text-[11px] font-normal text-gray-8'>
                        ({sizeStr})
                      </span>
                    )}
                  </div>
                  <div className='mt-0.5 flex min-w-0 items-center gap-2'>
                    {file.isAiMatch ? (
                      <span className='text-[11px] text-[var(--gray-9)]'>
                        Added just now · from AI cross-reference
                      </span>
                    ) : (
                      <>
                        <span className='shrink-0 text-[11px] text-gray-8'>
                          {file.createdAt
                            ? formatUtcToLocalDate(file.createdAt)
                            : 'Unknown date'}
                        </span>
                        {file.uploadedBy && (
                          <>
                            <span className='size-0.5 shrink-0 rounded-full bg-gray-4' />
                            <Tooltip
                              className='min-w-0 max-w-full flex-1 justify-start'
                              content={file.uploadedBy}
                              position='top'
                            >
                              <span className='block min-w-0 w-full truncate text-[11px] font-medium text-gray-9'>
                                {file.uploadedBy}
                              </span>
                            </Tooltip>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <button
                  className='flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-8 opacity-0 transition-colors group-hover:opacity-100 hover:bg-gray-2 hover:text-blue-9'
                  title={t`Download`}
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

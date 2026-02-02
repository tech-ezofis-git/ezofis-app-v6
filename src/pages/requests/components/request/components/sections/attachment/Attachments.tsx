// import { useState } from 'react'
import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Icon from '@/components/base/icon/Icon'
import { useAttachments, type AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import authUserStore from '@/stores/authUserStore'

type Props = {
    workflowId?: number
    processId?: number
    enabled?: boolean
    transactionId?: number | string
    repositoryId?: number | string
    repositoryDetails?: { fieldsType?: string }
    canUpload?: boolean
    selectedChecklistName?: string | null
    onSelect?: (file: AttachmentItem) => void
    onOpenComments?: (file: AttachmentItem) => void
    onOpenHistory?: (file: AttachmentItem) => void
    onOpenMailShare?: (files: Array<{ id: string | number; name: string }>) => void
    onClose?: () => void
}

type FileLike = AttachmentItem

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
//                 "group relative rounded-xl p-2 transition-all hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent",
//                 active && "bg-white/20"
//             )}
//         >
//             <Icon name={icon} className="size-5" />
//             <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 Pointer-events-none">
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
        pdf: 'tabler:file-type-pdf',
        doc: 'tabler:file-type-doc',
        docx: 'tabler:file-type-doc',
        xls: 'tabler:file-type-xls',
        xlsx: 'tabler:file-type-xls',
        ppt: 'tabler:file-type-ppt',
        pptx: 'tabler:file-type-ppt',
        png: 'tabler:photo',
        jpg: 'tabler:photo',
        jpeg: 'tabler:photo',
        webp: 'tabler:photo',
        gif: 'tabler:photo',
        csv: 'tabler:file-type-csv',
        txt: 'tabler:file-type-txt',
        rtf: 'tabler:file-text',
    }
    return iconMap[ext] || 'tabler:file'
}

const getFileIconClasses = (ext: string) => {
    const map: Record<string, { wrap: string; badge: string }> = {
        pdf: { wrap: 'bg-red-2 text-red-9', badge: 'bg-red-2 text-red-11 ring-red-8/30' },
        doc: { wrap: 'bg-blue-2 text-blue-9', badge: 'bg-blue-2 text-blue-11 ring-blue-8/30' },
        docx: { wrap: 'bg-blue-2 text-blue-9', badge: 'bg-blue-2 text-blue-11 ring-blue-8/30' },
        xls: { wrap: 'bg-green-2 text-green-9', badge: 'bg-green-2 text-green-11 ring-green-8/30' },
        xlsx: { wrap: 'bg-green-2 text-green-9', badge: 'bg-green-2 text-green-11 ring-green-8/30' },
        ppt: { wrap: 'bg-orange-2 text-orange-9', badge: 'bg-orange-2 text-orange-11 ring-orange-8/30' },
        pptx: { wrap: 'bg-orange-2 text-orange-9', badge: 'bg-orange-2 text-orange-11 ring-orange-8/30' },
        png: { wrap: 'bg-primary-2 text-primary-9', badge: 'bg-primary-2 text-primary-11 ring-primary-8/30' },
        jpg: { wrap: 'bg-primary-2 text-primary-9', badge: 'bg-primary-2 text-primary-11 ring-primary-8/30' },
        jpeg: { wrap: 'bg-primary-2 text-primary-9', badge: 'bg-primary-2 text-primary-11 ring-primary-8/30' },
        webp: { wrap: 'bg-primary-2 text-primary-9', badge: 'bg-primary-2 text-primary-11 ring-primary-8/30' },
    }

    // Fallback
    return map[ext] || { wrap: 'bg-gray-2 text-gray-9', badge: 'bg-gray-2 text-gray-11 ring-gray-8/30' }
}

// Download URL
function buildDownloadUrl(args: { apiBaseUrl: string; tenantId: string | number; userId: string | number; file: FileLike; type?: 1 | 2 }) {
    const { apiBaseUrl, tenantId, userId, file } = args
    const type = args.type ?? 2
    if (file.initiate) return `${apiBaseUrl}/uploadandindex/view/${tenantId}/${file.id}/${type}/2`
    const repositoryId = file.repositoryId ?? ''
    return `${apiBaseUrl}/menu/file/download/${tenantId}/${userId}/${repositoryId}/${file.id}/2`
}

export default function Attachments({
    workflowId,
    processId,
    enabled = true,
    onSelect,
    // onClose
}: Props) {
    const { data: files, isLoading } = useAttachments(workflowId, processId, enabled)
    const { session } = authUserStore.getState()
    const tenantId = session?.tenantId || ''
    const userId = session?.id || ''
    const apiBaseUrl = resolveApiBaseUrl()

    const handleDownload = (e: React.MouseEvent, file: FileLike) => {
        e.stopPropagation()
        const url = buildDownloadUrl({ apiBaseUrl, tenantId, userId, file })
        window.open(url, '_blank')
    }

    return (
        <div className="flex flex-col h-full bg-white">
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
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--gray-8)]">
                        <Icon name="tabler:loader" className="size-6 animate-spin mb-2" />
                        <span className="text-12">Loading attachments...</span>
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--gray-8)]">
                        <div className="size-12 rounded-full bg-[var(--gray-2)] flex items-center justify-center mb-3">
                            <Icon name="tabler:file-off" className="size-6 text-[var(--gray-7)]" />
                        </div>
                        <span className="text-13 font-medium text-[var(--gray-10)]">No attachments found</span>
                    </div>
                ) : (
                    files.map((file) => {
                        const ext = getExt(file.name || '')
                        const icon = getFileIcon(ext)
                        const styles = getFileIconClasses(ext)

                        return (
                            <div
                                key={file.id}
                                onClick={() => onSelect?.(file)}
                                className="group flex items-start gap-3 p-3 rounded-xl border border-[var(--gray-3)] bg-white hover:border-[var(--blue-4)] hover:shadow-sm transition-all cursor-pointer"
                            >
                                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", styles.wrap)}>
                                    <Icon name={icon} className="size-5" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="text-13 font-semibold text-[var(--gray-12)] break-all line-clamp-1 group-hover:line-clamp-none transition-all hover:underline" title={file.name}>
                                        {file.name || 'Untitled'}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] font-medium text-[var(--gray-9)] uppercase tracking-wide">
                                            {ext}
                                        </span>
                                        <span className="size-0.5 rounded-full bg-[var(--gray-4)]" />
                                        <span className="text-[11px] text-[var(--gray-8)]">
                                            {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Unknown date'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => handleDownload(e, file)}
                                    className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--gray-2)] text-[var(--gray-8)] hover:text-[var(--blue-9)] transition-colors opacity-0 group-hover:opacity-100"
                                    title="Download"
                                >
                                    <Icon name="tabler:download" className="size-4" />
                                </button>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

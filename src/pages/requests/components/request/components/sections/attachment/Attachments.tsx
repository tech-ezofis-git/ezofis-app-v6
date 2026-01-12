// @/pages/requests/components/request/components/sections/attachments/Attachments.tsx
import React, { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import Icon from '@/components/base/icon/Icon'
import FileSheet from '@/components/common/file-sheet/FileSheet'
import { formatDatetime } from '@/utils/dayjs'
import authUserStore from '@/stores/authUserStore'
import requestApi from '@/api/requests/requests'
import { useAttachments, type AttachmentItem } from '@/pages/requests/hooks/useAttachments'

type Props = {
    workflowId?: number
    processId?: number
    enabled?: boolean
    transactionId?: number | string
    repositoryId?: number | string
    repositoryDetails?: { fieldsType?: string }
    canUpload?: boolean
    selectedChecklistName?: string | null
    onOpenComments?: (file: FileLike) => void
    onOpenHistory?: (file: FileLike) => void
    onOpenMailShare?: (files: Array<{ id: string | number; name: string }>) => void
}

type FileLike = {
    id: string | number
    name: string
    repositoryId?: string | number
    initiate?: boolean
    checked?: boolean
}

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
function TooltipButton({
    icon,
    label,
    onClick,
    disabled,
}: {
    icon: string
    label: string
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            className="group relative rounded-xl p-2 transition-all hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent"
        >
            <Icon name={icon} className="size-5" />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {label}
            </span>
        </button>
    )
}

function resolveApiBaseUrl() {
    const v = (import.meta as any)?.env?.VITE_BASE_URL
    return String(v || '').replace(/\/$/, '')
}

const getExt = (name?: string) => (name?.split('.').pop() || '').toLowerCase()

const fileSupport = (ext: string) => {
    const allowed = [
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'png',
        'jpg',
        'jpeg',
        'webp',
        'gif',
        'csv',
        'txt',
        'rtf',
    ]
    return allowed.includes(ext.toLowerCase())
}

function getInitiateType(fieldsType?: string) {
    return fieldsType === 'STATIC' ? 2 : 1
}

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

/**
 * IMPORTANT:
 * Your Icon component follows currentColor from CSS classes (like your Overview).
 * So we set text-* on the wrapper to control icon color.
 */
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

// Compose URL
function buildComposeUrl(args: {
    tenantId: string | number
    userId: string | number
    repositoryId: string | number
    workflowId: string | number
    processId: string | number
    composeFileIdsCsv: string
}) {
    const { tenantId, userId, repositoryId, workflowId, processId, composeFileIdsCsv } = args
    const originRaw = window.location.origin
    const origin = originRaw === 'http://localhost:3000' ? 'https://trial.ezofis.com' : originRaw
    const domainURL = `${origin}/DocsMerge/index.html`
    return `${domainURL}?tId=${tenantId}&uId=${userId}&rId=${repositoryId}&itemId=${composeFileIdsCsv}&wId=${workflowId}&pId=${processId}&type=2`
}

export default function Attachments({
    workflowId,
    processId,
    enabled,
    transactionId,
    repositoryId,
    repositoryDetails,
    canUpload = true,
    selectedChecklistName = null,
    // onOpenComments,
    // onOpenHistory,
    onOpenMailShare,
}: Props) {
    const { session } = authUserStore.getState()
    const tenantId = session?.tenantId
    const userId = session?.id

    const { data, isLoading, error, refetch } = useAttachments(workflowId, processId, enabled)

    const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), [])
    const initiateType = useMemo(() => getInitiateType(repositoryDetails?.fieldsType) as 1 | 2, [repositoryDetails?.fieldsType])

    const [previewFile, setPreviewFile] = useState<FileLike | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string>('')

    const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({})

    const rows = useMemo(() => {
        return (data || []).map((a: AttachmentItem) => {
            const file: FileLike = {
                id: (a.id ?? a.itemId ?? a.fileId ?? '') as any,
                name: (a.name ?? a.fileName ?? '-') as any,
                repositoryId: a.repositoryId as any,
                initiate: !!a.initiate,
            }
            const key = String(file.id)
            file.checked = !!checkedMap[key]
            return { ...a, file }
        })
    }, [data, checkedMap])

    const selectedFiles = useMemo(() => rows.filter((r: any) => !!r.file?.checked).map((r: any) => r.file as FileLike), [rows])
    const selectedCount = selectedFiles.length

    const selectedPdfIds = useMemo(() => selectedFiles.filter((f) => getExt(f.name) === 'pdf').map((f) => f.id), [selectedFiles])
    const selectedOnlyPDF = useMemo(() => (selectedFiles.length ? selectedFiles.every((f) => getExt(f.name) === 'pdf') : false), [selectedFiles])

    const toggleOne = (id: string | number) => {
        const key = String(id)
        setCheckedMap((prev) => ({ ...prev, [key]: !prev[key] }))
    }
    const clearSelection = () => setCheckedMap({})

    // Upload
    const uploadAttachment = async (file: File) => {
        if (!workflowId || !processId || !transactionId || !repositoryId) {
            throw new Error('Missing upload context (workflowId/processId/transactionId/repositoryId)')
        }
        const ext = getExt(file.name)
        if (!fileSupport(ext)) throw new Error('Unsupported file format')

        const form = new FormData()
        form.append('workflowId', String(workflowId))
        form.append('repositoryId', String(repositoryId))
        form.append('processId', String(processId))
        form.append('transactionId', String(transactionId))
        form.append('fields', '')
        form.append('file', file)
        form.append('filename', selectedChecklistName ? `${selectedChecklistName}.${ext}` : file.name)

        await (requestApi as any).attachmentWithProcessId(form)
    }

    const onPickUpload = () => {
        if (!canUpload || uploading) return
        fileInputRef.current?.click()
    }

    const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return

        setUploading(true)
        setUploadError('')
        try {
            await uploadAttachment(f)
            await refetch()
            window.setTimeout(() => refetch(), 15000)
        } catch (err: any) {
            setUploadError(err?.message || 'Upload failed')
        } finally {
            setUploading(false)
        }
    }

    // Floating bar actions
    const onMerge = async () => {
        if (!workflowId || !processId || !transactionId || !repositoryId) return
        if (selectedPdfIds.length < 2) return
        await (requestApi as any).documentMerge(workflowId, processId, transactionId, repositoryId, { ids: selectedPdfIds })
    }

    const onCompose = () => {
        if (!tenantId || !userId || !workflowId || !processId || !repositoryId) return
        if (!selectedOnlyPDF) return
        const csv = selectedPdfIds.join(',')
        if (!csv) return
        window.open(buildComposeUrl({ tenantId, userId, repositoryId, workflowId, processId, composeFileIdsCsv: csv }), '_blank')
    }

    const onShare = () => onOpenMailShare?.(selectedFiles.map((f) => ({ id: f.id, name: f.name })))

    // Keep download on row click if you want quick action without icons (optional):
    const apiReady = !!apiBaseUrl && !!tenantId && !!userId

    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
    const itemVariants = { hidden: { opacity: 0, x: -10, y: 10 }, show: { opacity: 1, x: 0, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } } }

    return (
        <div className="relative min-h-[200px] w-full p-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary-2 text-primary-9">
                        <Icon name="tabler:files" className="size-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">AP Documents</h2>
                        <p className="text-xs text-gray-500">
                            {rows.length} {rows.length === 1 ? 'item' : 'items'} available
                        </p>
                    </div>
                </div>

                {canUpload && (
                    <div className="flex items-center gap-2">
                        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
                        <button
                            type="button"
                            onClick={onPickUpload}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200',
                                // Default State: Primary Purple
                                'cursor-pointer bg-secondary-9 text-white shadow-sm shadow-primary-8/20 hover:bg-secondary-10 hover:shadow-md active:scale-95',
                                // Uploading/Disabled State: Soft Lavender
                                uploading ? 'bg-primary-3 text-primary-11 cursor-not-allowed shadow-none' : '',
                            )}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <>
                                    <Icon name="tabler:loader-2" className="size-4 animate-spin" />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="tabler:cloud-upload" className="size-5" />
                                    <span>Upload</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {uploadError ? <div className="mb-3 text-xs text-red-11">{uploadError}</div> : null}

            {/* Body */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <Icon name="tabler:loader-2" className="size-8 animate-spin text-primary-9" />
                    <p className="mt-3 text-sm font-medium text-gray-10">Retrieving documents...</p>
                </div>
            ) : error ? (
                <div className="text-sm text-red-11">Couldn’t load attachments. Try refresh.</div>
            ) : !rows.length ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-3 bg-surface-muted py-12 text-center">
                    <div className="rounded-full bg-surface p-3 shadow-sm ring-1 ring-gray-3">
                        <Icon name="tabler:folder-off" className="size-6 text-gray-9" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-gray-13">No documents found</h3>
                    <p className="text-xs text-gray-10 mt-1">There are no files attached to this process yet.</p>
                </div>
            ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-3">
                    <AnimatePresence mode="popLayout">
                        {rows.map((row: any) => {
                            const file: FileLike = row.file
                            const ext = getExt(file.name)
                            const c = getFileIconClasses(ext)
                            const isSelected = !!file.checked

                            const createdAt = row.createdAt ? formatDatetime(row.createdAt, 'datetime') : '-'
                            const createdBy = row.createdByEmail ?? '-'

                            // Optional quick download on double click (keeps UI clean)
                            const onDoubleClickDownload = () => {
                                if (!apiReady) return
                                const url = buildDownloadUrl({ apiBaseUrl, tenantId: tenantId!, userId: userId!, file, type: initiateType })
                                window.open(url, '_blank')
                            }

                            return (
                                <motion.div
                                    layout
                                    key={file.id}
                                    variants={itemVariants as any}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    className={cn(
                                        'group relative flex items-center gap-3 rounded-2xl border p-3 transition-all duration-300',
                                        isSelected
                                            ? 'border-primary-8 bg-primary-1 shadow-sm'
                                            : 'border-gray-3 bg-surface shadow-sm hover:shadow-md',
                                    )}
                                >
                                    {/* Checkbox */}
                                    <div className="pl-1">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleOne(file.id)}
                                            className="size-4 cursor-pointer rounded border-gray-7"
                                        />
                                    </div>

                                    {/* Icon (color driven by wrapper text-* class) */}
                                    <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', c.wrap)}>
                                        <Icon name={getFileIcon(ext)} className="size-6" />
                                    </div>

                                    {/* Details */}
                                    <div className="min-w-0 flex-1 select-none">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewFile(file)}
                                                onDoubleClick={onDoubleClickDownload}
                                                className={cn(
                                                    'cursor-pointer text-left text-sm font-semibold text-gray-13',
                                                    'hover:underline hover:text-primary-11',
                                                )}
                                                title={file.name}
                                            >
                                                {file.name}
                                            </button>

                                            {/* <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset', c.badge)}>
                                                    {ext || 'file'}
                                                </span> */}
                                        </div>

                                        {/* full email / name (no ellipsis) */}
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-10">
                                            <span className="font-medium text-gray-11">{createdAt}</span>
                                            <span className="text-gray-7">|</span>
                                            <span className="text-gray-11">{createdBy}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Floating Action Bar (unchanged) */}
            <AnimatePresence>
                {selectedCount > 0 && (
                    <motion.div
                        initial={{ y: 50, opacity: 0, x: '-50%', scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, x: '-50%', scale: 1 }}
                        exit={{ y: 50, opacity: 0, x: '-50%', scale: 0.9 }}
                        transition={{ type: 'spring', bounce: 0.3 }}
                        className="fixed bottom-6 left-1/2 z-40 flex items-center gap-1.5 rounded-2xl border border-white/20 bg-gray-13/95 py-2 pl-4 pr-2 text-white shadow-2xl backdrop-blur-xl ring-1 ring-black/5"
                    >
                        <span className="mr-2 text-xs font-semibold tracking-wide text-gray-2">{selectedCount} Selected</span>
                        <div className="h-4 w-px bg-white/20 mx-1" />

                        <TooltipButton icon="tabler:mail-forward" label="Share" onClick={onShare} />

                        {selectedOnlyPDF && (
                            <>
                                <TooltipButton icon="tabler:files" label="Merge" onClick={onMerge} disabled={selectedCount < 2} />
                                <TooltipButton icon="tabler:layers-union" label="Compose" onClick={onCompose} />
                            </>
                        )}

                        <div className="h-4 w-px bg-white/20 mx-1" />

                        <button
                            onClick={clearSelection}
                            className="rounded-full p-1.5 text-gray-9 hover:bg-white/10 hover:text-white transition-colors"
                            title="Clear selection"
                        >
                            <Icon name="tabler:x" className="size-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preview Sheet */}
            <FileSheet
                opened={!!previewFile}
                onClose={() => setPreviewFile(null)}
                file={previewFile}
                tenantId={tenantId as string}
                userId={userId as string}
                workflowId={workflowId}
                processId={processId}
                type={2}
                actions="&action=all"
            />
        </div>
    )
}
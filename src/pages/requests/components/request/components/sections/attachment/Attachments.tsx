// @/pages/requests/components/request/components/sections/attachments/Attachments.tsx
import React, { useMemo, useRef, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import FileSheet from '@/components/common/file-sheet/FileSheet'
import { formatDatetime } from '@/utils/dayjs'
import authUserStore from '@/stores/authUserStore'
import requestApi from '@/api/requests/requests'
import { useAttachments, type AttachmentItem } from '@/pages/requests/hooks/useAttachments'

type Props = {
    workflowId?: number
    processId?: number
    enabled?: boolean

    // ✅ required for v5 upload + merge + compose context
    transactionId?: number | string
    repositoryId?: number | string

    // ✅ v5 uses repositoryDetails.fieldsType === "STATIC" to decide type for initiate files (1 vs 2)
    repositoryDetails?: { fieldsType?: string }

    // ✅ optional v5 features
    canUpload?: boolean
    selectedChecklistName?: string | null

    // ✅ wire to your existing modals/sheets if you have them
    onOpenComments?: (file: FileLike) => void
    onOpenHistory?: (file: FileLike) => void
    onOpenMailShare?: (files: Array<{ id: string | number; name: string }>) => void
}

type FileLike = {
    id: string | number
    name: string
    repositoryId?: string | number
    initiate?: boolean
    checked?: boolean // UI only
}

function resolveApiBaseUrl() {
    const v = (import.meta as any)?.env?.VITE_BASE_URL
    return String(v || '').replace(/\/$/, '')
}

const getExt = (name?: string) => (name?.split('.').pop() || '').toLowerCase()

// v5 had fileSupport() gate before upload
const fileSupport = (ext: string) => {
    const allowed = [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'png', 'jpg', 'jpeg', 'webp', 'gif',
        'csv', 'txt', 'rtf',
    ]
    return allowed.includes(ext.toLowerCase())
}

function getInitiateType(fieldsType?: string) {
    // v5: default type=1, but if STATIC then type=2
    return fieldsType === 'STATIC' ? 2 : 1
}

// Download URL (your existing logic, kept)
function buildDownloadUrl(args: {
    apiBaseUrl: string
    tenantId: string | number
    userId: string | number
    file: FileLike
    type?: 1 | 2
}) {
    const { apiBaseUrl, tenantId, userId, file } = args
    const type = args.type ?? 2

    if (file.initiate) {
        return `${apiBaseUrl}/uploadandindex/view/${tenantId}/${file.id}/${type}/2`
    }

    const repositoryId = file.repositoryId ?? ''
    return `${apiBaseUrl}/menu/file/download/${tenantId}/${userId}/${repositoryId}/${file.id}/2`
}

// Print URL (v5 parity)
function buildPrintUrl(args: {
    apiBaseUrl: string
    tenantId: string | number
    userId: string | number
    file: FileLike
    initiateType: 1 | 2
}) {
    const { apiBaseUrl, tenantId, userId, file, initiateType } = args

    if (file.initiate) {
        return `${apiBaseUrl}/uploadandindex/view/${tenantId}/${file.id}/${initiateType}/1`
    }

    const repositoryId = file.repositoryId ?? ''
    return `${apiBaseUrl}/file/view/${tenantId}/${userId}/${repositoryId}/${file.id}/2`
}

// v5 “Compose” viewer URL (DocsMerge)
function buildComposeUrl(args: {
    tenantId: string | number
    userId: string | number
    repositoryId: string | number
    workflowId: string | number
    processId: string | number
    composeFileIdsCsv: string
}) {
    const { tenantId, userId, repositoryId, workflowId, processId, composeFileIdsCsv } = args

    // v5 has a few origin mappings; keep it robust:
    const originRaw = window.location.origin
    const origin =
        originRaw === 'http://localhost:3000'
            ? 'https://trial.ezofis.com'
            : originRaw

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

    onOpenComments,
    onOpenHistory,
    onOpenMailShare,
}: Props) {
    const { session } = authUserStore.getState()
    const tenantId = session?.tenantId
    const userId = session?.id

    const { data, isLoading, error, refetch } = useAttachments(workflowId, processId, enabled)

    const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), [])
    const initiateType = useMemo(
        () => getInitiateType(repositoryDetails?.fieldsType) as 1 | 2,
        [repositoryDetails?.fieldsType],
    )

    // preview
    const [previewFile, setPreviewFile] = useState<FileLike | null>(null)

    // upload
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string>('')

    // selection
    const [selectAll, setSelectAll] = useState(false)
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

    const selectedPdfIds = useMemo(() => {
        return selectedFiles
            .filter((f) => getExt(f.name) === 'pdf')
            .map((f) => f.id)
    }, [selectedFiles])

    const selectedOnlyPDF = useMemo(() => {
        if (!selectedFiles.length) return false
        return selectedFiles.every((f) => getExt(f.name) === 'pdf')
    }, [selectedFiles])

    const syncSelectAll = (nextMap: Record<string, boolean>) => {
        const ids = rows.map((r: any) => String(r.file?.id)).filter(Boolean)
        const all = ids.length > 0 && ids.every((id) => !!nextMap[id])
        setSelectAll(all)
    }

    const toggleSelectAll = (checked: boolean) => {
        const next: Record<string, boolean> = {}
        rows.forEach((r: any) => {
            const id = String(r.file?.id)
            if (id) next[id] = checked
        })
        setCheckedMap(next)
        setSelectAll(checked)
    }

    const toggleOne = (fileId: string | number, checked: boolean) => {
        const key = String(fileId)
        const next = { ...checkedMap, [key]: checked }
        setCheckedMap(next)
        syncSelectAll(next)
    }

    // ===== Upload (v5: attachmentWithProcessId) =====
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

        // v5 optional rename: checklistName.ext
        if (selectedChecklistName) {
            form.append('filename', `${selectedChecklistName}.${ext}`)
        } else {
            form.append('filename', file.name)
        }

        // ⚠️ Adjust this if your requestApi nests it differently
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

            // refresh immediately + delayed refresh (v5 backend sometimes indexes async)
            await refetch()
            window.setTimeout(() => refetch(), 15000)
        } catch (err: any) {
            setUploadError(err?.message || 'Upload failed')
        } finally {
            setUploading(false)
        }
    }

    // ===== Merge PDFs (v5: documentMerge) =====
    const onMergeSelectedPDF = async () => {
        if (!workflowId || !processId || !transactionId || !repositoryId) return
        if (selectedPdfIds.length < 2) return

        // ⚠️ Adjust method name/params if needed
        await (requestApi as any).documentMerge(
            workflowId,
            processId,
            transactionId,
            repositoryId,
            { ids: selectedPdfIds },
        )
    }

    // ===== Compose PDFs (v5: DocsMerge viewer) =====
    const onComposeSelected = () => {
        if (!tenantId || !userId || !workflowId || !processId || !repositoryId) return
        if (!selectedOnlyPDF) return

        const csv = selectedPdfIds.join(',')
        if (!csv) return

        const url = buildComposeUrl({
            tenantId,
            userId,
            repositoryId,
            workflowId,
            processId,
            composeFileIdsCsv: csv,
        })

        window.open(url, '_blank')
    }

    const onShareSelected = () => {
        const list = selectedFiles.map((f) => ({ id: f.id, name: f.name }))
        onOpenMailShare?.(list)
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-800">
                    Attachments ({rows.length})
                </div>

                <div className="flex items-center gap-2">
                    <IconButton icon="tabler:refresh" variant="ghost" color="gray" onClick={() => refetch()} />
                </div>
            </div>

            {/* Upload (v5-style) */}
            {canUpload && (
                <div className="rounded-md border border-dashed border-gray-300 p-4 mb-4 hover:bg-gray-50 cursor-pointer" onClick={onPickUpload}>
                    <div className="flex items-center gap-3">
                        <IconButton
                            icon={uploading ? 'tabler:loader-2' : 'tabler:cloud-upload'}
                            variant="ghost"
                            color="gray"
                        />
                        <div className="min-w-0">
                            <div className="font-medium text-gray-900">{uploading ? 'Uploading…' : 'UPLOAD FILES'}</div>
                            <div className="text-sm text-gray-500">Click here to choose a file and upload</div>
                            {uploadError ? <div className="text-xs text-red-600 mt-1">{uploadError}</div> : null}
                        </div>
                    </div>

                    <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
                </div>
            )}

            {/* Multi-select toolbar */}
            {!!rows.length && (
                <div className="flex items-center gap-3 mb-3">
                    <input type="checkbox" checked={selectAll} onChange={(e) => toggleSelectAll(e.target.checked)} />
                    <span className="text-sm text-gray-700">Select All</span>

                    <div className="ml-auto flex items-center gap-2">
                        <IconButton
                            icon="tabler:mail-forward"
                            variant="ghost"
                            color="gray"
                            disabled={!selectedCount}
                            onClick={onShareSelected}
                            title="Mail Share"
                        />

                        <IconButton
                            icon="tabler:files"
                            variant="ghost"
                            color="gray"
                            disabled={!(selectedCount > 1 && selectedOnlyPDF)}
                            onClick={onMergeSelectedPDF}
                            title="Merge PDFs"
                        />

                        <IconButton
                            icon="tabler:layers-union"
                            variant="ghost"
                            color="gray"
                            disabled={!(selectedCount > 0 && selectedOnlyPDF)}
                            onClick={onComposeSelected}
                            title="Compose PDFs"
                        />
                    </div>
                </div>
            )}

            {/* Loading + Empty + Error */}
            {isLoading && <div className="text-sm text-gray-500">Loading attachments…</div>}
            {!isLoading && error && <div className="text-sm text-red-600">Couldn’t load attachments. Try refresh.</div>}
            {!isLoading && !rows.length && <div className="text-sm text-gray-500">No attachments found.</div>}

            {/* List */}
            {!!rows.length && (
                <div className="divide-y rounded-lg border border-gray-200 bg-white">
                    {rows.map((a: any, idx: number) => {
                        const createdAt = a.createdAt ? formatDatetime(a.createdAt, 'datetime') : '-'
                        const createdBy = a.createdByEmail ?? '-'
                        const stageName = a.stageName ?? '-'
                        const file: FileLike = a.file

                        return (
                            <div key={`${file?.id}-${idx}`} className="flex items-center justify-between p-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <input
                                        type="checkbox"
                                        checked={!!file?.checked}
                                        onChange={(e) => toggleOne(file.id, e.target.checked)}
                                    />

                                    <div className="min-w-0">
                                        <div className="truncate font-medium text-gray-900">{file?.name ?? '-'}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                            <span>Stage: {stageName}</span>
                                            <span>By: {createdBy}</span>
                                            <span>At: {createdAt}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <IconButton
                                        icon="tabler:eye"
                                        variant="ghost"
                                        color="gray"
                                        onClick={() => setPreviewFile(file)}
                                        title="Preview"
                                    />

                                    <IconButton
                                        icon="tabler:download"
                                        variant="ghost"
                                        color="gray"
                                        onClick={() => {
                                            if (!apiBaseUrl || !tenantId || !userId) return
                                            const url = buildDownloadUrl({
                                                apiBaseUrl,
                                                tenantId,
                                                userId,
                                                file,
                                                type: initiateType,
                                            })
                                            window.open(url, '_blank')
                                        }}
                                        title="Download"
                                    />

                                    <IconButton
                                        icon="tabler:printer"
                                        variant="ghost"
                                        color="gray"
                                        onClick={() => {
                                            if (!apiBaseUrl || !tenantId || !userId) return
                                            const url = buildPrintUrl({
                                                apiBaseUrl,
                                                tenantId,
                                                userId,
                                                file,
                                                initiateType,
                                            })
                                            window.open(url, '_blank')
                                        }}
                                        title="Print"
                                    />

                                    <IconButton
                                        icon="tabler:message-circle"
                                        variant="ghost"
                                        color="gray"
                                        onClick={() => onOpenComments?.(file)}
                                        title="Comments"
                                    />

                                    <IconButton
                                        icon="tabler:history"
                                        variant="ghost"
                                        color="gray"
                                        onClick={() => onOpenHistory?.(file)}
                                        title="History"
                                    />

                                    <IconButton
                                        icon="tabler:mail-forward"
                                        variant="ghost"
                                        color="gray"
                                        onClick={() => onOpenMailShare?.([{ id: file.id, name: file.name }])}
                                        title="Mail Share"
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

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

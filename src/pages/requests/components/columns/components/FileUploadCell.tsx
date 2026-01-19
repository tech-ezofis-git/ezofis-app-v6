import React, { useMemo, useState } from 'react'
import FileSheet from '@/components/common/file-sheet/FileSheet'
import Icon from '@/components/base/icon/Icon'
import { safeParse } from '@/pages/requests/utils/workflow.utils'
import authStore from "../../../../../stores/authUserStore";

type Props = {
    rawVal: any
    row: any

    // If you already have these in a global store, you can pass them in instead.

    workflowId?: string | number
    processId?: string | number

    className?: string
}

// Helper function to get file icon based on extension
function getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    switch (ext) {
        case 'pdf':
            return 'tabler:file-type-pdf'
        case 'doc':
        case 'docx':
            return 'tabler:file-type-doc'
        case 'xls':
        case 'xlsx':
            return 'tabler:file-type-xls'
        case 'ppt':
        case 'pptx':
            return 'tabler:file-type-ppt'
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
            return 'tabler:photo'
        case 'zip':
        case 'rar':
        case '7z':
            return 'tabler:file-zip'
        case 'txt':
            return 'tabler:file-text'
        case 'csv':
            return 'tabler:file-spreadsheet'
        default:
            return 'tabler:file'
    }
}

function pickSessionNumber(row: any, keys: string[]) {
    for (const k of keys) {
        const v = row?.[k]
        if (v !== undefined && v !== null && v !== '') return v
    }
    return ''
}

const FileUploadCell: React.FC<Props> = ({
    rawVal,
    row,

    workflowId,
    processId,
    className = 'underline cursor-pointer',
}) => {
    const [opened, setOpened] = useState(false)

    const parsed = useMemo(() => safeParse(rawVal), [rawVal])
    const first = Array.isArray(parsed) && parsed.length ? parsed[0] : null
    const { session } = authStore.getState();
    // Normalize file payloads (since different systems shape it differently)
    const file = useMemo(() => {
        if (!first) return null
        const name = first.fileName || first.name || '-'
        const id = first.itemId || first.id || first.fileId
        const repositoryId = first.repositoryId || row?.repositoryId
        if (!id || !repositoryId) {
            // still allow showing the name, but preview will be limited
            return { id: id || '', name, repositoryId }
        }
        return { id, name, repositoryId }
    }, [first, row])

    const resolvedTenantId = session?.tenantId || pickSessionNumber(row, ['tenantId', 'tId'])
    const resolvedUserId = session?.id || pickSessionNumber(row, ['userId', 'uId'])
    const resolvedWorkflowId =
        workflowId ?? pickSessionNumber(row, ['workflowId', 'wId'])
    const resolvedProcessId =
        processId ?? pickSessionNumber(row, ['processId', 'pId'])

    const fileName = file?.name || '-'
    const fileIcon = getFileIcon(fileName)

    if (!first) return <span>-</span>

    console.log("this is file data", file, resolvedTenantId, resolvedUserId, resolvedWorkflowId, resolvedProcessId);
    return (
        <>
            <span
                className="inline-flex items-center gap-2 cursor-pointer"
                onClick={(e) => {
                    e?.stopPropagation?.()
                    setOpened(true)
                }}
            >
                <Icon name={fileIcon} className="text-gray-600 shrink-0" />
                <span className={className}>
                    {fileName}
                </span>
            </span>

            {opened && <FileSheet
                opened={opened}
                onClose={() => setOpened(false)}
                file={file}
                tenantId={resolvedTenantId}
                userId={resolvedUserId}
                workflowId={resolvedWorkflowId}
                processId={resolvedProcessId}
                type={2}
                actions="&action=all"
                fullScreen={true}
            />}
        </>
    )
}

FileUploadCell.displayName = 'FileUploadCell'
export default FileUploadCell

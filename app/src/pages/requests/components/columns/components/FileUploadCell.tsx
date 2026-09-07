import React, { useMemo, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import FileSheet from '@/components/common/file-sheet/FileSheet'
import { safeParse } from '@/pages/requests/utils/workflow.utils'
import authStore from '../../../../../stores/authUserStore'

type Props = {
  className?: string
  processId?: string | number

  // If you already have these in a global store, you can pass them in instead.

  rawVal: any
  row: any

  workflowId?: string | number
}

// Helper function to get file icon based on extension
function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  switch (ext) {
    case 'pdf':
      return 'vscode-icons:file-type-pdf2'
    case 'doc':
    case 'docx':
      return 'vscode-icons:file-type-word'
    case 'xls':
    case 'xlsx':
    case 'csv':
      return 'vscode-icons:file-type-excel'
    case 'ppt':
    case 'pptx':
      return 'vscode-icons:file-type-powerpoint'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return 'vscode-icons:file-type-image'
    case 'zip':
    case 'rar':
    case '7z':
      return 'vscode-icons:file-type-zip'
    case 'txt':
    case 'rtf':
      return 'vscode-icons:file-type-text'
    default:
      return 'vscode-icons:file-type-text'
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
  className = 'underline cursor-pointer',
  processId,

  rawVal,
  row,
  workflowId,
}) => {
  const [opened, setOpened] = useState(false)

  const parsed = useMemo(() => safeParse(rawVal), [rawVal])
  const first = Array.isArray(parsed) && parsed.length ? parsed[0] : null
  const { session } = authStore.getState()
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

  const resolvedTenantId =
    session?.tenantId || pickSessionNumber(row, ['tenantId', 'tId'])
  const resolvedUserId =
    session?.id || pickSessionNumber(row, ['userId', 'uId'])
  const resolvedWorkflowId =
    workflowId ?? pickSessionNumber(row, ['workflowId', 'wId'])
  const resolvedProcessId =
    processId ?? pickSessionNumber(row, ['processId', 'pId'])

  const fileName = file?.name || '-'
  const fileIcon = getFileIcon(fileName)

  if (!first) return <span>-</span>

  console.log(
    'this is file data',
    file,
    resolvedTenantId,
    resolvedUserId,
    resolvedWorkflowId,
    resolvedProcessId,
  )
  return (
    <>
      <span
        className='inline-flex cursor-pointer items-center gap-2'
        onClick={(e) => {
          e?.stopPropagation?.()
          setOpened(true)
        }}
      >
        <Icon className='text-gray-600 shrink-0' name={fileIcon} />
        <span className={className}>{fileName}</span>
      </span>

      {opened && (
        <FileSheet
          actions='&action=all'
          file={file}
          fullScreen={true}
          opened={opened}
          processId={resolvedProcessId}
          tenantId={resolvedTenantId}
          type={2}
          userId={resolvedUserId}
          workflowId={resolvedWorkflowId}
          onClose={() => setOpened(false)}
        />
      )}
    </>
  )
}

FileUploadCell.displayName = 'FileUploadCell'
export default FileUploadCell

import { createContext, useContext } from 'react'

// Name of the workflow the request form belongs to. Lets deeply nested fields
// (e.g. table file columns) pick workflow-specific behaviour without prop
// drilling; empty outside the new-request flow.
export const WorkflowNameContext = createContext('')

export const useWorkflowName = () => useContext(WorkflowNameContext)

export const WorkflowAttachmentsContext = createContext<any[]>([])

export const useWorkflowAttachments = () => useContext(WorkflowAttachmentsContext)

// A file picked in a table cell that still needs mandatory repository values.
// The request screen shows it in the file viewer with the repository fields
// beside it; `onConfirm` stages the file with the values entered there.
export interface TableUploadRequest {
  file: File
  /** The repository's field definitions. */
  repoFields: Array<{
    dataType?: string
    isMandatory?: boolean
    level?: number
    name?: string
    sqlColumnName?: string
  }>
  /** Repository field name -> value already known from the row / OCR. */
  initialValues: Record<string, string>
  onCancel: () => void
  onConfirm: (values: Record<string, string>) => Promise<void>
}

export const WorkflowTableUploadContext = createContext<
  ((request: TableUploadRequest) => void) | undefined
>(undefined)

export const useWorkflowTableUpload = () =>
  useContext(WorkflowTableUploadContext)

export const WorkflowOpenAttachmentContext = createContext<
  ((attachment: any) => void) | undefined
>(undefined)

export const useWorkflowOpenAttachment = () =>
  useContext(WorkflowOpenAttachmentContext)

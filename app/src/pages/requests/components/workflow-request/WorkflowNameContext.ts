import { createContext, useContext } from 'react'

// Name of the workflow the request form belongs to. Lets deeply nested fields
// (e.g. table file columns) pick workflow-specific behaviour without prop
// drilling; empty outside the new-request flow.
export const WorkflowNameContext = createContext('')

export const useWorkflowName = () => useContext(WorkflowNameContext)

export const WorkflowAttachmentsContext = createContext<any[]>([])

export const useWorkflowAttachments = () => useContext(WorkflowAttachmentsContext)

export const WorkflowOpenAttachmentContext = createContext<
  ((attachment: any) => void) | undefined
>(undefined)

export const useWorkflowOpenAttachment = () =>
  useContext(WorkflowOpenAttachmentContext)

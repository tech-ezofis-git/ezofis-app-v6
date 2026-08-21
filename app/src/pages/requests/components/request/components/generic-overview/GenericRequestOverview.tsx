import { useMemo } from 'react'
import WorkflowFormRenderer from '@/pages/requests/components/workflow-request/WorkflowFormRenderer'
import Attachments from '../sections/attachment/Attachments'
import Comments from '../sections/comment/Comments'
import History from '../sections/history/History'

interface Props {
  rawWorkflowData: any
  rightView: 'overview' | 'history' | 'attachments' | 'comments'
  selectedItem: any
}

const safeParseFormData = (formData: unknown): Record<string, any> => {
  if (!formData) return {}
  if (typeof formData === 'object') {
    return (formData as any).fields || formData || {}
  }
  if (typeof formData === 'string') {
    try {
      const parsed = JSON.parse(formData)
      return parsed?.fields || parsed || {}
    } catch {
      return {}
    }
  }
  return {}
}

// Generic (non-Accounts-Payable) request detail: the submitted form
// rendered read-only with the same component used to compose it in New
// Request, always visible on the left; History/Attachments/Comments open
// as a right-side panel driven by the header's icon buttons (rightView),
// using the existing workflow-agnostic components for those.
const GenericRequestOverview = ({
  rawWorkflowData,
  rightView,
  selectedItem,
}: Props) => {
  const panels = useMemo(
    () => rawWorkflowData?.formJson?.panels || [],
    [rawWorkflowData],
  )
  const formModel = useMemo(
    () => safeParseFormData(selectedItem?.formData),
    [selectedItem],
  )

  const workflowId = rawWorkflowData?.id
  const instanceId = selectedItem?.workflowInstanceId || selectedItem?.processId
  const processId = selectedItem?.processId
  const repositoryId = rawWorkflowData?.repositoryId

  const showSidePanel = rightView !== 'overview'

  return (
    <div className='flex min-h-0 flex-1 overflow-hidden'>
      <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
        <WorkflowFormRenderer
          formModel={formModel}
          panels={panels}
          viewOnly
          onFieldChange={() => {}}
        />
      </div>

      {showSidePanel && (
        <div className='flex w-[380px] shrink-0 flex-col overflow-y-auto border-l border-gray-3 bg-gray-1'>
          {rightView === 'history' && (
            <div className='px-4 py-4'>
              <History
                instanceId={instanceId}
                processId={processId}
                workflowId={workflowId}
                enabled
              />
            </div>
          )}
          {rightView === 'attachments' && (
            <div className='px-4 py-4'>
              <Attachments
                instanceId={instanceId}
                processId={processId}
                repositoryId={repositoryId}
                workflowId={workflowId}
                enabled
              />
            </div>
          )}
          {rightView === 'comments' && (
            <div className='flex h-full flex-col px-4 py-4'>
              <Comments
                instanceId={instanceId}
                processId={processId}
                workflowId={workflowId}
                enabled
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

GenericRequestOverview.displayName = 'GenericRequestOverview'
export default GenericRequestOverview

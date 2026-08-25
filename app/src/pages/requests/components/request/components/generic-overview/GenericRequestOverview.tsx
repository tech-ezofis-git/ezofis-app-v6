import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useState } from 'react'
import type { AttachmentItem } from '@/pages/requests/hooks/useAttachments'
import IconButton from '@/components/base/button/IconButton'
import WorkflowFormRenderer from '@/pages/requests/components/workflow-request/WorkflowFormRenderer'
import Attachments from '../sections/attachment/Attachments'
import Comments from '../sections/comment/Comments'
import History from '../sections/history/History'
import AttachmentPreviewPanel from './AttachmentPreviewPanel'

interface Props {
  formModel: Record<string, any>
  rawWorkflowData: any
  rightView: 'overview' | 'history' | 'attachments' | 'comments'
  selectedItem: any
  onFieldChange: (fieldId: string, value: any) => void
  setRightView: (view: 'overview' | 'history' | 'attachments' | 'comments') => void
}

// Generic (non-Accounts-Payable) request detail: the submitted form
// rendered editable with the same component used to compose it in New
// Request, always visible on the left; History/Attachments/Comments open
// as a right-side panel driven by the header's icon buttons (rightView),
// using the existing workflow-agnostic components for those.
const GenericRequestOverview = ({
  formModel,
  rawWorkflowData,
  rightView,
  selectedItem,
  onFieldChange,
  setRightView,
}: Props) => {
  const { t } = useLingui()
  const panels = useMemo(
    () => rawWorkflowData?.formJson?.panels || [],
    [rawWorkflowData],
  )

  const workflowId = rawWorkflowData?.id
  const instanceId = selectedItem?.workflowInstanceId || selectedItem?.processId
  const processId = selectedItem?.processId
  const repositoryId = rawWorkflowData?.repositoryId

  const showSidePanel = rightView !== 'overview'

  const [selectedAttachment, setSelectedAttachment] =
    useState<AttachmentItem | null>(null)

  useEffect(() => {
    setSelectedAttachment(null)
  }, [rightView, selectedItem])

  return (
    <div className='flex min-h-0 flex-1 overflow-hidden'>
      <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
        <WorkflowFormRenderer
          formModel={formModel}
          panels={panels}
          onFieldChange={onFieldChange}
        />
      </div>

      {showSidePanel && (
        <div className='flex w-[380px] shrink-0 flex-col overflow-hidden border-l border-gray-3 bg-gray-1'>
          {rightView === 'history' && (
            <div className='flex h-full min-h-0 flex-col'>
              <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3 py-2.5'>
                <span className='text-xs font-semibold text-gray-12'>
                  {t`History`}
                </span>
                <IconButton
                  ariaLabel={t`Close`}
                  icon='tabler:x'
                  size='sm'
                  variant='ghost'
                  onClick={() => setRightView('overview')}
                />
              </div>
              <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4'>
                <History
                  instanceId={instanceId}
                  processId={processId}
                  workflowId={workflowId}
                  enabled
                />
              </div>
            </div>
          )}
          {rightView === 'attachments' &&
            (selectedAttachment ? (
              <div className='flex h-full min-h-0 flex-col'>
                <AttachmentPreviewPanel
                  file={selectedAttachment}
                  repositoryId={repositoryId}
                  onBack={() => setSelectedAttachment(null)}
                />
              </div>
            ) : (
              <div className='flex h-full min-h-0 flex-col'>
                <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3 py-2.5'>
                  <span className='text-xs font-semibold text-gray-12'>
                    {t`Attachments`}
                  </span>
                  <IconButton
                    ariaLabel={t`Close`}
                    icon='tabler:x'
                    size='sm'
                    variant='ghost'
                    onClick={() => setRightView('overview')}
                  />
                </div>
                <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4'>
                  <Attachments
                    instanceId={instanceId}
                    processId={processId}
                    repositoryId={repositoryId}
                    workflowId={workflowId}
                    enabled
                    onSelect={setSelectedAttachment}
                  />
                </div>
              </div>
            ))}
          {rightView === 'comments' && (
            <div className='flex h-full min-h-0 flex-col'>
              <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3 py-2.5'>
                <span className='text-xs font-semibold text-gray-12'>
                  {t`Comments`}
                </span>
                <IconButton
                  ariaLabel={t`Close`}
                  icon='tabler:x'
                  size='sm'
                  variant='ghost'
                  onClick={() => setRightView('overview')}
                />
              </div>
              <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4'>
                <Comments
                  instanceId={instanceId}
                  processId={processId}
                  workflowId={workflowId}
                  enabled
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

GenericRequestOverview.displayName = 'GenericRequestOverview'
export default GenericRequestOverview

import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import AnimateFadeIn from '@/components/common/animations/AnimateFadeIn'
import requestStore from '@/pages/requests/stores/useRequestStore'
import Header from '../request/components/newrequest/Header'
import { useWorkflowForm } from './hooks/useWorkflowForm'
import WorkflowFormRenderer from './WorkflowFormRenderer'
import WorkflowRequestSidebar from './WorkflowRequestSidebar'

interface Props {
  workflow: any
  onClose: () => void
}

type SidePanel = 'attachments' | 'comments'

// Generic, form-driven "New Request" flow for any workflow that isn't
// Accounts Payable: resolves the workflow's form (via workflow.formId),
// renders it with the app's existing form-control components, and submits
// it to start a new workflow instance.
const WorkflowRequest = ({ workflow, onClose }: Props) => {
  const { t } = useLingui()
  const workflowRefresh = requestStore((state) => state.workflowRefresh)
  const [activePanel, setActivePanel] = useState<SidePanel | null>(null)

  const {
    addAttachment,
    addComment,
    applyOcrFieldList,
    attachments,
    commentDraft,
    comments,
    formModel,
    isLoadingForm,
    isSubmitting,
    isUploadingAttachment,
    loadError,
    panels,
    removeAttachment,
    repoFieldHints,
    submit,
    submitError,
    setCommentDraft,
    setFieldValue,
  } = useWorkflowForm(workflow)

  const handleTogglePanel = (panel: SidePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  const handleSubmit = async () => {
    const result = await submit()
    if (!result.success) {
      showToast({
        message:
          submitError || t`Failed to start the workflow. Please try again.`,
        variant: 'error',
      })
      return
    }

    showToast({
      message: t`Request submitted.`,
      variant: 'success',
    })
    workflowRefresh()
    onClose()
  }

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
      <Header
        activePanel={activePanel}
        attachmentCount={attachments.length}
        commentCount={comments.length}
        isSubmitDisabled={isLoadingForm || !!loadError}
        isSubmitting={isSubmitting}
        title={t`New Request`}
        onClose={onClose}
        onSubmit={handleSubmit}
        onTogglePanel={handleTogglePanel}
      />

      {isLoadingForm ? (
        <AnimateFadeIn className='flex flex-1 flex-col items-center justify-center gap-3'>
          <div className='flex size-14 items-center justify-center rounded-2xl bg-[var(--primary-1)] shadow-sm'>
            <Icon
              className='size-7 animate-spin text-[var(--primary-9)]'
              name='tabler:loader-2'
            />
          </div>
          <p className='text-14 font-medium text-gray-11'>{t`Loading form…`}</p>
        </AnimateFadeIn>
      ) : loadError ? (
        <AnimateFadeIn className='flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center'>
          <div className='flex size-14 items-center justify-center rounded-2xl bg-gray-2 shadow-sm'>
            <Icon className='size-7 text-gray-8' name='tabler:file-off' />
          </div>
          <p className='text-14 font-medium text-gray-12'>{loadError}</p>
        </AnimateFadeIn>
      ) : (
        <div className='flex min-h-0 flex-1 overflow-hidden'>
          <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
            <WorkflowFormRenderer
              formModel={formModel}
              panels={panels}
              repoFieldHints={repoFieldHints}
              repositoryId={workflow?.repositoryId}
              onFieldChange={setFieldValue}
              onOcrFieldList={applyOcrFieldList}
            />
          </div>
          {activePanel && (
            <WorkflowRequestSidebar
              activePanel={activePanel}
              attachments={attachments}
              commentDraft={commentDraft}
              comments={comments}
              isUploadingAttachment={isUploadingAttachment}
              onAddAttachment={addAttachment}
              onCommentDraftChange={setCommentDraft}
              onRemoveAttachment={removeAttachment}
              onSendComment={addComment}
            />
          )}
        </div>
      )}
    </div>
  )
}

WorkflowRequest.displayName = 'WorkflowRequest'
export default WorkflowRequest

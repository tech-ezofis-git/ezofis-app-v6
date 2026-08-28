import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import AnimateFadeIn from '@/components/common/animations/AnimateFadeIn'
import requestStore from '@/pages/requests/stores/useRequestStore'
import Header from '../request/components/newrequest/Header'
import RepoFieldsPanel from './components/RepoFieldsPanel'
import UploadedFilePreview from './components/UploadedFilePreview'
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
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null)
  const [isConfirmingUpload, setIsConfirmingUpload] = useState(false)
  // Clicking a repository field highlights its value in the file preview —
  // focusRequestId is bumped on every click (even re-clicking the same
  // field) so the viewer re-scrolls to it each time.
  const [activeHighlightTerm, setActiveHighlightTerm] = useState<string | null>(
    null,
  )
  const [focusRequestId, setFocusRequestId] = useState(0)

  const handleFieldFocus = (value: any) => {
    const str = value == null ? '' : String(value).trim()
    if (!str) return
    setActiveHighlightTerm(str)
    setFocusRequestId((id) => id + 1)
  }

  const {
    addAttachment,
    addComment,
    applyOcrFieldList,
    attachments,
    cancelPendingUpload,
    commentDraft,
    comments,
    confirmUpload,
    formModel,
    hasAttemptedSubmit,
    isLoadingForm,
    isSubmitting,
    isUploadingAttachment,
    loadError,
    missingMandatoryFieldIds,
    needsManualUpload,
    panels,
    removeAttachment,
    repoFieldDescriptors,
    repoFieldHints,
    submit,
    submitError,
    uploadedFiles,
    setCommentDraft,
    setFieldValue,
  } = useWorkflowForm(workflow)

  const handleTogglePanel = (panel: SidePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  const handleSubmit = async () => {
    const result = await submit()
    if (!result.success) {
      // A missing-required-field(s) message is guidance, not a failure —
      // show it as info so it doesn't read like something broke.
      const isMissingFieldsMessage = missingMandatoryFieldIds.size > 0
      showToast({
        message:
          submitError || t`Failed to start the workflow. Please try again.`,
        variant: isMissingFieldsMessage ? 'default' : 'error',
      })
      const firstMissingId = missingMandatoryFieldIds.values().next().value
      if (firstMissingId) {
        const target = document.querySelector(
          `[data-field-id="${firstMissingId}"]`,
        )
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target?.querySelector<HTMLElement>('input, select, textarea')?.focus()
      }
      return
    }

    showToast({
      message: t`Request submitted.`,
      variant: 'success',
    })
    workflowRefresh()
    onClose()
  }

  const handleConfirmUpload = async () => {
    setIsConfirmingUpload(true)
    const result = await confirmUpload()
    setIsConfirmingUpload(false)
    if (!result.success) {
      showToast({
        message: submitError || t`Failed to upload the file. Please try again.`,
        variant: 'error',
      })
    }
  }

  return (
    <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
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
        <div className='flex min-h-0 min-w-0 flex-1 overflow-hidden'>
          {!needsManualUpload ? (
            // Plain form view — covers "no file yet", "still extracting"
            // (the dropzone/field itself shows its own loading state), and
            // "OCR filled everything, auto-staged" alike. The file-preview +
            // repository-fields screen is reserved solely for the case
            // below, where the user still has to supply missing data.
            <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
              <WorkflowFormRenderer
                formModel={formModel}
                hasAttemptedSubmit={hasAttemptedSubmit}
                missingMandatoryFieldIds={missingMandatoryFieldIds}
                panels={panels}
                repoFieldHints={repoFieldHints}
                repositoryId={workflow?.repositoryId}
                onFieldChange={setFieldValue}
                onOcrFieldList={applyOcrFieldList}
              />
            </div>
          ) : (
            <div className='flex min-w-0 flex-1 gap-4 overflow-hidden p-4'>
              <div className='min-w-0 flex-1'>
                <UploadedFilePreview
                  activeHighlightTerm={activeHighlightTerm}
                  activeKey={activeFileKey}
                  files={uploadedFiles}
                  focusRequestId={focusRequestId}
                  onSelectKey={setActiveFileKey}
                />
              </div>
              <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
                <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
                  <RepoFieldsPanel
                    descriptors={repoFieldDescriptors}
                    formModel={formModel}
                    hasAttemptedSubmit={hasAttemptedSubmit}
                    missingMandatoryFieldIds={missingMandatoryFieldIds}
                    repoFieldHints={repoFieldHints}
                    repositoryId={workflow?.repositoryId}
                    onFieldChange={setFieldValue}
                    onFieldFocus={handleFieldFocus}
                    onOcrFieldList={applyOcrFieldList}
                  />
                </div>
                <div className='mt-3 flex items-center justify-end gap-2 border-t border-gray-3 pt-3'>
                  <Button
                    label={t`Cancel`}
                    variant='outline'
                    onClick={cancelPendingUpload}
                  />
                  <Button
                    disabled={missingMandatoryFieldIds.size > 0}
                    label={t`Upload`}
                    loading={isConfirmingUpload}
                    variant='solid'
                    onClick={handleConfirmUpload}
                  />
                </div>
              </div>
            </div>
          )}
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

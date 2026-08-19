import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import requestStore from '@/pages/requests/stores/useRequestStore'
import Footer from '../request/components/newrequest/Footer'
import { useWorkflowForm } from './hooks/useWorkflowForm'
import WorkflowFormRenderer from './WorkflowFormRenderer'
import WorkflowRequestHeader from './WorkflowRequestHeader'

interface Props {
  workflow: any
  onClose: () => void
}

// Generic, form-driven "New Request" flow for any workflow that isn't
// Accounts Payable: resolves the workflow's form (via workflow.formId),
// renders it with the app's existing form-control components, and submits
// it to start a new workflow instance.
const WorkflowRequest = ({ workflow, onClose }: Props) => {
  const { t } = useLingui()
  const workflowRefresh = requestStore((state) => state.workflowRefresh)

  const {
    form,
    formModel,
    isLoadingForm,
    isSubmitting,
    loadError,
    panels,
    submit,
    submitError,
    setFieldValue,
  } = useWorkflowForm(workflow)

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

  if (isLoadingForm) {
    return (
      <div className='flex flex-1 items-center justify-center'>
        <Icon
          className='size-6 animate-spin text-gray-9'
          name='tabler:loader-2'
        />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center'>
        <Icon className='size-8 text-gray-8' name='tabler:file-off' />
        <p className='text-14 font-medium text-gray-12'>{loadError}</p>
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='flex-1 overflow-hidden'>
        <WorkflowRequestHeader
          description={form?.description}
          name={form?.name}
        />
        <WorkflowFormRenderer
          formModel={formModel}
          panels={panels}
          repositoryId={workflow?.repositoryId}
          onFieldChange={setFieldValue}
        />
      </div>
      <Footer
        isPrimaryLoading={isSubmitting}
        primaryLabel={t`Submit`}
        onPrimaryClick={handleSubmit}
      />
    </div>
  )
}

WorkflowRequest.displayName = 'WorkflowRequest'
export default WorkflowRequest

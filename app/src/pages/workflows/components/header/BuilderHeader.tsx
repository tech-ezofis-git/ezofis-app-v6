import { useNavigate, useParams } from '@tanstack/react-router'
import { useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import showToast from '@/components/base/toast/showToast'
import { getSettingsReturnPath } from '@/pages/settings/helpers/settingsNavigation'
import useWorkflowStore from '../../stores/useWorkflowStore'
import { exportWorkflow } from '../../utils/exportWorkflow'
import { validateWorkflowSettings } from '../../utils/validateWorkflowSettings'

const BuilderHeader = () => {
  const navigate = useNavigate()
  const { workflowId } = useParams({ strict: false }) as any
  const { getEdges, getNodes } = useReactFlow()
  const { workflowDescription, workflowName, workflowStatus } =
    useWorkflowStore((state) => state)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (targetStatus?: 'draft' | 'published') => {
    if (!workflowId) {
      showToast({
        message: "We couldn't save your changes. Please try again.",
        variant: 'error',
      })
      return
    }

    const state = useWorkflowStore.getState()
    const currentStatus = targetStatus || state.workflowStatus
    const validation = validateWorkflowSettings({
      folder: state.folder,
      form: state.form,
      initiateUsing: state.initiateUsing,
      status: currentStatus,
      workflowName: state.workflowName,
    })

    if (!validation.isValid) {
      state.setSettingsValidationErrors(validation.errors)
      state.openSettings()
      showToast({
        message:
          validation.firstError ||
          'Please fill in all required workflow settings.',
        toastTitle: 'Required Fields',
        variant: 'default',
      })
      return
    }

    state.setSettingsValidationErrors(null)

    const isPublished = String(currentStatus).toLowerCase() === 'published'

    state.setWorkflowStatus(isPublished ? 'published' : 'draft')

    setIsSaving(true)
    try {
      const exportedJson = exportWorkflow(getNodes(), getEdges())

      if (!exportedJson.settings) (exportedJson as any).settings = {}
      if (!exportedJson.settings.publish)
        (exportedJson.settings as any).publish = {}
      exportedJson.settings.publish.publishOption = isPublished
        ? 'PUBLISHED'
        : 'DRAFT'

      const payload = {
        description: workflowDescription || '',
        name: workflowName,
        status: isPublished ? 'PUBLISHED' : 'DRAFT',
        workflowJson: exportedJson,
      }

      console.log(
        '📌 [Workflow Builder] Saving Workflow JSON Payload:',
        JSON.stringify(payload, null, 2),
      )
      console.log(
        '📌 [Workflow Builder] Raw Workflow JSON object:',
        exportedJson,
      )

      let response
      if (workflowId === 'new') {
        response = await workflowsApiV6.createWorkflow(payload)
      } else {
        response = await workflowsApiV6.updateWorkflow(
          String(workflowId),
          payload,
        )
      }

      const { data, error } = response

      if (error) {
        showToast({
          message: `Failed to ${isPublished ? 'publish' : 'save'} workflow: ${error}`,
          variant: 'error',
        })
      } else {
        useWorkflowStore
          .getState()
          .setWorkflowStatus(isPublished ? 'published' : 'draft')
        showToast({
          message: isPublished
            ? 'Workflow published successfully'
            : 'Workflow saved successfully',
          variant: 'success',
        })
        const newId = data?.id || (typeof data === 'string' ? data : null)
        if (workflowId === 'new' && newId) {
          navigate({
            params: { workflowId: String(newId) },
            to: '/workflow-builder/$workflowId',
          })
        }
      }
    } catch (error: any) {
      console.error('Save failed:', error)
      showToast({
        message: `Failed to save workflow: ${error.message || error}`,
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isPublished = String(workflowStatus).toLowerCase() === 'published'

  return (
    <header className='flex h-16 items-center justify-between border-b border-gray-3 bg-white px-4'>
      <div className='flex items-center gap-4'>
        <IconButton
          color='gray'
          icon='lucide:chevron-left'
          variant='ghost'
          onClick={() =>
            navigate({
              to:
                getSettingsReturnPath('workflow-configuration') ?? '/workflows',
            })
          }
        />
        <div className='flex flex-col'>
          <div className='flex items-center gap-2'>
            <h1 className='text-15/5 font-semibold text-gray-13'>
              {workflowName}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                workflowStatus === 'draft'
                  ? 'bg-gray-3 text-gray-11'
                  : 'bg-success-subtle text-success-main'
              }`}
            >
              {workflowStatus}
            </span>
          </div>
          <span className='text-xs text-gray-10'>
            {workflowDescription || 'No description'}
          </span>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <IconButton
          color='gray'
          icon='lucide:settings'
          variant='ghost'
          onClick={() => useWorkflowStore.getState().openSettings()}
        />
        <Button
          color='gray'
          disabled={isPublished}
          icon='lucide:play'
          label='Test Run'
          variant='outline'
          onClick={() => useWorkflowStore.getState().startTestRun()}
        />
        <Button
          className='cursor-pointer font-medium'
          disabled={isSaving}
          icon='lucide:save'
          label='Save'
          loading={isSaving}
          onClick={() => handleSave()}
        />
      </div>
    </header>
  )
}

BuilderHeader.displayName = 'BuilderHeader'
export default BuilderHeader

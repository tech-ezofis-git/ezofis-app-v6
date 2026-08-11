import { useNavigate, useParams } from '@tanstack/react-router'
import { useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import showToast from '@/components/base/toast/showToast'
import useWorkflowStore from '../../stores/useWorkflowStore'
import { exportWorkflow } from '../../utils/exportWorkflow'

const BuilderHeader = () => {
  const navigate = useNavigate()
  const { workflowId } = useParams({ strict: false }) as any
  const { getEdges, getNodes } = useReactFlow()
  const { workflowDescription, workflowName, workflowStatus } =
    useWorkflowStore((state) => state)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!workflowId) {
      showToast({
        message: 'No active workflow ID found to save.',
        variant: 'error',
      })
      return
    }

    setIsSaving(true)
    try {
      const exportedJson = exportWorkflow(getNodes(), getEdges())

      const payload = {
        name: workflowName,
        workflowJson: exportedJson,
      }

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
          message: `Failed to save workflow: ${error}`,
          variant: 'error',
        })
      } else {
        showToast({
          message: 'Workflow saved successfully',
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

  return (
    <header className='flex h-16 items-center justify-between border-b border-gray-3 bg-white px-4'>
      <div className='flex items-center gap-4'>
        <IconButton
          color='gray'
          icon='lucide:chevron-left'
          variant='ghost'
          onClick={() => navigate({ to: '/workflows' })}
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
          onClick={useWorkflowStore((state) => state.openSettings)}
        />
        <Button
          color='gray'
          disabled={workflowStatus === 'published'}
          icon='lucide:play'
          label='Test Run'
          variant='outline'
          onClick={useWorkflowStore((state) => state.startTestRun)}
        />
        <Button
          disabled={isSaving}
          icon='lucide:save'
          label='Save'
          loading={isSaving}
          onClick={handleSave}
        />
      </div>
    </header>
  )
}

BuilderHeader.displayName = 'BuilderHeader'
export default BuilderHeader

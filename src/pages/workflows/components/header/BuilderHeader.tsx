import { useNavigate } from '@tanstack/react-router'
import { useReactFlow } from '@xyflow/react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import useWorkflowStore from '../../stores/useWorkflowStore'
import { exportWorkflow } from '../../utils/exportWorkflow'

const BuilderHeader = () => {
  const navigate = useNavigate()
  const { getEdges, getNodes } = useReactFlow()
  const {
    workflowDescription,
    workflowName,
    workflowStatus,
  } = useWorkflowStore((state) => state)

  const handleSave = () => {
    // Save functionality
    const exportedJson = exportWorkflow(getNodes(), getEdges())
    console.log(
      'Exported Workflow JSON:',
      JSON.stringify(exportedJson, null, 2),
    )
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
                  : 'text-success-main bg-success-subtle'
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
          icon='lucide:save'
          label='Save'
          onClick={handleSave}
        />
      </div>
    </header>
  )
}

BuilderHeader.displayName = 'BuilderHeader'
export default BuilderHeader

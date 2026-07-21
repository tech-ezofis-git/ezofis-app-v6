import { useNavigate } from '@tanstack/react-router'
import Table from './components/Table'

const WorkflowsPage = () => {
  const navigate = useNavigate()

  const handleCreate = () => {
    // Note: workflow builder routing uses 'new' as template identifier parameter
    navigate({
      params: { workflowId: 'new' },
      to: '/workflow-builder/$workflowId',
    })
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='bg-gray-50/50 flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
        <Table onCreate={handleCreate} />
      </div>
    </div>
  )
}

WorkflowsPage.displayName = 'WorkflowsPage'
export default WorkflowsPage

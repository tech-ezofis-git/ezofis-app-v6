import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import Header from './components/header/Header'
import Table from './components/Table'

const WorkflowsPage = () => {
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState<string>('All')

  const handleCreate = () => {
    // TODO: Generate a real ID or handle 'new'
    navigate({
      params: { workflowId: 'new' },
      to: '/workflow-builder/$workflowId',
    })
  }

  return (
    <div className='flex h-full flex-col'>
      <Header tabValue={tabValue} onTabChange={setTabValue} onCreate={handleCreate} />
      <div className='bg-gray-50/50 flex-1 overflow-hidden px-6 py-2'>
        <Table tabValue={tabValue} onCreate={handleCreate} />
      </div>
    </div>
  )
}

WorkflowsPage.displayName = 'WorkflowsPage'
export default WorkflowsPage


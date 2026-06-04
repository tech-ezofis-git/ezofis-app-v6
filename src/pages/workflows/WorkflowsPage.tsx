import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Header from './components/header/Header'
import Table from './components/Table'

const WorkflowsPage = () => {
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState<string>('All')

  const handleCreate = () => {
    // Note: workflow builder routing uses 'new' as template identifier parameter
    navigate({
      params: { workflowId: 'new' },
      to: '/workflow-builder/$workflowId',
    })
  }

  return (
    <div className='flex h-full flex-col'>
      <Header
        tabValue={tabValue}
        onCreate={handleCreate}
        onTabChange={setTabValue}
      />
      <div className='bg-gray-50/50 flex-1 overflow-hidden px-6 py-2'>
        <Table tabValue={tabValue} onCreate={handleCreate} />
      </div>
    </div>
  )
}

WorkflowsPage.displayName = 'WorkflowsPage'
export default WorkflowsPage

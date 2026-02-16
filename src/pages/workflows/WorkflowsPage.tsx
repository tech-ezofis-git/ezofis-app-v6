import { useNavigate } from '@tanstack/react-router'
import Header from './components/header/Header'
import Table from './components/Table'

const WorkflowsPage = () => {
  const navigate = useNavigate()

  const handleCreate = () => {
    // TODO: Generate a real ID or handle 'new'
    navigate({ to: '/workflow-builder/$workflowId', params: { workflowId: 'new' } })
  }

  return (
    <>
      <Header onCreate={handleCreate} />
      <Table />
    </>
  )
}

WorkflowsPage.displayName = 'WorkflowsPage'
export default WorkflowsPage

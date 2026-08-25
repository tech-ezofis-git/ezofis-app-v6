import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import AiWorkflowBuilder from './components/AiWorkflowBuilder'
import Table from './components/Table'
import useWorkflowStore from './stores/useWorkflowStore'

const WorkflowsPage = () => {
  const navigate = useNavigate()
  const [showAiBuilder, setShowAiBuilder] = useState(false)

  const handleCreate = () => {
    setShowAiBuilder(true)
  }

  if (showAiBuilder) {
    return (
      <AiWorkflowBuilder
        onBack={() => setShowAiBuilder(false)}
        onManualCreate={() => {
          useWorkflowStore.getState().resetWorkflow()
          void navigate({
            params: { workflowId: 'new' },
            to: '/workflow-builder/$workflowId',
          })
        }}
        onApply={(payload, promptName) => {
          if (payload) {
            const store = useWorkflowStore.getState()
            store.loadLegacyWorkflow(payload)
            store.setWorkflowStatus('draft')
            const name =
              promptName ||
              payload.name ||
              payload.settings?.general?.name
            const description =
              payload.description ||
              payload.settings?.general?.description ||
              ''
            if (name) store.setWorkflowName(name)
            store.setWorkflowDescription(description)
          } else {
            useWorkflowStore.getState().resetWorkflow()
          }
          void navigate({
            params: { workflowId: 'new' },
            to: '/workflow-builder/$workflowId',
          })
        }}
      />
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='bg-gray-50/50 flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
        <Table onCreate={handleCreate} />
      </div>
    </div>
  )
}

WorkflowsPage.displayName = 'WorkflowsPage'
export default WorkflowsPage

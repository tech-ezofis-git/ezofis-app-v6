import { createFileRoute } from '@tanstack/react-router'
import WorkflowChatPage from '@/pages/workflow-chat/WorkflowChatPage'

export const Route = createFileRoute('/_app/workflow-chat')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Workflow Chat Assistant',
  },
})

function RouteComponent() {
  return <WorkflowChatPage />
}

import { createFileRoute } from '@tanstack/react-router'
import WorkflowsPage from '@/pages/workflows/WorkflowsPage'

export const Route = createFileRoute('/_app/workflows')({
  component: RouteComponent,
})

function RouteComponent() {
  return <WorkflowsPage />
}

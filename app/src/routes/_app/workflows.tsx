import { createFileRoute } from '@tanstack/react-router'
import WorkflowsPage from '@/pages/workflows/WorkflowsPage'

export const Route = createFileRoute('/_app/workflows')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Workflows',
  },
})

function RouteComponent() {
  return <WorkflowsPage />
}

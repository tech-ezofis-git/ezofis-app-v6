import { createFileRoute } from '@tanstack/react-router'
import WorkflowBuilder from '@/pages/workflows/components/WorkflowBuilder'

export const Route = createFileRoute('/workflow-builder/$workflowId')({
    component: RouteComponent,
    staticData: {
        pageTitle: 'Workflow Builder',
    },
})

function RouteComponent() {
    return <WorkflowBuilder />
}

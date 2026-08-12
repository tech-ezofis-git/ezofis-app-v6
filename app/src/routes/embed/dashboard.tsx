import { createFileRoute } from '@tanstack/react-router'
import DashboardPage from '@/pages/dashboard/DashboardPage'

export const Route = createFileRoute('/embed/dashboard')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Dashboard',
  },
})

function RouteComponent() {
  return <DashboardPage />
}

import { createFileRoute } from '@tanstack/react-router'
import ReportsPage from '@/pages/reports/ReportsPage'

export const Route = createFileRoute('/_app/reports')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ReportsPage />
}

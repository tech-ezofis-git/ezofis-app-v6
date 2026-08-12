import { createFileRoute } from '@tanstack/react-router'
import ReportsPage from '@/pages/reports/ReportsPage'

export const Route = createFileRoute('/_app/reports')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Reports',
  },
})

function RouteComponent() {
  return <ReportsPage />
}

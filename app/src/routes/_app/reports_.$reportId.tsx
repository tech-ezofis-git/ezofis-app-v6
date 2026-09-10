import { createFileRoute } from '@tanstack/react-router'
import ReportDetailPage from '@/pages/reports/ReportDetailPage'

export const Route = createFileRoute('/_app/reports_/$reportId')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Report Details',
  },
})

function RouteComponent() {
  const { reportId } = Route.useParams()
  return <ReportDetailPage reportId={reportId} />
}

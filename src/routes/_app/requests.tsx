import { createFileRoute } from '@tanstack/react-router'
import RequestsPage from '@/pages/requests/RequestsPage'

export const Route = createFileRoute('/_app/requests')({
  component: RouteComponent,
})

function RouteComponent() {
  return <RequestsPage />
}

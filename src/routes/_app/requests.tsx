import { createFileRoute } from '@tanstack/react-router'
import RequestsPage from '@/pages/requests/RequestsPage'

export const Route = createFileRoute('/_app/requests')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Requests',
  },
})

function RouteComponent() {
  return <RequestsPage />
}

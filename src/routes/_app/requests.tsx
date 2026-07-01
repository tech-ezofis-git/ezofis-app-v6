import { createFileRoute } from '@tanstack/react-router'
import RequestsPage from '@/pages/requests/RequestsPage'
import requestStore from '@/pages/requests/stores/useRequestStore'

export const Route = createFileRoute('/_app/requests')({
  beforeLoad: () => {
    requestStore.getState().closeRequest()
  },
  component: RouteComponent,
  staticData: {
    pageTitle: 'Requests',
  },
})

function RouteComponent() {
  return <RequestsPage />
}

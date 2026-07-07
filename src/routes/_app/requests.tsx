import { createFileRoute } from '@tanstack/react-router'
import RequestsPage from '@/pages/requests/RequestsPage'
import requestStore from '@/pages/requests/stores/useRequestStore'

export const Route = createFileRoute('/_app/requests')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Requests',
  },
  beforeLoad: () => {
    requestStore.getState().closeRequest()
  },
})

function RouteComponent() {
  return <RequestsPage />
}

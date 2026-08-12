import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AdaptiveScreen,
  InvoiceDetailScreen,
  RequestsInboxScreen,
} from '@/pages/mobile'
import RequestsPage from '@/pages/requests/RequestsPage'
import requestStore from '@/pages/requests/stores/useRequestStore'

export const Route = createFileRoute('/embed/requests')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Requests',
  },
  beforeLoad: () => {
    requestStore.getState().closeRequest()
  },
})

function MobileRequestsFlow() {
  const navigate = useNavigate()
  const { closeRequest, isRequestOpen } = requestStore()

  if (isRequestOpen) {
    return <InvoiceDetailScreen onBack={() => closeRequest()} />
  }

  return (
    <RequestsInboxScreen
      onTabBarChange={(id) => {
        if (id === 'folder') {
          void navigate({ to: '/embed/folders' })
        }
      }}
    />
  )
}

function RouteComponent() {
  return (
    <AdaptiveScreen
      mobile={<MobileRequestsFlow />}
      web={<RequestsPage />}
    />
  )
}

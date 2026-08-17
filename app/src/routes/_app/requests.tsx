import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AdaptiveScreen,
  InvoiceDetailScreen,
  RequestsInboxScreen,
} from '@/pages/mobile'
import RequestsPage from '@/pages/requests/RequestsPage'
import requestStore from '@/pages/requests/stores/useRequestStore'

type RequestsDeepLinkSearch = {
  processId?: string
  tab?: string
  transactionId?: string
  workflowId?: string
}

export const Route = createFileRoute('/_app/requests')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Requests',
  },
  beforeLoad: ({ search }) => {
    if (search.workflowId && search.processId) {
      requestStore.getState().setPendingDeepLink({
        processId: search.processId,
        tab: search.tab,
        transactionId: search.transactionId,
        workflowId: search.workflowId,
      })
      return
    }
    const state = requestStore.getState()
    if (!state.pendingDeepLink && !state.selectedItem) {
      state.closeRequest()
    }
  },
  validateSearch: (
    search: Record<string, unknown>,
  ): RequestsDeepLinkSearch => ({
    processId:
      typeof search.processId === 'string' ? search.processId : undefined,
    tab: typeof search.tab === 'string' ? search.tab : undefined,
    transactionId:
      typeof search.transactionId === 'string'
        ? search.transactionId
        : undefined,
    workflowId:
      typeof search.workflowId === 'string' ? search.workflowId : undefined,
  }),
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
          void navigate({ to: '/folders' })
        }
      }}
    />
  )
}

function RouteComponent() {
  return (
    <AdaptiveScreen mobile={<MobileRequestsFlow />} web={<RequestsPage />} />
  )
}

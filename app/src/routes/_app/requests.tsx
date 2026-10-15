import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AdaptiveScreen,
  InvoiceDetailScreen,
  RequestsInboxScreen,
} from '@/pages/mobile'
import RequestsPage from '@/pages/requests/RequestsPage'
import requestStore from '@/pages/requests/stores/useRequestStore'

type RequestsDeepLinkSearch = {
  accountEmail?: string
  connectionId?: string
  email?: string
  error?: string
  message?: string
  processId?: string
  status?: string
  tab?: string
  tenantId?: string
  transactionId?: string
  watchId?: string
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
    accountEmail:
      typeof search.accountEmail === 'string' ? search.accountEmail : undefined,
    connectionId:
      typeof search.connectionId === 'string' ? search.connectionId : undefined,
    email: typeof search.email === 'string' ? search.email : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
    message: typeof search.message === 'string' ? search.message : undefined,
    processId:
      typeof search.processId === 'string' ? search.processId : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
    tab: typeof search.tab === 'string' ? search.tab : undefined,
    tenantId:
      typeof search.tenantId === 'string' ? search.tenantId : undefined,
    transactionId:
      typeof search.transactionId === 'string'
        ? search.transactionId
        : undefined,
    watchId:
      typeof search.watchId === 'string' ? search.watchId : undefined,
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

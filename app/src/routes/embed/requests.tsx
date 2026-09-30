import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  AdaptiveScreen,
  InvoiceDetailScreen,
  RequestsInboxScreen,
} from '@/pages/mobile'
import RequestsPage from '@/pages/requests/RequestsPage'
import requestStore from '@/pages/requests/stores/useRequestStore'
import authUserStore from '@/stores/authUserStore'

export const Route = createFileRoute('/embed/requests')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Requests',
  },
  beforeLoad: () => {
    requestStore.getState().closeRequest()
  },
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : undefined,
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
          void navigate({ to: '/embed/folders', search: (prev: any) => prev })
        }
      }}
    />
  )
}

function RouteComponent() {
  const search = Route.useSearch()

  useEffect(() => {
    const email = search?.email
    if (email) {
      const state = authUserStore.getState()
      if (!state.session || state.session.email !== email) {
        const userName = email.split('@')[0] || 'User'
        state.setSession({
          email,
          firstName: userName,
          id: 'embed-' + email,
          lastName: '',
          role: 'Admin',
        } as any)
        if (!state.identity) {
          state.setIdentity({
            accessToken: 'embed-token-' + email,
          } as any)
        }
      }
    }
  }, [search])

  return (
    <AdaptiveScreen mobile={<MobileRequestsFlow />} web={<RequestsPage />} />
  )
}

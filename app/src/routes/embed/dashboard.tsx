import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import authUserStore from '@/stores/authUserStore'

export const Route = createFileRoute('/embed/dashboard')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Dashboard',
  },
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
})

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

  return <DashboardPage />
}

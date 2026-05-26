// routes/_app/route.ts
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import AppLayout from '@/layouts/app/AppLayout'
import { shouldLockAppNavigation } from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import authUserStore from '@/stores/authUserStore'

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'App Layout',
  },
  beforeLoad: ({ location }) => {
    const { isAuthenticated } = authUserStore.getState()

    if (!isAuthenticated) {
      // adjust path to your actual sign-in route under _auth
      throw redirect({
        replace: true,
        to: '/sign-in',
      })
    }

    if (shouldLockAppNavigation() && location.pathname !== '/') {
      throw redirect({
        replace: true,
        to: '/',
      })
    }
  },
})

function RouteComponent() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

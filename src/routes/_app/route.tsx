// routes/_app/route.ts
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import AppLayout from '@/layouts/app/AppLayout'
import authUserStore from '@/stores/authUserStore'

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'App Layout',
  },
  beforeLoad: () => {
    const { isAuthenticated } = authUserStore.getState()

    if (!isAuthenticated) {
      // adjust path to your actual sign-in route under _auth
      throw redirect({
        replace: true,
        to: '/sign-in',
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

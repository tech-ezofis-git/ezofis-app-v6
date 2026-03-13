// routes/_auth/route.ts
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import AuthLayout from '@/layouts/auth/AuthLayout'
import authUserStore from '@/stores/authUserStore'

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Auth Layout',
  },
  beforeLoad: () => {
    const { isAuthenticated } = authUserStore.getState()

    if (isAuthenticated) {
      // user is already logged in -> don’t let them see sign-in
      throw redirect({
        replace: true,
        to: '/', // or '/_app' or '/_app/dashboard' depending on your home route
      })
    }
  },
})

function RouteComponent() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}

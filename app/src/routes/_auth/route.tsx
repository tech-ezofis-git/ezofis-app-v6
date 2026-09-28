// routes/_auth/route.ts
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import AuthLayout from '@/layouts/auth/AuthLayout'
import authUserStore from '@/stores/authUserStore'

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Auth Layout',
  },
  beforeLoad: ({ search }) => {
    const searchObj = (search || {}) as Record<string, unknown>
    const urlParams =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null

    const shareToken =
      searchObj?.shareToken ||
      searchObj?.sharetoken ||
      urlParams?.get('shareToken') ||
      urlParams?.get('sharetoken')

    const inviteToken =
      searchObj?.inviteToken ||
      searchObj?.invitetoken ||
      urlParams?.get('inviteToken') ||
      urlParams?.get('invitetoken')

    const hasShareOrInviteToken = Boolean(shareToken || inviteToken)

    if (hasShareOrInviteToken) {
      authUserStore.getState().resetAuthState()
    } else {
      const { isAuthenticated } = authUserStore.getState()

      if (isAuthenticated) {
        // user is already logged in -> don’t let them see sign-in
        throw redirect({
          replace: true,
          to: '/', // or '/_app' or '/_app/dashboard' depending on your home route
        })
      }
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

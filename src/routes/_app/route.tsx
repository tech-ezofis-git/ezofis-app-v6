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
    const { isAuthenticated, session } = authUserStore.getState()

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

    const sessionPermissions = session?.permissionKeys

    if (sessionPermissions && sessionPermissions.length > 0) {
      const routeToPermissionKey: Record<string, string> = {
        '/requests': 'requests',
        '/folders': 'folder',
        '/workflows': 'workflow',
        '/forms': 'forms',
        '/settings': 'settings',
        '/': 'dashboard',
      }

      const baseRoute = Object.keys(routeToPermissionKey).find((route) =>
        route === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(route),
      )

      if (baseRoute) {
        const requiredPermissionKey = routeToPermissionKey[baseRoute]
        const permission = sessionPermissions.find(
          (p) => p.key === requiredPermissionKey,
        )

        if (permission && permission.visible === false) {
          const firstVisible = sessionPermissions.find((p) => p.visible)
          const fallbackRoute = firstVisible
            ? Object.keys(routeToPermissionKey).find(
                (k) => routeToPermissionKey[k] === firstVisible.key,
              ) || '/'
            : '/'
          
          if (location.pathname !== fallbackRoute) {
            throw redirect({
              replace: true,
              to: fallbackRoute,
            })
          }
        }
      }
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

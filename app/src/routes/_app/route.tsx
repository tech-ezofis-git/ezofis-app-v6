// routes/_app/route.ts
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import AppLayout from '@/layouts/app/AppLayout'
import { shouldLockAppNavigation } from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import authUserStore from '@/stores/authUserStore'

const normalizePermissionKey = (key: string) => {
  const k = key.toLowerCase().trim()
  if (k === 'requests') return 'request'
  if (k === 'forms') return 'form'
  if (k === 'folders') return 'folder'
  if (k === 'workflows') return 'workflow'
  return k
}

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
        '/': 'dashboard',
        '/folders': 'folder',
        '/forms': 'form',
        '/requests': 'request',
        '/settings': 'settings',
        '/workflow-chat': 'workflow',
        '/workflows': 'workflow',
      }

      const baseRoute = Object.keys(routeToPermissionKey).find((route) =>
        route === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(route),
      )

      if (baseRoute) {
        const requiredPermissionKey = routeToPermissionKey[baseRoute]
        const normalizedTarget = normalizePermissionKey(requiredPermissionKey)

        const permission = sessionPermissions.find(
          (p) => p.key && normalizePermissionKey(p.key) === normalizedTarget,
        )

        if (permission && permission.visible === false) {
          const firstAllowedRoute =
            Object.keys(routeToPermissionKey).find((r) => {
              const k = normalizePermissionKey(routeToPermissionKey[r])
              const p = sessionPermissions.find(
                (item) => item.key && normalizePermissionKey(item.key) === k,
              )
              return !p || p.visible !== false
            }) || '/'

          if (location.pathname !== firstAllowedRoute) {
            throw redirect({
              replace: true,
              to: firstAllowedRoute,
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

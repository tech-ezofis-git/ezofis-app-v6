// routes/_app/route.ts
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import AppLayout from '@/layouts/app/AppLayout'
import { resolveSignInPath } from '@/lib/branding/session'
import { shouldLockAppNavigation } from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { shouldLockToShareResource } from '@/pages/sign-in/utils/shareGuestLock'
import authUserStore from '@/stores/authUserStore'
import { isPermissionVisible } from '@/utils/sessionPermissions'

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'App Layout',
  },
  beforeLoad: ({ location }) => {
    const { isAuthenticated, session } = authUserStore.getState()

    if (!isAuthenticated) {
      const signInPath = resolveSignInPath()
      if (signInPath !== '/sign-in' && signInPath.startsWith('/')) {
        throw redirect({
          params: { encryptedName: signInPath.replace(/^\//, '') },
          replace: true,
          to: '/$encryptedName',
        })
      }
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

    const shareLock = shouldLockToShareResource()
    if (
      shareLock.locked &&
      shareLock.allowedPath &&
      location.pathname !== shareLock.allowedPath
    ) {
      throw redirect({
        replace: true,
        to: shareLock.allowedPath,
      })
    }

    const sessionPermissions = session?.permissionKeys

    if (sessionPermissions && sessionPermissions.length > 0) {
      const routeToPermissionKey: Record<string, string> = {
        '/': 'dashboard',
        '/folders': 'folder',
        '/forms': 'form',
        '/reports': 'report',
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

        if (!isPermissionVisible(requiredPermissionKey, sessionPermissions)) {
          const firstAllowedRoute =
            Object.keys(routeToPermissionKey).find((r) =>
              isPermissionVisible(routeToPermissionKey[r], sessionPermissions),
            ) || '/'

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

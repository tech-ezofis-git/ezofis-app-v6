import type { NavigateOptions } from '@tanstack/react-router'
import apiRouter from '@/api/apiRouter'
import { markUserSessionFetchedForRedirect } from '@/api/v6/auth'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import authUserStore from '@/stores/authUserStore'

type RedirectAfterLoginOptions = {
  shareTenantId?: string | null
  /** SPA navigate — avoids full reload blank screen after sign-in */
  navigate: (opts: NavigateOptions) => Promise<void> | void
  /** Optional return path (e.g. sign-request invite URL) */
  redirectTo?: string | null
}

const safeInternalRedirect = (value?: string | null): string | null => {
  const raw = String(value || '').trim()
  if (!raw) return null
  // Only allow same-app relative paths (block open redirects)
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

/**
 * Load session once, then SPA-navigate to the destination.
 * Keeps the app mounted (no white flash from location.replace).
 */
export const redirectAfterLogin = async ({
  shareTenantId,
  navigate,
  redirectTo,
}: RedirectAfterLoginOptions) => {
  const explicitRedirect = safeInternalRedirect(redirectTo)
  let destination: NavigateOptions['to'] = explicitRedirect || '/requests'

  try {
    const res = await apiRouter.userSession()
    const configuration =
      res?.data?.configuration ??
      authUserStore.getState().session?.configuration

    const shareCtx = authUserStore.getState().shareContext
    if (explicitRedirect) {
      destination = explicitRedirect
    } else if (shareTenantId || shareCtx) {
      if (shareCtx) {
        const currentSession = authUserStore.getState().session
        if (currentSession) {
          authUserStore.getState().setSession({
            ...currentSession,
            tenantId: shareCtx.sourceTenantId,
          })
        }
      }
      destination = shareCtx?.workflowInstanceId ? '/requests' : '/folders'
    } else if (
      String(configuration) === '0' ||
      !useSetupStore.getState().isApSetUpCompleted
    ) {
      destination = '/'
    }
  } catch (err) {
    console.error('Failed to load session details:', err)
    if (explicitRedirect) {
      destination = explicitRedirect
    } else {
      const shareCtx = authUserStore.getState().shareContext
      destination = shareTenantId || shareCtx ? '/folders' : '/'
    }
  }

  // Session already loaded — skip duplicate /userSession in AppLayout
  markUserSessionFetchedForRedirect()

  if (typeof destination === 'string' && destination.includes('?')) {
    const [pathname, query = ''] = destination.split('?')
    const search = Object.fromEntries(new URLSearchParams(query).entries())
    await navigate({ replace: true, to: pathname, search })
    return
  }

  await navigate({ replace: true, to: destination })
}

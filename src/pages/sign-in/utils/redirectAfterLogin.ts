import type { NavigateOptions } from '@tanstack/react-router'
import apiRouter from '@/api/apiRouter'
import { markUserSessionFetchedForRedirect } from '@/api/v6/auth'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import authUserStore from '@/stores/authUserStore'

type RedirectAfterLoginOptions = {
  shareTenantId?: string | null
  /** SPA navigate — avoids full reload blank screen after sign-in */
  navigate: (opts: NavigateOptions) => Promise<void> | void
}

/**
 * Load session once, then SPA-navigate to the destination.
 * Keeps the app mounted (no white flash from location.replace).
 */
export const redirectAfterLogin = async ({
  shareTenantId,
  navigate,
}: RedirectAfterLoginOptions) => {
  let destination: NavigateOptions['to'] = '/requests'

  try {
    const res = await apiRouter.userSession()
    const configuration =
      res?.data?.configuration ??
      authUserStore.getState().session?.configuration

    const shareCtx = authUserStore.getState().shareContext
    if (shareTenantId || shareCtx) {
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
    const shareCtx = authUserStore.getState().shareContext
    destination = shareTenantId || shareCtx ? '/folders' : '/'
  }

  // Session already loaded — skip duplicate /userSession in AppLayout
  markUserSessionFetchedForRedirect()
  await navigate({ replace: true, to: destination })
}

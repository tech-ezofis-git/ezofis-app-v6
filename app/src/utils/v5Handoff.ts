import type { V5Identity } from '@/api/v5Auth'
import { setToLocalStorage } from './local-storage'

/**
 * Computes the V5 Application Base URL for Reverse Proxy Subpath (/v5)
 */
export const getV5BaseUrl = (): string => {
  if (import.meta.env.VITE_V5_APP_URL) {
    return import.meta.env.VITE_V5_APP_URL
  }

  const origin = globalThis.location?.origin || ''

  // Option 1 Subpath Reverse Proxy: cloud.ezofis.com/v5 or localhost:3000/v5
  return `${origin}/v5`
}

/**
 * Determines the target hash route in V5 Vue router based on session permissions
 */
export const determineV5LandingHash = (session: any): string => {
  if (session?.workspaceEnabled) {
    return '#/workspaces/repositories'
  }
  if (
    session?.hasWorkflowPermissions ||
    (Array.isArray(session?.userPermissions) &&
      session.userPermissions.includes('Workflows'))
  ) {
    return '#/workflows/browse'
  }
  return '#/repositories/browse'
}

export interface V5HandoffOptions {
  identity: V5Identity
  redirectPath?: string | null
  session?: any
}

export const performV5Handoff = ({
  identity,
  redirectPath,
  session,
}: V5HandoffOptions): void => {
  try {
    // 1. Store raw Base64 identity string in localStorage for V5 Vue router guard
    const rawIdentity = (identity as any)?.rawTokenData
    if (rawIdentity && typeof rawIdentity === 'string') {
      window.localStorage.setItem('identity', rawIdentity)
    } else {
      setToLocalStorage(identity, 'identity')
    }

    if (session) {
      setToLocalStorage(session, 'session')
    }

    // 2. Set version cookie for reverse proxy routing
    document.cookie = 'ezofis_app_version=v5; path=/; max-age=2592000; SameSite=Lax'

    // 3. Subpath Navigation with token parameter: cloud.ezofis.com/v5/#/repositories/browse?token=...
    const baseUrl = getV5BaseUrl()
    const landingHash = redirectPath || determineV5LandingHash(session)
    const tokenQuery = rawIdentity ? `?token=${encodeURIComponent(rawIdentity)}` : ''
    const targetUrl = `${baseUrl}/${landingHash}${tokenQuery}`

    console.log('Option 1 Subpath Navigation:', targetUrl)

    // 4. Perform top-level window redirection
    globalThis.location.href = targetUrl
  } catch (err) {
    console.error('Failed to execute V5 handoff:', err)
  }
}

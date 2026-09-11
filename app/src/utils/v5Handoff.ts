import type { V5Identity } from '@/api/v5Auth'
import { setToLocalStorage } from './local-storage'

/**
 * Computes the V5 Application Base URL depending on environment
 */
export const getV5BaseUrl = (): string => {
  if (import.meta.env.VITE_V5_APP_URL) {
    return import.meta.env.VITE_V5_APP_URL
  }

  const origin = globalThis.location?.origin || ''
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1')

  // When running locally, default to live V5 app URL or configurable port
  if (isLocal) {
    return 'https://app.ezofis.com'
  }

  // In production (cloud.ezofis.com / app.ezofis.com under reverse proxy):
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

/**
 * Persists V5 identity & session state to localStorage and performs redirect/handoff
 */
export const performV5Handoff = ({
  identity,
  redirectPath,
  session,
}: V5HandoffOptions): void => {
  try {
    // 1. Store identity and session in localStorage for V5 Vue router guard
    setToLocalStorage(identity, 'identity')
    if (session) {
      setToLocalStorage(session, 'session')
    }

    // 2. Set version cookie for reverse proxy routing
    document.cookie = 'ezofis_app_version=v5; path=/; max-age=2592000; SameSite=Lax'

    // 3. Determine target URL
    const baseUrl = getV5BaseUrl()
    const landingHash = redirectPath || determineV5LandingHash(session)
    const targetUrl = `${baseUrl}/${landingHash}`

    console.log('Redirecting to V5 application:', targetUrl)

    // 4. Redirect window
    globalThis.location.href = targetUrl
  } catch (err) {
    console.error('Failed to execute V5 handoff:', err)
  }
}

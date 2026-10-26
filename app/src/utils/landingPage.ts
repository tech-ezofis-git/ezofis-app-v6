import type { SessionPermission } from '@/stores/authUserStore'
import { isPermissionVisible } from '@/utils/sessionPermissions'

const LANDING_APPLIED_KEY = 'landingPageApplied'

// Where a user lands after signing in: the Workflows menu when they can see it,
// otherwise the Folders menu. Returns null when neither is available so the
// usual home page applies.
export const getDefaultLandingPath = (
  sessionPermissions?: Array<SessionPermission | string> | null,
  role?: string | null,
): '/folders' | '/requests' | null => {
  if (isPermissionVisible('workflow-inbox', sessionPermissions, role)) {
    return '/requests'
  }
  if (isPermissionVisible('folder', sessionPermissions, role)) {
    return '/folders'
  }
  return null
}

// The landing redirect runs once per sign-in so the Dashboard menu item (also
// "/") keeps working afterwards.
export const hasAppliedLanding = () => {
  try {
    return sessionStorage.getItem(LANDING_APPLIED_KEY) === '1'
  } catch {
    return true
  }
}

export const markLandingApplied = () => {
  try {
    sessionStorage.setItem(LANDING_APPLIED_KEY, '1')
  } catch {
    // Storage unavailable: the landing redirect simply won't repeat.
  }
}

export const resetLandingApplied = () => {
  try {
    sessionStorage.removeItem(LANDING_APPLIED_KEY)
  } catch {
    // Nothing to reset.
  }
}

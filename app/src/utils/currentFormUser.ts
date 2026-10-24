import usePortalSessionStore, {
  getPortalIdFromPathname,
  type PortalAuthUser,
} from '@/pages/portal/stores/usePortalSessionStore'
import authUserStore from '@/stores/authUserStore'

// The signed-in user that form defaults ("user email", "user name", table
// user columns, "You" on comments) refer to.
export type CurrentFormUser = {
  email: string
  firstName: string
  id: string
  lastName: string
  name: string
  tenantId: string
}

const fromPortalUser = (user: PortalAuthUser): CurrentFormUser => {
  const name = String(user.displayName || '').trim()
  const [firstName = '', ...rest] = name.split(/\s+/).filter(Boolean)
  return {
    email: String(user.username || '').trim(),
    firstName,
    id: String(user.userId || ''),
    lastName: rest.join(' '),
    name,
    tenantId: String(user.tenantId || ''),
  }
}

const getActivePortalUser = (
  sessions: Record<string, PortalAuthUser>,
): PortalAuthUser | undefined => {
  if (typeof window === 'undefined') return undefined
  const portalId = getPortalIdFromPathname(window.location.pathname)
  return portalId ? sessions[portalId] : undefined
}

// On a portal page this is the portal's own login (kept per browser tab), not
// the app session: that one lives in localStorage and is shared by every tab,
// so it may belong to someone else signed in to the app in another tab.
export const getCurrentFormUser = (): CurrentFormUser => {
  const portalUser = getActivePortalUser(
    usePortalSessionStore.getState().sessions,
  )
  if (portalUser) return fromPortalUser(portalUser)
  const { identity, session } = authUserStore.getState()
  return {
    email: String(session?.email || ''),
    firstName: String(session?.firstName || ''),
    id: session?.id ? String(session.id) : '',
    lastName: String(session?.lastName || ''),
    name: String(session?.name || ''),
    tenantId: String(session?.tenantId || identity?.tenantId || ''),
  }
}

// Same as getCurrentFormUser, re-rendering when either login changes
export const useCurrentFormUser = (): CurrentFormUser => {
  usePortalSessionStore((state) => getActivePortalUser(state.sessions))
  authUserStore((state) => state.session)
  return getCurrentFormUser()
}

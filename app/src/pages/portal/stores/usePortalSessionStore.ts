import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type PortalAuthUser = {
  accessToken?: string
  displayName: string
  entry?: Record<string, unknown>
  itemId?: number
  tenantId?: string
  userId?: string
  username: string
}

type PortalSessionState = {
  sessions: Record<string, PortalAuthUser>
  clearSession: (portalId: string) => void
  setSession: (portalId: string, user: PortalAuthUser) => void
}

const usePortalSessionStore = create<PortalSessionState>()(
  persist(
    (set) => ({
      sessions: {},
      clearSession: (portalId) =>
        set((state) => {
          const next = { ...state.sessions }
          delete next[portalId]
          return { sessions: next }
        }),
      setSession: (portalId, user) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [portalId]: user,
          },
        })),
    }),
    {
      name: 'ezofis_portal_sessions',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

const PUBLIC_PORTAL_ID_RE = /^\/portals\/([^/?#]+)/

export const getPortalIdFromPathname = (pathname: string) => {
  const match = pathname.match(PUBLIC_PORTAL_ID_RE)
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

export const getActivePortalAccessToken = () => {
  if (typeof window === 'undefined') return undefined
  const portalId = getPortalIdFromPathname(window.location.pathname)
  if (!portalId) return undefined
  const token = usePortalSessionStore.getState().sessions[portalId]?.accessToken
  return String(token || '').trim() || undefined
}

export default usePortalSessionStore

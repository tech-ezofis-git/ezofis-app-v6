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
  clearSession: (portalId: string) => void
  sessions: Record<string, PortalAuthUser>
  setSession: (portalId: string, user: PortalAuthUser) => void
}

const usePortalSessionStore = create<PortalSessionState>()(
  persist(
    (set) => ({
      clearSession: (portalId) =>
        set((state) => {
          const next = { ...state.sessions }
          delete next[portalId]
          return { sessions: next }
        }),
      sessions: {},
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

export const getActivePortalAccessToken = () => {
  if (typeof window === 'undefined') return undefined
  const match = window.location.pathname.match(/^\/portal\/([^/?#]+)/)
  if (!match?.[1]) return undefined
  const token = usePortalSessionStore.getState().sessions[
    decodeURIComponent(match[1])
  ]?.accessToken
  return String(token || '').trim() || undefined
}

export default usePortalSessionStore

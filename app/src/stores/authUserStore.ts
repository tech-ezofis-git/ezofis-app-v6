import posthog from 'posthog-js'
// src/stores/authUserStore.ts
import { create } from 'zustand'
import type { User } from '@/schemas/user'
import { resetUserSessionFetchGate } from '@/api/v6/auth'
import { clearClassicRuntimeCookie, isV6Identity } from '@/lib/classic-gateway'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { getFromLocalStorage, setToLocalStorage } from '@/utils/local-storage'

export type DefaultView = Record<string, unknown>
export type Identity = {
  // V6 fields
  accessToken?: string
  expiresIn?: number
  iv?: string
  key?: string
  /** Persisted from login X-Tenant-Id when session payload omits it */
  tenantId?: string
  token?: string
  tokenType?: string
}
export type Session = {
  configuration?: number | string
  email: string
  firstName: string
  id: string
  lastName?: string
  name?: string
  permissionKeys?: SessionPermission[] | null
  role?: string
  tenantId: string
}
export type SessionPermission = {
  [key: string]: unknown
  id?: number | string
  key?: string
  menu?: string
  name?: string
  visible?: boolean
}
export type ShareContext = {
  action?: number
  permission?: string
  shareToken: string
  sourceItemId: string
  sourceRepositoryId: string
  sourceTenantId: string
  workflowInstanceId?: string
}
export type SignUpUserData = {
  email: string
  firstName: string
  lastName: string
  licenseType: string
  loginType: string | number
  organisation: string
  password: string
}

type Store = {
  defaultView: DefaultView

  identity: Identity | null
  isAuthenticated: boolean
  preferenceId: number
  profileMenus: unknown[]
  session: Session | null
  shareContext: ShareContext | null
  signUpUserData: SignUpUserData
  user: User
  resetAuthState: () => void
  resetSignUpUserData: () => void
  setDefaultView: (view: DefaultView) => void
  setIdentity: (identity: Identity | null) => void
  setPreferenceId: (id: number) => void
  setProfileMenu: (menus: unknown[]) => void
  setSession: (session: Session | null) => void
  setShareContext: (context: ShareContext | null) => void
  setSignUpUserData: (partial: Partial<SignUpUserData>) => void
  setUser: (user: User) => void
}
const emptySignUp: SignUpUserData = {
  email: '',
  firstName: '',
  lastName: '',
  licenseType: '3', // keep string to match your type
  loginType: '',
  organisation: '',
  password: '',
}
const authUserStore = create<Store>()((set) => {
  // Hydrate from localStorage on first load
  let identity: Identity | null = null
  let session: Session | null = null

  if (globalThis.window !== undefined) {
    const storedIdentity = (getFromLocalStorage('identity') as Identity) ?? null
    // Classic (V5) identity shares the same key; do not treat it as a V6 session.
    identity = isV6Identity(storedIdentity) ? storedIdentity : null
    session = identity
      ? ((getFromLocalStorage('session') as Session) ?? null)
      : null
  }

  return {
    defaultView: {},

    identity,
    isAuthenticated: isV6Identity(identity),
    preferenceId: 0,
    profileMenus: [],
    session,
    shareContext: (() => {
      if (globalThis.window === undefined) return null
      try {
        const raw = sessionStorage.getItem('ezofis.repositoryShareContext')
        if (!raw) return null
        return JSON.parse(raw) as ShareContext
      } catch {
        return null
      }
    })(),
    signUpUserData: emptySignUp,

    user: {
      createdAt: '',
      createdBy: '',
      email: 'charles@ezofis.com',
      id: 1,
      name: 'Charles Vinoth',
      profile: {
        avatarUrl: '',
        department: '',
        jobTitle: '',
        phoneNumber: '+91-9876543210',
        twoStepVerification: {
          enabled: true,
          method: 'email',
        },
      },
      role: 'Admin',
      signUpMethod: 'email',
      updatedAt: '',
      updatedBy: '',
      onBoardingCompleted: true,
    },

    resetAuthState: () => {
      // Clear auth in memory first so route guards immediately treat the user as logged out
      set(() => ({
        defaultView: {},
        identity: null,
        isAuthenticated: false,
        preferenceId: 0,
        profileMenus: [],
        session: null,
        shareContext: null,
        signUpUserData: emptySignUp,
      }))

      resetUserSessionFetchGate()

      if (globalThis.window !== undefined) {
        clearClassicRuntimeCookie()
        globalThis.localStorage.removeItem('identity')
        globalThis.localStorage.removeItem('session')
        globalThis.localStorage.removeItem('isApSetUpCompleted')
        globalThis.localStorage.removeItem('restrictNavigationUntilApSetup')
        try {
          sessionStorage.removeItem('ezofis.repositoryShareContext')
          sessionStorage.removeItem('shareToken')
          sessionStorage.removeItem('tenantId')
          sessionStorage.removeItem('repositoryId')
          sessionStorage.removeItem('itemId')
          sessionStorage.removeItem('shareAction')
          sessionStorage.removeItem('sharePermission')
        } catch {
          // ignore
        }
      }

      // Reset setup after auth is cleared (avoids AP-setup flash / redirect loops)
      try {
        useSetupStore.getState().resetSetupState()
      } catch (err) {
        console.error('Failed to reset setup store state:', err)
      }
    },

    resetSignUpUserData: () =>
      set(() => ({
        signUpUserData: emptySignUp,
      })),
    setDefaultView: (view) => set(() => ({ defaultView: view })),
    setIdentity: (identity) =>
      set(() => ({
        identity,
        isAuthenticated: isV6Identity(identity),
      })),
    setPreferenceId: (id) => set(() => ({ preferenceId: id })),
    setProfileMenu: (menus) => set(() => ({ profileMenus: menus })),

    setSession: (session) => {
      const nextSession = session
        ? {
            ...session,
            permissionKeys: Array.isArray(session.permissionKeys)
              ? session.permissionKeys
              : null,
          }
        : null

      if (nextSession?.id) {
        posthog.identify(nextSession.id, {
          email: nextSession.email,
          name: nextSession.firstName,
          tenantId: nextSession.tenantId,
        })
      }
      if (nextSession && 'configuration' in nextSession) {
        const isCompleted = String(nextSession.configuration) !== '0'
        const setupStoreState = useSetupStore.getState()
        setupStoreState.setisApSetUpCompleted(isCompleted)
        setupStoreState.setRestrictNavigationUntilApSetup(!isCompleted)
      }

      if (globalThis.window !== undefined && nextSession) {
        setToLocalStorage(nextSession, 'session')
      }

      set(() => ({ session: nextSession }))
    },

    setShareContext: (context) => {
      if (globalThis.window !== undefined) {
        try {
          if (!context) {
            sessionStorage.removeItem('ezofis.repositoryShareContext')
            sessionStorage.removeItem('shareToken')
            sessionStorage.removeItem('tenantId')
            sessionStorage.removeItem('repositoryId')
            sessionStorage.removeItem('itemId')
            sessionStorage.removeItem('shareAction')
            sessionStorage.removeItem('sharePermission')
          } else {
            sessionStorage.setItem(
              'ezofis.repositoryShareContext',
              JSON.stringify(context),
            )
            sessionStorage.setItem('shareToken', context.shareToken)
            sessionStorage.setItem('tenantId', context.sourceTenantId)
            sessionStorage.setItem('repositoryId', context.sourceRepositoryId)
            sessionStorage.setItem('itemId', context.sourceItemId)
            if (context.action != null) {
              sessionStorage.setItem('shareAction', String(context.action))
            }
            if (context.permission) {
              sessionStorage.setItem('sharePermission', context.permission)
            }
          }
        } catch {
          // ignore storage failures
        }
      }
      set(() => ({ shareContext: context }))
    },

    setSignUpUserData: (partial) =>
      set((state) => ({
        signUpUserData: {
          ...state.signUpUserData,
          ...partial,
        },
      })),

    setUser: (user: User) => set(() => ({ user })),
  }
})

export default authUserStore

import posthog from 'posthog-js'
// src/stores/authUserStore.ts
import { create } from 'zustand'
import type { User } from '@/schemas/user'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { getFromLocalStorage, setToLocalStorage } from '@/utils/local-storage'

export type DefaultView = Record<string, unknown>
export type Identity = {
  // V6 fields
  accessToken?: string
  expiresIn?: number
  iv?: string
  key?: string
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
    identity = (getFromLocalStorage('identity') as Identity) ?? null
    session = (getFromLocalStorage('session') as Session) ?? null
  }

  return {
    defaultView: {},

    identity,
    isAuthenticated: !!identity,
    preferenceId: 0,
    profileMenus: [],
    session,
    shareContext: null,
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
      // Clear localStorage
      if (globalThis.window !== undefined) {
        globalThis.localStorage.removeItem('identity')
        globalThis.localStorage.removeItem('session')
        globalThis.localStorage.removeItem('isApSetUpCompleted')
        globalThis.localStorage.removeItem('restrictNavigationUntilApSetup')
      }

      // Reset setup store state
      try {
        useSetupStore.getState().setisApSetUpCompleted(false)
        useSetupStore.getState().setRestrictNavigationUntilApSetup(false)
        useSetupStore.getState().setIsSetupStarted(true)
        useSetupStore.getState().setStep(0)
      } catch (err) {
        console.error('Failed to reset setup store state:', err)
      }

      // Clear in-memory state
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
    },

    resetSignUpUserData: () =>
      set(() => ({
        signUpUserData: emptySignUp,
      })),
    setDefaultView: (view) => set(() => ({ defaultView: view })),
    setIdentity: (identity) =>
      set(() => ({
        identity,
        isAuthenticated: !!identity,
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

    setShareContext: (context) => set(() => ({ shareContext: context })),

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

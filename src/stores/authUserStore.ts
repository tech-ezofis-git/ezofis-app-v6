import posthog from 'posthog-js'
// src/stores/authUserStore.ts
import { create } from 'zustand'
import type { User } from '@/schemas/user'
import { getFromLocalStorage } from '@/utils/local-storage'

export type DefaultView = Record<string, unknown>
export type Identity = {
  iv?: string
  key?: string
  token?: string
  // V6 fields
  accessToken?: string
  tokenType?: string
  expiresIn?: number
}
export type ProfileMenu = unknown
export type Session = {
  email: string
  firstName: string
  id: string
  tenantId: string
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
  profileMenus: ProfileMenu[]
  session: Session | null
  signUpUserData: SignUpUserData
  user: User
  resetAuthState: () => void
  resetSignUpUserData: () => void
  setDefaultView: (view: DefaultView) => void
  setIdentity: (identity: Identity | null) => void
  setPreferenceId: (id: number) => void
  setProfileMenu: (menus: ProfileMenu[]) => void
  setSession: (session: Session | null) => void
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

  if (typeof window !== 'undefined') {
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
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('identity')
        window.localStorage.removeItem('session')
      }

      // Clear in-memory state
      set(() => ({
        defaultView: {},
        identity: null,
        isAuthenticated: false,
        preferenceId: 0,
        profileMenus: [],
        session: null,
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
      if (session?.id) {
        posthog.identify(session.id, {
          email: session.email,
          name: session.firstName,
          tenantId: session.tenantId,
        })
      }
      set(() => ({ session }))
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

// src/stores/authUserStore.ts
import { create } from 'zustand'
import type { User } from '@/schemas/user'
import { getFromLocalStorage } from '@/utils/local-storage'

export type Identity = {
  token: string
  iv: string
  key: string
}
export type Session = {
  firstName: string
  email: string
  tenantId: string
  id: string
}
export type ProfileMenu = unknown
export type DefaultView = Record<string, unknown>

type Store = {
  user: User

  identity: Identity | null
  session: Session | null
  profileMenus: ProfileMenu[]
  defaultView: DefaultView
  preferenceId: number
  isAuthenticated: boolean

  setUser: (user: User) => void
  setIdentity: (identity: Identity | null) => void
  setSession: (session: Session | null) => void
  setProfileMenu: (menus: ProfileMenu[]) => void
  setDefaultView: (view: DefaultView) => void
  setPreferenceId: (id: number) => void
  resetAuthState: () => void
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

    identity,
    session,
    profileMenus: [],
    defaultView: {},
    preferenceId: 0,
    isAuthenticated: !!identity,

    setUser: (user: User) => set(() => ({ user })),

    setIdentity: (identity) =>
      set(() => ({
        identity,
        isAuthenticated: !!identity,
      })),

    setSession: (session) => set(() => ({ session })),
    setProfileMenu: (menus) => set(() => ({ profileMenus: menus })),
    setDefaultView: (view) => set(() => ({ defaultView: view })),
    setPreferenceId: (id) => set(() => ({ preferenceId: id })),

    resetAuthState: () =>
      set(() => ({
        identity: null,
        session: null,
        profileMenus: [],
        defaultView: {},
        preferenceId: 0,
        isAuthenticated: false,
      })),
  }
})

export default authUserStore

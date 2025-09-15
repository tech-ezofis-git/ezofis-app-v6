import { create } from 'zustand'
import type { User } from '@/schemas/user'

type Store = {
  user: User
  setUser: (user: User) => void
}

const authUserStore = create<Store>()((set) => ({
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
  setUser: (user: User) => set(() => ({ user })),
}))

export default authUserStore

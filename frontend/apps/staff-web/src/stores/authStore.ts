import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: number
  username: string
  roles: string[]
}

function getPrimaryRole(roles: string[]): User['roles'][number] {
  const priority = ['manager', 'admin', 'assistant_manager', 'kitchen', 'waiter', 'delivery', 'other']
  for (const r of priority) {
    if (roles.includes(r)) return r
  }
  return roles[0] || 'other'
}

interface AuthState {
  token: string | null
  user: User | null
  primaryRole: User['roles'][number] | null
  setAuth: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      primaryRole: null,
      setAuth: (token, user) => set({ token, user, primaryRole: getPrimaryRole(user.roles) }),
      logout: () => set({ token: null, user: null, primaryRole: null }),
    }),
    {
      name: 'tableready_auth',
    }
  )
)

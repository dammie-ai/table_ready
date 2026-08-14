import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
  switchRole: (role: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      primaryRole: null,
      setAuth: (token, user) => set({ token, user, primaryRole: getPrimaryRole(user.roles) }),
      switchRole: (role) => {
        const { user } = get()
        if (user && user.roles.includes(role)) {
          set({ primaryRole: role })
        }
      },
      logout: () => set({ token: null, user: null, primaryRole: null }),
    }),
    {
      name: 'tableready_auth',
      // localStorage is shared across every tab on the same origin -- with
      // several staff-web tabs open at once for different roles (exactly
      // how tonight's demo runs: one tab each for waiter/kitchen/manager/
      // delivery), logging into a new role in one tab silently overwrote
      // the token every OTHER open tab's next request would use, since
      // api.ts/socket.ts read the token fresh from storage on every call
      // rather than from this store's in-memory state. sessionStorage is
      // tab-scoped, so each tab now keeps its own independent login.
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)

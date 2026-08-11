import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getStorageItem, setStorageItem, deleteStorageItem } from './storage'
import type { User } from './api'

interface AuthState {
  token: string | null
  user: User | null
  // Reading persisted secure storage is async — on first render after app
  // launch, token/user are still null even for an already-logged-in
  // returning user, purely because rehydration hasn't finished yet. A
  // navigator deciding "show Login" based on token alone before this
  // flips true would flash the login screen at every returning user.
  hasHydrated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'tableready_auth',
      storage: createJSONStorage(() => ({
        getItem: getStorageItem,
        setItem: setStorageItem,
        removeItem: deleteStorageItem,
      })),
      // hasHydrated itself is deliberately excluded from what gets
      // persisted (via partialize) — it must always start false on a
      // fresh app launch regardless of what was saved last session.
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

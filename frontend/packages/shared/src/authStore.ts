import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getStorageItem, setStorageItem, deleteStorageItem } from './storage'

interface User {
  id: number
  username: string
  role: string
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'tableready_auth',
      storage: createJSONStorage(() => ({
        getItem: getStorageItem,
        setItem: setStorageItem,
        removeItem: deleteStorageItem,
      })),
    }
  )
)

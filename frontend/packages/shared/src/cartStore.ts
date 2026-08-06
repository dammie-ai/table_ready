import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from './types'
import { getStorageItem, setStorageItem, deleteStorageItem } from './storage'

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (menu_item_id: number) => void
  updateQuantity: (menu_item_id: number, quantity: number) => void
  updateInstructions: (menu_item_id: number, instructions: string) => void
  addCombo: (combo: Omit<CartItem, 'quantity'>) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => set((state) => {
        const existing = state.items.find(i => i.menu_item_id === item.menu_item_id && !i.combo_id)
        if (existing) {
          return {
            items: state.items.map(i =>
              i.menu_item_id === item.menu_item_id && !i.combo_id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          }
        }
        return { items: [...state.items, { ...item, quantity: 1 }] }
      }),

      addCombo: (combo) => set((state) => ({
        items: [...state.items, { ...combo, quantity: 1 }]
      })),

      removeItem: (menu_item_id) => set((state) => ({
        items: state.items.filter(i => i.menu_item_id !== menu_item_id && (!i.combo_id || i.combo_main?.menu_item_id !== menu_item_id)),
      })),

      updateQuantity: (menu_item_id, quantity) => set((state) => ({
        items: quantity <= 0
          ? state.items.filter(i => i.menu_item_id !== menu_item_id && (!i.combo_id || i.combo_main?.menu_item_id !== menu_item_id))
          : state.items.map(i => {
              if (i.menu_item_id === menu_item_id && !i.combo_id) return { ...i, quantity }
              if (i.combo_id && i.combo_main?.menu_item_id === menu_item_id) return { ...i, quantity }
              return i
            }),
      })),

      updateInstructions: (menu_item_id, instructions) => set((state) => ({
        items: state.items.map(i =>
          i.menu_item_id === menu_item_id ? { ...i, custom_instructions: instructions } : i
        ),
      })),

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.base_price * i.quantity, 0),
    }),
    {
      name: 'tableready_cart',
      // No storage option here defaults to the global localStorage, which
      // doesn't exist on native — and by the time any App.tsx-level polyfill
      // for it would run, this module (imported transitively by every
      // screen) has already evaluated and captured the reference. Give it
      // an explicit adapter instead of depending on that timing.
      storage: createJSONStorage(() => ({
        getItem: getStorageItem,
        setItem: setStorageItem,
        removeItem: deleteStorageItem,
      })),
    }
  )
)

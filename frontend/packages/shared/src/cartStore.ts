import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from './types'
import { getStorageItem, setStorageItem, deleteStorageItem } from './storage'

let cartIdCounter = 0
const generateCartId = () => `cart-${Date.now()}-${cartIdCounter++}`

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity' | 'cartId'>) => void
  removeItem: (cartId: string) => void
  updateQuantity: (cartId: string, quantity: number) => void
  updateInstructions: (cartId: string, instructions: string) => void
  addCombo: (combo: Omit<CartItem, 'quantity' | 'cartId'>) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => set((state) => {
        // Combos and customized (modifier-bearing) items are never merged
        // into an existing line — only plain, unmodified menu items stack
        // their quantity.
        const existing = state.items.find(i =>
          i.menu_item_id === item.menu_item_id && !i.combo_id && !item.combo_id &&
          !i.modifiers?.length && !item.modifiers?.length
        )
        if (existing) {
          return {
            items: state.items.map(i =>
              i.cartId === existing.cartId ? { ...i, quantity: i.quantity + 1 } : i
            ),
          }
        }
        return { items: [...state.items, { ...item, cartId: generateCartId(), quantity: 1 }] }
      }),

      addCombo: (combo) => set((state) => ({
        items: [...state.items, { ...combo, cartId: generateCartId(), quantity: 1 }]
      })),

      removeItem: (cartId) => set((state) => ({
        items: state.items.filter(i => i.cartId !== cartId),
      })),

      updateQuantity: (cartId, quantity) => set((state) => ({
        items: quantity <= 0
          ? state.items.filter(i => i.cartId !== cartId)
          : state.items.map(i => i.cartId === cartId ? { ...i, quantity } : i),
      })),

      updateInstructions: (cartId, instructions) => set((state) => ({
        items: state.items.map(i =>
          i.cartId === cartId ? { ...i, custom_instructions: instructions } : i
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
      // v0 carts (persisted before cartId existed) can have items with no
      // cartId, which breaks list keys/updates on rehydrate — drop those
      // instead of restoring a half-broken cart.
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as CartState
        return { ...state, items: (state.items || []).filter((i) => !!i.cartId) }
      },
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@table-ready/shared'

let cartIdCounter = 0
const generateCartId = () => `cart-${Date.now()}-${cartIdCounter++}`

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity' | 'cartId'>) => void
  // menu_item_id-keyed: only ever matches plain (non-combo) lines. Used by
  // the cross-device SharedCart flow, where synced items from other
  // devices only ever carry a menu_item_id — never a local cartId.
  removeItem: (menu_item_id: number) => void
  updateQuantity: (menu_item_id: number, quantity: number) => void
  updateInstructions: (menu_item_id: number, instructions: string) => void
  addCombo: (combo: Omit<CartItem, 'quantity' | 'cartId'>) => void
  // cartId-keyed: addresses any single line (plain or combo) unambiguously.
  // Two combos sharing the same main item would otherwise both match a
  // menu_item_id-based lookup — use these for on-device cart controls.
  removeCartLine: (cartId: string) => void
  updateCartLineQuantity: (cartId: string, quantity: number) => void
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
              i.cartId === existing.cartId ? { ...i, quantity: i.quantity + 1 } : i
            ),
          }
        }
        return { items: [...state.items, { ...item, cartId: generateCartId(), quantity: 1 }] }
      }),

      addCombo: (combo) => set((state) => ({
        items: [...state.items, { ...combo, cartId: generateCartId(), quantity: 1 }]
      })),

      removeItem: (menu_item_id) => set((state) => ({
        items: state.items.filter(i => !(i.menu_item_id === menu_item_id && !i.combo_id)),
      })),

      updateQuantity: (menu_item_id, quantity) => set((state) => ({
        items: quantity <= 0
          ? state.items.filter(i => !(i.menu_item_id === menu_item_id && !i.combo_id))
          : state.items.map(i => (i.menu_item_id === menu_item_id && !i.combo_id) ? { ...i, quantity } : i),
      })),

      updateInstructions: (menu_item_id, instructions) => set((state) => ({
        items: state.items.map(i =>
          i.menu_item_id === menu_item_id && !i.combo_id ? { ...i, custom_instructions: instructions } : i
        ),
      })),

      removeCartLine: (cartId) => set((state) => ({
        items: state.items.filter(i => i.cartId !== cartId),
      })),

      updateCartLineQuantity: (cartId, quantity) => set((state) => ({
        items: quantity <= 0
          ? state.items.filter(i => i.cartId !== cartId)
          : state.items.map(i => i.cartId === cartId ? { ...i, quantity } : i),
      })),

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.base_price * i.quantity, 0),
    }),
    {
      name: 'tableready_cart',
      // v0 carts (persisted before cartId existed) can have items with no
      // cartId, which breaks line identity on rehydrate — drop those
      // instead of restoring a half-broken cart.
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as CartState
        return { ...state, items: (state.items || []).filter((i) => !!i.cartId) }
      },
    }
  )
)

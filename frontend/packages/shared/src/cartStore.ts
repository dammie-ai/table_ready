import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from './types'
import { getStorageItem, setStorageItem, deleteStorageItem } from './storage'
import { broadcastCartUpdate } from './sharedCart'

let cartIdCounter = 0
const generateCartId = () => `cart-${Date.now()}-${cartIdCounter++}`

export interface RemoteCartItem {
  key: string
  menu_item_id?: number
  name: string
  base_price: number
  quantity: number
  combo_id?: number
}

interface CartState {
  items: CartItem[]
  // The active shared-cart room code, or null when ordering solo. Combos
  // are never broadcast (no stable per-instance id to reconcile a remote
  // update/remove against) — only plain, non-combo items sync.
  groupRoom: string | null
  remoteItems: RemoteCartItem[]
  // Set by WelcomeScreen's Pickup/Delivery/Order-From-Home buttons so
  // CheckoutScreen (reached several navigate() hops later, with nothing
  // forwarding route params through Menu/Cart in between) can default to
  // what the customer already chose instead of always starting at Pickup.
  // Not persisted -- a fresh app launch shouldn't resurrect a stale intent.
  orderType: string | null
  setOrderType: (type: string) => void
  addItem: (item: Omit<CartItem, 'quantity' | 'cartId'>) => void
  removeItem: (cartId: string) => void
  updateQuantity: (cartId: string, quantity: number) => void
  updateInstructions: (cartId: string, instructions: string) => void
  addCombo: (combo: Omit<CartItem, 'quantity' | 'cartId'>) => void
  clearCart: () => void
  total: () => number
  setGroupRoom: (room: string) => void
  leaveGroupRoom: () => void
  applyRemoteUpdate: (payload: { type: 'add' | 'remove' | 'update' | 'sync'; item?: any; menu_item_id?: number; quantity?: number }) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      groupRoom: null,
      remoteItems: [],
      orderType: null,
      setOrderType: (type) => set({ orderType: type }),

      addItem: (item) => set((state) => {
        // Combos and customized (modifier-bearing) items are never merged
        // into an existing line — only plain, unmodified menu items stack
        // their quantity.
        const existing = state.items.find(i =>
          i.menu_item_id === item.menu_item_id && !i.combo_id && !item.combo_id &&
          !i.modifiers?.length && !item.modifiers?.length
        )
        if (state.groupRoom && !item.combo_id) {
          broadcastCartUpdate(state.groupRoom, {
            type: 'add',
            item: { menu_item_id: item.menu_item_id, name: item.name, base_price: item.base_price, quantity: 1 },
            timestamp: Date.now(),
          })
        }
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

      removeItem: (cartId) => set((state) => {
        const removed = state.items.find(i => i.cartId === cartId)
        if (state.groupRoom && removed && !removed.combo_id && removed.menu_item_id) {
          broadcastCartUpdate(state.groupRoom, { type: 'remove', menu_item_id: removed.menu_item_id, timestamp: Date.now() })
        }
        return { items: state.items.filter(i => i.cartId !== cartId) }
      }),

      updateQuantity: (cartId, quantity) => set((state) => {
        const target = state.items.find(i => i.cartId === cartId)
        if (state.groupRoom && target && !target.combo_id && target.menu_item_id) {
          broadcastCartUpdate(state.groupRoom, quantity <= 0
            ? { type: 'remove', menu_item_id: target.menu_item_id, timestamp: Date.now() }
            : { type: 'update', menu_item_id: target.menu_item_id, quantity, timestamp: Date.now() })
        }
        return {
          items: quantity <= 0
            ? state.items.filter(i => i.cartId !== cartId)
            : state.items.map(i => i.cartId === cartId ? { ...i, quantity } : i),
        }
      }),

      updateInstructions: (cartId, instructions) => set((state) => ({
        items: state.items.map(i =>
          i.cartId === cartId ? { ...i, custom_instructions: instructions } : i
        ),
      })),

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.base_price * i.quantity, 0),

      setGroupRoom: (room) => set({ groupRoom: room, remoteItems: [] }),

      leaveGroupRoom: () => set({ groupRoom: null, remoteItems: [] }),

      // Folds an incoming broadcast from another device into remoteItems —
      // never touches the local `items` list, so a flaky connection can't
      // corrupt this device's own authoritative cart.
      applyRemoteUpdate: (payload) => set((state) => {
        if (payload.type === 'sync') return { remoteItems: [] }
        if (payload.type === 'add' && payload.item) {
          const key = `item-${payload.item.menu_item_id}`
          const existing = state.remoteItems.find(r => r.key === key)
          if (existing) {
            return {
              remoteItems: state.remoteItems.map(r =>
                r.key === key ? { ...r, quantity: r.quantity + (payload.item.quantity || 1) } : r
              ),
            }
          }
          return {
            remoteItems: [...state.remoteItems, {
              key,
              menu_item_id: payload.item.menu_item_id,
              name: payload.item.name,
              base_price: payload.item.base_price,
              quantity: payload.item.quantity || 1,
            }],
          }
        }
        if (payload.type === 'remove' && payload.menu_item_id) {
          return { remoteItems: state.remoteItems.filter(r => r.menu_item_id !== payload.menu_item_id) }
        }
        if (payload.type === 'update' && payload.menu_item_id && payload.quantity !== undefined) {
          return {
            remoteItems: state.remoteItems.map(r =>
              r.menu_item_id === payload.menu_item_id ? { ...r, quantity: payload.quantity! } : r
            ),
          }
        }
        return {}
      }),
    }),
    {
      name: 'tableready_cart',
      partialize: (state) => ({ items: state.items, groupRoom: state.groupRoom }),
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

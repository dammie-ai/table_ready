import { getSocket } from './socket'

export interface CartUpdatePayload {
  type: 'add' | 'remove' | 'update' | 'sync'
  item?: {
    menu_item_id: number
    name: string
    base_price: number
    quantity: number
    combo_id?: number
    combo_main?: { menu_item_id: number; name: string; base_price: number }
    combo_sides?: { menu_item_id: number; name: string; base_price: number }[]
  }
  menu_item_id?: number
  quantity?: number
  timestamp: number
}

export function broadcastCartUpdate(socket: ReturnType<typeof import('socket.io-client').io>, room: string, payload: CartUpdatePayload) {
  socket.emit('cart_update', { room, ...payload })
}

export function listenForCartUpdates(socket: ReturnType<typeof import('socket.io-client').io>, room: string, handler: (payload: CartUpdatePayload) => void) {
  socket.on(`cart_update:${room}`, handler)
  return () => {
    socket.off(`cart_update:${room}`)
  }
}

export { getSocket }

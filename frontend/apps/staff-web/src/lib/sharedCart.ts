import { getSocket } from '@table-ready/shared'
import type { CartUpdatePayload } from '@table-ready/shared'

export function broadcastCartUpdate(socket: ReturnType<typeof import('socket.io-client').io>, room: string, payload: CartUpdatePayload) {
  socket.emit('cart_update', { room, ...payload })
}

export function listenForCartUpdates(socket: ReturnType<typeof import('socket.io-client').io>, room: string, handler: (payload: CartUpdatePayload) => void) {
  socket.on(`cart_update:${room}`, handler)
  return () => {
    socket.off(`cart_update:${room}`)
  }
}

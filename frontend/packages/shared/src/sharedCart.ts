import { getSocket } from './socket'
import type { CartUpdatePayload } from './types'

export function broadcastCartUpdate(room: string, payload: CartUpdatePayload) {
  const socket = getSocket()
  socket.emit('cart_update', { room, ...payload })
}

export function listenForCartUpdates(room: string, handler: (payload: CartUpdatePayload) => void) {
  const socket = getSocket()
  socket.emit('join_cart_room', room)
  socket.on(`cart_update:${room}`, handler)
  return () => {
    socket.off(`cart_update:${room}`)
    socket.emit('leave_cart_room', room)
  }
}

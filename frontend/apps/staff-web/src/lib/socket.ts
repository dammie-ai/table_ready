import { io, Socket } from 'socket.io-client'
import { API_ORIGIN } from './api'

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tableready_token') : null
    socket = io(API_ORIGIN, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export default { getSocket }

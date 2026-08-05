import { io, Socket } from 'socket.io-client'
import { Platform } from 'react-native'

let socket: Socket | null = null

// Same reasoning as api.ts: a real device can't reach "localhost" on the
// dev machine, it needs the actual LAN address.
const SOCKET_URL = Platform.OS === 'web' ? 'http://localhost:8001' : 'http://172.20.18.66:8001'

export function getSocket() {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tableready_token') : null
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

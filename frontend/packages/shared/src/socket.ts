import { io, Socket } from 'socket.io-client'
import { Platform } from 'react-native'

let socket: Socket | null = null

// Same reasoning as api.ts: only use localhost when actually served from
// localhost, otherwise point at the deployed backend.
const DEPLOYED_SOCKET = 'https://tableready-backend.onrender.com'
const SOCKET_URL = Platform.OS === 'web'
  ? (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8001'
      : DEPLOYED_SOCKET)
  : DEPLOYED_SOCKET

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

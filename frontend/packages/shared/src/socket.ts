import { io, Socket } from 'socket.io-client'
import { Platform } from 'react-native'
import { getStorageItem } from './storage'

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
    // Connect immediately as a guest (the backend accepts unauthenticated
    // sockets), then upgrade to an authenticated connection once the real
    // token — stored async under 'tableready_auth', same as api.ts — has
    // been read. Same bug this fixed in api.ts: reading a bare
    // 'tableready_token' localStorage key that nothing ever wrote to.
    socket = io(SOCKET_URL, {
      auth: { token: null },
      transports: ['websocket', 'polling'],
    })

    const activeSocket = socket
    getStorageItem('tableready_auth')
      .then((stored) => {
        if (!stored) return
        const parsed = JSON.parse(stored)
        const token = parsed.state?.token
        if (token) {
          activeSocket.auth = { token }
          activeSocket.disconnect().connect()
        }
      })
      .catch(() => {})
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

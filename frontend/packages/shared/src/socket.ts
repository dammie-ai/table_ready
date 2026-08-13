import { io, Socket } from 'socket.io-client'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { getStorageItem } from './storage'

let socket: Socket | null = null

// Same reasoning as api.ts: only use localhost when actually served from
// localhost; native dev builds derive the dev machine's current LAN IP
// from Expo's own packager host instead of a hardcoded value, so this
// keeps working no matter which network the dev machine is on.
const DEPLOYED_SOCKET = 'https://tableready-backend.onrender.com'
const devHost = Constants.expoConfig?.hostUri?.split(':')[0]
const SOCKET_URL = Platform.OS === 'web'
  ? (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8001'
      : DEPLOYED_SOCKET)
  : (__DEV__ && devHost ? `http://${devHost}:8001` : DEPLOYED_SOCKET)

export function getSocket() {
  if (!socket) {
    // Connect immediately as a guest (the backend accepts unauthenticated
    // sockets), then upgrade to an authenticated connection once the real
    // token — stored async under 'tableready_auth', same as api.ts — has
    // been read. Same bug this fixed in api.ts: reading a bare
    // 'tableready_token' localStorage key that nothing ever wrote to.
    console.log('[socket] connecting to', SOCKET_URL)
    socket = io(SOCKET_URL, {
      auth: { token: null },
      // Polling first: it's plain HTTP, so it isn't affected by networks
      // (some home routers, or Windows treating a new Wi-Fi network as
      // "Public") that block the WebSocket upgrade specifically while
      // ordinary HTTP requests go through fine. Socket.IO auto-upgrades
      // to a real WebSocket after connecting if the network allows it —
      // this only changes what's tried first, not the steady-state.
      transports: ['polling', 'websocket'],
    })

    socket.on('connect', () => console.log('[socket] connected, id:', socket?.id))
    socket.on('connect_error', (err) => console.log('[socket] connect_error:', err.message))
    socket.on('disconnect', (reason) => console.log('[socket] disconnected:', reason))

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

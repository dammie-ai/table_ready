import { io, Socket } from 'socket.io-client'
import { API_ORIGIN } from './api'

let socket: Socket | null = null
type ConnectionListener = (connected: boolean) => void
const connectionListeners = new Set<ConnectionListener>()

// Mirrors api.ts's getToken() — the real token lives inside the zustand-
// persist envelope under 'tableready_auth', not a bare 'tableready_token'
// key nothing here ever wrote to. Every staff-web socket connection was
// silently connecting as an unauthenticated guest until this matched.
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('tableready_auth')
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored)
    return parsed.state?.token || null
  } catch {
    return null
  }
}

export function getSocket() {
  if (!socket) {
    socket = io(API_ORIGIN, {
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => connectionListeners.forEach((fn) => fn(true)))
    socket.on('disconnect', () => connectionListeners.forEach((fn) => fn(false)))
  }
  return socket
}

// A dropped connection (routine on a kitchen tablet's wifi) means any
// events missed during the gap are gone for good — no per-event replay
// exists, so the only correct recovery is refetching on reconnect. This
// lets a screen show a "reconnecting" state and trigger that refetch,
// rather than silently showing stale data with no indication anything's
// wrong.
export function onConnectionChange(listener: ConnectionListener) {
  connectionListeners.add(listener)
  return () => connectionListeners.delete(listener)
}

export default { getSocket, onConnectionChange }

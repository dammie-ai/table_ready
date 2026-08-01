import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tableready_token') : null
    socket = io('http://localhost:8001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export default { getSocket }

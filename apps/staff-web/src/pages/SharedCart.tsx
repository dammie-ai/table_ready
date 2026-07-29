import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSocket, listenForCartUpdates, type CartUpdatePayload } from '../lib/sharedCart'
import { useCartStore } from '../stores/cartStore'

export default function SharedCart() {
  const [room, setRoom] = useState('')
  const [joined, setJoined] = useState(false)
  const [remoteItems, setRemoteItems] = useState<CartUpdatePayload['item'][]>([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const navigate = useNavigate()
  const localItems = useCartStore((s) => s.items)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const savedRoom = localStorage.getItem('tableready_group_code')
    if (savedRoom) {
      setRoom(savedRoom)
      setJoined(true)
    }
  }, [])

  useEffect(() => {
    if (!joined || !room) return

    const socket = getSocket()
    socket.emit('join_cart_room', room)

    const unsubscribe = listenForCartUpdates(socket, room, (payload: CartUpdatePayload) => {
      if (payload.type === 'sync') {
        setRemoteItems([])
        return
      }

      if (payload.type === 'add' && payload.item) {
        setRemoteItems((prev) => {
          const exists = prev.find((i) => i?.menu_item_id === payload.item?.menu_item_id)
          if (exists) {
            return prev.map((i) =>
              i?.menu_item_id === payload.item?.menu_item_id
                ? { ...payload.item!, quantity: (i.quantity || 0) + (payload.item.quantity || 1) }
                : i
            )
          }
          return [...prev, payload.item!]
        })
      } else if (payload.type === 'remove' && payload.menu_item_id) {
        setRemoteItems((prev) => prev.filter((i) => i?.menu_item_id !== payload.menu_item_id))
      } else if (payload.type === 'update' && payload.menu_item_id && payload.quantity !== undefined) {
        setRemoteItems((prev) =>
          prev.map((i) =>
            i?.menu_item_id === payload.menu_item_id ? { ...i!, quantity: payload.quantity! } : i
          )
        )
      }
    })

    return () => {
      unsubscribe()
      socket.emit('leave_cart_room', room)
    }
  }, [joined, room])

  const broadcastChange = (type: CartUpdatePayload['type'], item?: CartUpdatePayload['item'], menu_item_id?: number, quantity?: number) => {
    const socket = getSocket()
    const payload: CartUpdatePayload = {
      type,
      item,
      menu_item_id,
      quantity,
      timestamp: Date.now(),
    }
    socket.emit('cart_update', { room, ...payload })
  }

  const handleAddItem = (item: { menu_item_id: number; name: string; base_price: number }) => {
    useCartStore.getState().addItem(item)
    broadcastChange('add', { ...item, quantity: 1 })
  }

  const handleRemoveItem = (menu_item_id: number) => {
    useCartStore.getState().removeItem(menu_item_id)
    broadcastChange('remove', undefined, menu_item_id)
  }

  const handleUpdateQuantity = (menu_item_id: number, quantity: number) => {
    useCartStore.getState().updateQuantity(menu_item_id, quantity)
    broadcastChange('update', undefined, menu_item_id, quantity)
  }

  const mergeItems = () => {
    const merged: { menu_item_id: number; name: string; base_price: number; quantity: number }[] = []
    const allItems = [...localItems, ...remoteItems]
    
    allItems.forEach((item) => {
      if (!item) return
      const existing = merged.find((i) => i.menu_item_id === item.menu_item_id)
      if (existing) {
        existing.quantity += item.quantity || 1
      } else {
        merged.push({
          menu_item_id: item.menu_item_id!,
          name: item.name,
          base_price: item.base_price,
          quantity: item.quantity || 1,
        })
      }
    })

    return merged
  }

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-4 text-center">Shared Table Cart</h1>
          <p className="text-gray-600 text-center mb-6">Enter your table code to join the group order.</p>
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value.toUpperCase())}
            placeholder="Table code"
            className="w-full border rounded-lg px-4 py-3 text-center text-lg tracking-widest mb-4"
            maxLength={6}
          />
          <button
            onClick={() => {
              if (room) {
                localStorage.setItem('tableready_group_code', room)
                setJoined(true)
              }
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium"
          >
            Join Table
          </button>
        </div>
      </div>
    )
  }

  const mergedItems = mergeItems()

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Table Cart</h1>
          <p className="text-sm text-gray-600">Room: {room}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <button onClick={() => navigate('/menu')} className="text-blue-600 hover:underline">
            Add Items
          </button>
        </div>
      </div>

      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
          You're offline. Cart changes are saved locally and will sync when you reconnect.
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
        Items added by others appear below. All changes sync in real time.
      </div>

      {mergedItems.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No items yet. Start adding from the menu!</p>
      ) : (
        <div className="space-y-3 mb-6">
          {mergedItems.map((item) => (
            <div key={item.menu_item_id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-blue-600 font-medium">${item.base_price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleUpdateQuantity(item.menu_item_id, item.quantity - 1)} className="w-8 h-8 rounded border hover:bg-gray-100">
                  -
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button onClick={() => handleUpdateQuantity(item.menu_item_id, item.quantity + 1)} className="w-8 h-8 rounded border hover:bg-gray-100">
                  +
                </button>
                <button onClick={() => handleRemoveItem(item.menu_item_id)} className="ml-2 text-red-500 hover:text-red-700 text-sm">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => navigate('/checkout')} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium">
          Checkout
        </button>
      </div>
    </div>
  )
}

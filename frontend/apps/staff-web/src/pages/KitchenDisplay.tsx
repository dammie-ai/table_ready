import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { getSocket } from '../lib/socket'
import { getMenuItems, toggleMenuItemStock, type MenuItem } from '../lib/menuApi'

interface Order {
  master_order_id: number
  status: string
  total_amount: number
  table_number?: number
  order_type?: string
  items: any[]
}

const KITCHEN_HIDDEN_STATUSES = new Set([
  'ON_HOLD', 'CANCELLED_AND_REFUNDED', 'CANCELLED', 'COMPLETED', 'SERVED', 'PICKED_UP',
])

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'orders' | 'stock'>('orders')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [stockLoading, setStockLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; orders: Order[] }>('/orders/kitchen-orders')
        setOrders(res.orders || [])
      } catch (err) {
        console.error('Failed to load orders:', err)
      } finally {
        setLoading(false)
      }
    }

    const loadMenuItems = async () => {
      try {
        const res = await getMenuItems()
        setMenuItems(res.items || [])
      } catch (err) {
        console.error('Failed to load menu items:', err)
      } finally {
        setStockLoading(false)
      }
    }

    loadOrders()
    loadMenuItems()

    const socket = getSocket()
    socket.on('new_kitchen_order', (order: Order) => {
      setOrders((prev) => [order, ...prev])
    })
    socket.on('kitchen_order_updated', (data: { orderId: number; status?: string }) => {
      // Mirrors the exclusion list in GET /orders/kitchen-orders — once an
      // order reaches one of these, it's done and should disappear from
      // the live board instead of sitting there forever.
      if (data.status && KITCHEN_HIDDEN_STATUSES.has(data.status)) {
        setOrders((prev) => prev.filter((o) => o.master_order_id !== data.orderId))
        return
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.master_order_id === data.orderId ? { ...o, ...data } : o
        )
      )
    })
    socket.on('menu_item_updated', (data: { item_id: number; out_of_stock_flag?: boolean }) => {
      if (data.out_of_stock_flag === undefined) return
      setMenuItems((prev) =>
        prev.map((m) => (m.item_id === data.item_id ? { ...m, out_of_stock_flag: data.out_of_stock_flag! } : m))
      )
    })

    return () => {
      socket.off('new_kitchen_order')
      socket.off('kitchen_order_updated')
      socket.off('menu_item_updated')
    }
  }, [])

  const toggleStock = async (itemId: number) => {
    setTogglingId(itemId)
    try {
      const res = await toggleMenuItemStock(itemId)
      setMenuItems((prev) => prev.map((m) => (m.item_id === itemId ? res.item : m)))
    } catch (err) {
      console.error('Failed to toggle stock:', err)
    } finally {
      setTogglingId(null)
    }
  }

  const advanceStatus = async (orderId: number, currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      RECEIVED: 'IN_PREPARATION',
      IN_PREPARATION: 'COOKING',
      COOKING: 'READY',
      READY: 'READY_FOR_PICKUP',
      READY_FOR_PICKUP: 'PICKED_UP',
    }

    const nextStatus = statusFlow[currentStatus]
    if (!nextStatus) return

    try {
      await apiClient.patch(`/orders/${orderId}/status`, {
        status: nextStatus,
      })
    } catch (err) {
      console.error('Failed to advance status:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white text-2xl">Loading kitchen display...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-6 text-center">Kitchen Display</h1>

      <div className="flex justify-center gap-3 mb-8">
        <button
          onClick={() => setView('orders')}
          className={`px-6 py-2 rounded-lg text-lg font-semibold ${
            view === 'orders' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-300'
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setView('stock')}
          className={`px-6 py-2 rounded-lg text-lg font-semibold ${
            view === 'stock' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-300'
          }`}
        >
          Stock
        </button>
      </div>

      {view === 'stock' ? (
        stockLoading ? (
          <p className="text-center text-gray-400 text-2xl py-20">Loading menu items...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl mx-auto">
            {menuItems.map((item) => (
              <div
                key={item.item_id}
                className={`rounded-lg p-4 border-2 flex items-center justify-between ${
                  item.out_of_stock_flag ? 'bg-gray-800 border-red-600' : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div>
                  <p className="text-lg font-semibold">{item.name}</p>
                  <p className={`text-sm ${item.out_of_stock_flag ? 'text-red-400' : 'text-green-400'}`}>
                    {item.out_of_stock_flag ? 'Out of stock' : 'In stock'}
                  </p>
                </div>
                <button
                  onClick={() => toggleStock(item.item_id)}
                  disabled={togglingId === item.item_id}
                  className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap disabled:opacity-50 ${
                    item.out_of_stock_flag
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {togglingId === item.item_id ? '...' : item.out_of_stock_flag ? 'Restock' : 'Mark Out of Stock'}
                </button>
              </div>
            ))}
          </div>
        )
      ) : orders.length === 0 ? (
        <p className="text-center text-gray-400 text-2xl py-20">No active orders</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <div
              key={order.master_order_id}
              className="bg-gray-800 rounded-lg p-6 border-4 border-yellow-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-3xl font-bold">#{order.master_order_id}</h2>
                  <p className="text-xl text-gray-300">
                    {order.table_number ? `Table ${order.table_number}` : (order.order_type?.replace('_', ' ') || 'Takeout')}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-lg text-lg font-bold ${
                    order.status === 'READY'
                      ? 'bg-green-600 text-white'
                      : order.status === 'COOKING'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                {order.items?.map((item: any) => (
                  <div key={item.order_item_id} className="border-t border-gray-700 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-medium">
                        {item.quantity}x {item.name || `Item #${item.item_id}`}
                      </span>
                    </div>
                    {item.custom_instructions && (
                      <p className="text-yellow-400 mt-1 italic">
                        {item.custom_instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => advanceStatus(order.master_order_id, order.status)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-4 rounded-lg"
                >
                  {order.status === 'READY' ? 'COMPLETE' : 'ADVANCE'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { getSocket } from '../lib/socket'

interface Order {
  master_order_id: number
  status: string
  total_amount: number
  table_number?: number
  order_type?: string
  items: any[]
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

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

    loadOrders()

    const socket = getSocket()
    socket.on('new_kitchen_order', (order: Order) => {
      setOrders((prev) => [order, ...prev])
    })
    socket.on('kitchen_order_updated', (data: { orderId: number }) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.master_order_id === data.orderId ? { ...o, ...data } : o
        )
      )
    })

    return () => {
      socket.off('new_kitchen_order')
      socket.off('kitchen_order_updated')
    }
  }, [])

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

      {orders.length === 0 ? (
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

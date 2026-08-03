import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { getSocket } from '../lib/socket'
import { useNavigate } from 'react-router-dom'

interface Order {
  master_order_id: number
  status: string
  total_amount: number
  order_type: string
  table_number?: number
  progress_percentage: number
  created_at: string
  items: any[]
}

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading kitchen...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Kitchen Orders</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/menu-management')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Manage Menu
          </button>
          <button
            onClick={() => navigate('/kitchen')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Kitchen Display
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No active orders</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div
              key={order.master_order_id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold">Order #{order.master_order_id}</h3>
                  <p className="text-sm text-gray-600">
                    {order.order_type.replace('_', ' ')}
                    {order.table_number && ` • Table ${order.table_number}`}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'READY'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'COOKING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              <div className="mb-4">
                {order.items?.map((item: any) => (
                  <div key={item.order_item_id} className="flex justify-between py-1">
                    <span>
                      {item.quantity}x {item.name || `Item #${item.item_id}`}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-bold">${order.total_amount.toFixed(2)}</span>
                <button
                  onClick={() => advanceStatus(order.master_order_id, order.status)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Advance
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

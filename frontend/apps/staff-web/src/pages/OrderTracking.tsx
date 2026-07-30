import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../lib/api'
import { getSocket } from '../lib/socket'
import { useAuthStore } from '../stores/authStore'
import { useGeofenceTracker } from '../hooks/useGeofenceTracker'

interface OrderItem {
  order_item_id: number
  item_id: number
  name: string
  base_price: number
  quantity: number
  item_status: string
  custom_instructions?: string
  modifiers: any[]
}

interface Order {
  master_order_id: number
  status: string
  total_amount: number
  order_type: string
  table_number?: number
  progress_percentage: number
  items: OrderItem[]
}

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const token = useAuthStore((s) => s.token)

  const handleRelease = () => {
    setOrder(prev => prev ? { ...prev, status: 'RECEIVED' } : null)
  }

  const { showReleasePopup, tracking, handleRelease: releaseOrder, handleDismiss, radius } = useGeofenceTracker(order, handleRelease)

  useEffect(() => {
    if (!id) return

    const loadOrder = async () => {
      try {
        const res = await apiClient<{ success: boolean; order: Order }>(`/orders/${id}`)
        setOrder(res.order)
      } catch (err) {
        console.error('Failed to load order:', err)
      } finally {
        setLoading(false)
      }
    }

    loadOrder()

    const socket = getSocket()
    socket.emit('join_order', id)

    const handleUpdate = (data: Order) => {
      setOrder((prev) => (prev ? { ...prev, ...data } : prev))
    }

    socket.on('order_updated', handleUpdate)

    return () => {
      socket.off('order_updated', handleUpdate)
    }
  }, [id, token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading order...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Order not found</p>
      </div>
    )
  }

  const isOnHold = order.status === 'ON_HOLD'
  const statusSteps = ['RECEIVED', 'IN_PREPARATION', 'COOKING', 'READY', 'READY_FOR_PICKUP', 'PICKED_UP']
  const currentStep = isOnHold ? -1 : statusSteps.indexOf(order.status)

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">Order #{order.master_order_id}</h1>
      <p className="text-gray-600 mb-6">{order.order_type.replace('_', ' ')}</p>

      {isOnHold && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 font-medium">Your order is on hold</p>
          <p className="text-sm text-yellow-700 mt-1">
            {tracking ? 'Checking your location...' : 'We\'ll notify you when you\'re near the restaurant to start cooking.'}
          </p>
        </div>
      )}

      {!isOnHold && (
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {statusSteps.map((step, idx) => (
              <div
                key={step}
                className={`flex-1 text-center text-xs ${
                  idx <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
                    idx <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </div>
                {step.replace('_', ' ')}
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-blue-600 rounded transition-all"
              style={{ width: `${((currentStep + 1) / statusSteps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Items</h2>
        <div className="space-y-3">
          {order.items?.map((item) => (
            <div key={item.order_item_id} className="flex justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium">
                ${(item.base_price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t mt-4 pt-4 flex justify-between">
          <span className="text-xl font-bold">Total</span>
          <span className="text-xl font-bold text-blue-600">
            ${order.total_amount.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        Status updates automatically • No refresh needed
      </div>

      {showReleasePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-2">You're here!</h3>
            <p className="text-gray-600 mb-4">
              You're within {radius}m of the restaurant. Would you like us to start cooking your order?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium"
              >
                Not yet
              </button>
              <button
                onClick={releaseOrder}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium"
              >
                Start Cooking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

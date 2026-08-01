import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiClient } from '../lib/api'
import { getSocket } from '../lib/socket'
import { useGeofenceTracker } from '../hooks/useGeofenceTracker'
import { useTheme } from '../hooks/useTheme'

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
  const { theme } = useTheme()

  const handleRelease = () => {
    setOrder(prev => prev ? { ...prev, status: 'RECEIVED' } : null)
  }

  const { showReleasePopup, tracking, handleRelease: releaseOrder, handleDismiss, radius } = useGeofenceTracker(order, handleRelease)

  useEffect(() => {
    if (!id) return

    const loadOrder = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; order: Order }>(`/orders/${id}`)
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
  }, [id])

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
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold" style={{ color: theme?.text_color }}>Order #{order.master_order_id}</h1>
        <Link to="/menu" className="text-sm hover:underline" style={{ color: theme?.primary_color }}>
          Back to Menu
        </Link>
      </div>
      <p className="text-gray-600 mb-6">{order.order_type.replace('_', ' ')}</p>

      {isOnHold && (
        <div className="border rounded-lg p-4 mb-6" style={{ borderColor: '#f59e0b', backgroundColor: '#fef3c7' }}>
          <p className="font-medium" style={{ color: '#b45309' }}>Your order is on hold</p>
          <p className="text-sm mt-1" style={{ color: '#92400e' }}>
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
                  idx <= currentStep ? 'font-medium' : 'text-gray-400'
                }`}
                style={{ color: idx <= currentStep ? theme?.primary_color : undefined }}
              >
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
                    idx <= currentStep ? 'text-white' : 'bg-gray-200'
                  }`}
                  style={idx <= currentStep ? { backgroundColor: theme?.primary_color } : undefined}
                >
                  {idx + 1}
                </div>
                {step.replace('_', ' ')}
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 rounded transition-all"
              style={{ width: `${((currentStep + 1) / statusSteps.length) * 100}%`, backgroundColor: theme?.primary_color }}
            />
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 mb-6" style={{ borderColor: theme?.primary_color + '40' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: theme?.text_color }}>Items</h2>
        <div className="space-y-3">
          {order.items?.map((item) => (
            <div key={item.order_item_id} className="flex justify-between">
              <div>
                <p className="font-medium" style={{ color: theme?.text_color }}>{item.name}</p>
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium" style={{ color: theme?.text_color }}>
                ${(item.base_price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t mt-4 pt-4 flex justify-between" style={{ borderColor: theme?.primary_color + '20' }}>
          <span className="text-xl font-bold" style={{ color: theme?.text_color }}>Total</span>
          <span className="text-xl font-bold" style={{ color: theme?.primary_color }}>
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

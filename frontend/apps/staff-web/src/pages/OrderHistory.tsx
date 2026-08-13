import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'

interface Order {
  master_order_id: number
  status: string
  total_amount: number
  order_type: string
  created_at: string
  items: any[]
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { theme } = useTheme()

  useEffect(() => {
    const loadHistory = async () => {
      // Guest ordering has no account/customer_id to look order history up
      // by -- Checkout.tsx persists each completed order's ID here locally,
      // and GET /orders/:id is public (no auth) so it works for a guest.
      let ids: number[] = []
      try {
        const raw = localStorage.getItem('tableready_order_history')
        ids = raw ? JSON.parse(raw) : []
      } catch {
        ids = []
      }

      if (ids.length === 0) {
        setLoading(false)
        return
      }

      try {
        const results = await Promise.all(
          ids.map((id) =>
            apiClient.get<{ success: boolean; order: Order }>(`/orders/${id}`).then((res) => res.order).catch(() => null)
          )
        )
        setOrders(results.filter((o): o is Order => o !== null))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order history')
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading order history...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold" style={{ color: theme?.text_color }}>Order History</h1>
          <button
            onClick={() => navigate('/menu')}
            className="text-sm hover:underline"
            style={{ color: theme?.primary_color }}
          >
            Back to Menu
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">No past orders</p>
            <button
              onClick={() => navigate('/menu')}
              className="text-white px-6 py-2 rounded-lg"
              style={{ backgroundColor: theme?.primary_color }}
            >
              Start Ordering
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.master_order_id}
                className="bg-[#111118] border border-white/8 rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-mono font-bold text-lg">Order #{order.master_order_id}</span>
                    <span className="ml-2 text-xs px-2 py-1 rounded-full bg-white/5 text-[#6b7280]">
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-sm text-[#6b7280]">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-1 mb-3">
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span style={{ color: theme?.text_color }}>{item.quantity}x {item.name || `Item #${item.item_id}`}</span>
                      <span style={{ color: theme?.text_color }}>${(item.base_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/8 pt-3 flex justify-between items-center">
                  <span className="font-bold" style={{ color: theme?.text_color }}>Total</span>
                  <span className="font-bold text-lg" style={{ color: theme?.primary_color }}>
                    ${Number(order.total_amount).toFixed(2)}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => navigate(`/order-tracking/${order.master_order_id}`)}
                    className="flex-1 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90"
                    style={{ backgroundColor: theme?.primary_color }}
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => navigate('/menu')}
                    className="px-4 py-2 border border-white/8 rounded-lg text-sm hover:bg-white/5"
                  >
                    Reorder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

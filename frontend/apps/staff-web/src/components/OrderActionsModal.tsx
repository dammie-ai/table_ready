import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useAuthStore } from '../stores/authStore'

// Surfaces order-modification actions that were fully built on the
// backend (void an item, record a cash payment, distribute tips) with no
// UI anywhere -- real POS actions a shift needs (checkout is pay-at-
// counter, so "mark this order paid" has never had a button until now).
// Deliberately doesn't build the add/remove-items flow (modify-items) --
// that needs a full menu-item picker and is lower urgency than getting an
// order actually marked paid; noted as a follow-up, not silently dropped.

interface OrderItem {
  order_item_id: number
  item_id: number
  name?: string
  quantity: number
  item_status: string
  base_price?: number
}

interface OrderDetail {
  master_order_id: number
  total_amount: number
  payment_status: string
  tip_value?: number
  items: OrderItem[]
}

interface StaffMember {
  id: number
  username: string
}

export default function OrderActionsModal({ orderId, onClose, onUpdated }: { orderId: number; onClose: () => void; onUpdated?: () => void }) {
  const primaryRole = useAuthStore((s) => s.primaryRole)
  const canVoid = primaryRole === 'admin' || primaryRole === 'manager'
  const canDistributeTips = canVoid

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [voidingId, setVoidingId] = useState<number | null>(null)
  const [cashAmount, setCashAmount] = useState('')
  const [payingCash, setPayingCash] = useState(false)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [tipSplits, setTipSplits] = useState<{ user_id: string; percentage: string }[]>([{ user_id: '', percentage: '' }])
  const [distributingTips, setDistributingTips] = useState(false)

  const load = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; order: OrderDetail }>(`/orders/${orderId}`)
      setOrder(res.order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    if (canDistributeTips) {
      apiClient.get<{ success: boolean; staff_on_shift: StaffMember[] }>('/dashboard/admin')
        .then((res) => setStaff(res.staff_on_shift || []))
        .catch((err) => console.error('Failed to load staff list:', err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const handleVoid = async (itemId: number) => {
    const reason = window.prompt('Reason for voiding this item?') || ''
    setVoidingId(itemId)
    setError('')
    try {
      await apiClient.post(`/orders/${orderId}/void-item/${itemId}`, { reason })
      await load()
      onUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void item')
    } finally {
      setVoidingId(null)
    }
  }

  const handleCashPayment = async () => {
    const amount = parseFloat(cashAmount)
    if (!amount || amount <= 0) return
    setPayingCash(true)
    setError('')
    try {
      await apiClient.post(`/orders/${orderId}/cash-payment`, { amount })
      setCashAmount('')
      await load()
      onUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record cash payment')
    } finally {
      setPayingCash(false)
    }
  }

  const handleDistributeTips = async () => {
    const splits = tipSplits
      .filter((s) => s.user_id && s.percentage)
      .map((s) => ({ user_id: Number(s.user_id), percentage: Number(s.percentage) }))
    if (splits.length === 0) return
    setDistributingTips(true)
    setError('')
    try {
      await apiClient.post(`/orders/${orderId}/tips/distribute`, { splits })
      setTipSplits([{ user_id: '', percentage: '' }])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to distribute tips')
    } finally {
      setDistributingTips(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto text-[#f1f5f9]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Order #{orderId}</h2>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#f1f5f9]">✕</button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading || !order ? (
          <p className="text-[#6b7280] text-sm">Loading…</p>
        ) : (
          <>
            <div className="flex justify-between text-sm mb-4 bg-white/5 rounded-xl p-3">
              <span>Total: <strong>${Number(order.total_amount).toFixed(2)}</strong></span>
              <span>Payment: <strong className="capitalize">{order.payment_status}</strong></span>
            </div>

            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-widest font-mono mb-2">Items</h3>
            <div className="space-y-2 mb-5">
              {order.items?.map((item) => {
                const voided = item.item_status === 'Bumped'
                return (
                  <div key={item.order_item_id} className={`flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 ${voided ? 'opacity-40' : ''}`}>
                    <span className="text-sm">{item.quantity}x {item.name || `Item #${item.item_id}`}{voided ? ' (voided)' : ''}</span>
                    {canVoid && !voided && (
                      <button
                        onClick={() => handleVoid(item.order_item_id)}
                        disabled={voidingId === item.order_item_id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-50"
                      >
                        {voidingId === item.order_item_id ? '…' : 'Void'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-widest font-mono mb-2">Record Cash Payment</h3>
            <div className="flex gap-2 mb-5">
              <input
                type="number"
                step="0.01"
                min="0"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm outline-none"
              />
              <button
                onClick={handleCashPayment}
                disabled={payingCash || !cashAmount}
                className="bg-[#f97316] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#f97316]/85 disabled:opacity-40"
              >
                {payingCash ? '…' : 'Record'}
              </button>
            </div>

            {canDistributeTips && (order.tip_value ?? 0) > 0 && (
              <>
                <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-widest font-mono mb-2">
                  Distribute Tips (${Number(order.tip_value).toFixed(2)})
                </h3>
                <div className="space-y-2 mb-3">
                  {tipSplits.map((split, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        value={split.user_id}
                        onChange={(e) => setTipSplits((prev) => prev.map((s, idx) => idx === i ? { ...s, user_id: e.target.value } : s))}
                        className="flex-1 bg-[#1c1c27] border border-white/8 rounded-xl px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Select staff…</option>
                        {staff.map((s) => <option key={s.id} value={s.id}>{s.username}</option>)}
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={split.percentage}
                        onChange={(e) => setTipSplits((prev) => prev.map((s, idx) => idx === i ? { ...s, percentage: e.target.value } : s))}
                        placeholder="%"
                        className="w-20 bg-[#1c1c27] border border-white/8 rounded-xl px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTipSplits((prev) => [...prev, { user_id: '', percentage: '' }])}
                    className="text-sm bg-white/5 border border-white/8 px-3 py-2 rounded-xl hover:bg-white/10"
                  >
                    Add Staff
                  </button>
                  <button
                    onClick={handleDistributeTips}
                    disabled={distributingTips}
                    className="text-sm bg-[#f97316] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#f97316]/85 disabled:opacity-40"
                  >
                    {distributingTips ? 'Distributing…' : 'Distribute'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

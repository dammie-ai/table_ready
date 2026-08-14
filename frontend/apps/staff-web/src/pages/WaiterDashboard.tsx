import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { getSocket, onConnectionChange } from '../lib/socket'
import OrderActionsModal from '../components/OrderActionsModal'

interface Table {
  table_id: number
  table_number: number
  status_state: string
  capacity: number
  updated_at: string
}

interface ServiceRequest {
  request_id: number
  table_number: number
  request_type: string
  notes?: string
  status: string
  created_at: string
}

interface Session {
  session_id: number
  table_number: number
  status: string
  started_at: string
}

interface MyTable {
  table_id: number
  table_number: number
  status_state: string
  capacity: number
  section: string
  master_order_id: number | null
  order_status: string | null
  total_amount: number | null
  payment_status: string | null
}

// PICKUP and ORDER_FROM_HOME converge into the same flow once an
// ORDER_FROM_HOME order is released from hold — both are counter hand-offs
// with no table involved, so they share this one queue.
interface CounterOrder {
  master_order_id: number
  order_type: string
  status: string
  total_amount: number
  payment_status: string | null
  payment_method: string | null
  customer_name?: string | null
}

const COUNTER_FLOW: Record<string, string> = {
  READY: 'READY_FOR_PICKUP',
  READY_FOR_PICKUP: 'PICKED_UP',
}

export default function WaiterDashboard() {
  const [tables, setTables] = useState<Table[]>([])
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [myTables, setMyTables] = useState<MyTable[]>([])
  const [counterOrders, setCounterOrders] = useState<CounterOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'floor' | 'alerts' | 'my-tables' | 'counter'>('my-tables')
  const [connected, setConnected] = useState(true)
  const [collectingId, setCollectingId] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tablesRes, requestsRes, sessionsRes, myTablesRes, kitchenRes] = await Promise.all([
          apiClient.get<any>('/tables/floor-layout'),
          apiClient.get<any>('/service-requests'),
          apiClient.get<any>('/sessions'),
          apiClient.get<any>('/tables/my-tables'),
          apiClient.get<any>('/orders/kitchen-orders'),
        ])
        setTables(tablesRes.tables || [])
        setRequests(requestsRes.requests || [])
        setSessions(sessionsRes.sessions || [])
        setMyTables(myTablesRes.tables || [])
        setCounterOrders(
          (kitchenRes.orders || []).filter((o: any) => o.order_type === 'PICKUP' || o.order_type === 'ORDER_FROM_HOME')
        )
      } catch (err) {
        console.error('Failed to load waiter data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    const offConnection = onConnectionChange((isConnected) => {
      setConnected(isConnected)
      if (isConnected) loadData()
    })

    const socket = getSocket()
    socket.on('service_request_created', (req: ServiceRequest) => {
      setRequests((prev) => [req, ...prev])
    })
    // Acknowledge/complete/cancel all broadcast this — without it, a
    // second waiter's Alerts tab kept showing a request as pending after
    // someone else had already handled it.
    socket.on('service_request_updated', (req: ServiceRequest) => {
      setRequests((prev) =>
        req.status === 'pending'
          ? prev.map((r) => (r.request_id === req.request_id ? req : r))
          : prev.filter((r) => r.request_id !== req.request_id)
      )
    })
    socket.on('table_status_updated', ({ table_id, status_state }: { table_id: number; status_state: string }) => {
      setTables((prev) => prev.map((t) => t.table_id === table_id ? { ...t, status_state } : t))
      setMyTables((prev) => prev.map((t) => t.table_id === table_id ? { ...t, status_state } : t))
    })
    // The backend broadcasts this on every kitchen status change — without
    // it, a waiter's own dashboard never learned food was ready until they
    // manually refreshed. Covers both a table's order and a counter order,
    // since both flow through the same generic status PATCH.
    socket.on('kitchen_order_updated', ({ orderId, status }: { orderId: number; status: string }) => {
      setMyTables((prev) => prev.map((t) => t.master_order_id === orderId ? { ...t, order_status: status } : t))
      setCounterOrders((prev) => prev.map((o) => o.master_order_id === orderId ? { ...o, status } : o))
    })
    // kitchen_order_updated only covers a *status change* on an order this
    // dashboard already knows about — a brand new order landing on one of
    // this waiter's tables (going from "No active order" to having one)
    // was never pushed at all, only visible after a manual refresh.
    socket.on('new_kitchen_order', (order: CounterOrder & { table_number?: number }) => {
      if (order.table_number) {
        setMyTables((prev) => prev.map((t) =>
          t.table_number === order.table_number
            ? { ...t, master_order_id: order.master_order_id, order_status: order.status, total_amount: order.total_amount }
            : t
        ))
        return
      }
      if (order.order_type === 'PICKUP' || order.order_type === 'ORDER_FROM_HOME') {
        setCounterOrders((prev) => [order, ...prev])
      }
    })

    return () => {
      socket.off('service_request_created')
      socket.off('service_request_updated')
      socket.off('table_status_updated')
      socket.off('kitchen_order_updated')
      socket.off('new_kitchen_order')
      offConnection()
    }
  }, [])

  const [servingId, setServingId] = useState<number | null>(null)
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [managingOrderId, setManagingOrderId] = useState<number | null>(null)

  // The kitchen's own advance chain stops at READY for dine-in orders now
  // (see KitchenDisplay.tsx) — this is the actual hand-off confirmation
  // that food reached the table, which previously didn't exist anywhere;
  // kitchen could walk an order straight to a terminal state alone.
  const markServed = async (orderId: number) => {
    setServingId(orderId)
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'SERVED' })
      setMyTables((prev) => prev.map((t) => t.master_order_id === orderId ? { ...t, order_status: 'SERVED' } : t))
    } catch (err) {
      console.error('Failed to mark order served:', err)
    } finally {
      setServingId(null)
    }
  }

  // SERVED existed as a terminal state in practice — nothing anywhere ever
  // moved an order past it to COMPLETED, even though the status is a valid,
  // already-supported value on the same PATCH /status endpoint markServed
  // uses. Closing the table's order out once the bill is settled.
  const completeOrder = async (orderId: number) => {
    setCompletingId(orderId)
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'COMPLETED' })
      setMyTables((prev) => prev.map((t) => t.master_order_id === orderId ? { ...t, order_status: 'COMPLETED' } : t))
    } catch (err) {
      console.error('Failed to complete order:', err)
    } finally {
      setCompletingId(null)
    }
  }

  // Mirrors markServed/completeOrder's pattern but for the counter queue --
  // kitchen's advance button stops at READY for every type now, so this is
  // the only thing that moves a PICKUP/ORDER_FROM_HOME order the rest of
  // the way (READY -> READY_FOR_PICKUP -> PICKED_UP). If it was already
  // paid up front (e.g. card at checkout), marking it picked up goes
  // straight to COMPLETED here too -- same reasoning as DeliveryPortal's
  // shouldComplete check, since nothing else will ever close this out.
  const advanceCounterStatus = async (order: CounterOrder) => {
    const nextStatus = COUNTER_FLOW[order.status]
    if (!nextStatus) return
    const finalStatus = nextStatus === 'PICKED_UP' && order.payment_status === 'Paid' ? 'COMPLETED' : nextStatus
    try {
      await apiClient.patch(`/orders/${order.master_order_id}/status`, { status: finalStatus })
      if (finalStatus === 'COMPLETED') {
        setCounterOrders((prev) => prev.filter((o) => o.master_order_id !== order.master_order_id))
      } else {
        setCounterOrders((prev) => prev.map((o) => o.master_order_id === order.master_order_id ? { ...o, status: finalStatus } : o))
      }
    } catch (err) {
      console.error('Failed to advance counter order:', err)
    }
  }

  // recordCashPayment already treats PICKED_UP as ready-to-close (same
  // rule as SERVED for dine-in), so collecting payment here both records
  // it and completes the order server-side in one call.
  const collectCounterPayment = async (order: CounterOrder) => {
    setCollectingId(order.master_order_id)
    try {
      await apiClient.post(`/orders/${order.master_order_id}/cash-payment`, { amount: order.total_amount })
      setCounterOrders((prev) => prev.filter((o) => o.master_order_id !== order.master_order_id))
    } catch (err) {
      console.error('Failed to collect payment:', err)
    } finally {
      setCollectingId(null)
    }
  }

  const updateTableStatus = async (tableId: number, status: string) => {
    try {
      await apiClient.patch(`/tables/${tableId}/status`, {
        status_state: status,
      })
      setTables((prev) => prev.map((t) => t.table_id === tableId ? { ...t, status_state: status } : t))
    } catch (err) {
      console.error('Failed to update table:', err)
    }
  }

  const acknowledgeRequest = async (requestId: number) => {
    try {
      await apiClient.patch(`/service-requests/${requestId}/acknowledge`, {})
      setRequests((prev) => prev.filter((r) => r.request_id !== requestId))
    } catch (err) {
      console.error('Failed to acknowledge request:', err)
    }
  }

  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
      case 'occupied': return 'bg-orange-500/15 border-orange-500/40 text-orange-400'
      case 'needs cleaning':
      case 'dirty':
      case 'cleaning': return 'bg-red-500/15 border-red-500/40 text-red-400'
      case 'reserved': return 'bg-blue-500/15 border-blue-500/40 text-blue-400'
      default: return 'bg-gray-500/15 border-gray-500/40 text-gray-400'
    }
  }

  const requestIcon = (type: string) => {
    switch (type) {
      case 'refill': return '💧'
      case 'call_server': return '🆘'
      case 'bill_request': return '💳'
      default: return '📋'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading floor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9]">
      {!connected && (
        <div className="bg-red-600 text-white text-center py-2 text-sm font-semibold">
          ⚠ Connection lost — reconnecting... this screen may be stale until it clears.
        </div>
      )}
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 h-14 bg-[#09090f]/95 backdrop-blur border-b border-white/8">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-sm tracking-widest uppercase text-[#f97316]">TableReady</span>
          <span className="text-white/10">·</span>
          <span className="text-sm font-medium text-[#f1f5f9]">Waiter Dashboard</span>
        </div>
        <div className="flex gap-1">
          {(['my-tables', 'counter', 'floor', 'alerts'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`relative px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                view === v ? 'bg-[#f97316] text-white' : 'text-[#6b7280] hover:text-[#f1f5f9]'
              }`}
            >
              {v === 'alerts' && requests.filter((r) => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {requests.filter((r) => r.status === 'pending').length}
                </span>
              )}
              {v === 'floor' ? 'Floor Map' : v === 'my-tables' ? 'My Tables' : v === 'counter' ? 'Pickup' : 'Alerts'}
            </button>
          ))}
        </div>
      </div>

      {view === 'my-tables' ? (
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-xl">My Tables</h2>
            <span className="text-xs text-[#6b7280]">{myTables.length} / 3 assigned</span>
          </div>

          {myTables.length === 0 ? (
            <div className="text-center text-[#6b7280] py-16">
              <div className="text-4xl mb-3">🪑</div>
              <p className="font-medium">No tables assigned to you yet</p>
              <p className="text-xs mt-1">Ask a manager to assign you a table.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {myTables.map((table) => (
                <div
                  key={table.table_id}
                  className={`rounded-xl border p-5 ${statusColor(table.status_state)}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-display font-bold text-2xl">Table {table.table_number}</div>
                    <span className="text-xs capitalize opacity-80">{table.status_state}</span>
                  </div>
                  <div className="text-xs opacity-70 mb-3">👥 Seats {table.capacity} · {table.section}</div>
                  {table.master_order_id ? (
                    <div className="bg-black/20 rounded-lg p-3">
                      <div className="text-sm font-semibold">Order #{table.master_order_id}</div>
                      <div className="text-xs opacity-80 mt-0.5 capitalize">
                        {table.order_status?.toLowerCase().replace(/_/g, ' ')}
                      </div>
                      {table.total_amount !== null && (
                        <div className="text-xs opacity-60 mt-1">${Number(table.total_amount).toFixed(2)}</div>
                      )}
                      {table.order_status === 'READY' && (
                        <button
                          onClick={() => markServed(table.master_order_id!)}
                          disabled={servingId === table.master_order_id}
                          className="w-full mt-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          {servingId === table.master_order_id ? 'Marking served…' : '✓ Mark Served'}
                        </button>
                      )}
                      {table.order_status === 'SERVED' && table.payment_status !== 'Paid' && (
                        <div className="w-full mt-2.5 text-center text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg py-2 px-2">
                          Awaiting payment — record it under Manage Order before this can be completed.
                        </div>
                      )}
                      {table.order_status === 'SERVED' && table.payment_status === 'Paid' && (
                        <button
                          onClick={() => completeOrder(table.master_order_id!)}
                          disabled={completingId === table.master_order_id}
                          className="w-full mt-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          {completingId === table.master_order_id ? 'Completing…' : '✓ Complete Order'}
                        </button>
                      )}
                      <button
                        onClick={() => setManagingOrderId(table.master_order_id!)}
                        className="w-full mt-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold py-2 rounded-lg transition-colors"
                      >
                        Manage Order
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs opacity-50 italic">No active order</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : view === 'counter' ? (
        <div className="p-4 md:p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-display font-bold text-xl">Pickup Queue</h2>
            <span className="text-xs font-mono bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30 px-2 py-0.5 rounded">
              {counterOrders.length} active
            </span>
          </div>

          {counterOrders.length === 0 ? (
            <div className="text-center text-[#6b7280] py-16">
              <div className="text-4xl mb-3">📦</div>
              <p className="font-medium">No pickup or order-ahead orders right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {counterOrders.map((order) => (
                <div key={order.master_order_id} className="bg-[#111118] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">#{order.master_order_id}</span>
                        <span className="text-[10px] border px-1.5 py-0.5 rounded font-mono font-bold text-blue-400 bg-blue-500/10 border-blue-500/30 capitalize">
                          {order.status.toLowerCase().replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-[#6b7280]">
                          {order.order_type === 'ORDER_FROM_HOME' ? 'Order from Home' : 'Pickup'}
                        </span>
                      </div>
                      <div className="text-sm font-medium mt-0.5">
                        {order.customer_name || `Order #${order.master_order_id}`}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[#f97316] flex-shrink-0">
                      ${Number(order.total_amount).toFixed(2)}
                    </div>
                  </div>

                  {order.status === 'READY' || order.status === 'READY_FOR_PICKUP' ? (
                    <div className="px-5 pb-4 pt-0">
                      <button
                        onClick={() => advanceCounterStatus(order)}
                        className="w-full bg-[#f97316] hover:bg-[#f97316]/80 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      >
                        {order.status === 'READY' ? 'Ready for Pickup' : 'Customer Picked Up'}
                      </button>
                    </div>
                  ) : order.status === 'PICKED_UP' && order.payment_status !== 'Paid' ? (
                    <div className="px-5 pb-4 pt-0">
                      <p className="text-xs text-amber-400 mb-2">
                        Awaiting payment{order.payment_method ? ` (${order.payment_method})` : ''} — collect before this closes out.
                      </p>
                      <button
                        onClick={() => collectCounterPayment(order)}
                        disabled={collectingId === order.master_order_id}
                        className="w-full bg-emerald-600 hover:bg-emerald-600/80 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      >
                        {collectingId === order.master_order_id ? '…' : `Collect $${Number(order.total_amount).toFixed(2)} Cash`}
                      </button>
                    </div>
                  ) : (
                    <div className="px-5 pb-4 pt-0">
                      <p className="text-xs text-[#6b7280]">Waiting on the kitchen.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : view === 'floor' ? (
        <div className="p-4 md:p-6">
          <div className="flex gap-2 mb-5 flex-wrap">
            {(['available', 'occupied', 'cleaning', 'reserved'] as const).map((s) => (
              <div key={s} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs capitalize font-medium ${statusColor(s)}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                {s}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {tables.map((table) => (
            <button
              key={table.table_id}
              onClick={() => {
                if (table.status_state.toLowerCase() === 'occupied') {
                  updateTableStatus(table.table_id, 'Needs Cleaning')
                }
              }}
              className={`rounded-xl border p-4 text-left transition-all ${statusColor(table.status_state)} ${
                table.status_state.toLowerCase() === 'occupied' ? 'hover:scale-[1.03] cursor-pointer' : 'cursor-default'
              }`}
            >
                <div className="font-display font-bold text-xl">T{table.table_number}</div>
                <div className="text-xs capitalize mt-0.5 opacity-80">{table.status_state}</div>
                {table.capacity && <div className="text-xs opacity-60">👥 {table.capacity}</div>}
              </button>
            ))}
          </div>

          {sessions.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display font-bold text-xl mb-4">Active Sessions</h2>
              <div className="bg-[#111118] border border-white/8 rounded-2xl overflow-hidden">
                {sessions.map((session) => (
                  <div key={session.session_id} className="px-4 py-3 border-b border-white/5 last:border-0 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">Table {session.table_number}</div>
                      <div className="text-xs text-[#6b7280]">Session #{session.session_id}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      session.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-500/15 text-gray-400'
                    }`}>
                      {session.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 md:p-6 max-w-lg">
          <h2 className="font-display font-bold text-xl mb-4">Active Alerts</h2>
          {requests.length === 0 ? (
            <div className="text-center text-[#6b7280] py-16">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-medium">All clear</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests
                .filter((r) => r.status === 'pending')
                .map((req) => (
                <div
                  key={req.request_id}
                  className={`flex items-start justify-between gap-3 p-4 rounded-xl border ${
                    req.request_type === 'call_server' ? 'border-red-500/40 bg-red-500/5' : req.request_type === 'refill' ? 'border-orange-500/40 bg-orange-500/5' : 'border-white/8 bg-[#111118]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{requestIcon(req.request_type)}</div>
                    <div>
                      <div className="font-semibold text-sm">Table {req.table_number}</div>
                      <div className="text-sm text-[#6b7280]">{req.request_type.replace(/_/g, ' ').toUpperCase()}</div>
                      {req.notes && <div className="text-xs text-[#6b7280]/60 mt-1">{req.notes}</div>}
                      <div className="text-[10px] text-[#6b7280]/40 mt-1 font-mono">
                        {new Date(req.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => acknowledgeRequest(req.request_id)}
                    className="text-xs bg-[#f97316] text-white px-3 py-1.5 rounded-lg hover:bg-[#f97316]/80 transition-colors font-medium flex-shrink-0"
                  >
                    Ack
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {managingOrderId && (
        <OrderActionsModal
          orderId={managingOrderId}
          onClose={() => setManagingOrderId(null)}
          onUpdated={() => {
            apiClient.get<any>('/tables/my-tables').then((res) => setMyTables(res.tables || [])).catch(() => {})
          }}
        />
      )}
    </div>
  )
}

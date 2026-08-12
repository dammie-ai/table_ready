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
}

export default function WaiterDashboard() {
  const [tables, setTables] = useState<Table[]>([])
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [myTables, setMyTables] = useState<MyTable[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'floor' | 'alerts' | 'my-tables'>('my-tables')
  const [connected, setConnected] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tablesRes, requestsRes, sessionsRes, myTablesRes] = await Promise.all([
          apiClient.get<any>('/tables/floor-layout'),
          apiClient.get<any>('/service-requests'),
          apiClient.get<any>('/sessions'),
          apiClient.get<any>('/tables/my-tables'),
        ])
        setTables(tablesRes.tables || [])
        setRequests(requestsRes.requests || [])
        setSessions(sessionsRes.sessions || [])
        setMyTables(myTablesRes.tables || [])
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
    // manually refreshed.
    socket.on('kitchen_order_updated', ({ orderId, status }: { orderId: number; status: string }) => {
      setMyTables((prev) => prev.map((t) => t.master_order_id === orderId ? { ...t, order_status: status } : t))
    })

    return () => {
      socket.off('service_request_created')
      socket.off('service_request_updated')
      socket.off('table_status_updated')
      socket.off('kitchen_order_updated')
      offConnection()
    }
  }, [])

  const [servingId, setServingId] = useState<number | null>(null)
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
          {(['my-tables', 'floor', 'alerts'] as const).map((v) => (
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
              {v === 'floor' ? 'Floor Map' : v === 'my-tables' ? 'My Tables' : 'Alerts'}
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
                      {session.status}
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
                      <div className="text-sm text-[#6b7280]">{req.request_type.replace('_', ' ').toUpperCase()}</div>
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

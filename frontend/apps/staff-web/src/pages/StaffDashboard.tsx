import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { getSocket } from '../lib/socket'

// Landing page for the 'other' role — "Limited access for support roles,"
// scoped to view_service_requests + view_floor per its own dashboard
// config (see dashboardController.js's ROLE_DASHBOARD_CONFIG). This used
// to render a full kitchen-order board instead: it called
// /orders/kitchen-orders, a role 'other' was never allowed to call
// (403'd silently, always showing "No active orders" — not actually
// empty, just broken), and its own advance-status logic walked a DINE_IN
// order straight to PICKED_UP with no waiter hand-off, the exact bug
// already closed in KitchenDisplay.tsx. Replaced with a read-only view
// matching what this role is actually scoped to see.

interface ServiceRequest {
  request_id: number
  table_number: number
  request_type: string
  notes?: string
  status: string
  created_at: string
}

interface Table {
  table_id: number
  table_number: number
  status_state: string
}

const STATUS_COLOR: Record<string, string> = {
  Available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Occupied: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Reserved: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Needs Cleaning': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

export default function StaffDashboard() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [reqRes, tableRes] = await Promise.all([
          apiClient.get<{ success: boolean; requests: ServiceRequest[] }>('/service-requests?status=pending'),
          apiClient.get<{ success: boolean; tables: Table[] }>('/tables/floor-layout'),
        ])
        setRequests(reqRes.requests || [])
        setTables(tableRes.tables || [])
      } catch (err) {
        console.error('Failed to load staff dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    load()

    const socket = getSocket()
    socket.on('service_request_created', (req: ServiceRequest) => {
      setRequests((prev) => [req, ...prev])
    })
    socket.on('service_request_updated', (req: ServiceRequest) => {
      setRequests((prev) =>
        req.status === 'pending'
          ? prev.map((r) => (r.request_id === req.request_id ? req : r))
          : prev.filter((r) => r.request_id !== req.request_id)
      )
    })
    socket.on('table_status_updated', ({ table_id, status_state }: { table_id: number; status_state: string }) => {
      setTables((prev) => prev.map((t) => t.table_id === table_id ? { ...t, status_state } : t))
    })

    return () => {
      socket.off('service_request_created')
      socket.off('service_request_updated')
      socket.off('table_status_updated')
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9] p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Staff Dashboard</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold mb-4">Pending Requests</h2>
            <div className="space-y-3">
              {requests.length === 0 ? (
                <p className="text-[#6b7280] text-sm">No pending service requests.</p>
              ) : (
                requests.map((req) => (
                  <div key={req.request_id} className="bg-[#111118] border border-white/8 rounded-2xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Table {req.table_number}</span>
                      <span className="text-xs text-[#6b7280]">{new Date(req.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-[#f97316] capitalize mt-1">{req.request_type.replace(/_/g, ' ')}</p>
                    {req.notes && <p className="text-sm text-[#6b7280] mt-1">{req.notes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Floor Layout</h2>
            <div className="grid grid-cols-3 gap-3">
              {tables.map((table) => (
                <div key={table.table_id} className={`rounded-xl border p-3 text-center ${STATUS_COLOR[table.status_state] || 'bg-white/5 text-[#f1f5f9] border-white/8'}`}>
                  <div className="font-bold text-lg">{table.table_number}</div>
                  <div className="text-[10px] uppercase tracking-wide mt-1">{table.status_state}</div>
                </div>
              ))}
              {tables.length === 0 && <p className="text-[#6b7280] text-sm col-span-3">No tables configured.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

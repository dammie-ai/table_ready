import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../lib/api'
import { getSocket } from '../lib/socket'

interface Delivery {
  master_order_id: number
  status: string
  delivery_status: string
  total_amount: number
  order_type: string
  table_number?: number
  notes?: string
  created_at: string
  customer_id?: number
  items?: any[]
  first_name?: string
  last_name?: string
  phone?: string
  address?: string
  driver_latitude?: number
  driver_longitude?: number
}

// The delivery_status column (assigned/accepted/picked_up/out_for_delivery/
// delivered/cancelled) is a separate state machine from the kitchen-prep
// `status` column — this screen only ever cares about the former.
const STATUS_META: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  assigned: { label: 'Assigned', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', next: 'accepted', nextLabel: 'Accept' },
  accepted: { label: 'Accepted', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', next: 'picked_up', nextLabel: 'Picked Up' },
  picked_up: { label: 'Picked Up', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', next: 'out_for_delivery', nextLabel: 'Out for Delivery' },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', next: 'delivered', nextLabel: 'Delivered' },
  delivered: { label: 'Delivered', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
}

export default function DeliveryPortal() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'queue' | 'map'>('queue')
  const watchIds = useRef<Record<number, number>>({})

  const startTrackingLocation = (orderId: number) => {
    if (!navigator.geolocation || watchIds.current[orderId] != null) return
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        apiClient.post(`/delivery/${orderId}/location`, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }).catch((err) => console.error('Failed to report driver location:', err))
      },
      (err) => console.error('Geolocation error:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    watchIds.current[orderId] = id
  }

  const stopTrackingLocation = (orderId: number) => {
    const id = watchIds.current[orderId]
    if (id != null) {
      navigator.geolocation.clearWatch(id)
      delete watchIds.current[orderId]
    }
  }

  useEffect(() => {
    const loadDeliveries = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; orders: Delivery[] }>('/orders/by-type/DELIVERY')
        const active = (res.orders || [])
          .map((o) => ({ ...o, delivery_status: (o.delivery_status || 'assigned').toLowerCase() }))
          .filter((o) => !['delivered', 'cancelled'].includes(o.delivery_status))
        setDeliveries(active)
        active.forEach((d) => {
          if (d.delivery_status === 'out_for_delivery') startTrackingLocation(d.master_order_id)
        })
      } catch (err) {
        console.error('Failed to load deliveries:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDeliveries()

    const socket = getSocket()
    socket.on('delivery_status_updated', (data: { orderId: number; status: string }) => {
      setDeliveries((prev) => prev.map((d) => d.master_order_id === data.orderId ? { ...d, delivery_status: data.status.toLowerCase() } : d))
    })

    return () => {
      socket.off('delivery_status_updated')
      Object.keys(watchIds.current).forEach((id) => stopTrackingLocation(parseInt(id)))
    }
  }, [])

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await apiClient.post(`/delivery/${orderId}/status`, { status })
      setDeliveries((prev) => prev.map((d) => d.master_order_id === orderId ? { ...d, delivery_status: status } : d))

      if (status === 'out_for_delivery') {
        startTrackingLocation(orderId)
      } else if (status === 'delivered' || status === 'cancelled') {
        stopTrackingLocation(orderId)
      }
    } catch (err) {
      console.error('Failed to update delivery status:', err)
    }
  }

  const activeCount = deliveries.filter((d) => d.delivery_status !== 'delivered' && d.delivery_status !== 'cancelled').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading deliveries...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9]">
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 h-14 bg-[#09090f]/95 backdrop-blur border-b border-white/8">
        <div className="flex items-center gap-3">
          <span className="text-white/10">·</span>
          <span className="text-sm font-medium text-[#f1f5f9]">Delivery Portal</span>
        </div>
        <div className="flex gap-1">
          {(['queue', 'map'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                view === v ? 'bg-[#f97316] text-white' : 'text-[#6b7280] hover:text-[#f1f5f9]'
              }`}
            >
              {v === 'queue' ? 'Queue' : 'Live Map'}
            </button>
          ))}
        </div>
      </div>

      {view === 'queue' ? (
        <div className="p-4 md:p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-display font-bold text-xl">Delivery Queue</h2>
            <span className="text-xs font-mono bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30 px-2 py-0.5 rounded">
              {activeCount} active
            </span>
          </div>

          <div className="space-y-3">
            {deliveries.map((delivery) => {
              const meta = STATUS_META[delivery.delivery_status] || STATUS_META.assigned
              return (
                <div
                  key={delivery.master_order_id}
                  className="bg-[#111118] border border-white/8 rounded-2xl overflow-hidden"
                >
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.color.split(' ')[0].replace('text-', 'bg-')}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">#{delivery.master_order_id}</span>
                        <span className={`text-[10px] border px-1.5 py-0.5 rounded font-mono font-bold ${meta.color}`}>
                          {meta.label}
                        </span>
                        {delivery.delivery_status === 'out_for_delivery' && (
                          <span className="text-[10px] text-emerald-400 font-mono">📍 sharing location</span>
                        )}
                      </div>
                      <div className="text-sm font-medium mt-0.5">
                        {delivery.first_name && delivery.last_name ? `${delivery.first_name} ${delivery.last_name}` : `Order #${delivery.master_order_id}`}
                      </div>
                      {delivery.address && <div className="text-xs text-[#6b7280] truncate">{delivery.address}</div>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-[#f97316]">${delivery.total_amount.toFixed(2)}</div>
                    </div>
                  </div>

                  {meta.next && meta.nextLabel && (
                    <div className="px-5 pb-4 pt-0">
                      <button
                        onClick={() => updateStatus(delivery.master_order_id, meta.next!)}
                        className="w-full bg-[#f97316] hover:bg-[#f97316]/80 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      >
                        {meta.nextLabel}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 md:p-6">
          <h2 className="font-display font-bold text-xl mb-4">Live Delivery Map</h2>
          <div className="bg-[#111118] border border-white/8 rounded-2xl overflow-hidden">
            <div className="relative bg-[#0a0c14] w-full" style={{ height: 320 }}>
              <svg className="absolute inset-0 w-full h-full opacity-10">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <line key={`h${i}`} x1="0" y1={`${i * 14.28}%`} x2="100%" y2={`${i * 14.28}%`} stroke="#fff" strokeWidth={0.5} />
                ))}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <line key={`v${i}`} x1={`${i * 11.11}%`} y1="0" x2={`${i * 11.11}%`} y2="100%" stroke="#fff" strokeWidth={0.5} />
                ))}
              </svg>

              <div className="absolute flex flex-col items-center" style={{ left: '15%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                <div className="w-9 h-9 rounded-xl bg-[#f97316] flex items-center justify-center shadow-lg shadow-[#f97316]/40">
                  <span className="text-white text-xs font-bold">R</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#f97316] mt-1 whitespace-nowrap bg-[#09090f]/80 px-1 rounded">RESTAURANT</span>
              </div>

              {deliveries.map((d, i) => {
                const angle = (i / deliveries.length) * Math.PI * 2
                const x = 15 + Math.cos(angle) * 30
                const y = 50 + Math.sin(angle) * 30
                return (
                  <div key={d.master_order_id} className="absolute flex flex-col items-center" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="w-8 h-8 rounded-full border-2 border-[#f97316] flex items-center justify-center shadow-lg bg-[#f97316]/20">
                      <span className="text-[#f97316] text-xs font-bold">#{d.master_order_id}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-4 flex items-center gap-4 flex-wrap border-t border-white/8">
              {[{ color: 'bg-orange-500', label: 'Out for Delivery' }, { color: 'bg-blue-500', label: 'Pending Pickup' }, { color: 'bg-emerald-500', label: 'Delivered' }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                  <div className={`w-2 h-2 rounded-full ${l.color}`} />{l.label}
                </div>
              ))}
              <span className="ml-auto text-xs font-mono text-[#6b7280]">Live · {deliveries.length} orders</span>
            </div>
            <p className="px-4 pb-4 text-[11px] text-[#6b7280]">
              Note: pin positions on this grid are illustrative, not real GPS — see an individual order's tracking on the customer's Order Tracking screen for real driver location/ETA.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

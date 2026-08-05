import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'

interface Reservation {
  reservation_id: number
  customer_name: string
  customer_phone: string
  customer_email?: string
  table_id?: number
  table_number?: number
  reservation_date: string
  reservation_time: string
  party_size: number
  status: string
  notes?: string
  created_at: string
}

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', table_id: '', reservation_date: '', reservation_time: '', party_size: 2, notes: '' })
  const { theme } = useTheme()

  useEffect(() => {
    loadReservations()
  }, [])

  const loadReservations = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; reservations: Reservation[] }>('/reservations')
      setReservations(res.reservations || [])
    } catch (err) {
      console.error('Failed to load reservations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiClient.post('/reservations', {
        ...form,
        table_id: form.table_id ? Number(form.table_id) : undefined,
        party_size: Number(form.party_size),
      })
      setShowForm(false)
      setForm({ customer_name: '', customer_phone: '', customer_email: '', table_id: '', reservation_date: '', reservation_time: '', party_size: 2, notes: '' })
      loadReservations()
    } catch (err) {
      console.error('Failed to create reservation:', err)
    }
  }

  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      case 'pending': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      case 'cancelled': return 'bg-red-500/15 text-red-400 border-red-500/30'
      case 'seated': return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading reservations...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold" style={{ color: theme?.text_color }}>Reservations</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm font-medium hover:bg-[#f97316]/85"
          >
            {showForm ? 'Cancel' : 'New Reservation'}
          </button>
        </div>

        {showForm && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">New Reservation</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.reservation_date}
                    onChange={(e) => setForm({ ...form, reservation_date: e.target.value })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Time</label>
                  <input
                    type="time"
                    value={form.reservation_time}
                    onChange={(e) => setForm({ ...form, reservation_time: e.target.value })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Party Size</label>
                  <input
                    type="number"
                    min="1"
                    value={form.party_size}
                    onChange={(e) => setForm({ ...form, party_size: Number(e.target.value) })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Table (optional)</label>
                  <input
                    type="number"
                    value={form.table_id}
                    onChange={(e) => setForm({ ...form, table_id: e.target.value })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#f97316] text-white py-3 rounded-xl font-semibold hover:bg-[#f97316]/85"
              >
                Create Reservation
              </button>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {reservations.length === 0 ? (
            <div className="text-center py-16 text-[#6b7280]">
              <p className="text-xl mb-2">No reservations yet</p>
              <p className="text-sm">Create your first reservation to get started</p>
            </div>
          ) : (
            reservations.map((r) => (
              <div key={r.reservation_id} className="bg-[#111118] border border-white/8 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: theme?.text_color }}>{r.customer_name}</h3>
                    <p className="text-sm text-[#6b7280]">{r.customer_phone}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${statusColor(r.status)}`}>
                    {r.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-[#6b7280]">Date</span>
                    <p className="font-medium" style={{ color: theme?.text_color }}>{r.reservation_date}</p>
                  </div>
                  <div>
                    <span className="text-[#6b7280]">Time</span>
                    <p className="font-medium" style={{ color: theme?.text_color }}>{r.reservation_time}</p>
                  </div>
                  <div>
                    <span className="text-[#6b7280]">Party Size</span>
                    <p className="font-medium" style={{ color: theme?.text_color }}>{r.party_size}</p>
                  </div>
                  <div>
                    <span className="text-[#6b7280]">Table</span>
                    <p className="font-medium" style={{ color: theme?.text_color }}>{r.table_number || 'Unassigned'}</p>
                  </div>
                </div>
                {r.notes && (
                  <p className="text-sm text-[#6b7280] mt-3 italic">{r.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

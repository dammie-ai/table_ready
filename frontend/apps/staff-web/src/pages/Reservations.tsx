import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'
import { useAuthStore } from '../stores/authStore'

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

const emptyForm = { customer_name: '', customer_phone: '', customer_email: '', table_id: '', reservation_date: '', reservation_time: '', party_size: 2, notes: '' }

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [busyId, setBusyId] = useState<number | null>(null)
  const { theme } = useTheme()
  const primaryRole = useAuthStore((s) => s.primaryRole)
  // Mirrors the backend's own role gates on PUT/PATCH /reservations/:id —
  // a waiter can see this page (to seat parties) but can't edit or cancel.
  const canManage = primaryRole === 'manager' || primaryRole === 'admin' || primaryRole === 'assistant_manager'
  const canSeat = canManage || primaryRole === 'waiter'

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
      setForm(emptyForm)
      loadReservations()
    } catch (err) {
      console.error('Failed to create reservation:', err)
    }
  }

  const startEdit = (r: Reservation) => {
    setEditingId(r.reservation_id)
    setEditForm({
      customer_name: r.customer_name,
      customer_phone: r.customer_phone || '',
      customer_email: r.customer_email || '',
      table_id: r.table_id ? String(r.table_id) : '',
      reservation_date: r.reservation_date,
      reservation_time: r.reservation_time,
      party_size: r.party_size,
      notes: r.notes || '',
    })
  }

  const handleUpdateSubmit = async (e: React.FormEvent, id: number) => {
    e.preventDefault()
    setBusyId(id)
    try {
      await apiClient.put(`/reservations/${id}`, {
        ...editForm,
        table_id: editForm.table_id ? Number(editForm.table_id) : undefined,
        party_size: Number(editForm.party_size),
      })
      setEditingId(null)
      loadReservations()
    } catch (err) {
      console.error('Failed to update reservation:', err)
    } finally {
      setBusyId(null)
    }
  }

  const handleCancel = async (id: number) => {
    setBusyId(id)
    try {
      await apiClient.patch(`/reservations/${id}/cancel`, {})
      loadReservations()
    } catch (err) {
      console.error('Failed to cancel reservation:', err)
    } finally {
      setBusyId(null)
    }
  }

  const handleSeat = async (id: number) => {
    setBusyId(id)
    try {
      await apiClient.post(`/reservations/${id}/seat`, {})
      loadReservations()
    } catch (err) {
      console.error('Failed to seat reservation:', err)
    } finally {
      setBusyId(null)
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
                {editingId === r.reservation_id ? (
                  <form onSubmit={(e) => handleUpdateSubmit(e, r.reservation_id)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Customer Name</label>
                        <input
                          type="text"
                          value={editForm.customer_name}
                          onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                          className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Phone</label>
                        <input
                          type="tel"
                          value={editForm.customer_phone}
                          onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                          className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Date</label>
                        <input
                          type="date"
                          value={editForm.reservation_date}
                          onChange={(e) => setEditForm({ ...editForm, reservation_date: e.target.value })}
                          className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Time</label>
                        <input
                          type="time"
                          value={editForm.reservation_time}
                          onChange={(e) => setEditForm({ ...editForm, reservation_time: e.target.value })}
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
                          value={editForm.party_size}
                          onChange={(e) => setEditForm({ ...editForm, party_size: Number(e.target.value) })}
                          className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Table (optional)</label>
                        <input
                          type="number"
                          value={editForm.table_id}
                          onChange={(e) => setEditForm({ ...editForm, table_id: e.target.value })}
                          className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Notes</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={busyId === r.reservation_id}
                        className="flex-1 bg-[#f97316] text-white py-2.5 rounded-xl font-semibold hover:bg-[#f97316]/85 disabled:opacity-50"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex-1 bg-[#1c1c27] border border-white/8 text-[#f1f5f9] py-2.5 rounded-xl font-semibold hover:bg-[#1c1c27]/70"
                      >
                        Cancel Edit
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg" style={{ color: theme?.text_color }}>{r.customer_name}</h3>
                        <p className="text-sm text-[#6b7280]">{r.customer_phone}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${statusColor(r.status)}`}>
                        {r.status.replace(/_/g, ' ')}
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
                    {(canSeat || canManage) && (
                      <div className="flex gap-2 mt-4 pt-4 border-t border-white/8">
                        {canSeat && r.status === 'confirmed' && (
                          <button
                            onClick={() => handleSeat(r.reservation_id)}
                            disabled={busyId === r.reservation_id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 disabled:opacity-50"
                          >
                            Mark Seated
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => startEdit(r)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[#f1f5f9] border border-white/8 hover:bg-white/10"
                          >
                            Edit
                          </button>
                        )}
                        {canManage && (r.status === 'confirmed' || r.status === 'seated') && (
                          <button
                            onClick={() => handleCancel(r.reservation_id)}
                            disabled={busyId === r.reservation_id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-50"
                          >
                            Cancel Reservation
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

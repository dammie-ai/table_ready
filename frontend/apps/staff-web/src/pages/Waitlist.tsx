import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'

interface WaitlistEntry {
  entry_id: number
  customer_name: string
  phone: string
  party_size: number
  status: string
  table_id?: number
  created_at: string
}

export default function Waitlist() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customer_name: '', phone: '', party_size: 2, table_id: '' })
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    loadWaitlist()
  }, [])

  const loadWaitlist = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; entries: WaitlistEntry[] }>('/waitlist')
      setEntries(res.entries || [])
    } catch (err) {
      console.error('Failed to load waitlist:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await apiClient.post('/waitlist/join', {
        customer_name: form.customer_name,
        phone: form.phone,
        party_size: Number(form.party_size),
        table_id: Number(form.table_id),
      })
      setShowForm(false)
      setForm({ customer_name: '', phone: '', party_size: 2, table_id: '' })
      loadWaitlist()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join waitlist')
    }
  }

  const seatNext = async (entryId: number) => {
    setError('')
    setBusyId(entryId)
    try {
      await apiClient.post(`/waitlist/${entryId}/seat`, {})
      loadWaitlist()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seat customer')
    } finally {
      setBusyId(null)
    }
  }

  const cancelEntry = async (entryId: number) => {
    setError('')
    setBusyId(entryId)
    try {
      await apiClient.patch(`/waitlist/${entryId}/cancel`, {})
      loadWaitlist()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel waitlist entry')
    } finally {
      setBusyId(null)
    }
  }

  const markNoShow = async (entryId: number) => {
    setError('')
    setBusyId(entryId)
    try {
      await apiClient.patch(`/waitlist/${entryId}/noshow`, {})
      loadWaitlist()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark no-show')
    } finally {
      setBusyId(null)
    }
  }

  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'waiting': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      case 'seated': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      case 'cancelled': return 'bg-red-500/15 text-red-400 border-red-500/30'
      case 'no_show': return 'bg-gray-500/15 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading waitlist...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: theme?.text_color }}>Waitlist</h1>
            <p className="text-sm text-[#6b7280]">{entries.filter(e => e.status === 'waiting').length} customers waiting</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm font-medium hover:bg-[#f97316]/85"
          >
            {showForm ? 'Cancel' : 'Add to Waitlist'}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Join Waitlist</h2>
            <form onSubmit={handleJoin} className="space-y-4">
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
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Table</label>
                  <input
                    type="number"
                    value={form.table_id}
                    onChange={(e) => setForm({ ...form, table_id: e.target.value })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                    placeholder="Table ID"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#f97316] text-white py-3 rounded-xl font-semibold hover:bg-[#f97316]/85"
              >
                Join Waitlist
              </button>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-16 text-[#6b7280]">
              <p className="text-xl mb-2">Waitlist is empty</p>
              <p className="text-sm">Add customers to the waitlist when tables are full</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.entry_id} className="bg-[#111118] border border-white/8 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: theme?.text_color }}>{entry.customer_name}</h3>
                    <p className="text-sm text-[#6b7280]">{entry.phone}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${statusColor(entry.status)}`}>
                    {entry.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[#6b7280]">
                    Party of {entry.party_size} • Added {new Date(entry.created_at).toLocaleTimeString()}
                  </div>
                  {entry.status === 'waiting' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => seatNext(entry.entry_id)}
                        disabled={busyId === entry.entry_id}
                        className="px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-500/25 disabled:opacity-50"
                      >
                        Seat
                      </button>
                      <button
                        onClick={() => markNoShow(entry.entry_id)}
                        disabled={busyId === entry.entry_id}
                        className="px-3 py-1.5 bg-gray-500/15 text-gray-400 border border-gray-500/30 rounded-lg text-xs font-medium hover:bg-gray-500/25 disabled:opacity-50"
                      >
                        No-Show
                      </button>
                      <button
                        onClick={() => cancelEntry(entry.entry_id)}
                        disabled={busyId === entry.entry_id}
                        className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/25 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

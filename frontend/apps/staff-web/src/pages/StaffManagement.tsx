import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'

interface StaffMember {
  id: number
  username: string
  role: string
  name?: string
  employee_id?: number
  account_lock_status?: boolean
}

interface TableRow {
  table_id: number
  table_number: number
  status_state: string
  waiter_id: number | null
  waiter_name: string | null
}

export default function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', role: 'waiter', name: '' })
  const [tables, setTables] = useState<TableRow[]>([])
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assigningTableId, setAssigningTableId] = useState<number | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<number | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    loadStaff()
    loadTables()
  }, [])

  const loadStaff = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; staff_on_shift: StaffMember[] }>('/dashboard/admin')
      setStaff(res.staff_on_shift || [])
    } catch (err) {
      console.error('Failed to load staff:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTables = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; tables: TableRow[] }>('/tables/floor-layout')
      setTables(res.tables || [])
    } catch (err) {
      console.error('Failed to load tables:', err)
    }
  }

  const assignWaiter = async (tableId: number, waiterId: string) => {
    setAssignError(null)
    setAssigningTableId(tableId)
    try {
      const res = await apiClient.patch<{ success: boolean; table: { waiter_id: number | null } }>(
        `/tables/${tableId}/assign-waiter`,
        { waiter_id: waiterId ? Number(waiterId) : null }
      )
      const waiter = staff.find((s) => s.id === res.table.waiter_id)
      setTables((prev) =>
        prev.map((t) =>
          t.table_id === tableId ? { ...t, waiter_id: res.table.waiter_id, waiter_name: waiter?.username || null } : t
        )
      )
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign waiter')
    } finally {
      setAssigningTableId(null)
    }
  }

  const waitersOnly = staff.filter((s) => s.role === 'waiter')
  const tableCountForWaiter = (waiterId: number) => tables.filter((t) => t.waiter_id === waiterId).length

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    try {
      await apiClient.post('/auth/register', {
        username: form.username,
        password: form.password,
        role: form.role,
      })
      setShowForm(false)
      setForm({ username: '', password: '', role: 'waiter', name: '' })
      loadStaff()
    } catch (err) {
      // Previously only console.error'd -- a duplicate username or a
      // too-short password left the form sitting there with zero
      // indication of what went wrong.
      setCreateError(err instanceof Error ? err.message : 'Failed to create staff account')
    }
  }

  const handleUnlock = async (employeeId: number) => {
    setUnlockingId(employeeId)
    try {
      await apiClient.patch(`/admin/employees/${employeeId}/unlock`, {})
      await loadStaff()
    } catch (err) {
      console.error('Failed to unlock employee:', err)
    } finally {
      setUnlockingId(null)
    }
  }

  const roleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30'
      case 'kitchen': return 'bg-red-500/15 text-red-400 border-red-500/30'
      case 'waiter': return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
      case 'delivery': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      case 'assistant_manager': return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading staff...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold" style={{ color: theme?.text_color }}>Staff Management</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm font-medium hover:bg-[#f97316]/85"
          >
            {showForm ? 'Cancel' : 'Add Staff'}
          </button>
        </div>

        {showForm && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add Staff Member</h2>
            {createError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                  >
                    <option value="waiter">Waiter</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="delivery">Delivery</option>
                    <option value="assistant_manager">Assistant Manager</option>
                    <option value="manager">Manager</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#f97316] text-white py-3 rounded-xl font-semibold hover:bg-[#f97316]/85"
              >
                Create Staff Account
              </button>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {staff.length === 0 ? (
            <div className="text-center py-16 text-[#6b7280]">
              <p className="text-xl mb-2">No staff members found</p>
              <p className="text-sm">Add staff members to get started</p>
            </div>
          ) : (
            staff.map((member) => (
              <div key={member.id} className="bg-[#111118] border border-white/8 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg" style={{ color: theme?.text_color }}>{member.name || member.username}</h3>
                  <p className="text-sm text-[#6b7280]">@{member.username}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${roleColor(member.role)}`}>
                    {member.role}
                  </span>
                  {member.account_lock_status && (
                    <>
                      <span className="text-xs px-2.5 py-1 rounded-full border bg-red-500/15 text-red-400 border-red-500/30">
                        Locked
                      </span>
                      {member.employee_id && (
                        <button
                          onClick={() => handleUnlock(member.employee_id!)}
                          disabled={unlockingId === member.employee_id}
                          className="text-xs px-2.5 py-1 rounded-full border bg-white/5 text-[#f1f5f9] border-white/8 hover:bg-white/10 disabled:opacity-50"
                        >
                          {unlockingId === member.employee_id ? '…' : 'Unlock'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-1" style={{ color: theme?.text_color }}>Table Assignments</h2>
          <p className="text-sm text-[#6b7280] mb-4">Each waiter can be assigned up to 3 tables.</p>

          {assignError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {assignError}
            </div>
          )}

          <div className="space-y-3">
            {tables.map((table) => (
              <div key={table.table_id} className="bg-[#111118] border border-white/8 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg" style={{ color: theme?.text_color }}>Table {table.table_number}</h3>
                  <p className="text-sm text-[#6b7280] capitalize">{table.status_state}</p>
                </div>
                <select
                  value={table.waiter_id ?? ''}
                  onChange={(e) => assignWaiter(table.table_id, e.target.value)}
                  disabled={assigningTableId === table.table_id}
                  className="bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {waitersOnly.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.username} ({tableCountForWaiter(w.id)}/3)
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

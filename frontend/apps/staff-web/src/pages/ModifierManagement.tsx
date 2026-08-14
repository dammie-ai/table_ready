import { useState, useEffect } from 'react'
import {
  getModifiers, createModifier, updateModifier, deleteModifier,
  getMenuItemModifiers, addModifierToItem, removeModifierFromItem,
  getMenuItems, type Modifier, type ItemModifier, type MenuItem,
} from '../lib/menuApi'

const TYPES: Modifier['modifier_type'][] = ['choice', 'extra', 'removal', 'preparation']

const TYPE_COLOR: Record<string, string> = {
  choice: 'bg-blue-500/15 text-blue-400',
  extra: 'bg-emerald-500/15 text-emerald-400',
  removal: 'bg-red-500/15 text-red-400',
  preparation: 'bg-purple-500/15 text-purple-400',
}

export default function ModifierManagement() {
  const [modifiers, setModifiers] = useState<Modifier[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ name: '', description: '', price_adjustment: '0', modifier_type: 'choice' as Modifier['modifier_type'], is_active: true })

  const [selectedItemId, setSelectedItemId] = useState('')
  const [itemModifiers, setItemModifiers] = useState<ItemModifier[]>([])
  const [newItemModifierId, setNewItemModifierId] = useState('')
  const [assigning, setAssigning] = useState(false)

  const load = async () => {
    try {
      const [modRes, menuRes] = await Promise.all([getModifiers(), getMenuItems()])
      setModifiers(modRes.modifiers)
      setMenuItems(menuRes.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modifiers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selectedItemId) { setItemModifiers([]); return }
    getMenuItemModifiers(parseInt(selectedItemId)).then((res) => setItemModifiers(res.modifiers)).catch((err) => console.error('Failed to load item modifiers:', err))
  }, [selectedItemId])

  const resetForm = () => {
    setForm({ name: '', description: '', price_adjustment: '0', modifier_type: 'choice', is_active: true })
    setEditingModifier(null)
    setShowForm(false)
  }

  const handleEdit = (mod: Modifier) => {
    setEditingModifier(mod)
    setForm({
      name: mod.name,
      description: mod.description || '',
      price_adjustment: mod.price_adjustment.toString(),
      modifier_type: mod.modifier_type,
      is_active: mod.is_active,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        price_adjustment: parseFloat(form.price_adjustment) || 0,
        modifier_type: form.modifier_type,
        is_active: form.is_active,
      }
      if (editingModifier) {
        await updateModifier(editingModifier.modifier_id, payload)
      } else {
        await createModifier(payload)
      }
      await load()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save modifier')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (mod: Modifier) => {
    if (!confirm(`Delete "${mod.name}"? This removes it from every menu item it's attached to.`)) return
    try {
      await deleteModifier(mod.modifier_id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete modifier')
    }
  }

  const handleAssign = async () => {
    if (!selectedItemId || !newItemModifierId) return
    setAssigning(true)
    try {
      await addModifierToItem(parseInt(selectedItemId), parseInt(newItemModifierId))
      const res = await getMenuItemModifiers(parseInt(selectedItemId))
      setItemModifiers(res.modifiers)
      setNewItemModifierId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign modifier')
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async (modifierId: number) => {
    if (!selectedItemId) return
    try {
      await removeModifierFromItem(parseInt(selectedItemId), modifierId)
      setItemModifiers((prev) => prev.filter((m) => m.modifier_id !== modifierId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove modifier')
    }
  }

  const availableForAssign = modifiers.filter((m) => !itemModifiers.some((im) => im.modifier_id === m.modifier_id))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-[#6b7280]">Loading modifiers...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 bg-[#09090f] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#f1f5f9]">Modifier Management</h1>
        <button onClick={() => setShowForm(true)} className="bg-[#f97316] text-white px-4 py-2 rounded-lg hover:bg-[#f97316]/80 transition-colors">
          Add Modifier
        </button>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="grid gap-3 md:grid-cols-2 mb-8">
        {modifiers.map((mod) => (
          <div key={mod.modifier_id} className={`border border-white/8 rounded-lg p-4 bg-[#111118] ${!mod.is_active ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-[#f1f5f9]">{mod.name}</h3>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${TYPE_COLOR[mod.modifier_type]}`}>{mod.modifier_type}</span>
              </div>
              <span className="text-sm text-[#f1f5f9]">{mod.price_adjustment >= 0 ? '+' : ''}${mod.price_adjustment.toFixed(2)}</span>
            </div>
            {mod.description && <p className="text-sm text-[#6b7280] mt-1">{mod.description}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleEdit(mod)} className="text-sm bg-white/5 text-[#f1f5f9] px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">Edit</button>
              <button onClick={() => handleDelete(mod)} className="text-sm bg-red-500/15 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/25 transition-colors">Delete</button>
            </div>
          </div>
        ))}
        {modifiers.length === 0 && <p className="text-[#6b7280]">No modifiers yet.</p>}
      </div>

      <div className="border-t border-white/8 pt-6">
        <h2 className="text-xl font-bold text-[#f1f5f9] mb-4">Assign Modifiers to a Menu Item</h2>
        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="w-full max-w-sm border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] outline-none focus:border-[#f97316]/50 mb-4"
        >
          <option value="">Select a menu item…</option>
          {menuItems.map((m) => <option key={m.item_id} value={m.item_id}>{m.name}</option>)}
        </select>

        {selectedItemId && (
          <>
            <div className="space-y-2 mb-3">
              {itemModifiers.map((im) => (
                <div key={im.item_modifier_id} className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-sm text-[#f1f5f9]">{im.name} <span className={`text-xs px-1.5 py-0.5 rounded-full ml-1 ${TYPE_COLOR[im.modifier_type]}`}>{im.modifier_type}</span></span>
                  <button onClick={() => handleUnassign(im.modifier_id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                </div>
              ))}
              {itemModifiers.length === 0 && <p className="text-sm text-[#6b7280]">No modifiers assigned to this item yet.</p>}
            </div>
            <div className="flex gap-2 max-w-sm">
              <select value={newItemModifierId} onChange={(e) => setNewItemModifierId(e.target.value)} className="flex-1 border border-white/8 rounded-lg px-3 py-2 text-sm text-[#f1f5f9] bg-[#1c1c27] outline-none focus:border-[#f97316]/50">
                <option value="">Select a modifier…</option>
                {availableForAssign.map((m) => <option key={m.modifier_id} value={m.modifier_id}>{m.name}</option>)}
              </select>
              <button onClick={handleAssign} disabled={!newItemModifierId || assigning} className="bg-white/5 text-[#f1f5f9] px-3 py-2 rounded-lg text-sm hover:bg-white/10 disabled:opacity-40 transition-colors">
                Add
              </button>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111118] border border-white/8 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-[#f1f5f9]">{editingModifier ? 'Edit Modifier' : 'New Modifier'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] placeholder-[#6b7280] outline-none focus:border-[#f97316]/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] placeholder-[#6b7280] outline-none focus:border-[#f97316]/50" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Type</label>
                <select value={form.modifier_type} onChange={(e) => setForm({ ...form, modifier_type: e.target.value as Modifier['modifier_type'] })}
                  className="w-full border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] outline-none focus:border-[#f97316]/50">
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <p className="text-xs text-[#6b7280] mt-1">"removal" is the allergy-relevant type (e.g. "No Onions") — flagged distinctly on the kitchen display.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Price Adjustment ($)</label>
                <input type="number" step="0.01" value={form.price_adjustment} onChange={(e) => setForm({ ...form, price_adjustment: e.target.value })}
                  className="w-full border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] placeholder-[#6b7280] outline-none focus:border-[#f97316]/50" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="mod_is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="mod_is_active" className="text-sm font-medium text-[#f1f5f9]">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-[#f97316] text-white py-2 rounded-lg hover:bg-[#f97316]/80 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : editingModifier ? 'Save Changes' : 'Create Modifier'}
                </button>
                <button type="button" onClick={resetForm} className="flex-1 border border-white/8 py-2 rounded-lg text-[#f1f5f9] hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import {
  getAllComboMeals, createComboMeal, updateComboMeal, deleteComboMeal,
  addComboSide, removeComboSide, getComboMealDetail, getMenuItems,
  type ComboMeal, type ComboMealSide, type MenuItem,
} from '../lib/menuApi'

const CATEGORIES = ['Entree', 'Meat', 'Fish', 'Dessert', 'Combo']

export default function ComboManagement() {
  const [combos, setCombos] = useState<ComboMeal[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCombo, setEditingCombo] = useState<ComboMeal | null>(null)
  const [sides, setSides] = useState<ComboMealSide[]>([])
  const [saving, setSaving] = useState(false)
  const [newSideItemId, setNewSideItemId] = useState('')

  const [form, setForm] = useState({
    name: '', description: '', base_price: '', image_url: '',
    required_main_category: 'Entree', max_sides: '2', sides_category: 'Entree', is_active: true,
  })

  const load = async () => {
    try {
      const [comboRes, menuRes] = await Promise.all([getAllComboMeals(), getMenuItems()])
      setCombos(comboRes.combos)
      setMenuItems(menuRes.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load combos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({ name: '', description: '', base_price: '', image_url: '', required_main_category: 'Entree', max_sides: '2', sides_category: 'Entree', is_active: true })
    setEditingCombo(null)
    setSides([])
    setNewSideItemId('')
    setShowForm(false)
  }

  const handleEdit = async (combo: ComboMeal) => {
    setEditingCombo(combo)
    setForm({
      name: combo.name,
      description: combo.description || '',
      base_price: combo.base_price.toString(),
      image_url: combo.image_url || '',
      required_main_category: combo.required_main_category,
      max_sides: combo.max_sides.toString(),
      sides_category: combo.sides_category,
      is_active: combo.is_active,
    })
    setShowForm(true)
    try {
      const detail = await getComboMealDetail(combo.combo_id)
      setSides(detail.sides)
    } catch (err) {
      console.error('Failed to load combo sides:', err)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm((prev) => ({ ...prev, image_url: reader.result as string }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        base_price: parseFloat(form.base_price),
        image_url: form.image_url || undefined,
        required_main_category: form.required_main_category,
        max_sides: parseInt(form.max_sides),
        sides_category: form.sides_category,
      }
      if (editingCombo) {
        await updateComboMeal(editingCombo.combo_id, { ...payload, is_active: form.is_active })
        await load()
        resetForm()
      } else {
        // Drop straight into edit mode so sides (which need a combo_id
        // that doesn't exist until now) can be added immediately, rather
        // than forcing a second "Edit" click right after creating.
        const res = await createComboMeal(payload)
        await load()
        await handleEdit(res.combo)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save combo')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (combo: ComboMeal) => {
    try {
      await updateComboMeal(combo.combo_id, { is_active: !combo.is_active })
      await load()
    } catch (err) {
      console.error('Failed to toggle combo:', err)
    }
  }

  const handleAddSide = async () => {
    if (!editingCombo || !newSideItemId) return
    try {
      await addComboSide(editingCombo.combo_id, parseInt(newSideItemId))
      const detail = await getComboMealDetail(editingCombo.combo_id)
      setSides(detail.sides)
      setNewSideItemId('')
    } catch (err) {
      console.error('Failed to add side:', err)
    }
  }

  const handleRemoveSide = async (sideId: number) => {
    if (!editingCombo) return
    try {
      await removeComboSide(editingCombo.combo_id, sideId)
      setSides((prev) => prev.filter((s) => s.combo_side_id !== sideId))
    } catch (err) {
      console.error('Failed to remove side:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-[#6b7280]">Loading combos...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 bg-[#09090f] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#f1f5f9]">Combo Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#f97316] text-white px-4 py-2 rounded-lg hover:bg-[#f97316]/80 transition-colors"
        >
          Add Combo
        </button>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {combos.map((combo) => (
          <div key={combo.combo_id} className={`border border-white/8 rounded-lg p-4 bg-[#111118] ${!combo.is_active ? 'opacity-50' : ''}`}>
            {combo.image_url && <img src={combo.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2 border border-white/8" />}
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-[#f1f5f9]">{combo.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${combo.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-[#6b7280]'}`}>
                {combo.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-[#6b7280] mt-1">{combo.description}</p>
            <p className="text-sm text-[#f1f5f9] mt-1">${combo.base_price.toFixed(2)} · main: {combo.required_main_category} · up to {combo.max_sides} {combo.sides_category} side(s)</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleEdit(combo)} className="text-sm bg-white/5 text-[#f1f5f9] px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">Edit / Sides</button>
              <button onClick={() => handleToggleActive(combo)} className="text-sm bg-white/5 text-[#f1f5f9] px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                {combo.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
              <button
                onClick={() => {
                  if (!confirm(`Delete "${combo.name}"? This deactivates it (existing orders referencing it are preserved).`)) return
                  deleteComboMeal(combo.combo_id).then(load).catch((err) => setError(err instanceof Error ? err.message : 'Failed to delete combo'))
                }}
                className="text-sm bg-red-500/15 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/25 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {combos.length === 0 && <p className="text-[#6b7280]">No combos yet.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111118] border border-white/8 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-[#f1f5f9]">{editingCombo ? 'Edit Combo' : 'New Combo'}</h2>

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
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Photo</label>
                {form.image_url && <img src={form.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2 border border-white/8" />}
                <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://... or upload" className="w-full border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] placeholder-[#6b7280] outline-none focus:border-[#f97316]/50" />
                <label className="inline-block mt-2 text-sm text-[#f97316] hover:text-[#f97316]/80 cursor-pointer">
                  Upload a photo
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Bundle Price ($)</label>
                <input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                  className="w-full border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] placeholder-[#6b7280] outline-none focus:border-[#f97316]/50" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Required Main Category</label>
                <select value={form.required_main_category} onChange={(e) => setForm({ ...form, required_main_category: e.target.value })}
                  className="w-full border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] outline-none focus:border-[#f97316]/50">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Max Sides</label>
                  <input type="number" min="1" value={form.max_sides} onChange={(e) => setForm({ ...form, max_sides: e.target.value })}
                    className="w-full border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] placeholder-[#6b7280] outline-none focus:border-[#f97316]/50" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Sides Category</label>
                  <select value={form.sides_category} onChange={(e) => setForm({ ...form, sides_category: e.target.value })}
                    className="w-full border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] outline-none focus:border-[#f97316]/50">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {editingCombo && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Available Sides</label>
                  <div className="space-y-1 mb-2">
                    {sides.map((s) => {
                      // getComboMealDetail's sides rows don't carry a joined
                      // item name (same gap the customer combo builder works
                      // around by resolving names from the loaded menu list
                      // itself) — do the same lookup here.
                      const itemName = menuItems.find((m) => m.item_id === s.menu_item_id)?.name || `Item #${s.menu_item_id}`
                      return (
                        <div key={s.combo_side_id} className="flex justify-between items-center text-sm bg-white/5 rounded-lg px-3 py-1.5">
                          <span className="text-[#f1f5f9]">{itemName}{s.is_default ? ' (default)' : ''}</span>
                          <button type="button" onClick={() => handleRemoveSide(s.combo_side_id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                        </div>
                      )
                    })}
                    {sides.length === 0 && <p className="text-xs text-[#6b7280]">No sides added yet.</p>}
                  </div>
                  <div className="flex gap-2">
                    <select value={newSideItemId} onChange={(e) => setNewSideItemId(e.target.value)}
                      className="flex-1 border border-white/8 rounded-lg px-3 py-2 text-sm text-[#f1f5f9] bg-[#1c1c27] outline-none focus:border-[#f97316]/50">
                      <option value="">Select an item…</option>
                      {menuItems.map((m) => <option key={m.item_id} value={m.item_id}>{m.name}</option>)}
                    </select>
                    <button type="button" onClick={handleAddSide} disabled={!newSideItemId}
                      className="bg-white/5 text-[#f1f5f9] px-3 py-2 rounded-lg text-sm hover:bg-white/10 disabled:opacity-40 transition-colors">
                      Add
                    </button>
                  </div>
                </div>
              )}

              {editingCombo && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="combo_is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
                  <label htmlFor="combo_is_active" className="text-sm font-medium text-[#f1f5f9]">Active</label>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-[#f97316] text-white py-2 rounded-lg hover:bg-[#f97316]/80 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : editingCombo ? 'Save Changes' : 'Create Combo'}
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

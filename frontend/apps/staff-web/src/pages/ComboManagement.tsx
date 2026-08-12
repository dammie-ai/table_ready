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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading combos...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Combo Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Combo
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {combos.map((combo) => (
          <div key={combo.combo_id} className={`border rounded-lg p-4 bg-white ${!combo.is_active ? 'opacity-50' : ''}`}>
            {combo.image_url && <img src={combo.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2 border" />}
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-gray-900">{combo.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${combo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {combo.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{combo.description}</p>
            <p className="text-sm text-gray-700 mt-1">${combo.base_price.toFixed(2)} · main: {combo.required_main_category} · up to {combo.max_sides} {combo.sides_category} side(s)</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleEdit(combo)} className="text-sm bg-gray-100 text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-200">Edit / Sides</button>
              <button onClick={() => handleToggleActive(combo)} className="text-sm bg-gray-100 text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                {combo.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
              <button
                onClick={() => {
                  if (!confirm(`Delete "${combo.name}"? This deactivates it (existing orders referencing it are preserved).`)) return
                  deleteComboMeal(combo.combo_id).then(load).catch((err) => setError(err instanceof Error ? err.message : 'Failed to delete combo'))
                }}
                className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {combos.length === 0 && <p className="text-gray-500">No combos yet.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">{editingCombo ? 'Edit Combo' : 'New Combo'}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400" rows={2} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Photo</label>
                {form.image_url && <img src={form.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2 border" />}
                <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://... or upload" className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400" />
                <label className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                  Upload a photo
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Bundle Price ($)</label>
                <input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Required Main Category</label>
                <select value={form.required_main_category} onChange={(e) => setForm({ ...form, required_main_category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">Max Sides</label>
                  <input type="number" min="1" value={form.max_sides} onChange={(e) => setForm({ ...form, max_sides: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">Sides Category</label>
                  <select value={form.sides_category} onChange={(e) => setForm({ ...form, sides_category: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {editingCombo && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">Available Sides</label>
                  <div className="space-y-1 mb-2">
                    {sides.map((s) => {
                      // getComboMealDetail's sides rows don't carry a joined
                      // item name (same gap the customer combo builder works
                      // around by resolving names from the loaded menu list
                      // itself) — do the same lookup here.
                      const itemName = menuItems.find((m) => m.item_id === s.menu_item_id)?.name || `Item #${s.menu_item_id}`
                      return (
                        <div key={s.combo_side_id} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg px-3 py-1.5">
                          <span className="text-gray-900">{itemName}{s.is_default ? ' (default)' : ''}</span>
                          <button type="button" onClick={() => handleRemoveSide(s.combo_side_id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
                        </div>
                      )
                    })}
                    {sides.length === 0 && <p className="text-xs text-gray-400">No sides added yet.</p>}
                  </div>
                  <div className="flex gap-2">
                    <select value={newSideItemId} onChange={(e) => setNewSideItemId(e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white">
                      <option value="">Select an item…</option>
                      {menuItems.map((m) => <option key={m.item_id} value={m.item_id}>{m.name}</option>)}
                    </select>
                    <button type="button" onClick={handleAddSide} disabled={!newSideItemId}
                      className="bg-gray-100 text-gray-900 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-40">
                      Add
                    </button>
                  </div>
                </div>
              )}

              {editingCombo && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="combo_is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
                  <label htmlFor="combo_is_active" className="text-sm font-medium text-gray-900">Active</label>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving…' : editingCombo ? 'Save Changes' : 'Create Combo'}
                </button>
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 text-gray-900 py-2 rounded-lg hover:bg-gray-200">
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

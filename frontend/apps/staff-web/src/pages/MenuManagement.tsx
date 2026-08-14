import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import type { MenuItem } from '../lib/menuApi'

export default function MenuManagement() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    category_type: 'Entree',
    description: '',
    base_price: '',
    prep_time_minutes: '10',
    is_active: true,
    image_url: '',
  })

  const loadItems = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; items: MenuItem[] }>('/menu')
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const resetForm = () => {
    setForm({
      name: '',
      category_type: 'Entree',
      description: '',
      base_price: '',
      prep_time_minutes: '10',
      is_active: true,
      image_url: '',
    })
    setEditingItem(null)
    setShowForm(false)
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      category_type: item.category_type,
      description: item.description || '',
      base_price: item.base_price.toString(),
      prep_time_minutes: item.prep_time_minutes.toString(),
      is_active: item.is_active,
      image_url: item.image_url || '',
    })
    setShowForm(true)
  }

  // No cloud file storage in this deployment (matches Settings.tsx's
  // branding logo/background upload) — inlined as a data URI and stored
  // directly on the menu item, no backend changes needed.
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
        category_type: form.category_type,
        description: form.description || undefined,
        base_price: parseFloat(form.base_price),
        prep_time_minutes: parseInt(form.prep_time_minutes),
        is_active: form.is_active,
        image_url: form.image_url || undefined,
      }

      if (editingItem) {
        await apiClient.put(`/menu/${editingItem.item_id}`, payload)
      } else {
        await apiClient.post('/menu', payload)
      }

      await loadItems()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu item')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (itemId: number) => {
    setError('')
    try {
      await apiClient.patch(`/menu/${itemId}/toggle`, {})
      await loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle item')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-[#6b7280]">Loading menu...</p>
      </div>
    )
  }

  const inputClass = "w-full border border-white/8 rounded-lg px-3 py-2 text-[#f1f5f9] bg-[#1c1c27] placeholder-[#6b7280] outline-none focus:border-[#f97316]/50"

  return (
    <div className="max-w-6xl mx-auto p-4 bg-[#09090f] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#f1f5f9]">Menu Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#f97316] text-white px-4 py-2 rounded-lg hover:bg-[#f97316]/80 transition-colors"
        >
          Add Item
        </button>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111118] border border-white/8 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-[#f1f5f9]">
              {editingItem ? 'Edit Item' : 'New Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Category</label>
                <select
                  value={form.category_type}
                  onChange={(e) => setForm({ ...form, category_type: e.target.value })}
                  className={inputClass}
                >
                  <option value="Entree">Entree</option>
                  <option value="Meat">Meat</option>
                  <option value="Fish">Fish</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Combo">Combo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Photo</label>
                {form.image_url && (
                  <img src={form.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2 border border-white/8" />
                )}
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://... or upload"
                  className={inputClass}
                />
                <label className="inline-block mt-2 text-sm text-[#f97316] hover:text-[#f97316]/80 cursor-pointer">
                  Upload a photo
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#f1f5f9]">Prep Time (minutes)</label>
                <input
                  type="number"
                  value={form.prep_time_minutes}
                  onChange={(e) => setForm({ ...form, prep_time_minutes: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-[#f1f5f9]">
                  Active / In Stock
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-white/8 py-2 rounded-lg text-[#f1f5f9] hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#f97316] text-white py-2 rounded-lg hover:bg-[#f97316]/80 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-[#111118] border border-white/8 rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Photo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {items.map((item) => (
              <tr key={item.item_id} className={item.is_active ? '' : 'bg-white/[0.02]'}>
                <td className="px-6 py-4">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-[#6b7280] text-xs">—</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-[#f1f5f9]">{item.name}</p>
                    <p className="text-sm text-[#6b7280]">{item.description}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[#f1f5f9]">{item.category_type}</td>
                <td className="px-6 py-4 text-sm font-medium text-[#f1f5f9]">${item.base_price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.is_active
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {item.is_active ? 'Active' : 'Out of Stock'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-[#f97316] hover:text-[#f97316]/80 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggle(item.item_id)}
                      className={`text-sm font-medium ${
                        item.is_active
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      {item.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="p-8 text-center text-[#6b7280]">No menu items found</div>
        )}
      </div>
    </div>
  )
}

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
    try {
      await apiClient.patch(`/menu/${itemId}/toggle`, {})
      await loadItems()
    } catch (err) {
      console.error('Failed to toggle item:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading menu...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Item
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              {editingItem ? 'Edit Item' : 'New Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Category</label>
                <select
                  value={form.category_type}
                  onChange={(e) => setForm({ ...form, category_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400"
                >
                  <option value="Entree">Entree</option>
                  <option value="Meat">Meat</option>
                  <option value="Fish">Fish</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Combo">Combo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Photo</label>
                {form.image_url && (
                  <img src={form.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2 border" />
                )}
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://... or upload"
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400"
                />
                <label className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                  Upload a photo
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Prep Time (minutes)</label>
                <input
                  type="number"
                  value={form.prep_time_minutes}
                  onChange={(e) => setForm({ ...form, prep_time_minutes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400"
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
                <label htmlFor="is_active" className="text-sm font-medium">
                  Active / In Stock
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.item_id} className={item.is_active ? '' : 'bg-gray-50'}>
                <td className="px-6 py-4">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-xs">—</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{item.category_type}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">${item.base_price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.is_active ? 'Active' : 'Out of Stock'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggle(item.item_id)}
                      className={`text-sm font-medium ${
                        item.is_active
                          ? 'text-red-600 hover:text-red-800'
                          : 'text-green-600 hover:text-green-800'
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
          <div className="p-8 text-center text-gray-500">No menu items found</div>
        )}
      </div>
    </div>
  )
}

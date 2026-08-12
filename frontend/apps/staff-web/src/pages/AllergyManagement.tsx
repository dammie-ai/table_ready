import { useState, useEffect } from 'react'
import {
  getMenuItems, getAllergenSummary, getAllergyAlerts, updateMenuItemAllergens,
  type MenuItem, type AllergyAlert,
} from '../lib/menuApi'

const COMMON_ALLERGENS = ['Gluten', 'Dairy', 'Eggs', 'Peanuts', 'Tree Nuts', 'Soy', 'Fish', 'Shellfish', 'Sesame']

export default function AllergyManagement() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [alerts, setAlerts] = useState<AllergyAlert[]>([])
  const [frequency, setFrequency] = useState<Record<string, { count: number; items: string[] }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'items' | 'alerts' | 'summary'>('items')

  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editSelection, setEditSelection] = useState<Set<string>>(new Set())
  const [customAllergen, setCustomAllergen] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [menuRes, summaryRes, alertsRes] = await Promise.all([getMenuItems(), getAllergenSummary(), getAllergyAlerts()])
      setItems(menuRes.items)
      setFrequency(summaryRes.allergen_frequency)
      setAlerts(alertsRes.alerts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allergy data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startEdit = (item: MenuItem) => {
    setEditingItemId(item.item_id)
    setEditSelection(new Set(item.allergens || []))
    setCustomAllergen('')
  }

  const toggleAllergen = (a: string) => {
    setEditSelection((prev) => {
      const next = new Set(prev)
      if (next.has(a)) next.delete(a)
      else next.add(a)
      return next
    })
  }

  const addCustomAllergen = () => {
    const trimmed = customAllergen.trim()
    if (!trimmed) return
    setEditSelection((prev) => new Set(prev).add(trimmed))
    setCustomAllergen('')
  }

  const saveAllergens = async (itemId: number) => {
    setSaving(true)
    setError('')
    try {
      const allergensArr = Array.from(editSelection)
      const res = await updateMenuItemAllergens(itemId, allergensArr)
      setItems((prev) => prev.map((i) => (i.item_id === itemId ? { ...i, allergens: res.item.allergens } : i)))
      setEditingItemId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save allergens')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading allergy data...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Allergy Management</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="flex gap-1 mb-6">
        {(['items', 'alerts', 'summary'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'items' ? 'Menu Item Tagging' : tab === 'alerts' ? `Active Alerts (${alerts.length})` : 'Frequency Summary'}
          </button>
        ))}
      </div>

      {activeTab === 'items' && (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.item_id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(item.allergens || []).length === 0 ? (
                      <span className="text-xs text-gray-400">No allergens tagged</span>
                    ) : (
                      (item.allergens || []).map((a) => (
                        <span key={a} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{a}</span>
                      ))
                    )}
                  </div>
                </div>
                <button onClick={() => startEdit(item)} className="text-sm bg-gray-100 text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                  Edit
                </button>
              </div>

              {editingItemId === item.item_id && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {COMMON_ALLERGENS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAllergen(a)}
                        className={`text-xs px-3 py-1.5 rounded-full border ${
                          editSelection.has(a) ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                    {Array.from(editSelection).filter((a) => !COMMON_ALLERGENS.includes(a)).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAllergen(a)}
                        className="text-xs px-3 py-1.5 rounded-full border bg-red-600 text-white border-red-600"
                      >
                        {a} ×
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 max-w-sm mb-4">
                    <input
                      type="text"
                      value={customAllergen}
                      onChange={(e) => setCustomAllergen(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomAllergen() } }}
                      placeholder="Add custom allergen…"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400"
                    />
                    <button type="button" onClick={addCustomAllergen} className="bg-gray-100 text-gray-900 px-3 py-2 rounded-lg text-sm hover:bg-gray-200">
                      Add
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => saveAllergens(item.item_id)} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingItemId(null)} className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-2">
          {alerts.length === 0 && <p className="text-gray-500">No active allergy alerts.</p>}
          {alerts.map((a) => (
            <div key={a.order_item_id} className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{a.item_name} × {a.quantity}</p>
                  <p className="text-xs text-gray-500">
                    Order #{a.master_order_id} · {a.order_type}{a.table_number ? ` · Table ${a.table_number}` : ''} · {a.order_status}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(a.allergens || []).map((al) => (
                      <span key={al} className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">{al}</span>
                    ))}
                  </div>
                </div>
                <span className="text-xs font-mono text-gray-500">{a.item_status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-2">
          {Object.keys(frequency).length === 0 && <p className="text-gray-500">No allergens tagged on any menu item yet.</p>}
          {Object.entries(frequency)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([allergen, data]) => (
              <div key={allergen} className="border rounded-lg p-4 bg-white">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">{allergen}</span>
                  <span className="text-sm text-gray-500">{data.count} item{data.count === 1 ? '' : 's'}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{data.items.join(', ')}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

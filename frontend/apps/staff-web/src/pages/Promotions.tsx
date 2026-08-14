import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'
import { getMenuItems, type MenuItem } from '../lib/menuApi'

interface Promotion {
  promotion_id: number
  type: string
  menu_item_id?: number
  name?: string
  discount_percentage?: number
  active: boolean
  start_date?: string
  end_date?: string
}

export default function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [dishOfWeek, setDishOfWeek] = useState<Promotion | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [discountPct, setDiscountPct] = useState('0')
  const [saving, setSaving] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    loadPromotions()
    getMenuItems().then((res) => setMenuItems(res.items || [])).catch((err) => console.error('Failed to load menu items:', err))
  }, [])

  const loadPromotions = async () => {
    try {
      const [promosRes, dishRes] = await Promise.all([
        apiClient.get<{ success: boolean; discounts: Promotion[] }>('/promotions/dish-of-week/active-discounts'),
        apiClient.get<{ success: boolean; dish: any }>('/promotions/dish-of-week'),
      ])
      setPromotions(promosRes.discounts || [])
      setDishOfWeek(dishRes.dish || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load promotions')
    } finally {
      setLoading(false)
    }
  }

  const togglePromotion = async (promotionId: number, active: boolean) => {
    setError('')
    try {
      await apiClient.patch(`/promotions/${promotionId}`, { active: !active })
      loadPromotions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle promotion')
    }
  }

  const handleSetDishOfWeek = async () => {
    if (!selectedItemId) return
    setSaving(true)
    setError('')
    try {
      await apiClient.post('/promotions/dish-of-week/override', {
        menu_item_id: parseInt(selectedItemId),
        discount_percentage: parseFloat(discountPct) || 0,
      })
      setSelectedItemId('')
      setDiscountPct('0')
      loadPromotions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set dish of the week')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading promotions...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: theme?.text_color }}>Promotions</h1>

        {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

        <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Set Dish of the Week</h2>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Menu Item</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
              >
                <option value="">Select an item…</option>
                {menuItems.map((m) => <option key={m.item_id} value={m.item_id}>{m.name}</option>)}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
              />
            </div>
            <button
              onClick={handleSetDishOfWeek}
              disabled={!selectedItemId || saving}
              className="bg-[#f97316] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#f97316]/85 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Set'}
            </button>
          </div>
        </div>

        {dishOfWeek && (
          <div className="bg-[#111118] border border-[#f97316]/30 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#f97316] uppercase tracking-widest font-mono mb-2">Dish of the Week</p>
                <h2 className="text-2xl font-bold mb-2" style={{ color: theme?.text_color }}>
                  {dishOfWeek.name || `Menu Item #${dishOfWeek.menu_item_id}`}
                </h2>
                {dishOfWeek.discount_percentage && (
                  <p className="text-emerald-400 font-semibold">{dishOfWeek.discount_percentage}% OFF</p>
                )}
              </div>
              <div className="w-16 h-16 rounded-2xl bg-[#f97316]/15 border border-[#f97316]/30 flex items-center justify-center">
                <span className="text-[#f97316] font-bold text-2xl">★</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#111118] border border-white/8 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Active Promotions</h2>
          <div className="space-y-3">
            {promotions.length === 0 ? (
              <p className="text-center text-[#6b7280] py-8">No active promotions</p>
            ) : (
              promotions.map((promo) => (
                <div key={promo.promotion_id} className="flex items-center justify-between p-4 bg-[#1c1c27] rounded-xl">
                  <div>
                    <h3 className="font-medium" style={{ color: theme?.text_color }}>{promo.name || `Promotion #${promo.promotion_id}`}</h3>
                    <p className="text-sm text-[#6b7280] capitalize">{promo.type.replace(/_/g, ' ')}</p>
                    {promo.discount_percentage && (
                      <p className="text-sm text-emerald-400">{promo.discount_percentage}% discount</p>
                    )}
                  </div>
                  <button
                    onClick={() => togglePromotion(promo.promotion_id, promo.active)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      promo.active
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {promo.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

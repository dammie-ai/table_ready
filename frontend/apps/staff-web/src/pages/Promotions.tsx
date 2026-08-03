import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'

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
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()

  useEffect(() => {
    loadPromotions()
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
      console.error('Failed to load promotions:', err)
    } finally {
      setLoading(false)
    }
  }

  const togglePromotion = async (promotionId: number, active: boolean) => {
    try {
      await apiClient.patch(`/promotions/${promotionId}`, { active: !active })
      loadPromotions()
    } catch (err) {
      console.error('Failed to toggle promotion:', err)
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
                    <p className="text-sm text-[#6b7280] capitalize">{promo.type.replace('_', ' ')}</p>
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

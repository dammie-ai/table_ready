import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../lib/api'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CategoryData {
  category_type: string
  order_type: string
  order_count: number
  total_quantity: number
  revenue: number
}

interface StaffPerf {
  id: number
  username: string
  role: string
  orders_handled: number
  total_revenue: number | null
  completed_orders: number
  cancelled_orders: number
}

interface InventoryItem {
  id: number
  item_name: string
  stock_quantity: number
  reorder_threshold: number
  unit: string
}

interface ServiceRating {
  id: number
  username: string
  ratings_count: number
  avg_score: number | null
}

const COLORS = ['#f97316', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function ManagerPanel() {
  const [view, setView] = useState<'dashboard' | 'menu' | 'inventory' | 'theme'>('dashboard')
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [staffData, setStaffData] = useState<StaffPerf[]>([])
  const [dishOfWeek, setDishOfWeek] = useState<{ name: string } | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [serviceRatings, setServiceRatings] = useState<ServiceRating[]>([])
  const [loading, setLoading] = useState(true)
  const [restockAmounts, setRestockAmounts] = useState<Record<number, string>>({})
  const [restockingId, setRestockingId] = useState<number | null>(null)
  const [restockError, setRestockError] = useState('')

  const loadInventory = async () => {
    const res = await apiClient.get<any>('/inventory')
    setInventory(res.inventory || res.items || [])
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoryRes, staffRes, dishRes, inventoryRes, ratingsRes] = await Promise.all([
          apiClient.get<any>('/analytics/category-sales'),
          apiClient.get<any>('/analytics/staff-performance'),
          apiClient.get<any>('/promotions/dish-of-week'),
          apiClient.get<any>('/inventory'),
          apiClient.get<any>('/analytics/service-ratings'),
        ])
        setCategoryData(categoryRes.sales || [])
        setStaffData((staffRes.staff || []).slice().sort((a: StaffPerf, b: StaffPerf) => b.orders_handled - a.orders_handled))
        setDishOfWeek(dishRes.dish || null)
        setInventory(inventoryRes.inventory || inventoryRes.items || [])
        setServiceRatings(ratingsRes.waiters || [])
      } catch (err) {
        console.error('Failed to load manager data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleRestock = async (id: number) => {
    const amount = parseInt(restockAmounts[id])
    if (!amount || amount <= 0) return
    setRestockingId(id)
    setRestockError('')
    try {
      await apiClient.post(`/inventory/${id}/restock`, { quantity: amount })
      setRestockAmounts((prev) => ({ ...prev, [id]: '' }))
      await loadInventory()
    } catch (err) {
      setRestockError(err instanceof Error ? err.message : 'Failed to restock item')
    } finally {
      setRestockingId(null)
    }
  }

  const totalRevenue = categoryData.reduce((s, d) => s + (d.revenue || 0), 0)
  const totalOrders = categoryData.reduce((s, d) => s + (d.order_count || 0), 0)
  const topCategory = categoryData.reduce<CategoryData | null>(
    (top, d) => (!top || d.revenue > top.revenue ? d : top),
    null
  )

  // Categories arrive as one row per (category_type, order_type) pair —
  // collapse to per-category totals for the chart.
  const categoryTotals = Object.values(
    categoryData.reduce((acc: Record<string, CategoryData>, d) => {
      if (!acc[d.category_type]) acc[d.category_type] = { ...d, order_count: 0, revenue: 0, total_quantity: 0 }
      acc[d.category_type].order_count += d.order_count || 0
      acc[d.category_type].revenue += d.revenue || 0
      acc[d.category_type].total_quantity += d.total_quantity || 0
      return acc
    }, {})
  )

  const fulfillmentTotals = Object.values(
    categoryData.reduce((acc: Record<string, { order_type: string; revenue: number }>, d) => {
      if (!acc[d.order_type]) acc[d.order_type] = { order_type: d.order_type, revenue: 0 }
      acc[d.order_type].revenue += d.revenue || 0
      return acc
    }, {})
  ).sort((a, b) => b.revenue - a.revenue)
  const fulfillmentTotal = fulfillmentTotals.reduce((s, f) => s + f.revenue, 0) || 1
  const FULFILLMENT_COLORS: Record<string, string> = {
    DINE_IN: 'bg-orange-500', PICKUP: 'bg-blue-500', DELIVERY: 'bg-violet-500',
    DRIVE_THRU: 'bg-emerald-500', ORDER_FROM_HOME: 'bg-pink-500', IN_HOUSE: 'bg-amber-500',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading manager panel...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9]">
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 h-14 bg-[#09090f]/95 backdrop-blur border-b border-white/8">
        <div className="flex items-center gap-3">
          <span className="text-white/10">·</span>
          <span className="text-sm font-medium text-[#f1f5f9]">Manager Panel</span>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(['dashboard', 'menu', 'inventory', 'theme'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap flex-shrink-0 ${
                view === v ? 'bg-[#f97316] text-white' : 'text-[#6b7280] hover:text-[#f1f5f9]'
              }`}
            >
              {v === 'theme' ? '🎨 Theme' : v}
            </button>
          ))}
        </div>
      </div>

      {view === 'dashboard' && (
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
              <div className="text-xs text-[#6b7280] mb-1 font-mono">Total Revenue</div>
              <div className="text-emerald-400 font-display font-bold text-2xl">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-[#6b7280]">All recorded orders</div>
            </div>
            <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
              <div className="text-xs text-[#6b7280] mb-1 font-mono">Total Orders</div>
              <div className="text-blue-400 font-display font-bold text-2xl">{totalOrders}</div>
              <div className="text-xs text-[#6b7280]">Across all categories</div>
            </div>
            <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
              <div className="text-xs text-[#6b7280] mb-1 font-mono">Top Category</div>
              <div className="text-orange-400 font-display font-bold text-2xl">{topCategory?.category_type || '—'}</div>
              <div className="text-xs text-[#6b7280]">{topCategory ? `$${topCategory.revenue.toFixed(2)} revenue` : 'No sales yet'}</div>
            </div>
            <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
              <div className="text-xs text-[#6b7280] mb-1 font-mono">Dish of the Week</div>
              <div className="text-amber-400 font-display font-bold text-2xl truncate">{dishOfWeek?.name || 'Not set'}</div>
              <div className="text-xs text-[#6b7280]">Set from the Promotions tab</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Revenue by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryTotals} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="category_type" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }} labelStyle={{ color: '#f1f5f9', fontWeight: 600 }} formatter={(v: any) => [`$${(v as number).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Employee Ranking</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={staffData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="username" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }} labelStyle={{ color: '#f1f5f9', fontWeight: 600 }} formatter={(v: any) => [v, 'Orders handled']} />
                  <Bar dataKey="orders_handled" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Revenue by Fulfillment Type</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={fulfillmentTotals}
                    dataKey="revenue"
                    nameKey="order_type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#6b7280' }}
                  >
                    {fulfillmentTotals.map((entry, index) => (
                      <Cell key={entry.order_type} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }} formatter={(v: any) => [`$${(v as number).toFixed(2)}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Staff Leaderboard</h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {staffData.map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xs font-mono w-5 text-center shrink-0 ${i === 0 ? 'text-amber-400' : 'text-[#6b7280]'}`}>#{i + 1}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{s.username}</div>
                        <div className="text-[10px] text-[#6b7280] uppercase tracking-wide">{s.role.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">{s.orders_handled} orders</div>
                      <div className="text-[10px] text-[#6b7280]">${(s.total_revenue || 0).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                {staffData.length === 0 && <p className="text-sm text-[#6b7280]">No staff activity yet.</p>}
              </div>
            </div>
          </div>

          <div className="bg-[#111118] border border-white/8 rounded-2xl p-5 mt-4">
            <h3 className="text-sm font-semibold mb-1 text-[#6b7280] uppercase tracking-widest font-mono">Customer Service Ratings</h3>
            <p className="text-xs text-[#6b7280] mb-4">From post-checkout customer feedback (0-10) — separate from sales performance above.</p>
            <div className="space-y-2">
              {serviceRatings.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                  <div>
                    <div className="text-sm font-medium">{r.username}</div>
                    <div className="text-[10px] text-[#6b7280]">{r.ratings_count} rating{r.ratings_count === 1 ? '' : 's'}</div>
                  </div>
                  <div
                    className="text-sm font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      color: r.avg_score === null ? '#6b7280' : r.avg_score >= 7 ? '#10b981' : r.avg_score >= 4 ? '#f59e0b' : '#ef4444',
                      backgroundColor: r.avg_score === null ? 'transparent' : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    {r.avg_score === null ? 'No ratings yet' : `${r.avg_score} / 10`}
                  </div>
                </div>
              ))}
              {serviceRatings.length === 0 && <p className="text-sm text-[#6b7280]">No waiters on staff yet.</p>}
            </div>
          </div>

          {fulfillmentTotals.length > 0 && (
            <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: `repeat(${fulfillmentTotals.length}, minmax(0, 1fr))` }}>
              {fulfillmentTotals.map((seg) => {
                const pct = Math.round((seg.revenue / fulfillmentTotal) * 100)
                const color = FULFILLMENT_COLORS[seg.order_type] || 'bg-gray-500'
                return (
                  <div key={seg.order_type} className="bg-[#111118] border border-white/8 rounded-xl p-4 text-center">
                    <div className={`text-2xl font-display font-bold ${color.replace('bg-', 'text-')}`}>{pct}%</div>
                    <div className="text-xs text-[#6b7280] mt-0.5">{seg.order_type.replace('_', ' ')}</div>
                    <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {view === 'menu' && (
        <div className="p-4 md:p-6">
          <h2 className="font-display font-bold text-xl mb-2">Menu Management</h2>
          <p className="text-sm text-[#6b7280] mb-6">Add, edit, price, and photograph menu items.</p>
          <Link
            to="/menu-management"
            className="inline-block bg-[#f97316] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#f97316]/85 transition-colors"
          >
            Open Menu Management →
          </Link>
        </div>
      )}

      {view === 'inventory' && (
        <div className="p-4 md:p-6 max-w-lg">
          <h2 className="font-display font-bold text-xl mb-4">Inventory Levels</h2>
          {restockError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {restockError}
            </div>
          )}
          <div className="space-y-3">
            {inventory.map((item) => {
              const pct = item.stock_quantity > 0 ? (item.stock_quantity / item.reorder_threshold) * 100 : 0
              const isLow = pct < 30
              const isCritical = pct < 15
              return (
                <div key={item.id} className={`bg-[#111118] border rounded-xl p-4 ${isCritical ? 'border-red-500/50' : isLow ? 'border-orange-500/40' : 'border-white/8'}`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.item_name}</span>
                      {isCritical && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono">CRITICAL</span>}
                      {isLow && !isCritical && <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded font-mono">LOW</span>}
                    </div>
                    <span className="font-mono text-sm font-semibold">{item.stock_quantity}<span className="text-[#6b7280]">/{item.reorder_threshold}</span></span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full transition-all ${isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Add stock"
                      value={restockAmounts[item.id] || ''}
                      onChange={(e) => setRestockAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-24 bg-[#1c1c27] border border-white/8 rounded-lg px-2.5 py-1.5 text-sm text-[#f1f5f9] placeholder:text-[#6b7280]/50 outline-none focus:border-[#f97316]/50"
                    />
                    <button
                      onClick={() => handleRestock(item.id)}
                      disabled={restockingId === item.id || !restockAmounts[item.id]}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#f97316] text-white hover:bg-[#f97316]/85 disabled:opacity-40 transition-colors"
                    >
                      {restockingId === item.id ? 'Adding…' : 'Restock'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'theme' && (
        <div className="p-4 md:p-6">
          <h2 className="font-display font-bold text-xl mb-2">Theme Customization</h2>
          <p className="text-sm text-[#6b7280] mb-6">Branding, colors, background, and more — changes reflect live on the customer app.</p>
          <Link
            to="/settings"
            className="inline-block bg-[#f97316] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#f97316]/85 transition-colors"
          >
            Open Settings →
          </Link>
        </div>
      )}
    </div>
  )
}

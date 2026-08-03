import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SalesData {
  day: string
  revenue: number
  orders: number
}

interface CategoryData {
  category_type: string
  total_sales: number
  order_count: number
}

interface InventoryItem {
  item_name: string
  stock_quantity: number
  reorder_threshold: number
  unit: string
}

interface ThemeConfig {
  primary_color: string
  secondary_color: string
  background_color: string
  text_color: string
  font_family: string
  logo_url: string | null
  restaurant_name: string
  border_radius: string
  button_style: 'rounded' | 'pill' | 'square'
}

const FONT_OPTIONS = ['Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Nunito', 'Raleway']
const RADIUS_OPTIONS = ['0px', '4px', '8px', '12px', '16px', '24px', '9999px']

const COLORS = ['#f97316', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function ThemeCustomizer() {
  const [theme, setTheme] = useState<ThemeConfig>({
    primary_color: '#f97316',
    secondary_color: '#2563eb',
    background_color: '#ffffff',
    text_color: '#111827',
    font_family: 'Inter',
    logo_url: null,
    restaurant_name: 'TableReady',
    border_radius: '12px',
    button_style: 'rounded',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    apiClient.get<{ config: Record<string, any> }>('/config')
      .then((res) => {
        const branding = res.config?.branding || {}
        setTheme({
          primary_color: branding.primary_color || '#f97316',
          secondary_color: branding.secondary_color || '#2563eb',
          background_color: branding.background_color || '#ffffff',
          text_color: branding.text_color || '#111827',
          font_family: branding.font_family || 'Inter',
          logo_url: branding.logo_url || null,
          restaurant_name: branding.restaurant_name || 'TableReady',
          border_radius: branding.border_radius || '12px',
          button_style: branding.button_style || 'rounded',
        })
      })
      .catch(() => {})
  }, [])

  const saveTheme = async () => {
    setSaving(true)
    setMessage('')
    try {
      await apiClient.put('/config', {
        branding: {
          primary_color: theme.primary_color,
          secondary_color: theme.secondary_color,
          background_color: theme.background_color,
          text_color: theme.text_color,
          font_family: theme.font_family,
          logo_url: theme.logo_url,
          restaurant_name: theme.restaurant_name,
          border_radius: theme.border_radius,
          button_style: theme.button_style,
        }
      })
      setMessage('Theme saved! Customer app will update on next load.')
    } catch (err) {
      setMessage('Failed to save theme.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#111118] border border-white/8 rounded-2xl p-5 space-y-4">
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      
      <div>
        <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Restaurant Name</label>
        <input
          type="text"
          value={theme.restaurant_name}
          onChange={(e) => setTheme({ ...theme, restaurant_name: e.target.value })}
          placeholder="TableReady"
          className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#6b7280]/50 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Primary Color</label>
          <input
            type="color"
            value={theme.primary_color}
            onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
            className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-white/8"
          />
        </div>
        <div>
          <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Secondary Color</label>
          <input
            type="color"
            value={theme.secondary_color}
            onChange={(e) => setTheme({ ...theme, secondary_color: e.target.value })}
            className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-white/8"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Background</label>
          <input
            type="color"
            value={theme.background_color}
            onChange={(e) => setTheme({ ...theme, background_color: e.target.value })}
            className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-white/8"
          />
        </div>
        <div>
          <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Text Color</label>
          <input
            type="color"
            value={theme.text_color}
            onChange={(e) => setTheme({ ...theme, text_color: e.target.value })}
            className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-white/8"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Font Family</label>
        <select
          value={theme.font_family}
          onChange={(e) => setTheme({ ...theme, font_family: e.target.value })}
          className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Border Radius</label>
        <select
          value={theme.border_radius}
          onChange={(e) => setTheme({ ...theme, border_radius: e.target.value })}
          className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
        >
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Button Style</label>
        <div className="flex gap-2">
          {(['rounded', 'pill', 'square'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setTheme({ ...theme, button_style: style })}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-colors ${
                theme.button_style === style ? 'border-[#f97316] bg-[#f97316]/15 text-[#f97316]' : 'border-white/8 text-[#6b7280]'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Logo URL</label>
        <input
          type="text"
          value={theme.logo_url || ''}
          onChange={(e) => setTheme({ ...theme, logo_url: e.target.value || null })}
          placeholder="https://example.com/logo.png"
          className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#6b7280]/50 outline-none"
        />
      </div>

      <button
        onClick={saveTheme}
        disabled={saving}
        className="w-full bg-[#f97316] text-white py-3 rounded-xl font-semibold hover:bg-[#f97316]/85 disabled:opacity-40 transition-colors"
      >
        {saving ? 'Saving...' : 'Save Theme'}
      </button>
    </div>
  )
}

export default function ManagerPanel() {
  const [view, setView] = useState<'dashboard' | 'menu' | 'inventory' | 'theme'>('dashboard')
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [salesRes, categoryRes, inventoryRes] = await Promise.all([
          apiClient.get<any>('/analytics/category-sales'),
          apiClient.get<any>('/analytics/category-sales'),
          apiClient.get<any>('/inventory'),
        ])
        setSalesData(salesRes.sales || [])
        setCategoryData(categoryRes.categories || categoryRes.sales || [])
        setInventory(inventoryRes.inventory || inventoryRes.items || [])
      } catch (err) {
        console.error('Failed to load manager data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const totalRevenue = salesData.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = salesData.reduce((s, d) => s + d.orders, 0)

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
              <div className="text-xs text-[#6b7280] mb-1 font-mono">Weekly Revenue</div>
              <div className="text-emerald-400 font-display font-bold text-2xl">${totalRevenue.toLocaleString()}</div>
              <div className="text-xs text-[#6b7280]">+12% vs last week</div>
            </div>
            <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
              <div className="text-xs text-[#6b7280] mb-1 font-mono">Total Orders</div>
              <div className="text-blue-400 font-display font-bold text-2xl">{totalOrders}</div>
              <div className="text-xs text-[#6b7280]">Sun–Sat</div>
            </div>
            <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
              <div className="text-xs text-[#6b7280] mb-1 font-mono">Avg Prep Time</div>
              <div className="text-orange-400 font-display font-bold text-2xl">11m 42s</div>
              <div className="text-xs text-[#6b7280]">Kitchen efficiency</div>
            </div>
            <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
              <div className="text-xs text-[#6b7280] mb-1 font-mono">Dish of Week</div>
              <div className="text-amber-400 font-display font-bold text-2xl">Fried Chicken</div>
              <div className="text-xs text-[#6b7280]">94 orders</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Weekly Revenue</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={salesData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false } />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={40} />
                   <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }} labelStyle={{ color: '#f1f5f9', fontWeight: 600 }} itemStyle={{ color: '#f97316' }} formatter={(v: any) => [`$${(v as number ?? 0).toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Orders by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="category_type" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }} labelStyle={{ color: '#f1f5f9', fontWeight: 600 }} />
                  <Bar dataKey="total_sales" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Order Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="total_sales"
                    nameKey="category_type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                     label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#6b7280' }}
                  >
                     {categoryData.map((_entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Dine-In', pct: 58, color: 'bg-orange-500' },
                { label: 'Drive-Thru', pct: 27, color: 'bg-blue-500' },
                { label: 'Delivery', pct: 15, color: 'bg-violet-500' },
              ].map((seg) => (
                <div key={seg.label} className="bg-[#111118] border border-white/8 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-display font-bold ${seg.color.replace('bg-', 'text-')}`}>{seg.pct}%</div>
                  <div className="text-xs text-[#6b7280] mt-0.5">{seg.label}</div>
                  <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${seg.color}`} style={{ width: `${seg.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'inventory' && (
        <div className="p-4 md:p-6 max-w-lg">
          <h2 className="font-display font-bold text-xl mb-4">Inventory Levels</h2>
          <div className="space-y-3">
            {inventory.map((item, i) => {
              const pct = item.stock_quantity > 0 ? (item.stock_quantity / item.reorder_threshold) * 100 : 0
              const isLow = pct < 30
              const isCritical = pct < 15
              return (
                <div key={i} className={`bg-[#111118] border rounded-xl p-4 ${isCritical ? 'border-red-500/50' : isLow ? 'border-orange-500/40' : 'border-white/8'}`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.item_name}</span>
                      {isCritical && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono">CRITICAL</span>}
                      {isLow && !isCritical && <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded font-mono">LOW</span>}
                    </div>
                    <span className="font-mono text-sm font-semibold">{item.stock_quantity}<span className="text-[#6b7280]">/{item.reorder_threshold}</span></span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
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
          <p className="text-sm text-[#6b7280] mb-6">White-label branding — changes reflect live on the customer app</p>
          <ThemeCustomizer />
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

interface StaffPerformance {
  username: string
  role: string
  order_count: number
  total_revenue: number
}

export default function Reports() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sales' | 'categories' | 'staff'>('sales')
  const { theme } = useTheme()

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const [salesRes, categoryRes, staffRes] = await Promise.all([
        apiClient.get<any>('/analytics/category-sales'),
        apiClient.get<any>('/analytics/category-sales'),
        apiClient.get<any>('/analytics/staff-performance'),
      ])
      setSalesData(salesRes.sales || [])
      setCategoryData(categoryRes.categories || categoryRes.sales || [])
      setStaffPerformance(staffRes.staff || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = salesData.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = salesData.reduce((s, d) => s + d.orders, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading reports...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: theme?.text_color }}>Reports & Analytics</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#6b7280] mb-1 font-mono">Total Revenue</div>
            <div className="text-emerald-400 font-display font-bold text-2xl">${totalRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#6b7280] mb-1 font-mono">Total Orders</div>
            <div className="text-blue-400 font-display font-bold text-2xl">{totalOrders}</div>
          </div>
          <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#6b7280] mb-1 font-mono">Avg Order Value</div>
            <div className="text-orange-400 font-display font-bold text-2xl">
              ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
            </div>
          </div>
          <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#6b7280] mb-1 font-mono">Categories</div>
            <div className="text-purple-400 font-display font-bold text-2xl">{categoryData.length}</div>
          </div>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto">
          {(['sales', 'categories', 'staff'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors whitespace-nowrap ${
                activeTab === tab ? 'bg-[#f97316] text-white' : 'text-[#6b7280] hover:text-[#f1f5f9]'
              }`}
            >
              {tab === 'sales' ? 'Sales Trend' : tab === 'categories' ? 'By Category' : 'Staff Performance'}
            </button>
          ))}
        </div>

        {activeTab === 'sales' && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={40} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }} labelStyle={{ color: '#f1f5f9', fontWeight: 600 }} itemStyle={{ color: '#f97316' }} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Sales by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="category_type" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }} labelStyle={{ color: '#f1f5f9', fontWeight: 600 }} />
                <Bar dataKey="total_sales" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Staff Performance</h3>
            <div className="space-y-3">
              {staffPerformance.length === 0 ? (
                <p className="text-center text-[#6b7280] py-8">No staff performance data available</p>
              ) : (
                staffPerformance.map((staff, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-[#1c1c27] rounded-xl">
                    <div>
                      <p className="font-medium" style={{ color: theme?.text_color }}>{staff.username}</p>
                      <p className="text-xs text-[#6b7280] capitalize">{staff.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#f97316]">{staff.order_count} orders</p>
                      <p className="text-xs text-[#6b7280]">${staff.total_revenue.toLocaleString()} revenue</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

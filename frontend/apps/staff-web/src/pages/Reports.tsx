import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CategoryData {
  category_type: string
  order_type: string
  order_count: number
  revenue: number
}

interface StaffPerformance {
  username: string
  role: string
  orders_handled: number
  total_revenue: number | null
}

interface AuditResult {
  result_id: number
  period_start: string
  period_end: string
  top_item_name: string | null
  top_item_quantity: number | null
  top_item_revenue: number | null
  total_revenue: number
  total_orders: number
  created_at: string
}

interface AuditConfig {
  config_id: number
  schedule_type: string
  is_active: boolean
  next_run: string | null
}

export default function Reports() {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'categories' | 'staff' | 'audit'>('categories')
  const { theme } = useTheme()

  // Sales audit already runs automatically on a schedule (set up at server
  // startup) -- this had zero UI anywhere despite real results already
  // sitting in the database.
  const [auditResults, setAuditResults] = useState<AuditResult[]>([])
  const [auditConfigs, setAuditConfigs] = useState<AuditConfig[]>([])
  const [auditLoading, setAuditLoading] = useState(true)
  const [runningId, setRunningId] = useState<number | null>(null)
  const [auditError, setAuditError] = useState('')

  useEffect(() => {
    loadReports()
    loadAudit()
  }, [])

  const loadReports = async () => {
    try {
      const [categoryRes, staffRes] = await Promise.all([
        apiClient.get<any>('/analytics/category-sales'),
        apiClient.get<any>('/analytics/staff-performance'),
      ])
      setCategoryData(categoryRes.sales || [])
      setStaffPerformance(staffRes.staff || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAudit = async () => {
    try {
      const [resultsRes, configsRes] = await Promise.all([
        apiClient.get<any>('/audit/sales/results'),
        apiClient.get<any>('/audit/sales/configs'),
      ])
      setAuditResults(resultsRes.results || [])
      setAuditConfigs(configsRes.configs || [])
    } catch (err) {
      console.error('Failed to load sales audit:', err)
    } finally {
      setAuditLoading(false)
    }
  }

  const runAuditNow = async (configId: number) => {
    setRunningId(configId)
    setAuditError('')
    try {
      await apiClient.post(`/audit/sales/configs/${configId}/run-now`, {})
      await loadAudit()
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Failed to run audit')
    } finally {
      setRunningId(null)
    }
  }

  // Rows come back as one entry per (category_type, order_type) pair —
  // collapse to per-category totals for the chart and the summary tiles.
  const categoryTotals = Object.values(
    categoryData.reduce((acc: Record<string, CategoryData>, d) => {
      if (!acc[d.category_type]) acc[d.category_type] = { ...d, order_count: 0, revenue: 0 }
      acc[d.category_type].order_count += d.order_count || 0
      acc[d.category_type].revenue += d.revenue || 0
      return acc
    }, {})
  )

  const totalRevenue = categoryTotals.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = categoryTotals.reduce((s, d) => s + d.order_count, 0)

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
            <div className="text-purple-400 font-display font-bold text-2xl">{categoryTotals.length}</div>
          </div>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto">
          {(['categories', 'staff', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors whitespace-nowrap ${
                activeTab === tab ? 'bg-[#f97316] text-white' : 'text-[#6b7280] hover:text-[#f1f5f9]'
              }`}
            >
              {tab === 'categories' ? 'By Category' : tab === 'staff' ? 'Staff Performance' : 'Sales Audit'}
            </button>
          ))}
        </div>

        {activeTab === 'audit' && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-widest font-mono">Sales Audit Results</h3>
              {auditConfigs.map((cfg) => (
                <button
                  key={cfg.config_id}
                  onClick={() => runAuditNow(cfg.config_id)}
                  disabled={runningId === cfg.config_id}
                  className="text-xs bg-[#f97316] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#f97316]/85 disabled:opacity-40"
                >
                  {runningId === cfg.config_id ? 'Running…' : 'Run Now'}
                </button>
              ))}
            </div>
            {auditError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {auditError}
              </div>
            )}
            {auditLoading ? (
              <p className="text-[#6b7280] text-sm">Loading…</p>
            ) : auditResults.length === 0 ? (
              <p className="text-[#6b7280] text-sm">No audit results yet.</p>
            ) : (
              <div className="space-y-2">
                {auditResults.map((r) => (
                  <div key={r.result_id} className="flex items-center justify-between px-4 py-3 bg-[#1c1c27] rounded-xl text-sm">
                    <div>
                      <div className="text-[#6b7280] text-xs font-mono">
                        {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                      </div>
                      <div className="mt-0.5">
                        {r.total_orders} orders · ${Number(r.total_revenue).toLocaleString()} revenue
                      </div>
                      {r.top_item_name && (
                        <div className="text-xs text-[#f97316] mt-0.5">
                          Top: {r.top_item_name} ({r.top_item_quantity}x, ${Number(r.top_item_revenue).toFixed(2)})
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-[#6b7280] font-mono">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 text-[#6b7280] uppercase tracking-widest font-mono">Sales by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryTotals} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="category_type" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }} labelStyle={{ color: '#f1f5f9', fontWeight: 600 }} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
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
                      <p className="font-bold text-[#f97316]">{staff.orders_handled} orders</p>
                      <p className="text-xs text-[#6b7280]">${(staff.total_revenue || 0).toLocaleString()} revenue</p>
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

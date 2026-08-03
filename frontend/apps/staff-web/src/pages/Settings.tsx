import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'

interface ConfigItem {
  config_key: string
  config_value: any
}

export default function Settings() {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const { theme } = useTheme()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; config: ConfigItem[] }>('/config')
      const configMap: Record<string, any> = {}
      if (res.config) {
        res.config.forEach((item) => {
          configMap[item.config_key] = item.config_value
        })
      }
      setConfig(configMap)
    } catch (err) {
      console.error('Failed to load config:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await apiClient.put('/config', { config })
      setMessage('Settings saved successfully!')
    } catch (err) {
      setMessage('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold" style={{ color: theme?.text_color }}>Settings</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm font-medium hover:bg-[#f97316]/85 disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('Failed') ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Restaurant Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Restaurant Name</label>
                <input
                  type="text"
                  value={config.branding?.restaurant_name || ''}
                  onChange={(e) => updateConfig('branding', { ...config.branding, restaurant_name: e.target.value })}
                  className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.tax_rate || 0}
                    onChange={(e) => updateConfig('tax_rate', parseFloat(e.target.value))}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Delivery Radius (m)</label>
                  <input
                    type="number"
                    value={config.delivery_radius || 200}
                    onChange={(e) => updateConfig('delivery_radius', parseInt(e.target.value))}
                    className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Geofence Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Restaurant Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={config.branding?.latitude || ''}
                  onChange={(e) => updateConfig('branding', { ...config.branding, latitude: parseFloat(e.target.value) })}
                  className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Restaurant Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={config.branding?.longitude || ''}
                  onChange={(e) => updateConfig('branding', { ...config.branding, longitude: parseFloat(e.target.value) })}
                  className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Order Statuses</h2>
            <p className="text-sm text-[#6b7280] mb-4">Configure the order status flow for your restaurant</p>
            <textarea
              value={Array.isArray(config.order_statuses) ? config.order_statuses.join(', ') : ''}
              onChange={(e) => updateConfig('order_statuses', e.target.value.split(',').map(s => s.trim()))}
              className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none"
              rows={3}
              placeholder="RECEIVED, IN_PREPARATION, COOKING, READY, READY_FOR_PICKUP, PICKED_UP"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

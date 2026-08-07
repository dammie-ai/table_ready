import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'
import { LANGUAGES, setLanguage, type LanguageCode } from '../i18n'

interface Branding {
  restaurant_name: string
  tagline: string
  logo_url: string
  logo_position: 'left' | 'center'
  primary_color: string
  secondary_color: string
  accent_color: string
  text_color: string
  background_mode: 'solid' | 'image'
  background_color: string
  background_image_url: string
  font_family: string
  font_size_base: 'sm' | 'md' | 'lg'
  border_radius: 'sharp' | 'rounded' | 'pill'
  currency_symbol: string
  show_trending_badges: boolean
  announcement_banner: string
}

const DEFAULT_BRANDING: Branding = {
  restaurant_name: 'TableReady',
  tagline: '',
  logo_url: '',
  logo_position: 'left',
  primary_color: '#c2410c',
  secondary_color: '#2563eb',
  accent_color: '#10b981',
  text_color: '#111827',
  background_mode: 'solid',
  background_color: '#ffffff',
  background_image_url: '',
  font_family: 'Inter',
  font_size_base: 'md',
  border_radius: 'rounded',
  currency_symbol: '$',
  show_trending_badges: true,
  announcement_banner: '',
}

const FONT_OPTIONS = ['Inter', 'Georgia', 'Poppins', 'Roboto', 'Playfair Display', 'system-ui']

export default function Settings() {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const { theme } = useTheme()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; config: Record<string, any> }>('/config')
      const configMap = res.config || {}
      setConfig(configMap)
      setBranding({ ...DEFAULT_BRANDING, ...(configMap.branding || {}) })
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
      await apiClient.put('/config', { ...config, branding })
      setMessage('Settings saved — changes are live on the customer app now.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const b = (key: keyof Branding, value: any) => setBranding((prev) => ({ ...prev, [key]: value }))

  // No cloud file storage in this deployment, so uploaded images are
  // inlined as data URIs and stored directly in the branding config —
  // fine for a small logo/background image, no backend changes needed.
  const handleImageUpload = (key: 'logo_url' | 'background_image_url') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => b(key, reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <p className="text-gray-400 text-xl">Loading settings...</p>
      </div>
    )
  }

  const inputCls = "w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] outline-none focus:border-[#f97316]/50"
  const labelCls = "block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5"
  const cardCls = "bg-[#111118] border border-white/8 rounded-2xl p-6"

  const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-11 h-11 rounded-lg border border-white/8 bg-transparent cursor-pointer shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9] p-4 md:p-6">
      <div className="max-w-2xl mx-auto pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: theme?.text_color }}>Settings</h1>
            <p className="text-sm text-[#6b7280] mt-1">Everything here reflects live on the customer menu, cart, and checkout.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#f97316] text-white rounded-lg text-sm font-medium hover:bg-[#f97316]/85 disabled:opacity-40 shrink-0"
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
          <div className={cardCls}>
            <h2 className="text-xl font-semibold mb-4">{t('settings.language')}</h2>
            <label className={labelCls}>{t('settings.language')}</label>
            <select
              value={i18n.language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className={inputCls}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <p className="text-xs text-[#6b7280] mt-2">{t('settings.languageHint')}</p>
          </div>

          <div className={cardCls}>
            <h2 className="text-xl font-semibold mb-4">Identity</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Restaurant Name</label>
                <input type="text" value={branding.restaurant_name} onChange={(e) => b('restaurant_name', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tagline</label>
                <input type="text" value={branding.tagline} onChange={(e) => b('tagline', e.target.value)} placeholder="e.g. Fast. Fresh. Local." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Announcement Banner</label>
                <input type="text" value={branding.announcement_banner} onChange={(e) => b('announcement_banner', e.target.value)} placeholder="e.g. Happy Hour 4–6pm today!" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Logo</label>
                  <div className="flex items-center gap-3">
                    {branding.logo_url && (
                      <img src={branding.logo_url} alt="" className="h-10 w-10 object-contain rounded bg-white/5 border border-white/10 shrink-0" />
                    )}
                    <input type="text" value={branding.logo_url} onChange={(e) => b('logo_url', e.target.value)} placeholder="https://... or upload" className={inputCls} />
                  </div>
                  <label className="inline-block mt-2 text-xs text-[#f97316] cursor-pointer hover:underline">
                    Upload an image
                    <input type="file" accept="image/*" onChange={handleImageUpload('logo_url')} className="hidden" />
                  </label>
                </div>
                <div>
                  <label className={labelCls}>Logo Position</label>
                  <select value={branding.logo_position} onChange={(e) => b('logo_position', e.target.value as Branding['logo_position'])} className={inputCls}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <h2 className="text-xl font-semibold mb-4">Theme Colors</h2>
            <div className="grid grid-cols-2 gap-4">
              <ColorField label="Primary Color" value={branding.primary_color} onChange={(v) => b('primary_color', v)} />
              <ColorField label="Secondary Color" value={branding.secondary_color} onChange={(v) => b('secondary_color', v)} />
              <ColorField label="Accent Color" value={branding.accent_color} onChange={(v) => b('accent_color', v)} />
              <ColorField label="Text Color" value={branding.text_color} onChange={(v) => b('text_color', v)} />
            </div>
          </div>

          <div className={cardCls}>
            <h2 className="text-xl font-semibold mb-4">Background</h2>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => b('background_mode', 'solid')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${branding.background_mode === 'solid' ? 'border-[#f97316] bg-[#f97316]/15 text-[#f97316]' : 'border-white/8 text-[#6b7280]'}`}
              >
                Solid Color
              </button>
              <button
                type="button"
                onClick={() => b('background_mode', 'image')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${branding.background_mode === 'image' ? 'border-[#f97316] bg-[#f97316]/15 text-[#f97316]' : 'border-white/8 text-[#6b7280]'}`}
              >
                Background Image
              </button>
            </div>
            {branding.background_mode === 'solid' ? (
              <ColorField label="Background Color" value={branding.background_color} onChange={(v) => b('background_color', v)} />
            ) : (
              <div>
                <label className={labelCls}>Background Image</label>
                <input type="text" value={branding.background_image_url} onChange={(e) => b('background_image_url', e.target.value)} placeholder="https://... or upload" className={inputCls} />
                <label className="inline-block mt-2 text-xs text-[#f97316] cursor-pointer hover:underline">
                  Upload an image
                  <input type="file" accept="image/*" onChange={handleImageUpload('background_image_url')} className="hidden" />
                </label>
                {branding.background_image_url && (
                  <img src={branding.background_image_url} alt="" className="mt-2 h-24 w-full object-cover rounded-lg border border-white/10" />
                )}
              </div>
            )}
          </div>

          <div className={cardCls}>
            <h2 className="text-xl font-semibold mb-4">Typography &amp; Shape</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Font Family</label>
                <select value={branding.font_family} onChange={(e) => b('font_family', e.target.value)} className={inputCls}>
                  {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Base Font Size</label>
                <select value={branding.font_size_base} onChange={(e) => b('font_size_base', e.target.value as Branding['font_size_base'])} className={inputCls}>
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Corner Style</label>
                <select value={branding.border_radius} onChange={(e) => b('border_radius', e.target.value as Branding['border_radius'])} className={inputCls}>
                  <option value="sharp">Sharp</option>
                  <option value="rounded">Rounded</option>
                  <option value="pill">Pill</option>
                </select>
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <h2 className="text-xl font-semibold mb-4">Menu Behavior</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Currency Symbol</label>
                <input type="text" value={branding.currency_symbol} onChange={(e) => b('currency_symbol', e.target.value)} maxLength={3} className={`${inputCls} max-w-[100px]`} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={branding.show_trending_badges} onChange={(e) => b('show_trending_badges', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Show "Trending" badges on the customer menu</span>
              </label>
            </div>
          </div>

          <div className={cardCls}>
            <h2 className="text-xl font-semibold mb-4">Restaurant Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.tax_rate ?? 0}
                  onChange={(e) => updateConfig('tax_rate', parseFloat(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Delivery Radius (miles)</label>
                <input
                  type="number"
                  value={config.delivery_radius?.max_miles ?? 10}
                  onChange={(e) => updateConfig('delivery_radius', { max_miles: parseInt(e.target.value) })}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <h2 className="text-xl font-semibold mb-4">Geofence Settings</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Restaurant Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={config.geofence?.restaurant_latitude ?? ''}
                  onChange={(e) => updateConfig('geofence', { ...config.geofence, restaurant_latitude: parseFloat(e.target.value) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Restaurant Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={config.geofence?.restaurant_longitude ?? ''}
                  onChange={(e) => updateConfig('geofence', { ...config.geofence, restaurant_longitude: parseFloat(e.target.value) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Geofence Radius (m)</label>
                <input
                  type="number"
                  value={config.geofence?.radius_meters ?? 200}
                  onChange={(e) => updateConfig('geofence', { ...config.geofence, radius_meters: parseInt(e.target.value) })}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <h2 className="text-xl font-semibold mb-4">Order Statuses</h2>
            <p className="text-sm text-[#6b7280] mb-4">Configure the order status flow for your restaurant</p>
            <textarea
              value={Array.isArray(config.order_statuses) ? config.order_statuses.join(', ') : ''}
              onChange={(e) => updateConfig('order_statuses', e.target.value.split(',').map(s => s.trim()))}
              className={inputCls}
              rows={3}
              placeholder="RECEIVED, IN_PREPARATION, COOKING, READY, READY_FOR_PICKUP, PICKED_UP"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

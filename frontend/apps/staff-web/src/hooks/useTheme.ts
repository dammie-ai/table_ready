import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'

export interface ThemeConfig {
  primary_color: string
  secondary_color: string
  background_color: string
  text_color: string
  font_family: string
  logo_url: string | null
  restaurant_name: string
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeConfig | null>(null)
  const [loading, setLoading] = useState(true)

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
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { theme, loading }
}

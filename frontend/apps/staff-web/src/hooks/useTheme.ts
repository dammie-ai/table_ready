import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'

export interface ThemeConfig {
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  background_mode: 'solid' | 'image'
  background_image_url: string | null
  text_color: string
  font_family: string
  font_size_base: 'sm' | 'md' | 'lg'
  border_radius: 'sharp' | 'rounded' | 'pill'
  logo_url: string | null
  logo_position: 'left' | 'center'
  restaurant_name: string
  tagline: string
  announcement_banner: string
  currency_symbol: string
  show_trending_badges: boolean
}

const FONT_SIZE_PX: Record<ThemeConfig['font_size_base'], string> = { sm: '14px', md: '16px', lg: '18px' }
const RADIUS_PX: Record<ThemeConfig['border_radius'], string> = { sharp: '2px', rounded: '12px', pill: '999px' }

export function useTheme() {
  const [theme, setTheme] = useState<ThemeConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<{ config: Record<string, any> }>('/config')
      .then((res) => {
        const branding = res.config?.branding || {}
        setTheme({
          primary_color: branding.primary_color || '#c2410c',
          secondary_color: branding.secondary_color || '#2563eb',
          accent_color: branding.accent_color || '#10b981',
          background_color: branding.background_color || '#ffffff',
          background_mode: branding.background_mode || 'solid',
          background_image_url: branding.background_image_url || null,
          text_color: branding.text_color || '#111827',
          font_family: branding.font_family || 'Inter',
          font_size_base: branding.font_size_base || 'md',
          border_radius: branding.border_radius || 'rounded',
          logo_url: branding.logo_url || null,
          logo_position: branding.logo_position || 'left',
          restaurant_name: branding.restaurant_name || 'TableReady',
          tagline: branding.tagline || '',
          announcement_banner: branding.announcement_banner || '',
          currency_symbol: branding.currency_symbol || '$',
          show_trending_badges: branding.show_trending_badges !== false,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { theme, loading }
}

export function themeBackgroundStyle(theme: ThemeConfig | null): React.CSSProperties {
  if (!theme) return {}
  if (theme.background_mode === 'image' && theme.background_image_url) {
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${theme.background_image_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { backgroundColor: theme.background_color }
}

export function themeRadiusPx(theme: ThemeConfig | null): string {
  return theme ? RADIUS_PX[theme.border_radius] : RADIUS_PX.rounded
}

export function themeFontSizePx(theme: ThemeConfig | null): string {
  return theme ? FONT_SIZE_PX[theme.font_size_base] : FONT_SIZE_PX.md
}

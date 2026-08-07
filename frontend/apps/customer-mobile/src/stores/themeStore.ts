import { create } from 'zustand'
import { Appearance } from 'react-native'
import { getConfig, getStorageItem, setStorageItem } from '@table-ready/shared'
import { colors as lightColors, darkColors } from '../theme'

interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  error: string
  success: string
  disabled: string
}

type Mode = 'light' | 'dark'

interface ThemeState {
  mode: Mode
  colors: ThemeColors
  loaded: boolean
  brandOverrides: { primary_color?: string; secondary_color?: string; text_color?: string; background_color?: string }
  fetchTheme: () => Promise<void>
  setMode: (mode: Mode) => void
}

// Manager-configured text/background colors (from staff-web's Settings
// page) assume a light context, so those two only apply in light mode —
// applying a manager's white background override would defeat the point
// of dark mode. Primary/secondary brand colors apply either way.
function computeColors(mode: Mode, overrides: ThemeState['brandOverrides']): ThemeColors {
  const base = mode === 'dark' ? darkColors : lightColors
  return {
    ...base,
    primary: overrides.primary_color || base.primary,
    secondary: overrides.secondary_color || base.secondary,
    ...(mode === 'light'
      ? {
          text: overrides.text_color || base.text,
          background: overrides.background_color || base.background,
        }
      : {}),
  }
}

// Mirrors staff-web's branding config (Settings page) so a manager's
// theme changes show up here too, not just on the staff dashboard.
//
// Most screens still read the plain `colors` object from theme.ts
// directly, baked into StyleSheet.create() at module-evaluation time —
// those stay on theme.ts's static defaults (which match staff-web's own
// defaults) since converting every screen to read live would be a much
// larger change. Button, Badge, Card, Input, and TabNavigator were
// converted to read colors from this store instead, so the most-used
// UI elements (primary actions, badges, cards, inputs, the tab bar) do
// reactively pick up whatever a manager has actually configured, and
// respond to the light/dark toggle.
export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  colors: lightColors,
  loaded: false,
  brandOverrides: {},
  fetchTheme: async () => {
    let mode: Mode = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
    try {
      const stored = await getStorageItem('tableready_theme_mode')
      if (stored === 'light' || stored === 'dark') mode = stored
    } catch {
      // fall back to system preference
    }

    try {
      const res = await getConfig()
      // The manager's branding fields live nested under config.branding
      // (matching the restaurant_config table's config_key rows) — reading
      // them off the top-level config object directly always returned
      // undefined, so a manager's saved brand colors never actually reached
      // this app. staff-web's own useTheme.ts already reads this correctly.
      const branding = res.config?.branding || {}
      const overrides = {
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        text_color: branding.text_color,
        background_color: branding.background_color,
      }
      // Screens that still import `colors` directly from theme.ts (rather
      // than this store) only ever see the light palette — mutate that
      // object too so they at least pick up the brand color on next
      // access, same best-effort behavior as before dark mode existed.
      Object.assign(lightColors, computeColors('light', overrides))
      set({ loaded: true, mode, brandOverrides: overrides, colors: computeColors(mode, overrides) })
    } catch (err) {
      console.error('Failed to load theme config:', err)
      set({ loaded: true, mode, colors: computeColors(mode, {}) })
    }
  },
  setMode: (mode) => {
    setStorageItem('tableready_theme_mode', mode).catch(() => {})
    set({ mode, colors: computeColors(mode, get().brandOverrides) })
  },
}))

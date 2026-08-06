import { create } from 'zustand'
import { getConfig } from '@table-ready/shared'
import { colors as sharedColors } from '../theme'

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

interface ThemeState {
  colors: ThemeColors
  loaded: boolean
  fetchTheme: () => Promise<void>
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
// reactively pick up whatever a manager has actually configured.
export const useThemeStore = create<ThemeState>((set) => ({
  colors: sharedColors,
  loaded: false,
  fetchTheme: async () => {
    try {
      const res = await getConfig()
      const cfg = res.config
      Object.assign(sharedColors, {
        primary: cfg.primary_color || sharedColors.primary,
        secondary: cfg.secondary_color || sharedColors.secondary,
        text: cfg.text_color || sharedColors.text,
        background: cfg.background_color || sharedColors.background,
      })
      set({ loaded: true, colors: { ...sharedColors } })
    } catch (err) {
      console.error('Failed to load theme config:', err)
      set({ loaded: true })
    }
  },
}))

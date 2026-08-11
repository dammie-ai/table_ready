import { create } from 'zustand'
import { getConfig } from '@table-ready/shared'

interface ConfigState {
  // Matches the value CartScreen/CheckoutScreen previously hardcoded, so
  // there's no visible flash of a different number while this loads.
  taxRate: number
  loaded: boolean
  fetchConfig: () => Promise<void>
}

export const useConfigStore = create<ConfigState>((set) => ({
  taxRate: 0.08,
  loaded: false,
  fetchConfig: async () => {
    try {
      const res = await getConfig()
      const rate = res.config?.tax_rate?.rate
      set({ taxRate: typeof rate === 'number' && !Number.isNaN(rate) ? rate : 0.08, loaded: true })
    } catch (err) {
      console.error('Failed to load restaurant config:', err)
      set({ loaded: true })
    }
  },
}))

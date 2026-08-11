import { useEffect } from 'react'
import { Platform, View, ActivityIndicator } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Navigation from './src/navigation/AppNavigator'
import { useThemeStore } from './src/stores/themeStore'
import { useConfigStore } from './src/stores/configStore'
import { useAuthStore } from '@table-ready/shared'

if (Platform.OS !== 'web') {
  const storage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
  ;(global as any).localStorage = storage
}

export default function App() {
  const fetchTheme = useThemeStore((s) => s.fetchTheme)
  const fetchConfig = useConfigStore((s) => s.fetchConfig)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  useEffect(() => {
    fetchTheme()
    fetchConfig()
  }, [fetchTheme, fetchConfig])

  // Reading the persisted session from secure storage is async —
  // LocationCheckScreen decides whether a signed-in customer skips Login,
  // and doing that before this resolves would send every already-signed-in
  // returning customer to Login anyway for a frame or two.
  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#c2410c" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <Navigation />
    </SafeAreaProvider>
  )
}

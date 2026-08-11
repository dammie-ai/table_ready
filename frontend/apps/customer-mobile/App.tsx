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
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    fetchTheme()
    fetchConfig()
  }, [fetchTheme, fetchConfig])

  // Reading the persisted session from secure storage is async — deciding
  // the initial route before this resolves would flash the Login screen
  // at every already-signed-in returning customer for a frame or two.
  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#c2410c" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <Navigation isAuthenticated={!!token} />
    </SafeAreaProvider>
  )
}

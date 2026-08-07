import { useEffect } from 'react'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Navigation from './src/navigation/AppNavigator'
import { useThemeStore } from './src/stores/themeStore'

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

  useEffect(() => {
    fetchTheme()
  }, [fetchTheme])

  return (
    <SafeAreaProvider>
      <Navigation />
    </SafeAreaProvider>
  )
}

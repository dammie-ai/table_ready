import { Platform } from 'react-native' 
import Navigation from './src/navigation/AppNavigator' 
 
if (Platform.OS !== 'web') { 
  const storage = { 
    getItem: () => null, 
    setItem: () => {}, 
    removeItem: () => {} 
  } 
  ;(global as any).localStorage = storage 
} 
 
export default function App() { 
  return <Navigation /> 
}

import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

// expo-secure-store's web target ships no implementation at all in the
// installed version (its web build is literally `export default {}`), so
// every SecureStore call throws on web. Route through localStorage there
// instead — same behavior the rest of this app already assumes on web.
export async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  }
  return SecureStore.getItemAsync(key)
}

export async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

export async function deleteStorageItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}

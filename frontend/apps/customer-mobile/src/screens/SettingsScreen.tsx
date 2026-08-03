import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { getNotificationPreferences, updateNotificationPreferences, deleteAccount } from '@table-ready/shared'
import { useAuthStore } from '@table-ready/shared'

export default function SettingsScreen({ navigation }: any) {
  const [prefs, setPrefs] = useState({
    order_updates: true,
    promotions: true,
    reminders: true,
  })
  const [loading, setLoading] = useState(true)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const res = await getNotificationPreferences()
      setPrefs(res.preferences)
    } catch (err) {
      console.error('Failed to load preferences:', err)
    } finally {
      setLoading(false)
    }
  }

  const togglePref = async (key: string, value: boolean) => {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    try {
      await updateNotificationPreferences(updated)
    } catch (err) {
      Alert.alert('Error', 'Failed to update preferences')
    }
  }

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('tableready_token')
    } catch {
      // ignore
    }
    logout()
    navigation.replace('Login')
  }

  const handleDeleteAccount = async () => {
    Alert.alert('Delete Account', 'This action cannot be undone. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount()
            await SecureStore.deleteItemAsync('tableready_token')
            logout()
            navigation.replace('Login')
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete account')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Order Updates</Text>
          <Switch value={prefs.order_updates} onValueChange={(v) => togglePref('order_updates', v)} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Promotions</Text>
          <Switch value={prefs.promotions} onValueChange={(v) => togglePref('promotions', v)} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Reminders</Text>
          <Switch value={prefs.reminders} onValueChange={(v) => togglePref('reminders', v)} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={styles.menuItemText}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleDeleteAccount}>
          <Text style={[styles.menuItemText, styles.dangerText]}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    color: '#111827',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: {
    fontSize: 16,
    color: '#374151',
  },
  menuItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  dangerItem: {
    marginTop: 8,
  },
  dangerText: {
    color: '#dc2626',
  },
})

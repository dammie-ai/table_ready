import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const GEO_KEY = 'tableready_within_geofence'

export default function WelcomeScreen({ navigation }: any) {
  const [withinGeofence, setWithinGeofence] = useState(true)

  useEffect(() => {
    const checkGeofence = async () => {
      try {
        const value = await SecureStore.getItemAsync(GEO_KEY)
        setWithinGeofence(value !== 'false')
      } catch {
        setWithinGeofence(true)
      }
    }
    checkGeofence()
  }, [])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>TableReady</Text>
      <Text style={styles.subtitle}>Order from your table or on the go</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Combos')}>
        <Text style={styles.primaryButtonText}>Combo Deals</Text>
      </TouchableOpacity>

      {withinGeofence && (
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Menu', { mode: 'dine-in' })}>
          <Text style={styles.secondaryButtonText}>Dine In</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Menu', { mode: 'pickup' })}>
        <Text style={styles.secondaryButtonText}>Pickup</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Menu', { mode: 'delivery' })}>
        <Text style={styles.secondaryButtonText}>Delivery</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>More</Text>

      <TouchableOpacity style={styles.tertiaryButton} onPress={() => navigation.navigate('TableCart')}>
        <Text style={styles.tertiaryButtonText}>Group Order / Table Cart</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tertiaryButton} onPress={() => navigation.navigate('Reservations')}>
        <Text style={styles.tertiaryButtonText}>Reservations</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tertiaryButton} onPress={() => navigation.navigate('Waitlist')}>
        <Text style={styles.tertiaryButtonText}>Join Waitlist</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tertiaryButton} onPress={() => navigation.navigate('OrderHistory')}>
        <Text style={styles.tertiaryButtonText}>Order History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tertiaryButton} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.tertiaryButtonText}>Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e40af',
  },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#dbeafe',
    marginBottom: 40,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#1e40af',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  tertiaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tertiaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    maxWidth: 320,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#93c5fd',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    width: '100%',
    maxWidth: 320,
    textAlign: 'left',
  },
})

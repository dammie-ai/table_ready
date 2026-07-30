import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Button } from 'react-native'
import * as Location from 'expo-location'
import * as SecureStore from 'expo-secure-store'
import { getGeofenceConfig, type GeofenceConfig } from '@table-ready/shared'

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const phi1 = lat1 * Math.PI / 180
  const phi2 = lat2 * Math.PI / 180
  const deltaPhi = (lat2 - lat1) * Math.PI / 180
  const deltaLambda = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

const GEO_KEY = 'tableready_within_geofence'

export default function LocationCheckScreen({ navigation }: any) {
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [config, setConfig] = useState<GeofenceConfig | null>(null)

  useEffect(() => {
    checkLocation()
  }, [])

  const checkLocation = async () => {
    try {
      const geoConfig = await getGeofenceConfig()
      setConfig(geoConfig)

      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('Location permission denied. You can continue, but Dine In may be limited.')
        setChecking(false)
        return
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      const { latitude, longitude } = location.coords

      let withinGeofence = true
      if (geoConfig.restaurant_latitude && geoConfig.restaurant_longitude) {
        const distance = calculateDistance(
          latitude,
          longitude,
          geoConfig.restaurant_latitude,
          geoConfig.restaurant_longitude
        )
        withinGeofence = distance <= geoConfig.radius_meters
      }

      await SecureStore.setItemAsync(GEO_KEY, withinGeofence ? 'true' : 'false')
      navigation.replace('GroupChoice')
    } catch (err) {
      setError('Failed to check location. You can continue anyway.')
      setChecking(false)
    }
  }

  const continueAnyway = async () => {
    try {
      await SecureStore.setItemAsync(GEO_KEY, 'true')
    } catch {
      // ignore secure store errors
    }
    navigation.replace('GroupChoice')
  }

  if (checking) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>TableReady</Text>
        <Text style={styles.subtitle}>Checking your location...</Text>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TableReady</Text>
      <Text style={styles.subtitle}>We need your location to show available restaurants.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Continue Anyway" onPress={continueAnyway} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
})

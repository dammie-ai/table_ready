import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Button } from 'react-native'
import * as Location from 'expo-location'
import { getGeofenceConfig, type GeofenceConfig } from '@table-ready/shared'

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

export default function LocationCheckScreen({ navigation }: any) {
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [geofenceRadius, setGeofenceRadius] = useState<number | null>(null)

  useEffect(() => {
    checkLocation()
  }, [])

  const checkLocation = async () => {
    try {
      const config = await getGeofenceConfig()
      setGeofenceRadius(config.radius_meters)

      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('Location permission denied')
        setChecking(false)
        return
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const { latitude, longitude } = location.coords

      let isWithinGeofence = true
      if (config.restaurant_latitude && config.restaurant_longitude) {
        const distance = calculateDistance(
          latitude, longitude,
          config.restaurant_latitude, config.restaurant_longitude
        )
        isWithinGeofence = distance <= config.radius_meters
      }

      // Store geofence result in secure storage or async storage
      // For now, we'll just navigate
      navigation.replace('GroupChoice')
    } catch (err) {
      setError('Failed to check location')
      setChecking(false)
    }
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
      <Button title="Continue Anyway" onPress={() => navigation.replace('GroupChoice')} />
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

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { getSocket } from '@table-ready/shared'
import * as Location from 'expo-location'
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

export default function OrderTrackingScreen({ route }: any) {
  const { id } = route.params || { id: '1' }
  const [status, setStatus] = useState('RECEIVED')
  const [showReleasePopup, setShowReleasePopup] = useState(false)
  const [geoConfig, setGeoConfig] = useState<GeofenceConfig | null>(null)

  useEffect(() => {
    const socket = getSocket()
    socket.emit('join_order', id)
    const handleUpdate = (data: any) => {
      if (data.status) setStatus(data.status)
    }
    socket.on('order_updated', handleUpdate)
    return () => socket.off('order_updated', handleUpdate)
  }, [id])

  useEffect(() => {
    if (status !== 'ON_HOLD') return
    let watchId: number | null = null

    const startTracking = async () => {
      try {
        const config = await getGeofenceConfig()
        setGeoConfig(config)

        if (!config.restaurant_latitude || !config.restaurant_longitude) return

        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') return

        watchId = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (location) => {
            const { latitude, longitude } = location.coords
            const distance = calculateDistance(
              latitude,
              longitude,
              config.restaurant_latitude!,
              config.restaurant_longitude!
            )

            if (distance <= config.radius_meters) {
              setShowReleasePopup(true)
              if (watchId !== null) {
                Location.clearWatch(watchId)
              }
            }
          }
        )
      } catch (err) {
        console.error('Geofence tracking error:', err)
      }
    }

    startTracking()

    return () => {
      if (watchId !== null) {
        Location.clearWatch(watchId)
      }
    }
  }, [status])

  const statusSteps = ['RECEIVED', 'IN_PREPARATION', 'COOKING', 'READY', 'READY_FOR_PICKUP', 'PICKED_UP']
  const currentStep = statusSteps.indexOf(status)

  const handleRelease = async () => {
    try {
      // TODO: call backend release endpoint
      setShowReleasePopup(false)
      Alert.alert('Success', 'Order released to kitchen')
    } catch (err) {
      Alert.alert('Error', 'Failed to release order')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order #{id}</Text>
      <Text style={styles.subtitle}>{status.replace('_', ' ')}</Text>

      <View style={styles.progressContainer}>
        {statusSteps.map((step, idx) => (
          <View key={step} style={styles.stepRow}>
            <View style={[styles.stepCircle, idx <= currentStep && styles.stepCircleActive]}>
              <Text style={[styles.stepText, idx <= currentStep && styles.stepTextActive]}>
                {idx + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, idx <= currentStep && styles.stepLabelActive]}>
              {step.replace('_', ' ')}
            </Text>
          </View>
        ))}
      </View>

      {status === 'ON_HOLD' && (
        <TouchableOpacity
          style={styles.releaseButton}
          onPress={() => setShowReleasePopup(true)}
        >
          <Text style={styles.releaseButtonText}>Release to Kitchen</Text>
        </TouchableOpacity>
      )}

      {showReleasePopup && (
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <Text style={styles.popupTitle}>You're here!</Text>
            <Text style={styles.popupText}>Would you like us to start cooking your order?</Text>
            <View style={styles.popupButtons}>
              <TouchableOpacity style={styles.popupCancel} onPress={() => setShowReleasePopup(false)}>
                <Text style={styles.popupCancelText}>Not yet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popupConfirm} onPress={handleRelease}>
                <Text style={styles.popupConfirmText}>Start Cooking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  progressContainer: {
    gap: 16,
    marginBottom: 32,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2563eb',
  },
  stepText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  stepTextActive: {
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  stepLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  releaseButton: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  releaseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  popup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  popupText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  popupButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  popupCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  popupCancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  popupConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  popupConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
  },
})

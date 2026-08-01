import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../lib/api'

interface GeofenceConfig {
  success: boolean
  radius_meters: number
  unit: string
  restaurant_latitude: number | null
  restaurant_longitude: number | null
}

interface Order {
  master_order_id: number
  status: string
  order_type: string
}

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

export function useGeofenceTracker(order: Order | null, onRelease: () => void) {
  const [showReleasePopup, setShowReleasePopup] = useState(false)
  const [config, setConfig] = useState<GeofenceConfig | null>(null)
  const [tracking, setTracking] = useState(false)

  useEffect(() => {
    if (!order || order.status !== 'ON_HOLD') return

    let watchId: number
    let hasPrompted = false

    const startTracking = async () => {
      try {
        const geofenceConfig = await apiClient.get<GeofenceConfig>('/config/geofence')
        setConfig(geofenceConfig)

        if (!geofenceConfig.restaurant_latitude || !geofenceConfig.restaurant_longitude) {
          return
        }

        setTracking(true)

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            const distance = calculateDistance(
              latitude, longitude,
              geofenceConfig.restaurant_latitude,
              geofenceConfig.restaurant_longitude
            )

            console.log(`Geofence distance: ${distance.toFixed(1)}m / ${geofenceConfig.radius_meters}m`)

            if (distance <= geofenceConfig.radius_meters && !hasPrompted) {
              hasPrompted = true
              setShowReleasePopup(true)
            }
          },
          (err) => {
            console.error('Geofence tracking error:', err)
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 5,
            timeout: 10000
          }
        )
      } catch (err) {
        console.error('Failed to start geofence tracking:', err)
      }
    }

    startTracking()

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId)
      }
      setTracking(false)
    }
  }, [order?.master_order_id, order?.status])

  const handleRelease = useCallback(async () => {
    if (!order) return

    try {
      await apiClient.post(`/orders/${order.master_order_id}/release-hold`, {})
      setShowReleasePopup(false)
      onRelease()
    } catch (err) {
      console.error('Failed to release order:', err)
    }
  }, [order, onRelease])

  const handleDismiss = useCallback(() => {
    setShowReleasePopup(false)
  }, [])

  return {
    showReleasePopup,
    tracking,
    handleRelease,
    handleDismiss,
    radius: config?.radius_meters || 100
  }
}

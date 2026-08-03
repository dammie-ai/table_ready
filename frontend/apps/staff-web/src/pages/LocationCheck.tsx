import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/api'
import { useTheme } from '../hooks/useTheme'

interface GeofenceConfig {
  success: boolean
  radius_meters: number
  unit: string
  restaurant_latitude: number | null
  restaurant_longitude: number | null
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

interface LocationCheckProps {
  orderType: string
  tableNumber: string
  deliveryAddress: string
  specialInstructions: string
  onLocationVerified: (locationValid: boolean) => void
  onBack: () => void
}

export default function LocationCheck({
  orderType,
  tableNumber,
  deliveryAddress,
  specialInstructions,
  onLocationVerified,
  onBack,
}: LocationCheckProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [distance, setDistance] = useState<number | null>(null)
  const [config, setConfig] = useState<GeofenceConfig | null>(null)
  const navigate = useNavigate()
  const { theme } = useTheme()

  useEffect(() => {
    if (orderType !== 'DELIVERY' && orderType !== 'DINE_IN') {
      onLocationVerified(true)
      return
    }

    let watchId: number | null = null

    const checkLocation = async () => {
      try {
        setStatus('Loading restaurant location...')
        const geofenceConfig = await apiClient.get<GeofenceConfig>('/config/geofence')
        setConfig(geofenceConfig)

        if (!geofenceConfig.restaurant_latitude || !geofenceConfig.restaurant_longitude) {
          setError('Restaurant location not configured. Please contact support.')
          setLoading(false)
          return
        }

        setStatus('Requesting location access...')

        if (!navigator.geolocation) {
          setError('Geolocation is not supported by your browser')
          setLoading(false)
          return
        }

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            const dist = calculateDistance(
              latitude, longitude,
              geofenceConfig.restaurant_latitude,
              geofenceConfig.restaurant_longitude
            )
            setDistance(dist)

            if (dist <= geofenceConfig.radius_meters) {
              setStatus(`You're within ${Math.round(dist)}m of the restaurant`)
              setLoading(false)
              onLocationVerified(true)
            } else {
              setStatus(`You're ${Math.round(dist)}m away. Please get closer to the restaurant.`)
            }
          },
          (err) => {
            console.error('Geolocation error:', err)
            setError('Unable to get your location. Please enable location services.')
            setLoading(false)
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 5,
            timeout: 30000,
          }
        )
      } catch (err) {
        setError('Failed to load location settings')
        setLoading(false)
      }
    }

    checkLocation()

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [orderType, onLocationVerified])

  const handleContinue = () => {
    if (distance !== null && distance <= (config?.radius_meters || 100)) {
      onLocationVerified(true)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6" style={{ color: theme?.text_color }}>Location Check</h1>
      
      <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 mb-6">
        <p className="text-[#f1f5f9] mb-4">
          {orderType === 'DELIVERY' 
            ? 'We need to verify your location to confirm delivery availability.'
            : 'We need to verify you are at the restaurant to start your order.'}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={onBack}
              className="mt-3 text-sm text-red-300 hover:text-red-200 underline"
            >
              Go back and change order type
            </button>
          </div>
        )}

        {!error && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-sm text-[#f1f5f9]">{status || 'Waiting for location...'}</p>
            </div>

            {distance !== null && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#6b7280]">Distance to restaurant</span>
                  <span className="font-mono" style={{ color: theme?.primary_color }}>{Math.round(distance)}m</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((distance / (config?.radius_meters || 100)) * 100, 100)}%`,
                      backgroundColor: distance <= (config?.radius_meters || 100) ? '#10b981' : '#ef4444'
                    }}
                  />
                </div>
                <p className="text-xs text-[#6b7280] mt-1">
                  Must be within {config?.radius_meters || 100}m
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-white/8 text-[#f1f5f9] py-3 rounded-xl font-medium hover:bg-white/5 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={distance === null || distance > (config?.radius_meters || 100)}
          className="flex-1 text-white py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-40 transition-colors"
          style={{ backgroundColor: theme?.primary_color }}
        >
          Continue to Payment
        </button>
      </div>
    </div>
  )
}

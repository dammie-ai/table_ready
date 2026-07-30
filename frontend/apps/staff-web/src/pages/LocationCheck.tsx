import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGeofenceConfig, type GeofenceConfig } from '../lib/menuApi'

interface LocationCheckProps {
  onLocationComplete?: () => void
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

export default function LocationCheck({ onLocationComplete }: LocationCheckProps) {
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const checkLocation = async () => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser')
        setChecking(false)
        return
      }

      try {
        const config = await getGeofenceConfig()
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            
            let isWithinGeofence = true
            if (config.restaurant_latitude && config.restaurant_longitude) {
              const distance = calculateDistance(
                latitude, longitude,
                config.restaurant_latitude, config.restaurant_longitude
              )
              isWithinGeofence = distance <= config.radius_meters
              console.log(`Distance to restaurant: ${distance.toFixed(1)}m, Radius: ${config.radius_meters}m, Within: ${isWithinGeofence}`)
            }
            
            localStorage.setItem('tableready_within_geofence', isWithinGeofence ? 'true' : 'false')
            handleComplete()
          },
          (_err) => {
            setError('Location access denied. You can still browse the menu.')
            setChecking(false)
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      } catch (err) {
        console.error('Failed to load geofence config:', err)
        setChecking(false)
      }
    }

    checkLocation()
  }, [navigate, onLocationComplete])

  const handleComplete = () => {
    if (onLocationComplete) {
      onLocationComplete()
    } else {
      navigate('/group-choice')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8">
        <h1 className="text-3xl font-bold mb-4 text-center">TableReady</h1>
        <p className="text-gray-600 text-center mb-8">
          We need your location to show available restaurants and enable table-side ordering.
        </p>

        {checking && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking your location...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {!checking && (
          <button
            onClick={handleComplete}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Continue Anyway
          </button>
        )}
      </div>
    </div>
  )
}

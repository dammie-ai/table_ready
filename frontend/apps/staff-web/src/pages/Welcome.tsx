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

type WelcomeStep = 'location' | 'mode' | 'dinein'

export default function Welcome() {
  const [step, setStep] = useState<WelcomeStep>('location')
  const [distance, setDistance] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [orderMode, setOrderMode] = useState<'individual' | 'group' | null>(null)
  const navigate = useNavigate()
  const { theme } = useTheme()

  useEffect(() => {
    const withinGeofence = localStorage.getItem('tableready_within_geofence') === 'true'
    if (withinGeofence) {
      setStep('mode')
    }
  }, [])

  useEffect(() => {
    if (step !== 'location') return

    let watchId: number | null = null

    const checkLocation = async () => {
      try {
        setStatus('Loading restaurant location...')
        const geofenceConfig = await apiClient.get<GeofenceConfig>('/config/geofence')
        
        if (!geofenceConfig.restaurant_latitude || !geofenceConfig.restaurant_longitude) {
          setError('Restaurant location not configured.')
          setStatus('')
          return
        }

        setStatus('Requesting location access...')

        if (!navigator.geolocation) {
          setError('Geolocation is not supported by your browser')
          setStatus('')
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
              localStorage.setItem('tableready_within_geofence', 'true')
              setStatus(`You're within ${Math.round(dist)}m`)
              setTimeout(() => setStep('mode'), 800)
            } else {
              setStatus(`You're ${Math.round(dist)}m away. Please get closer.`)
            }
          },
          (err) => {
            console.error('Geolocation error:', err)
            setError('Unable to get your location. Please enable location services.')
            setStatus('')
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 5,
            timeout: 30000,
          }
        )
      } catch (err) {
        setError('Failed to load location settings')
        setStatus('')
      }
    }

    checkLocation()

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [step])

  const handleModeSelect = (mode: 'individual' | 'group') => {
    setOrderMode(mode)
    if (mode === 'group') {
      const groupCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      localStorage.setItem('tableready_group_code', groupCode)
    } else {
      localStorage.removeItem('tableready_group_code')
    }
    setStep('dinein')
  }

  const handleDineIn = () => {
    navigate('/table-pin')
  }

  const handlePickup = () => {
    navigate('/menu?mode=pickup')
  }

  const handleDelivery = () => {
    navigate('/menu?mode=delivery')
  }

  if (step === 'location') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="text-center p-8">
          <h1 className="text-5xl font-bold text-white mb-4">TableReady</h1>
          <p className="text-xl text-blue-100 mb-12">Order from your table or on the go</p>
          
          <div className="max-w-sm mx-auto bg-white/10 backdrop-blur rounded-2xl p-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-white">{status || 'Checking your location...'}</p>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 mb-4">
                <p className="text-red-200 text-sm">{error}</p>
                <button
                  onClick={() => {
                    localStorage.setItem('tableready_within_geofence', 'true')
                    setStep('mode')
                  }}
                  className="mt-3 text-sm text-white underline"
                >
                  Continue anyway
                </button>
              </div>
            )}

            {distance !== null && !error && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-blue-100">Distance to restaurant</span>
                  <span className="font-mono text-white">{Math.round(distance)}m</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${Math.min((distance / 200) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <p className="text-blue-200 mt-8">
            Staff? <button onClick={() => navigate('/login')} className="underline">Sign in</button>
          </p>
        </div>
      </div>
    )
  }

  if (step === 'dinein' && orderMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="text-center p-8">
          <h1 className="text-5xl font-bold text-white mb-4">TableReady</h1>
          <p className="text-xl text-blue-100 mb-12">How are you ordering?</p>

          <div className="grid gap-4 max-w-sm mx-auto">
            <button
              onClick={handleDineIn}
              className="bg-white text-blue-600 py-4 px-6 rounded-xl text-lg font-semibold hover:bg-blue-50 shadow-lg"
            >
              Dine In
            </button>
            <button
              onClick={handlePickup}
              className="bg-white text-blue-600 py-4 px-6 rounded-xl text-lg font-semibold hover:bg-blue-50 shadow-lg"
            >
              Pickup
            </button>
            <button
              onClick={handleDelivery}
              className="bg-white text-blue-600 py-4 px-6 rounded-xl text-lg font-semibold hover:bg-blue-50 shadow-lg"
            >
              Delivery
            </button>
          </div>

          <button
            onClick={() => { setStep('mode'); setOrderMode(null) }}
            className="mt-6 text-blue-200 underline text-sm"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="text-center p-8">
        <h1 className="text-5xl font-bold text-white mb-4">TableReady</h1>
        <p className="text-xl text-blue-100 mb-12">Order from your table or on the go</p>

        <div className="grid gap-4 max-w-sm mx-auto">
          <button
            onClick={() => handleModeSelect('individual')}
            className="bg-white text-blue-600 py-4 px-6 rounded-xl text-lg font-semibold hover:bg-blue-50 shadow-lg flex items-center justify-center gap-3"
          >
            <span className="text-2xl">👤</span>
            Just Me
          </button>
          <button
            onClick={() => handleModeSelect('group')}
            className="bg-white text-blue-600 py-4 px-6 rounded-xl text-lg font-semibold hover:bg-blue-50 shadow-lg flex items-center justify-center gap-3"
          >
            <span className="text-2xl">👥</span>
            Group Order
          </button>
        </div>

        <p className="text-blue-200 mt-8">
          Staff? <button onClick={() => navigate('/login')} className="underline">Sign in</button>
        </p>
      </div>
    </div>
  )
}

import { Platform } from 'react-native'

const API_BASE = Platform.OS === 'web' 
  ? 'http://localhost:8001/api' 
  : '/api'

export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tableready_token') : null
  
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || 'API request failed')
  }
  return data as T
}

export async function getGeofenceConfig(): Promise<GeofenceConfig> {
  return apiClient('/config/geofence')
}

export async function getMenuItems(): Promise<MenuResponse> {
  return apiClient('/menu')
}

export async function getComboMeals(): Promise<ComboResponse> {
  return apiClient('/combo-meals')
}

export async function getComboMealDetail(id: number): Promise<ComboDetailResponse> {
  return apiClient(`/combo-meals/${id}`)
}

import { apiClient } from '@table-ready/shared'
import type { MenuItem, MenuResponse, ComboMeal, ComboMealSide, ComboMealDetail, ComboResponse, ComboDetailResponse, GeofenceConfig } from '@table-ready/shared'

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

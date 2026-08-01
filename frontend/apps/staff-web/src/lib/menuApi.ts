export interface MenuItem {
  item_id: number
  name: string
  category_type: string
  description: string | null
  base_price: number
  image_url: string | null
  is_trending: boolean
  prep_time_minutes: number
  is_active: boolean
  stock_quantity: number
  out_of_stock_flag: boolean
  allergens?: string[]
  custom_sides_array?: any[]
}

export interface MenuResponse {
  success: boolean
  count: number
  items: MenuItem[]
}

export interface ComboMeal {
  combo_id: number
  name: string
  description: string | null
  base_price: number
  image_url: string | null
  required_main_category: string
  max_sides: number
  sides_category: string
  is_active: boolean
}

export interface ComboMealSide {
  combo_side_id: number
  combo_id: number
  menu_item_id: number
  is_default: boolean
  sort_order: number
  name: string
  base_price: number
  image_url: string | null
  category_type: string
}

export interface ComboDetailResponse {
  success: boolean
  combo: ComboMeal & { sides: ComboMealSide[] }
  sides: ComboMealSide[]
}

export interface GeofenceConfig {
  success: boolean
  radius_meters: number
  unit: string
  restaurant_latitude: number | null
  restaurant_longitude: number | null
}

export async function getGeofenceConfig(): Promise<GeofenceConfig> {
  const res = await fetch('http://localhost:8001/api/config/geofence')
  const data = await res.json()
  return data
}

export async function getMenuItems(): Promise<MenuResponse> {
  const res = await fetch('http://localhost:8001/api/menu')
  const data = await res.json()
  return data
}

export async function getComboMeals(): Promise<{ success: boolean; combos: ComboMeal[] }> {
  const res = await fetch('http://localhost:8001/api/combo-meals')
  const data = await res.json()
  return data
}

export async function getComboMealDetail(id: number): Promise<ComboDetailResponse> {
  const res = await fetch(`http://localhost:8001/api/combo-meals/${id}`)
  const data = await res.json()
  return data
}

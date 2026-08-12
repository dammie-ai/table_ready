import { API_ORIGIN, apiClient } from './api'

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
  const res = await fetch(`${API_ORIGIN}/api/config/geofence`)
  const data = await res.json()
  return data
}

export async function getMenuItems(): Promise<MenuResponse> {
  const res = await fetch(`${API_ORIGIN}/api/menu`)
  const data = await res.json()
  return data
}

export async function toggleMenuItemStock(itemId: number) {
  return apiClient.patch<{ success: boolean; message: string; item: MenuItem }>(
    `/menu/${itemId}/toggle-stock`,
    {}
  )
}

export async function getComboMeals(): Promise<{ success: boolean; combos: ComboMeal[] }> {
  const res = await fetch(`${API_ORIGIN}/api/combo-meals`)
  const data = await res.json()
  return data
}

export async function getComboMealDetail(id: number): Promise<ComboDetailResponse> {
  const res = await fetch(`${API_ORIGIN}/api/combo-meals/${id}`)
  const data = await res.json()
  return data
}

// Includes deactivated combos, unlike getComboMeals() — a manager needs to
// see (and be able to reactivate) ones they've turned off.
export async function getAllComboMeals(): Promise<{ success: boolean; combos: ComboMeal[] }> {
  return apiClient.get(`/combo-meals?all=true`)
}

export interface ComboMealInput {
  name: string
  description?: string
  base_price: number
  image_url?: string
  required_main_category: string
  max_sides: number
  sides_category: string
}

export async function createComboMeal(input: ComboMealInput) {
  return apiClient.post<{ success: boolean; combo: ComboMeal }>('/combo-meals', input)
}

export async function updateComboMeal(id: number, input: Partial<ComboMealInput> & { is_active?: boolean }) {
  return apiClient.put<{ success: boolean; combo: ComboMeal }>(`/combo-meals/${id}`, input)
}

export async function deleteComboMeal(id: number) {
  return apiClient.delete<{ success: boolean; message: string }>(`/combo-meals/${id}`)
}

export async function addComboSide(comboId: number, menuItemId: number, isDefault = false) {
  return apiClient.post<{ success: boolean; side: ComboMealSide }>(`/combo-meals/${comboId}/sides`, {
    menu_item_id: menuItemId,
    is_default: isDefault,
  })
}

export async function removeComboSide(comboId: number, sideId: number) {
  return apiClient.delete<{ success: boolean; message: string }>(`/combo-meals/${comboId}/sides/${sideId}`)
}

export interface Modifier {
  modifier_id: number
  name: string
  description: string | null
  price_adjustment: number
  modifier_type: 'choice' | 'extra' | 'removal' | 'preparation'
  is_active: boolean
}

export interface ItemModifier {
  item_modifier_id: number
  menu_item_id: number
  modifier_id: number
  is_required: boolean
  max_quantity: number
  sort_order: number
  name: string
  description: string | null
  price_adjustment: number
  modifier_type: string
}

export interface ModifierInput {
  name: string
  description?: string
  price_adjustment?: number
  modifier_type?: 'choice' | 'extra' | 'removal' | 'preparation'
  is_active?: boolean
}

export async function getModifiers() {
  return apiClient.get<{ success: boolean; count: number; modifiers: Modifier[] }>('/modifiers')
}

export async function createModifier(input: ModifierInput) {
  return apiClient.post<{ success: boolean; modifier: Modifier }>('/modifiers', input)
}

export async function updateModifier(id: number, input: Partial<ModifierInput>) {
  return apiClient.put<{ success: boolean; modifier: Modifier }>(`/modifiers/${id}`, input)
}

export async function deleteModifier(id: number) {
  return apiClient.delete<{ success: boolean; message: string }>(`/modifiers/${id}`)
}

export async function getMenuItemModifiers(menuItemId: number) {
  return apiClient.get<{ success: boolean; count: number; modifiers: ItemModifier[] }>(`/modifiers/item/${menuItemId}`)
}

export async function addModifierToItem(menuItemId: number, modifierId: number) {
  return apiClient.post<{ success: boolean; item_modifier: ItemModifier }>(`/modifiers/item/${menuItemId}`, { modifier_id: modifierId })
}

export async function removeModifierFromItem(menuItemId: number, modifierId: number) {
  return apiClient.delete<{ success: boolean; message: string }>(`/modifiers/item/${menuItemId}/${modifierId}`)
}

export interface AllergenSummaryItem {
  item_id: number
  name: string
  allergens: string[]
  allergen_count: number
  category_type: string
  times_ordered: number
}

export interface AllergyAlert {
  order_item_id: number
  master_order_id: number
  item_name: string
  allergens: string[]
  quantity: number
  item_status: string
  order_type: string
  table_number: number | null
  order_status: string
}

export async function getAllergenSummary() {
  return apiClient.get<{
    success: boolean
    menu_items_with_allergens: AllergenSummaryItem[]
    allergen_frequency: Record<string, { count: number; items: string[] }>
  }>('/allergy/summary')
}

export async function getAllergyAlerts() {
  return apiClient.get<{ success: boolean; count: number; alerts: AllergyAlert[] }>('/allergy/alerts')
}

export async function updateMenuItemAllergens(itemId: number, allergens: string[]) {
  return apiClient.patch<{ success: boolean; message: string; item: { item_id: number; name: string; allergens: string[] } }>(
    `/allergy/menu/${itemId}/allergens`,
    { allergens }
  )
}

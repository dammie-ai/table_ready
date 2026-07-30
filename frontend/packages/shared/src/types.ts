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

export interface ComboMealDetail extends ComboMeal {
  sides: ComboMealSide[]
}

export interface ComboResponse {
  success: boolean
  count: number
  combos: ComboMeal[]
}

export interface ComboDetailResponse {
  success: boolean
  combo: ComboMealDetail
  sides: ComboMealSide[]
}

export interface GeofenceConfig {
  success: boolean
  radius_meters: number
  unit: string
  restaurant_latitude: number | null
  restaurant_longitude: number | null
}

export interface CartItem {
  menu_item_id?: number
  name: string
  base_price: number
  quantity: number
  custom_instructions?: string
  combo_id?: number
  combo_name?: string
  combo_main?: { menu_item_id: number; name: string; base_price: number }
  combo_sides?: { menu_item_id: number; name: string; base_price: number }[]
}

export interface OrderItem {
  order_item_id: number
  item_id: number
  name: string
  base_price: number
  quantity: number
  item_status: string
  custom_instructions?: string
  modifiers: any[]
}

export interface Order {
  master_order_id: number
  status: string
  total_amount: number
  order_type: string
  table_number?: number
  progress_percentage: number
  items: OrderItem[]
}

export interface CartUpdatePayload {
  type: 'add' | 'remove' | 'update' | 'sync'
  item?: {
    menu_item_id?: number
    name: string
    base_price: number
    quantity: number
    combo_id?: number
    combo_main?: { menu_item_id: number; name: string; base_price: number }
    combo_sides?: { menu_item_id: number; name: string; base_price: number }[]
  }
  menu_item_id?: number
  quantity?: number
  timestamp: number
}

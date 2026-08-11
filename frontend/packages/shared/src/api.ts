import { Platform } from 'react-native'
import { getStorageItem } from './storage'

// On web, only use localhost when actually served from localhost (local
// dev); a deployed build (Vercel/Render static site) needs the real
// deployed backend. On a real device (Expo Go), "localhost"/LAN IPs only
// work on the same network as the dev machine, so point at the deployed
// backend by default too — swap back to a LAN IP here for local-only testing.
const DEPLOYED_API = 'https://tableready-backend.onrender.com/api'
const API_BASE = Platform.OS === 'web'
  ? (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8001/api'
      : DEPLOYED_API)
  : DEPLOYED_API

// The auth token actually lives inside useAuthStore's zustand-persist
// envelope under 'tableready_auth' (secure on-device storage on native,
// localStorage on web) — not a bare 'tableready_token' key, which nothing
// in this app ever wrote to. Mirrors staff-web's lib/api.ts getToken().
async function getToken(): Promise<string | null> {
  try {
    const stored = await getStorageItem('tableready_auth')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed.state?.token || null
  } catch {
    return null
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken()

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

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
}

export async function getGeofenceConfig(): Promise<GeofenceConfig> {
  return request<GeofenceConfig>('/config/geofence')
}

export async function getConfig(): Promise<ConfigResponse> {
  return request<ConfigResponse>('/config')
}

export async function getMenuItems(): Promise<MenuResponse> {
  return request<MenuResponse>('/menu')
}

export async function getMenuItemDetail(id: number): Promise<MenuItemDetailResponse> {
  return request<MenuItemDetailResponse>(`/menu/${id}`)
}

export async function getItemModifiers(menuItemId: number): Promise<ModifierResponse> {
  return request<ModifierResponse>(`/modifiers/item/${menuItemId}`)
}

export async function getComboMeals(): Promise<ComboResponse> {
  return request<ComboResponse>('/combo-meals')
}

export async function getComboMealDetail(id: number): Promise<ComboDetailResponse> {
  return request<ComboDetailResponse>(`/combo-meals/${id}`)
}

export async function createCart(): Promise<CartResponse> {
  return request<CartResponse>('/cart', { method: 'POST', body: '{}' })
}

export async function getCart(cartId: number): Promise<CartResponse> {
  return request<CartResponse>(`/cart/${cartId}`)
}

export async function addCartItem(cartId: number, item: CartItemPayload) {
  return request<CartResponse>(`/cart/${cartId}/items`, { method: 'POST', body: JSON.stringify(item) })
}

export async function removeCartItem(cartId: number, itemId: number) {
  return request<CartResponse>(`/cart/${cartId}/items/${itemId}`, { method: 'DELETE' })
}

export async function clearCart(cartId: number) {
  return request<CartResponse>(`/cart/${cartId}`, { method: 'DELETE' })
}

export async function checkoutCart(cartId: number, checkout: CheckoutPayload) {
  return request<OrderResponse>(`/cart/${cartId}/checkout`, { method: 'POST', body: JSON.stringify(checkout) })
}

export async function createOrder(order: CreateOrderPayload): Promise<OrderResponse> {
  return request<OrderResponse>('/orders', { method: 'POST', body: JSON.stringify(order) })
}

export async function getOrder(id: number): Promise<OrderResponse> {
  return request<OrderResponse>(`/orders/${id}`)
}

export async function getOrderReceipt(id: number): Promise<ReceiptResponse> {
  return request<ReceiptResponse>(`/orders/${id}/receipt`)
}

export async function releaseOrderHold(id: number) {
  return request<{ success: boolean; message: string }>(`/orders/${id}/release-hold`, { method: 'POST', body: '{}' })
}

export async function cancelOrder(id: number, accessToken?: string) {
  return request<{ success: boolean; message: string; order: Order }>(`/orders/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ access_token: accessToken }),
  })
}

export async function customerArrived(id: number, payload: { vehicle?: string; curbside_lane?: string }) {
  return request<{ success: boolean; message: string }>(`/orders/${id}/customer-arrived`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function createPaymentIntent(payload: CreatePaymentIntentPayload) {
  return request<PaymentIntentResponse>('/payments/create-intent', { method: 'POST', body: JSON.stringify(payload) })
}

export async function confirmPayment(payload: ConfirmPaymentPayload) {
  return request<{ success: boolean }>('/payments/confirm', { method: 'POST', body: JSON.stringify(payload) })
}

export async function calculateSplitBill(payload: SplitBillCalculatePayload) {
  return request<SplitBillCalculateResponse>('/payments/split-bill/calculate', { method: 'POST', body: JSON.stringify(payload) })
}

export async function createSplitBillIntents(payload: SplitBillCreatePayload) {
  return request<SplitBillCreateResponse>('/payments/split-bill/create-intents', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getDishOfWeek() {
  return request<{ success: boolean; dish: any }>('/promotions/dish-of-week')
}

export async function getActiveDiscounts() {
  return request<{ success: boolean; discounts: any[] }>('/promotions/dish-of-week/active-discounts')
}

export async function getUsual() {
  return request<{ success: boolean; usual: any }>('/customer/usual')
}

export async function setUsual(items: any[]) {
  return request<{ success: boolean }>('/customer/usual', { method: 'POST', body: JSON.stringify({ items }) })
}

export async function reorderUsual() {
  return request<{ success: boolean }>('/customer/usual/reorder', { method: 'POST', body: '{}' })
}

export async function verifyTableCode(payload: { table_number: number; code: string }) {
  return request<{ success: boolean; table_id: number; message?: string; waiter_name: string | null }>('/tables/verify-code', { method: 'POST', body: JSON.stringify(payload) })
}

export async function checkLocation(payload: { latitude: number; longitude: number; check_type?: 'delivery' | 'dine_in' | 'qr_scan' }) {
  return request<{ success: boolean; allowed: boolean; distance_miles: number; radius_miles: number; message: string }>('/tables/check-location', { method: 'POST', body: JSON.stringify(payload) })
}

export async function verifyQRCode(payload: { qr_code: string }) {
  return request<{ success: boolean; table: any }>('/tables/qr/verify', { method: 'POST', body: JSON.stringify(payload) })
}

export async function joinWaitlist(payload: { table_id: number; customer_name: string; phone?: string; party_size: number }) {
  return request<{ success: boolean; entry: any }>('/waitlist/join', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getFloorLayout() {
  return request<{ success: boolean; count: number; tables: { table_id: number; table_number: number; status_state: string }[] }>('/tables/floor-layout')
}

export async function getWaitlist() {
  return request<{ success: boolean; entries: any[] }>('/waitlist')
}

export async function cancelWaitlistEntry(entryId: number) {
  return request<{ success: boolean }>(`/waitlist/${entryId}/cancel`, { method: 'PATCH', body: '{}' })
}

export async function getWaitlistQueue(tableId: number) {
  return request<{ success: boolean; queue: any[] }>(`/waitlist/queue/${tableId}`)
}

export async function createReservation(payload: { reservation_date: string; reservation_time: string; party_size: number; customer_name: string; customer_phone?: string; table_id?: number; notes?: string }) {
  return request<{ success: boolean; reservation: any }>('/reservations', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getReservations() {
  return request<{ success: boolean; reservations: any[] }>('/reservations')
}

export async function cancelReservation(id: number) {
  return request<{ success: boolean }>(`/reservations/${id}/cancel`, { method: 'PATCH', body: '{}' })
}

export async function createServiceRequest(payload: { table_number: number; request_type: string; notes?: string }) {
  return request<{ success: boolean; request: any }>('/service-requests', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getServiceRequests() {
  return request<{ success: boolean; requests: any[] }>('/service-requests')
}

export async function getNotificationPreferences() {
  return request<{ success: boolean; preferences: any }>('/notifications/preferences')
}

export async function updateNotificationPreferences(prefs: any) {
  return request<{ success: boolean }>('/notifications/preferences', { method: 'PATCH', body: JSON.stringify(prefs) })
}

// /auth/register and /auth/login are the staff (users table) endpoints —
// not for customers at all, and /auth/register requires an already-
// authenticated admin/manager. Customers get their own separate identity
// space, tied to customer_profiles, not the staff table.
export async function customerRegister(payload: { email: string; password: string; first_name?: string; last_name?: string; phone?: string }) {
  return request<{ success: boolean; token: string; user: User }>('/customer/register', { method: 'POST', body: JSON.stringify(payload) })
}

export async function customerLogin(payload: { email: string; password: string }) {
  return request<{ success: boolean; token: string; user: User }>('/customer/login', { method: 'POST', body: JSON.stringify(payload) })
}

export async function deleteAccount() {
  return request<{ success: boolean }>('/auth/account', { method: 'DELETE' })
}

export async function joinSessionByCode(payload: { code: string }) {
  return request<{ success: boolean; session: any }>('/sessions/join-by-code', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getOrderHistory(userId: number) {
  return request<{ success: boolean; orders: any[] }>(`/orders/history/${userId}`)
}

// Shared by both staff (username/role, no email) and customer (email/name,
// no role at all — a customer token carries type: 'customer' instead)
// identities, which are entirely separate account systems.
export interface User {
  id: number
  username?: string
  email?: string
  first_name?: string
  last_name?: string
  role?: string
}

export interface MenuResponse {
  success: boolean
  count: number
  items: MenuItem[]
}

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

export interface MenuItemDetailResponse {
  success: boolean
  item: MenuItem
  ingredients: any[]
  modifiers: MenuItemModifier[]
}

export interface MenuItemModifier {
  modifier_id: number
  name: string
  description: string
  price_adjustment: number
  modifier_type: string
}

export interface ModifierResponse {
  success: boolean
  modifiers: MenuItemModifier[]
}

export interface ComboResponse {
  success: boolean
  count: number
  combos: ComboMeal[]
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
  combo: ComboMealDetail
  sides: ComboMealSide[]
}

export interface ComboMealDetail extends ComboMeal {
  sides: ComboMealSide[]
}

export interface GeofenceConfig {
  success: boolean
  radius_meters: number
  unit: string
  restaurant_latitude: number | null
  restaurant_longitude: number | null
}

export interface ConfigResponse {
  success: boolean
  config: {
    // Every config_key row comes back as whatever shape it was saved
    // with — tax_rate is { rate: <fraction, e.g. 0.085> }, matching
    // configService.js's getTaxRate() on the backend.
    tax_rate?: { rate: number }
    [key: string]: any
  }
}

export interface CartResponse {
  success: boolean
  cart_id: number
  items: CartItem[]
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

export interface CartItemPayload {
  menu_item_id: number
  quantity: number
  price?: number
  custom_instructions?: string
  modifiers?: { modifier_id: number; quantity: number }[]
  // Ties combo components (main + sides) flattened from one cart entry
  // back together so the backend charges the combo's bundle price once
  // instead of summing each component's own à la carte price.
  combo_id?: number
  combo_group?: string
}

export interface CheckoutPayload {
  order_type: 'IN_HOUSE' | 'PICKUP' | 'DELIVERY' | 'ORDER_FROM_HOME'
  is_held?: boolean
  items: CartItemPayload[]
  table_number?: number
  notes?: string
  ordered_by_user_id?: number
  idempotency_key?: string
  delivery_latitude?: number
  delivery_longitude?: number
  // Declared intent, not a charge — collected in person at pay-at-counter,
  // stored so staff/the receipt know what the customer meant to leave.
  tip_amount?: number
}

export interface CreateOrderPayload extends CheckoutPayload {
  payment_method?: 'card' | 'cash'
}

export interface OrderResponse {
  success: boolean
  message?: string
  order: Order
  appliedMultiplier?: number
}

export interface Order {
  master_order_id: number
  status: string
  total_amount: number
  order_type: string
  table_number?: number
  progress_percentage: number
  is_held: boolean
  created_at: string
  updated_at: string
  items: OrderItem[]
  payment_status?: string
  pickup_code?: string
  access_token?: string
  tip_value?: number
}

export interface OrderItem {
  order_item_id: number
  item_id: number
  quantity: number
  item_status: string
  custom_instructions?: string
  modifiers: any[]
  name?: string
  base_price?: number
}

export interface ReceiptResponse {
  success: boolean
  receipt: {
    receiptNumber: string
    orderId: number
    tableNumber?: number
    orderType: string
    status: string
    date: string
    items: {
      name: string
      quantity: number
      unit_price: number
      subtotal: number
      custom_instructions?: string
      modifiers: any[]
    }[]
    subtotal: number
    tax: number
    tax_rate: number
    tip: number
    total: number
    payment_status: string
    stripe_charge_id?: string
    notes?: string
  }
}

export interface PaymentIntentResponse {
  success: boolean
  clientSecret: string
  paymentIntentId: string
}

export interface CreatePaymentIntentPayload {
  order_mode: 'dine-in' | 'pickup' | 'delivery'
  amount: number
  order_id?: number
  latitude?: number
  longitude?: number
}

export interface ConfirmPaymentPayload {
  payment_intent_id: string
  order_id: number
}

export interface SplitBillCalculatePayload {
  mode: 'even' | 'itemized'
  total: number
  splits?: number
  guestOrders?: any[]
  tax?: number
  tip?: number
  totalPaid?: number
}

export interface SplitBillCalculateResponse {
  mode: string
  splits: number[]
  calculatedTotal?: number
  balance: any
}

export interface SplitBillCreatePayload {
  order_id: number
  splits: { index: number; label?: string; amount: number; customer_id?: number }[]
}

export interface SplitBillCreateResponse {
  success: boolean
  paymentIntents: {
    index: number
    label: string
    amount: number
    clientSecret: string
    paymentIntentId: string
  }[]
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

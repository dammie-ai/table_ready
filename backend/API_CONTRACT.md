# TableReady API Contract

**Base URL:** `http://localhost:8001/api`
**Auth:** Bearer JWT token in `Authorization: Bearer <token>` header for protected routes.
**Guest Access:** Customer ordering, menu browsing, order tracking, and service requests do NOT require login.

---

## Public Endpoints (No Auth)

### Health Check
- `GET /health`
- Response: `{ status: 'ok', message: string }`

### Menu (Customer-facing)
- `GET /menu`
  - Response: `{ success: true, count: number, items: Array<MenuItem> }`
  - `MenuItem`: `{ item_id, name, category_type, description, base_price, image_url, is_trending, prep_time_minutes }`

- `GET /menu/:id`
  - Response: `{ success: true, item: MenuItem, ingredients: Array<{ inventory_id, item_name, quantity_required }> }`

### Auth
- `POST /auth/register`
  - Body: `{ username, password, role? }`
  - Response: `{ success: true, message, user: { id, username, role } }`

- `POST /auth/login`
  - Body: `{ username, password }`
  - Response: `{ success: true, token, user: { id, username, role } }`

### Orders (Public — for guest order tracking)
- `GET /orders/:id`
  - Response: `{ success: true, order: { ...order, items: Array<{ quantity, custom_instructions, item_status, item_name, modifiers }> } }`

- `GET /orders/:id/receipt`
  - Response: `{ success: true, receipt: { ..., items: Array<{ name, quantity, unit_price, custom_instructions, modifiers }> } }`

### Service Requests (Public — guests can create)
- `POST /service-requests`
  - Body: `{ table_number, request_type, notes?, session_id? }`
  - Valid `request_type`: `call_server`, `refill`, `bill_request`, `other`
  - Response: `{ success: true, message, request }`

### Payments (Public)
- `POST /payments/create-intent`
  - Body: `{ amount, currency? }`
  - Response: `{ success: true, clientSecret, paymentIntentId, status }`

- `POST /payments/split`
  - Body: `{ mode: 'even' | 'itemized', total, splits?, guestOrders?, tax?, tip?, totalPaid? }`
  - Response: `{ mode, splits, balance }`

- `POST /payments/webhook`
  - Stripe webhook endpoint (raw body)

---

## Protected Endpoints (Bearer Auth Required)

### Cart (Guest + Customer)
- `POST /cart`
  - Body: `{ customer_id?, session_token? }`
  - Response: `{ success: true, cart: Cart }`

- `GET /cart/:id`
  - Response: `{ success: true, cart: { ...cart, items, subtotal, item_count } }`

- `POST /cart/:id/items`
  - Body: `{ menu_item_id?, inventory_id?, quantity?, custom_instructions? }`
  - Response: `{ success: true, message, unit_price }`

- `DELETE /cart/:id/items/:itemId`
  - Response: `{ success: true, message }`

- `DELETE /cart/:id`
  - Response: `{ success: true, message }`

- `POST /cart/:id/checkout`
  - Body: `{ order_type, table_number?, notes?, ordered_by_user_id?, latitude?, longitude? }`
  - `order_type`: `Dine-In`, `Pickup`, `Delivery`, `Drive-Thru`, `ORDER_FROM_HOME`
  - Response: `{ success: true, message, order: Order, appliedMultiplier, paymentIntent? }`
  - Note: Delivery orders require `latitude` + `longitude` (10-mile geofence enforced)

### Orders (Staff)
- `POST /orders`
  - Auth: admin/manager/kitchen/waiter
  - Body: `{ order_type, is_held?, items, table_number?, notes?, ordered_by_user_id? }`
  - Response: `{ success: true, message, order, appliedMultiplier }`

- `GET /orders/kitchen`
  - Auth: admin/manager/kitchen/waiter
  - Response: `{ success: true, orders: Array<OrderSummary> }`

- `PATCH /orders/:id/status`
  - Auth: admin/manager/kitchen/waiter
  - Body: `{ status, progress_percentage? }`
  - Valid statuses: `RECEIVED`, `IN_PREPARATION`, `COOKING`, `READY`, `SERVED`, `COMPLETED`, `CANCELLED`
  - Response: `{ success: true, message, order }`

- `POST /orders/:id/refund`
  - Auth: admin/manager only
  - Response: `{ success: true, message, order }`

- `PATCH /orders/:id/cancel`
  - Auth: admin/manager/waiter
  - Response: `{ success: true, message, order }`

- `GET /orders/user/:userId`
  - Auth: any authenticated user
  - Response: `{ success: true, orders: Array<OrderWithItems> }`

### Menu (Staff - Auth: admin/manager)
- `POST /menu`
  - Body: `{ name, category_type, description?, base_price, stock_quantity?, prep_time_minutes?, image_url? }`
  - Response: `{ success: true, message, item }`

- `PUT /menu/:id`
  - Body: `{ name?, category_type?, description?, base_price?, stock_quantity?, is_active?, is_trending?, prep_time_minutes?, image_url?, allergens?, custom_sides_array? }`
  - Response: `{ success: true, message, item }`

- `PATCH /menu/:id/toggle`
  - Response: `{ success: true, message, item }`

### Menu Ingredients (Staff - Auth: admin/manager/kitchen)
- `POST /menu/:id/ingredients`
  - Body: `{ inventory_id, quantity_required }`
  - Response: `{ message, data }`

- `GET /menu/:id/ingredients`
  - Response: `{ menu_item_id, ingredients }`

- `DELETE /menu/:id/ingredients/:inventoryId`
  - Response: `{ message, data }`

### Inventory
- `POST /inventory`
  - Auth: admin/manager/kitchen
  - Body: `{ items: Array<{ inventory_id, quantity }> }`
  - Response: `{ success: true, message, appliedMultiplier, deducted_items }`

- `PATCH /inventory/:id/toggle`
  - Auth: admin/manager only
  - Body: `{ is_active? }`
  - Response: `{ success: true, message, item }`

- `GET /inventory/alerts`
  - Response: `{ success: true, count, alerts }`

- `GET /inventory/alerts/history`
  - Response: `{ success: true, count, alerts }`

- `POST /inventory/alerts/:id/acknowledge`
  - Response: `{ success: true, message, alert }`

- `POST /inventory/alerts/:id/resolve`
  - Response: `{ success: true, message, alert }`

### Promotions (Dish of the Week)
- `GET /promotions/dish-of-week`
  - Response: `{ success: true, count, dishes }`

- `POST /promotions/dish-of-week/calculate`
  - Auth: admin/manager
  - Response: `{ success: true, message }`

- `POST /promotions/dish-of-week/override`
  - Auth: admin only
  - Body: `{ category_type, menu_item_id, discount_percentage?, period_start?, period_end? }`
  - Response: `{ success: true, message, config }`

- `GET /promotions/dish-of-week/active-discounts`
  - Response: `{ success: true, discounts: { [category_type]: { menu_item_id, discount_percentage, is_override } } }`

### The Usual (Customer Reorder)
- `GET /customer/usual?session_token=<token>`
  - Public — guest access via session_token
  - Response: `{ success: true, usual: { combo_id, combo_name, items, order_count, last_ordered_at } }`

- `GET /customer/:customerId/usual`
  - Auth required
  - Response: same as above

- `POST /customer/usual/reorder`
  - Body: `{ session_token, order_type, table_number?, ordered_by_user_id? }`
  - Response: `{ success: true, message, order, appliedMultiplier }`

- `POST /customer/:customerId/usual/reorder`
  - Auth required
  - Same response

- `POST /customer/usual`
  - Body: `{ session_token, item_ids, quantities, combo_name? }`
  - Response: `{ success: true, message, combo }`

- `POST /customer/:customerId/usual`
  - Auth required
  - Same response

### Service Requests
- `POST /service-requests`
  - Public — guests can create
  - Body: `{ table_number, request_type, notes?, session_id? }`
  - Response: `{ success: true, message, request }`

- `GET /service-requests`
  - Auth: staff
  - Query: `?status=&table_number=`
  - Response: `{ success: true, count, requests }`

- `PATCH /service-requests/:id/acknowledge`
  - Auth: staff
  - Response: `{ success: true, message, request }`

- `PATCH /service-requests/:id/complete`
  - Auth: staff
  - Response: `{ success: true, message, request }`

- `PATCH /service-requests/:id/cancel`
  - Auth: staff
  - Response: `{ success: true, message, request }`

### Tables
- `POST /tables/verify`
  - Body: `{ table_number, code }`
  - Response: `{ success: true, message, table_id }`

- `GET /tables/floor-layout`
  - Response: `{ success: true, count, tables }`

- `PATCH /tables/:id/status`
  - Auth: admin/manager/waiter
  - Body: `{ status_state }`
  - Response: `{ success: true, message, table }`

- `POST /tables`
  - Auth: admin/manager
  - Body: `{ table_number }`
  - Response: `{ success: true, message, table }`

### Sessions
- `POST /sessions/check-shift`
  - Auth: admin/manager/waiter
  - Body: `{ waiter_id }`
  - Response: `{ success: true, on_shift, message, waiter }`

- `POST /sessions`
  - Auth: admin/manager/waiter
  - Body: `{ table_number, waiter_id, party_size? }`
  - Response: `{ success: true, ...session }`

- `GET /sessions`
  - Auth: admin/manager/waiter
  - Response: `{ success: true, sessions }`

- `PUT /sessions/:id/close`
  - Auth: admin/manager/waiter
  - Response: `{ success: true, ...session }`

### Admin (Auth: admin/manager)
- `GET /admin/surge-config`
  - Response: `{ success: true, dynamicPricingEnabled, tiers }`

- `PATCH /admin/surge-toggle`
  - Body: `{ enabled: boolean }`
  - Response: `{ success: true, message, dynamicPricingEnabled }`

- `PUT /admin/surge-tiers`
  - Body: `{ tiers: Array<{ min_orders, max_orders?, multiplier }> }`
  - Response: `{ success: true, message }`

### Audit Logs (Auth: admin/manager)
- `GET /admin/audit-logs`
  - Query: `?actor_id=&entity_type=&entity_id=&limit=&offset=`
  - Response: `{ success: true, count, logs }`

- `POST /admin/audit-logs`
  - Body: `{ actor_id?, actor_username?, action, entity_type, entity_id?, old_value?, new_value?, ip_address?, user_agent? }`
  - Response: `{ success: true, log }`

### Analytics (Auth: admin/manager)
- `GET /analytics/category-sales`
  - Query: `?start_date=&end_date=`
  - Response: `{ success: true, count, sales }`

- `GET /analytics/staff-performance`
  - Query: `?start_date=&end_date=`
  - Response: `{ success: true, count, staff }`

- `GET /analytics/dish-of-week-stats`
  - Response: `{ success: true, by_category, overall_top }`

### Account
- `DELETE /auth/account`
  - Auth required
  - Response: `{ success: true, message }`

---

## WebSocket Events (Socket.io)

Connect with JWT: `socket = io('http://localhost:8001', { auth: { token: '<JWT>' } })`

### Server Emits
- `new_kitchen_order` — `{ order }` when a new order is placed
- `order_status_updated` — `{ order_id, status, progress_percentage }` when status changes
- `kitchen_order_updated` — `{ order }` when order is modified
- `inventory_item_updated` — `{ itemId, itemName, isActive, stockQuantity }` when inventory is toggled
- `low_stock_alert` — `{ inventoryId, itemName, currentStock, threshold }` when stock drops
- `service_request_created` — `{ request }` when customer calls server
- `service_request_updated` — `{ request }` when request status changes
- `table_status_updated` — `{ table }` when table status changes

### Client Can Emit
- `join_order` — `orderId` — join order-specific room
- `join_kitchen` — join kitchen broadcast room
- `leave_kitchen` — leave kitchen room

---

## Error Format
```json
{
  "success": false,
  "error": "Error message"
}
```

## Success Format
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

---

## Data Models

### User
```
id, username, password_hash, role, created_at
```

### UserRole (multi-role)
```
user_role_id, user_id, role (admin|manager|kitchen|waiter|driver), assigned_at
```

### CustomerProfile
```
customer_id, email?, phone?, first_name?, last_name?, preferred_language, preferred_fulfillment?, max_delivery_distance_miles, is_guest, created_at, updated_at
```

### CustomerSession
```
session_id, customer_id?, device_token?, session_token (unique), expires_at?, created_at
```

### MenuItem
```
item_id, name, category_type, description, base_price, stock_quantity,
out_of_stock_flag, is_active, is_trending, prep_time_minutes,
allergens[], custom_sides_array, image_url
```

### Cart
```
cart_id, customer_id, session_token, status (active|checked_out|abandoned), created_at, updated_at
```

### CartItem
```
cart_item_id, cart_id, menu_item_id?, inventory_id?, quantity,
custom_instructions, unit_price, modifiers (JSONB), created_at, updated_at
```

### Order
```
master_order_id, customer_id?, status, is_held, total_amount, order_type,
table_number?, notes, progress_percentage, payment_status,
tax_calculation, tip_value, refund_eligible, stripe_charge_id, created_at, updated_at
```

### OrderItem
```
order_item_id, master_order_id, item_id, quantity, ordered_by_user_id,
custom_instructions, has_allergy_alert, item_status, modifiers (JSONB)
```

### OrderDiscount
```
discount_id, master_order_id, order_item_id?, discount_type (dish_of_week_category|dish_of_week_overall|promo|custom), discount_percentage, discount_amount, menu_item_id?, created_at
```

### Inventory
```
id, sku, item_name, base_price, stock_quantity, reorder_threshold,
unit, is_active, created_at, updated_at
```

### LowStockAlert
```
alert_id, inventory_id, current_stock, threshold, status (active|acknowledged|resolved),
acknowledged_by?, acknowledged_at?, resolved_at?, created_at
```

### ServiceRequest
```
request_id, table_number, session_id?, request_type (call_server|refill|bill_request|other),
status (pending|acknowledged|completed|cancelled), notes?, created_by_customer,
acknowledged_by?, acknowledged_at?, completed_at?, cancelled_at?, created_at
```

### DishOfWeekConfig
```
config_id, category_type, menu_item_id, discount_percentage, is_override,
set_by?, period_start?, period_end?, is_active, created_at, updated_at
```

### CustomerFavoriteCombo ("The Usual")
```
combo_id, customer_id, combo_name, item_ids (JSONB), quantities (JSONB),
order_count, last_ordered_at, created_at, updated_at
```

### AuditLog
```
log_id, actor_id?, actor_username?, action, entity_type, entity_id?,
old_value?, new_value?, ip_address?, user_agent?, created_at
```

### RestaurantTable
```
table_id, table_number (unique), status_state (Available|Occupied|Needs Cleaning|Reserved|Dirty),
active_pin?, pin_expires_at?, waitlist_queue_array[], updated_at
```

### Session (dining)
```
id, table_number, waiter_id?, code?, party_size, status (active|closed),
ended_at?, verification_code?, verification_attempts?, verification_verified?, created_at
```

### Schedule
```
schedule_id, employee_id, schedule_date, start_time, end_time,
role?, is_published, notes?, created_by_user_id?, created_at, updated_at
```

### TimeEntry
```
time_entry_id, employee_id, user_id?, clock_in, clock_out?,
total_hours?, status (active|completed|adjusted|flagged), notes?,
location?, ip_address?, created_at, updated_at
```

### Supplier
```
supplier_id, name, contact_name?, email?, phone?, address?, tax_id?, payment_terms?,
is_active, created_at, updated_at
```

### PurchaseOrder
```
purchase_order_id, supplier_id, order_date, expected_delivery_date?, received_date?,
status (draft|sent|confirmed|shipped|received|cancelled|partially_received),
total_amount, tax_amount, shipping_cost, grand_total, notes?,
created_by_user_id?, approved_by_user_id?, created_at, updated_at
```

### PurchaseOrderItem
```
purchase_order_item_id, purchase_order_id, inventory_id,
quantity_ordered, quantity_received, unit_cost, line_total, notes?,
created_at, updated_at
```

### ReorderRule
```
reorder_rule_id, inventory_id, supplier_id?, reorder_quantity, min_quantity,
is_enabled, last_ordered_at?, created_at, updated_at
```

### NotificationTemplate
```
template_id, name, channel (email|sms|push|in_app), event_type,
subject_template?, body_template, is_active, created_at, updated_at
```

### NotificationLog
```
notification_log_id, template_id?, channel, recipient, subject?, body,
status (pending|sent|delivered|failed|bounced), error_message?,
sent_at?, delivered_at?, opened_at?, clicked_at?,
related_entity_type?, related_entity_id?, created_at, updated_at
```

### NotificationPreference
```
preference_id, customer_id?, session_token?, channel, event_type, is_enabled,
created_at, updated_at
```

### TaxJurisdiction
```
tax_jurisdiction_id, name, jurisdiction_type (country|state|county|city|special),
parent_jurisdiction_id?, code?, is_active, effective_date, end_date,
created_at, updated_at
```

### TaxRate
```
tax_rate_id, jurisdiction_id, name, rate_percentage,
applies_to (all|food|alcohol|merchandise|delivery|service),
is_tax_inclusive, is_active, effective_date, end_date,
created_at, updated_at
```

### TaxExemption
```
tax_exemption_id, customer_id?, organization_name, exemption_number,
jurisdiction_id, expires_at?, is_active, created_at, updated_at
```

### OrderTaxDetail
```
order_tax_detail_id, master_order_id, jurisdiction_id?, tax_rate_id?,
taxable_amount, tax_rate, tax_amount, tax_type (sales|use|vat|gst|hst),
created_at
```

---

## Seed Data (Postman Test Data)

After running `npm run migrate` and starting the server, seed via psql:

```sql
-- Inventory
INSERT INTO inventory (sku, item_name, base_price, stock_quantity, is_active) VALUES
('BURGER-001', 'Classic Burger Patty', 5.00, 50, true),
('FRIES-001', 'French Fries', 1.50, 100, true),
('COKE-001', 'Coca Cola', 0.50, 200, true),
('BUN-001', 'Burger Bun', 0.50, 100, true);

-- Menu Items
INSERT INTO menu_items (name, category_type, base_price, stock_quantity, is_active) VALUES
('Classic Burger', 'Entree', 10.99, 50, true),
('Fries Large', 'Entree', 3.99, 100, true),
('Coca Cola', 'Entree', 1.99, 200, true);

-- Recipes
INSERT INTO menu_item_ingredients (menu_item_id, inventory_id, quantity_required) VALUES
(1, 1, 1.00), (1, 4, 1.00), (2, 2, 1.00);

-- Staff user
INSERT INTO users (username, password_hash, role) VALUES
('test_waiter', '$2b$10$test', 'waiter');

-- Manager user for testing protected routes
INSERT INTO users (username, password_hash, role) VALUES
('manager_test', '$2b$10$test', 'manager');
```

**Note:** Menu item IDs may not be 1, 2, 3 if previous test data exists. Query `SELECT item_id, name FROM menu_items` to get actual IDs.

---

## Testing Order (Postman)

1. `POST /api/auth/login` with `manager_test` / `password123` → copy token
2. `GET /api/menu` → browse menu
3. `POST /api/cart` → create cart
4. `POST /api/cart/1/items` → add items
5. `POST /api/cart/1/checkout` → place order (returns PaymentIntent)
6. `GET /api/orders/kitchen` → staff sees order
7. `PATCH /api/orders/1/status` → advance status
8. `GET /api/orders/1` → customer tracks order (public)
9. `POST /api/service-requests` → guest calls server (public)

## Employee Scheduling & Time-Clock (Auth: admin/manager/assistant_manager)

- `POST /schedules`
  - Body: `{ employee_id, schedule_date, start_time, end_time, role?, is_published?, notes? }`
  - Response: `{ success: true, schedule }`

- `GET /schedules`
  - Query: `?start_date=&end_date=&employee_id=&role=&is_published=`
  - Response: `{ success: true, schedules: Array<Schedule> }`

- `GET /schedules/my`
  - Query: `?start_date=&end_date=`
  - Response: `{ success: true, schedules: Array<Schedule> }`

- `PATCH /schedules/:id`
  - Body: `{ start_time?, end_time?, role?, is_published?, notes?, schedule_date? }`
  - Response: `{ success: true, schedule }`

- `DELETE /schedules/:id`
  - Response: `{ success: true, message }`

- `POST /time-entries/clock-in`
  - Body: `{ employee_id, location?, notes? }`
  - Response: `{ success: true, time_entry }`

- `POST /time-entries/clock-out`
  - Body: `{ employee_id, notes? }`
  - Response: `{ success: true, time_entry }`

- `GET /time-entries`
  - Query: `?employee_id=&start_date=&end_date=&status=`
  - Response: `{ success: true, time_entries: Array<TimeEntry> }`

## Purchase Orders & Supplier Management (Auth: admin/manager)

- `POST /purchase-orders/suppliers`
  - Body: `{ name, contact_name?, email?, phone?, address?, tax_id?, payment_terms?, is_active? }`
  - Response: `{ success: true, supplier }`

- `GET /purchase-orders/suppliers`
  - Query: `?is_active=`
  - Response: `{ success: true, suppliers: Array<Supplier> }`

- `PATCH /purchase-orders/suppliers/:id`
  - Body: `{ name?, contact_name?, email?, phone?, address?, tax_id?, payment_terms?, is_active? }`
  - Response: `{ success: true, supplier }`

- `POST /purchase-orders`
  - Body: `{ supplier_id, expected_delivery_date?, notes?, items: Array<{ inventory_id, quantity_ordered, unit_cost, notes? }> }`
  - Response: `{ success: true, purchase_order }`

- `GET /purchase-orders`
  - Query: `?status=&supplier_id=&start_date=&end_date=`
  - Response: `{ success: true, purchase_orders: Array<PurchaseOrder> }`

- `PATCH /purchase-orders/:id/status`
  - Body: `{ status }`
  - Valid statuses: `draft`, `sent`, `confirmed`, `shipped`, `received`, `cancelled`, `partially_received`
  - Response: `{ success: true, purchase_order }`

- `POST /purchase-orders/:id/receive`
  - Body: `{ items: Array<{ purchase_order_item_id, quantity_received }> }`
  - Response: `{ success: true, purchase_order }`

- `POST /purchase-orders/reorder-rules`
  - Body: `{ inventory_id, supplier_id?, reorder_quantity, min_quantity, is_enabled? }`
  - Response: `{ success: true, reorder_rule }`

- `GET /purchase-orders/reorder-rules`
  - Query: `?is_enabled=&inventory_id=`
  - Response: `{ success: true, reorder_rules: Array<ReorderRule> }`

- `GET /purchase-orders/reorder-rules/auto-check`
  - Response: `{ success: true, items_to_reorder: Array<ReorderRule> }`

## Notifications (Auth: admin/manager for management; public for some customer pref ops)

- `GET /notifications/templates`
  - Response: `{ success: true, templates: Array<NotificationTemplate> }`

- `POST /notifications/templates`
  - Body: `{ name, channel, event_type, subject_template?, body_template }`
  - Valid channels: `email`, `sms`, `push`, `in_app`
  - Response: `{ success: true, template }`

- `PATCH /notifications/templates/:id`
  - Body: `{ name?, channel?, event_type?, subject_template?, body_template?, is_active? }`
  - Response: `{ success: true, template }`

- `POST /notifications/send`
  - Body: `{ channel, recipient, template_id?, subject?, body, related_entity_type?, related_entity_id? }`
  - Response: `{ success: true, notification }`

- `GET /notifications/logs`
  - Query: `?channel=&status=&recipient=&related_entity_type=&related_entity_id=&limit=&offset=`
  - Response: `{ success: true, notifications: Array<NotificationLog> }`

- `GET /notifications/preferences`
  - Query: `?customer_id=&session_token=`
  - Response: `{ success: true, preferences: Array<NotificationPreference> }`

- `PATCH /notifications/preferences`
  - Body: `{ customer_id?, session_token?, preferences: Array<{ channel, event_type, is_enabled }> }`
  - Response: `{ success: true, message }`

## Tax Compliance (Auth: admin/manager for management)

- `POST /tax/jurisdictions`
  - Body: `{ name, jurisdiction_type, parent_jurisdiction_id?, code?, is_active?, effective_date?, end_date? }`
  - Valid types: `country`, `state`, `county`, `city`, `special`
  - Response: `{ success: true, jurisdiction }`

- `GET /tax/jurisdictions`
  - Response: `{ success: true, jurisdictions: Array<TaxJurisdiction> }`

- `POST /tax/rates`
  - Body: `{ jurisdiction_id, name, rate_percentage, applies_to?, is_tax_inclusive?, is_active?, effective_date?, end_date? }`
  - Valid applies_to: `all`, `food`, `alcohol`, `merchandise`, `delivery`, `service`
  - Response: `{ success: true, tax_rate }`

- `GET /tax/rates`
  - Query: `?jurisdiction_id=&is_active=`
  - Response: `{ success: true, tax_rates: Array<TaxRate> }`

- `GET /tax/orders/:order_id/calculate`
  - Response: `{ success: true, order_id, subtotal, tax_inclusive, tax_rates_applied, total_tax, grand_total }`

- `POST /tax/exemptions`
  - Body: `{ customer_id?, organization_name, exemption_number, jurisdiction_id, expires_at? }`
  - Response: `{ success: true, exemption }`

- `GET /tax/exemptions`
  - Query: `?customer_id=&jurisdiction_id=`
  - Response: `{ success: true, exemptions: Array<TaxExemption> }`

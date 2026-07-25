# TableReady API Contract

**Base URL:** `http://localhost:8001/api`
**Auth:** Bearer JWT token in `Authorization: Bearer <token>` header for protected routes.

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

### Orders (Kitchen/Staff)
- `GET /orders/kitchen`
  - Response: `{ success: true, orders: Array<OrderSummary> }`
  - `OrderSummary`: `{ master_order_id, status, is_held, total_amount, order_type, table_number, notes, progress_percentage, payment_status, created_at }`

### Payments
- `POST /payments/create-intent`
  - Body: `{ amount, currency? }`
  - Response: `{ clientSecret, paymentIntentId, status }`

- `POST /payments/confirm`
  - Body: `{ paymentIntentId, orderId }`
  - Response: `{ success: true, message, order }`

- `POST /payments/split`
  - Body: `{ mode: 'even' | 'itemized', total, splits?, guestOrders?, tax?, tip?, totalPaid? }`
  - Response: `{ mode, splits, balance }`

---

## Protected Endpoints (Bearer Auth Required)

### Cart (Customer)
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
  - Body: `{ order_type, table_number?, notes?, ordered_by_user_id? }`
  - Response: `{ success: true, message, order: Order, appliedMultiplier, paymentIntent? }`

### Orders (Customer Tracking)
- `GET /orders/:id`
  - Response: `{ success: true, order: { ...order, items: Array<{ quantity, custom_instructions, item_status, item_name }> } }`

- `GET /orders/user/:userId`
  - Response: `{ success: true, orders: Array<OrderWithItems> }`

### Orders (Staff - Auth: admin/manager/kitchen/waiter)
- `PATCH /orders/:id/status`
  - Body: `{ status, progress_percentage? }`
  - Valid statuses: `RECEIVED`, `IN_PREPARATION`, `COOKING`, `READY`, `SERVED`, `COMPLETED`, `CANCELLED`
  - Response: `{ success: true, message, order }`

- `POST /orders/:id/refund`
  - Auth: admin/manager only
  - Response: `{ success: true, message, order }`

- `GET /orders/:id/receipt`
  - Response: `{ success: true, receipt: { ... } }`

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

### Inventory (Auth varies)
- `POST /inventory`
  - Body: `{ items: Array<{ inventory_id, quantity }> }`
  - Response: `{ success: true, message, appliedMultiplier, deducted_items }`

- `PATCH /inventory/:id/toggle`
  - Auth: admin/manager only
  - Body: `{ is_active? }`
  - Response: `{ success: true, message, item }`

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

### Sessions
- `POST /sessions/check-shift`
  - Body: `{ waiter_id }`
  - Response: `{ on_shift, message, waiter }`

- `POST /sessions`
  - Body: `{ table_number, waiter_id, party_size? }`
  - Response: `{ ...session }`

- `GET /sessions`
  - Response: `Array<Session>`

- `PUT /sessions/:id/close`
  - Response: `{ ...session }`

### Account
- `DELETE /auth/account`
  - Auth required
  - Response: `{ success: true, message }`

---

## WebSocket Events (Socket.io)

### Server Emits
- `new_kitchen_order` — `{ order }` when a new order is placed
- `order_status_updated` — `{ order_id, status, progress_percentage }` when status changes
- `kitchen_order_updated` — `{ order }` when order is modified
- `inventory_item_updated` — `{ itemId, itemName, isActive, stockQuantity }` when inventory is toggled
- `low_stock_alert` — `{ inventoryId, itemName, currentStock, threshold }` when stock drops

### Client Can Emit
- `join_kitchen` — staff joins kitchen room
- `leave_kitchen` — staff leaves kitchen room

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
custom_instructions, unit_price, created_at, updated_at
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
custom_instructions, has_allergy_alert, item_status
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

### AuditLog
```
log_id, actor_id?, actor_username?, action, entity_type, entity_id?,
old_value?, new_value?, ip_address?, user_agent?, created_at
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

-- User
INSERT INTO users (username, password_hash, role) VALUES
('test_waiter', '$2b$10$test', 'waiter');
```

**Note:** Menu item IDs may not be 1, 2, 3 if previous test data exists. Query `SELECT item_id, name FROM menu_items` to get actual IDs.

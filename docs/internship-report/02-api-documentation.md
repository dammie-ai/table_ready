# 3. API Documentation

## 3.1 Overview

The backend exposes a REST API under `/api`, plus a WebSocket channel (Socket.IO) for
real-time events. All endpoints below are implemented in `backend/src/routes/` (route
definitions) and `backend/src/controllers/` (handler logic).

- **Base URL (dev):** `http://localhost:8001/api`
- **Auth:** JWT bearer token — `Authorization: Bearer <token>` — for protected routes.
  Tokens are issued by `/auth/login` and `/customer/auth/login`.
- **Guest access:** menu browsing, cart/checkout, order tracking, and service requests do
  **not** require login — the app supports fully anonymous dine-in/pickup ordering via a
  `session_token`, not just logged-in customers.
- **Role-based authorization:** protected routes check the caller's role (`admin`,
  `manager`, `kitchen`, `waiter`, `driver`, `assistant_manager`) via middleware
  (`backend/src/middleware/`) before the controller runs.

## 3.2 Response & Status Code Conventions

Every controller in the codebase follows the same convention (verified by inspecting
`res.status(...)` calls across all files in `backend/src/controllers/`):

| Status | Meaning | When it's returned |
|---|---|---|
| `200 OK` | Success | Successful `GET`, `PATCH`, `PUT`, or `DELETE` |
| `201 Created` | Resource created | Successful `POST` that creates a new row (e.g. register, place order, create schedule) |
| `400 Bad Request` | Validation failure | Missing/invalid fields, caught by `zod` schema validation or manual checks |
| `401 Unauthorized` | Auth failure | Missing/invalid/expired JWT, or wrong username/password on login |
| `403 Forbidden` | Authorization failure | Valid token, but caller's role isn't allowed to perform the action |
| `404 Not Found` | Resource missing | ID in the URL doesn't match any row |
| `500 Internal Server Error` | Unhandled server-side error | Caught in a `try/catch` and logged |

**Success body shape:**
```json
{ "success": true, "message": "optional message", "data...": "endpoint-specific fields" }
```

**Error body shape:**
```json
{ "success": false, "error": "human-readable error message" }
```

## 3.3 Endpoint Reference

Endpoints are grouped by feature area below. "Auth" lists which role(s) can call the
route; "Public" means no token is required.

### Health
| Method & Path | Auth | Body | Success | Notes |
|---|---|---|---|---|
| `GET /health` | Public | — | 200 `{ status: 'ok', message }` | Liveness check for deployment monitoring |

### Authentication (staff)
| Method & Path | Auth | Body | Status codes | Response |
|---|---|---|---|---|
| `POST /auth/register` | Public | `{ username, password, role? }` | 201 / 400 / 500 | `{ success, message, user: { id, username, role } }` |
| `POST /auth/login` | Public | `{ username, password }` | 200 / 401 / 500 | `{ success, token, user }` |
| `DELETE /auth/account` | Any authenticated user | — | 200 / 500 | `{ success, message }` |

Staff accounts support **multiple roles per user** (`UserRole` join table), so a single
login can carry, e.g., both `waiter` and `kitchen` permissions.

### Customer Authentication
| Method & Path | Auth | Body | Notes |
|---|---|---|---|
| `POST /customer/auth/register` etc. | Public | — | Mirrors staff auth but issues customer-scoped tokens; introduced to require login before ordering (see `customerAuthController.js`) |

### Menu (customer-facing, public)
| Method & Path | Auth | Response |
|---|---|---|
| `GET /menu` | Public | 200 `{ success, count, items: MenuItem[] }` |
| `GET /menu/:id` | Public | 200 `{ success, item, ingredients }` / 404 if not found |

### Menu (staff management)
| Method & Path | Auth | Body | Response |
|---|---|---|---|
| `POST /menu` | admin/manager | `{ name, category_type, description?, base_price, stock_quantity?, prep_time_minutes?, image_url? }` | 201 / 400 / 500 |
| `PUT /menu/:id` | admin/manager | Any updatable field, incl. `allergens`, `custom_sides_array` | 200 / 404 / 500 |
| `PATCH /menu/:id/toggle` | admin/manager | — | 200 — activates/deactivates a menu item |
| `POST /menu/:id/ingredients` | admin/manager/kitchen | `{ inventory_id, quantity_required }` | Links a recipe ingredient for stock deduction |
| `GET /menu/:id/ingredients` | admin/manager/kitchen | — | Lists recipe |
| `DELETE /menu/:id/ingredients/:inventoryId` | admin/manager/kitchen | — | Removes a recipe ingredient |

### Cart (guest or logged-in customer)
| Method & Path | Body | Notes |
|---|---|---|
| `POST /cart` | `{ customer_id?, session_token? }` | Creates an active cart |
| `GET /cart/:id` | — | Returns cart + computed `subtotal`, `item_count` |
| `POST /cart/:id/items` | `{ menu_item_id?, inventory_id?, quantity?, custom_instructions? }` | |
| `DELETE /cart/:id/items/:itemId` | — | |
| `DELETE /cart/:id` | — | |
| `POST /cart/:id/checkout` | `{ order_type, table_number?, notes?, latitude?, longitude? }` | `order_type` ∈ `Dine-In, Pickup, Delivery, Drive-Thru, ORDER_FROM_HOME`. **Delivery orders require lat/long — rejected outside a 10-mile radius (geofencing).** Returns `appliedMultiplier` (surge pricing) and a Stripe `paymentIntent` when relevant. |

### Orders (staff-facing)
| Method & Path | Auth | Body | Notes |
|---|---|---|---|
| `POST /orders` | admin/manager/kitchen/waiter | `{ order_type, items, table_number?, notes? }` | Staff-entered orders (e.g. waiter taking a dine-in order manually) |
| `GET /orders/kitchen` | admin/manager/kitchen/waiter | — | Live queue for the kitchen display |
| `PATCH /orders/:id/status` | admin/manager/kitchen/waiter | `{ status, progress_percentage? }` | Status machine: `RECEIVED → IN_PREPARATION → COOKING → READY → SERVED → COMPLETED`, or `CANCELLED` |
| `POST /orders/:id/refund` | admin/manager only | — | Triggers Stripe refund |
| `PATCH /orders/:id/cancel` | admin/manager/waiter | — | Only allowed while status is `RECEIVED` (guarded server-side) |
| `GET /orders/user/:userId` | Any authenticated user | — | Order history |
| `GET /orders/:id` | Public | — | Lets a guest track their order without login |
| `GET /orders/:id/receipt` | Public | — | Printable/shareable receipt |

### Order Modifiers/Modifications
Handles item-level modifiers (e.g. "no onions") and allergy flags — see
`orderModificationController.js`. Kitchen-facing endpoints surface `has_allergy_alert`
and `modifiers` so allergy-relevant removals are visible on the kitchen display (this
was a real bug fixed during the internship — see the Testing Documentation section).

### Inventory
| Method & Path | Auth | Notes |
|---|---|---|
| `POST /inventory` | admin/manager/kitchen | Deducts stock for an array of `{ inventory_id, quantity }` |
| `PATCH /inventory/:id/toggle` | admin/manager | Enable/disable an inventory item |
| `GET /inventory/alerts` / `/alerts/history` | staff | Low-stock alerts, active and historical |
| `POST /inventory/alerts/:id/acknowledge` / `/resolve` | staff | Alert lifecycle |

### Purchase Orders & Suppliers
Full supplier + purchase-order lifecycle (`draft → sent → confirmed → shipped →
received/partially_received/cancelled`), plus auto-reorder rules keyed to inventory
minimums. See `purchaseOrderRoutes.js` / `purchaseOrderController.js`.

### Promotions — "Dish of the Week"
| Method & Path | Auth | Notes |
|---|---|---|
| `GET /promotions/dish-of-week` | Public | Current picks |
| `POST /promotions/dish-of-week/calculate` | admin/manager | Auto-selects the top-ordered item per category |
| `POST /promotions/dish-of-week/override` | admin only | Manager can force a specific item/discount |
| `GET /promotions/dish-of-week/active-discounts` | Public | Discounts currently applied at checkout |

### "The Usual" (customer reorder)
Lets a guest (via `session_token`) or logged-in customer save and one-tap reorder their
most frequent combo (`CustomerFavoriteCombo`). Guest and authenticated variants exist
side-by-side for every operation (e.g. `GET /customer/usual?session_token=` vs.
`GET /customer/:customerId/usual`).

### Service Requests
Guest-creatable ("call server", "refill", "bill request"); staff acknowledge/complete/
cancel. Drives the `service_request_created` / `service_request_updated` WebSocket
events so staff see requests live.

### Tables & Sessions
- `POST /tables/verify` — 6-digit code verification for a reserved table (codes expire, attempts tracked)
- `GET /tables/floor-layout` — all tables + live status for the floor-plan view
- `PATCH /tables/:id/status` — `Available | Occupied | Needs Cleaning | Reserved | Dirty`
- `/sessions/*` — a dining "session" ties a table to a waiter and party size for the length of a visit; `check-shift` confirms a waiter is clocked in before assigning them a table

### Reservations & Waitlist
Standalone reservation booking plus a walk-in waitlist queue attached to
`RestaurantTable.waitlist_queue_array`.

### Admin — Dynamic (Surge) Pricing
`GET/PATCH /admin/surge-config`, `PUT /admin/surge-tiers` — configurable multiplier
tiers applied to `Order.total_amount` during high-demand periods.

### Audit Logs
`GET/POST /admin/audit-logs` — every sensitive staff action can be recorded with
`actor`, `action`, `entity_type/id`, and before/after values for accountability.

### Analytics & Reporting
`GET /analytics/category-sales`, `/staff-performance`, `/dish-of-week-stats` — all
admin/manager-only, date-range filterable, backing the `Reports.tsx` dashboard page.

### Employee Scheduling & Time Clock
`/schedules/*` (create/list/publish shifts) and `/time-entries/clock-in|clock-out`
(hourly time tracking with `status: active|completed|adjusted|flagged` for manager
review of anomalies).

### Notifications
Template-driven multi-channel notifications (`email | sms | push | in_app`) with a
delivery log (`sent → delivered/failed/bounced`, open/click tracking) and per-customer
opt-in preferences.

### Tax Compliance
Jurisdiction-aware tax configuration (`country → state → county → city → special`),
multiple tax rates per jurisdiction scoped by category (`food`, `alcohol`, `delivery`,
...), exemption certificates, and a per-order calculation endpoint
(`GET /tax/orders/:order_id/calculate`).

### Payments
| Method & Path | Auth | Notes |
|---|---|---|
| `POST /payments/create-intent` | Public | Creates a Stripe PaymentIntent |
| `POST /payments/split` | Public | Bill-splitting: `even` (divide total) or `itemized` (per-guest line items) |
| `POST /payments/webhook` | Stripe signature (raw body) | Stripe → backend event delivery (payment success/failure) |

## 3.4 WebSocket Events (Socket.IO)

Clients connect with `io('http://localhost:8001', { auth: { token: '<JWT>' } })`.

**Server → client:**
`new_kitchen_order`, `order_status_updated`, `kitchen_order_updated`,
`inventory_item_updated`, `low_stock_alert`, `service_request_created`,
`service_request_updated`, `table_status_updated`

**Client → server:**
`join_order` (room per order, for live tracking), `join_kitchen` / `leave_kitchen`
(kitchen display broadcast room)

This is what makes the Kitchen Display, Waiter Dashboard, and customer order-tracking
screen update live without polling.

## 3.5 Full request/response contract & test data

The complete request/response contract (all ~100 endpoints with exact body shapes) and
a ready-to-use Postman seed dataset already exist at [`backend/API_CONTRACT.md`](../../backend/API_CONTRACT.md)
and [`backend/TableReady API.postman_collection.json`](../../backend/TableReady%20API.postman_collection.json) —
reference these directly rather than retyping them; screenshot the Postman collection
running against a few endpoints for the report if it asks for example requests/responses.

---
*TODO (you): pick 4-5 representative endpoints (e.g. checkout, order status update,
dish-of-week calculate, tax calculate) and paste an actual example request + response
JSON captured from Postman — graders generally want to see real output, not just the
schema.*

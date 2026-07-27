# TableReady — 3-Week Execution Plan

**Target:** Go live 2–3 days before the 3-week deadline  
**Backend status:** ~90% complete. Core API, auth, cart, payments, inventory, promotions, analytics, and WebSockets are built.  
**Frontend status:** Not started. This plan frontloads frontend work.  
**Assumption:** You + Cline work in parallel. Cline handles frontend. You handle backend polish, integration, testing, and deployment.

---

## Week 1: Backend Polish + Frontend Foundation

**Goal:** Lock down the backend and give Cline a working API to build against.

### Backend (You)

* Task 1: [HIGH][SETUP] - Verify Database Schema & Seed Data
  * Description: Confirm all tables exist, run migrations on a fresh DB, and seed test data (inventory, menu items, recipes, staff users).
  * Acceptance Criteria: `npm run migrate` succeeds, `docker-compose up` works, and Postman can hit every endpoint.
  * Time: 4 hours | Dependencies: None

* Task 2: [HIGH][FEATURE] - Customer Profile & Session Token System
  * Description: Ensure `customer_profiles` and `customer_sessions` tables work for guest ordering. Test session token creation and validation.
  * Acceptance Criteria: Guest can create a session, place an order, and reorder "The Usual" without logging in.
  * Time: 3 hours | Dependencies: Task 1

* Task 3: [HIGH][FEATURE] - Dish of the Week Calculation Engine
  * Description: Test the auto-calculation endpoint. Ensure it correctly identifies top-ordered items per category and overall. Test admin override.
  * Acceptance Criteria: `POST /api/promotions/dish-of-week/calculate` returns correct results. Active discounts endpoint works.
  * Time: 3 hours | Dependencies: Task 1

* Task 4: [HIGH][FEATURE] - The Usual Reorder Flow
  * Description: Test the guest-friendly reorder endpoints. Ensure `session_token` lookup works and stock deducts correctly.
  * Acceptance Criteria: Guest with valid session_token can one-tap reorder their most frequent combo.
  * Time: 3 hours | Dependencies: Task 2

* Task 5: [HIGH][FEATURE] - Service Requests + WebSocket Events
  * Description: Test service request lifecycle (create → acknowledge → complete → cancel). Verify WebSocket events fire correctly.
  * Acceptance Criteria: Customer creates request via public endpoint, staff sees it live on dashboard.
  * Time: 3 hours | Dependencies: Task 1

* Task 6: [HIGH][FEATURE] - Table Verification & Floor Layout
  * Description: Test table code verification and floor layout endpoint. Ensure verification codes expire and attempts are tracked.
  * Acceptance Criteria: Waiter can verify a reserved table with a 6-digit code. Floor layout returns all tables with statuses.
  * Time: 3 hours | Dependencies: Task 1

* Task 7: [HIGH][FEATURE] - Geofencing + Delivery Radius Check
  * Description: Test the 10-mile delivery check integrated into cart checkout. Verify it blocks orders outside the radius.
  * Acceptance Criteria: Delivery orders with coordinates >10 miles away are rejected with a clear error message.
  * Time: 2 hours | Dependencies: Task 1

* Task 8: [MED][FEATURE] - Order Cancellation Endpoint
  * Description: Test `PATCH /api/orders/:id/cancel` for non-refund cancellations. Ensure it respects status guards.
  * Acceptance Criteria: Orders in `RECEIVED` status can be cancelled. Orders in `COOKING` or later cannot.
  * Time: 2 hours | Dependencies: Task 1

* Task 9: [MED][FEATURE] - Analytics Endpoints
  * Description: Test category sales, staff performance, and dish-of-week stats endpoints with seeded data.
  * Acceptance Criteria: Endpoints return accurate aggregated data for the test date range.
  * Time: 3 hours | Dependencies: Task 1

* Task 10: [LOW][DOCS] - Finalize API Contract
  * Description: Update `API_CONTRACT.md` with any endpoint changes, request/response examples, and WebSocket event docs.
  * Acceptance Criteria: Cline has a complete, accurate spec to build against.
  * Time: 2 hours | Dependencies: Task 1

### Frontend (Cline)

* Task 11: [HIGH][SETUP] - Initialize React Frontend Project
  * Description: Set up a new React project (Vite + React Router + Tailwind or preferred stack) in a `frontend/` folder or separate repo.
  * Acceptance Criteria: Project runs on `npm run dev`, connects to backend at `http://localhost:8001/api`, and can fetch the menu.
  * Time: 7 hours | Dependencies: Task 1

* Task 12: [HIGH][FEATURE] - Build Customer Menu Screen
  * Description: Build the scrolling menu layout with categories, item cards, prices, and out-of-stock grayed-out states.
  * Acceptance Criteria: Customer can browse all active menu items, see images, and add items to cart.
  * Time: 7 hours | Dependencies: Task 11

* Task 13: [MED][FEATURE] - Build Cart + Checkout Flow
  * Description: Build the cart screen, quantity adjusters, and checkout form with fulfillment type selector (Dine-In, Pickup, Delivery, Drive-Thru).
  * Acceptance Criteria: Customer can build a cart, choose fulfillment type, and submit an order.
  * Time: 7 hours | Dependencies: Task 12

---

## Week 2: Customer App + Staff Dashboard

**Goal:** Complete the customer mobile experience and build the staff-facing tools.

### Frontend — Customer App (Cline)

* Task 14: [HIGH][FEATURE] - Order Tracking + Live Status
  * Description: Build the order tracking screen using public `GET /api/orders/:id`. Connect Socket.io for live status updates.
  * Acceptance Criteria: Customer sees order status update in real-time without refreshing.
  * Time: 7 hours | Dependencies: Task 13

* Task 15: [MED][FEATURE] - Service Request UI ("Call Server")
  * Description: Build a simple "Call Server" button for dine-in customers. Connects to public `POST /api/service-requests`.
  * Acceptance Criteria: Customer taps button, request appears on staff dashboard instantly.
  * Time: 4 hours | Dependencies: Task 14

* Task 16: [MED][FEATURE] - "The Usual" One-Tap Reorder
  * Description: Build the "The Usual" button on the menu or account screen. Uses guest `session_token` or customer ID.
  * Acceptance Criteria: Customer can reorder their most frequent combo with one tap.
  * Time: 5 hours | Dependencies: Task 13, Task 14

* Task 17: [LOW][FEATURE] - Dish of the Week Badge
  * Description: Fetch active discounts from `GET /api/promotions/dish-of-week/active-discounts` and show discounted items with a badge.
  * Acceptance Criteria: Discounted items display a "Dish of the Week" badge with the discounted price.
  * Time: 3 hours | Dependencies: Task 12

### Frontend — Staff Dashboard (Cline)

* Task 18: [HIGH][FEATURE] - Kitchen Order Queue Screen
  * Description: Build the kitchen display showing incoming orders sorted by time. Connect to `GET /api/orders/kitchen` and Socket.io.
  * Acceptance Criteria: New orders appear instantly. Kitchen staff can see order details and advance status.
  * Time: 7 hours | Dependencies: Task 11

* Task 19: [HIGH][FEATURE] - Order Status Controls
  * Description: Build buttons to advance orders through the pipeline: RECEIVED → IN_PREPARATION → COOKING → READY → SERVED → COMPLETED.
  * Acceptance Criteria: Tapping a status button updates the order and broadcasts to all connected clients.
  * Time: 5 hours | Dependencies: Task 18

* Task 20: [MED][FEATURE] - Menu Management Screen
  * Description: Build staff interface to create, edit, and toggle menu items. Connect to `POST/PUT/PATCH /api/menu`.
  * Acceptance Criteria: Admin can add a new menu item and toggle it out of stock, and the customer app updates instantly.
  * Time: 6 hours | Dependencies: Task 18

* Task 21: [MED][FEATURE] - Inventory + Low-Stock Alerts Screen
  * Description: Build inventory list with toggle switches. Show active low-stock alerts and allow acknowledge/resolve.
  * Acceptance Criteria: Staff can see which items are low, acknowledge alerts, and mark them resolved.
  * Time: 5 hours | Dependencies: Task 18

* Task 22: [MED][FEATURE] - Table Floor Layout Screen
  * Description: Build visual floor map showing table statuses. Connect to `GET /api/tables/floor-layout` and `PATCH /api/tables/:id/status`.
  * Acceptance Criteria: Waiters can see table colors change in real-time and update table status.
  * Time: 6 hours | Dependencies: Task 18

* Task 23: [MED][FEATURE] - Service Request Dashboard
  * Description: Build a panel showing pending service requests by table. Connect to `GET /api/service-requests` with acknowledge/complete/cancel actions.
  * Acceptance Criteria: Staff can see "Table 5 called server" and mark it handled.
  * Time: 4 hours | Dependencies: Task 18

* Task 24: [LOW][FEATURE] - Analytics Dashboard
  * Description: Build simple charts for category sales, staff performance, and dish-of-week stats.
  * Acceptance Criteria: Admin can view revenue breakdown by Dine-In/Delivery/Pickup and top-performing staff.
  * Time: 5 hours | Dependencies: Task 18

---

## Week 3: Testing, Polish, and Deployment

**Goal:** End-to-end testing, bug fixes, and go live 2–3 days early.

### Backend (You)

* Task 25: [HIGH][TEST] - End-to-End API Testing
  * Description: Run through every endpoint in the Postman collection. Fix any broken routes, edge cases, or error responses.
  * Acceptance Criteria: Every request in the Postman collection returns the expected response.
  * Time: 6 hours | Dependencies: All backend tasks

* Task 26: [HIGH][TEST] - WebSocket Integration Testing
  * Description: Test all Socket.io events with a simple client. Verify order status updates, service requests, and inventory toggles broadcast correctly.
  * Acceptance Criteria: All events fire and are received by connected clients.
  * Time: 3 hours | Dependencies: Task 25

* Task 27: [MED][FEATURE] - Stripe Webhook End-to-End
  * Description: Test the full Stripe payment flow: create intent → confirm → webhook updates order to Paid. Use Stripe test cards.
  * Acceptance Criteria: Order transitions from Pending → Paid automatically after payment.
  * Time: 3 hours | Dependencies: Task 25

* Task 28: [MED][SECURITY] - Finalize Auth Guards
  * Description: Double-check all protected routes. Ensure no staff endpoints are accidentally public. Add rate limiting to login endpoint.
  * Acceptance Criteria: Unauthenticated requests to protected routes return 401. Login has basic throttling.
  * Time: 4 hours | Dependencies: Task 25

* Task 29: [LOW][FEATURE] - Add CORS Whitelist
  * Description: Restrict CORS to your frontend domain in production. Keep `*` for development.
  * Acceptance Criteria: Production backend only accepts requests from your deployed frontend URL.
  * Time: 1 hour | Dependencies: Task 25

### Frontend (Cline)

* Task 30: [HIGH][FEATURE] - Staff Login Screen
  * Description: Build the staff login page using `POST /api/auth/login`. Store JWT and route to dashboard.
  * Acceptance Criteria: Staff can log in and access the dashboard. Invalid credentials show an error.
  * Time: 4 hours | Dependencies: Task 11

* Task 31: [HIGH][FEATURE] - Role-Based Dashboard Routing
  * Description: Build role-aware routing. Kitchen staff see only kitchen screen. Waiters see floor map. Admins see everything.
  * Acceptance Criteria: Users are redirected to the correct view based on their role.
  * Time: 5 hours | Dependencies: Task 30

* Task 32: [MED][FEATURE] - Payment Checkout Screen
  * Description: Build the Stripe Elements checkout form. Connect to `POST /api/payments/create-intent` and confirm payment.
  * Acceptance Criteria: Customer can enter fake card details and complete payment.
  * Time: 6 hours | Dependencies: Task 13

* Task 33: [MED][FEATURE] - Receipt + Order History
  * Description: Build receipt view and order history screen for customers.
  * Acceptance Criteria: Customer can view past orders and itemized receipts.
  * Time: 4 hours | Dependencies: Task 14

* Task 34: [LOW][FEATURE] - Loading States + Error Boundaries
  * Description: Add skeleton loaders, error fallbacks, and retry logic for all API calls.
  * Acceptance Criteria: App handles slow networks and API errors gracefully.
  * Time: 4 hours | Dependencies: All frontend tasks

### Integration + Deployment (You + Cline)

* Task 35: [HIGH][TEST] - Full End-to-End User Flow
  * Description: Simulate a complete customer journey: browse menu → add to cart → checkout → pay → kitchen sees order → status updates → customer sees completion.
  * Acceptance Criteria: The entire flow works without manual intervention or errors.
  * Time: 6 hours | Dependencies: Task 25, Task 30

* Task 36: [MED][DEPLOY] - Deploy Backend to Render/Railway
  * Description: Deploy the Express backend to a cloud host. Configure PostgreSQL, environment variables, and domain.
  * Acceptance Criteria: Backend is live at `https://api.tableready.app` (or similar) and all endpoints work.
  * Time: 6 hours | Dependencies: Task 35

* Task 37: [HIGH][DEPLOY] - Deploy Frontend + Go Live
  * Description: Deploy the React frontend to Vercel/Netlify. Point it at the live backend. Run final smoke tests.
  * Acceptance Criteria: Customer app and staff dashboard are both live over HTTPS and functional.
  * Time: 7 hours | Dependencies: Task 35, Task 36

---

## Feature Coverage Map

| Feature | Backend | Frontend |
|---|---|---|
| Menu browsing | ✅ Done | Task 12 |
| Cart + checkout | ✅ Done | Task 13 |
| Guest ordering (no login) | ✅ Done | Task 13 |
| Order tracking (public) | ✅ Done | Task 14 |
| Live order status (Socket.io) | ✅ Done | Task 14 |
| Stripe payments (test mode) | ✅ Done | Task 27, 32 |
| Bill splitting | ✅ Done | Task 32 |
| 30% refund lock | ✅ Done | Task 25 |
| Auto inventory deduction | ✅ Done | Task 25 |
| Out-of-stock toggle | ✅ Done | Task 20 |
| Dish of the Week | ✅ Done | Task 17 |
| The Usual reorder | ✅ Done | Task 16 |
| Service requests | ✅ Done | Task 15, 23 |
| Table verification codes | ✅ Done | Task 6 |
| Floor layout | ✅ Done | Task 22 |
| Geofencing (10-mile) | ✅ Done | Task 7 |
| Kitchen order queue | ✅ Done | Task 18 |
| Staff dashboard | ✅ Done | Tasks 18–24 |
| Analytics/sales reports | ✅ Done | Task 24 |
| Staff performance ranking | ✅ Done | Task 24 |
| Audit logs | ✅ Done | Task 28 |
| Multi-role support | ✅ Done | Task 31 |
| WebSocket auth | ✅ Done | Task 26 |
| Customer profiles (guest) | ✅ Done | Task 2 |
| Low-stock alerts | ✅ Done | Task 21 |
| Stock logs | ✅ Done | Task 25 |
| Order cancellation | ✅ Done | Task 8 |

**Backend complete: ~90%**  
**Frontend remaining: ~100%** (Cline's work, Tasks 11–34)

---

## Time Budget

| Week | Backend (You) | Frontend (Cline) | Total |
|---|---|---|---|
| Week 1 | 24 hours | 21 hours | 45 hours |
| Week 2 | 0 hours | 48 hours | 48 hours |
| Week 3 | 27 hours | 13 hours | 40 hours |
| **Total** | **51 hours** | **82 hours** | **133 hours** |

At ~8–10 hours/day, this fits comfortably in 3 weeks with 2–3 days buffer for go-live.

---

## Critical Path

```
Task 1 (DB) → Task 2 (Customer profiles) → Task 4 (The Usual)
Task 1 → Task 3 (Dish of Week) → Task 17 (Badge UI)
Task 1 → Task 11 (Frontend setup) → Task 12 (Menu) → Task 13 (Cart) → Task 14 (Tracking)
Task 11 → Task 18 (Kitchen) → Task 19 (Status) → Task 35 (E2E)
Task 35 → Task 36 (Deploy backend) → Task 37 (Deploy frontend) → GO LIVE
```

---

## What Cline Needs From You

1. `API_CONTRACT.md` — full endpoint spec
2. `src/config/init.sql` — database schema
3. `TableReady API.postman_collection.json` — working request examples
4. A meeting to walk through the core flows: guest ordering, kitchen display, and payment

---

## Your Editor Tabs

Your VS Code still shows stale tabs for deleted files:
- `src/utils/jwt.js` — deleted
- `src/utils/allergyScanner.js` — deleted
- `test-db.js` — deleted
- `src/db.js` — deleted
- `src/db/migrations/*` — deleted

Close those tabs. They don't exist on disk.

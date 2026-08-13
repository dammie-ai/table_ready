# CHAPTER 3 — SYSTEM ANALYSIS
*(3.1, 3.2 integrated from your SRS.docx — your own original writing, lightly restructured to fit the chapter template)*

## 3.1 Problem Definition
The customer-facing app replaces a basic order confirmation with live order tracking:
a WebSocket connection pushes status changes straight to the customer's screen as the
kitchen advances the order, with no polling or manual refresh. For staff, the system
replaces guesswork with an accurate, real-time kitchen queue that shows every item,
quantity, and modifier a customer selected — including allergy-relevant removals — and
a floor dashboard that reflects table and order status live.

## 3.2 Requirements Gathering

### 3.2.1 Functional Requirements

**1. The Customer App Modules**

*Account & Access*
- The app must require a customer to register or sign in before reaching the ordering flow.
- Registration must require a unique email and a password of at least 6 characters; an email already registered must be rejected.
- A session, once established, must persist across app restarts until the customer explicitly signs out.

*Menu Browsing & Customization*
- The app must display menu items organized by category, each with an image, price, and description.
- Selected modifiers must be reflected in the running order total and passed through to the kitchen display, resolved to their real names.
- An item toggled out of stock by staff must be immediately hidden or disabled in the customer app.

*Order Placement & Tracking*
- The app must support Pickup, Delivery, Dine-In, and Order From Home fulfillment types.
- An Order From Home order must be created in an ON_HOLD state, hidden from the kitchen, until the customer releases it.
- Order status must update on the customer's screen live via WebSocket, without a manual refresh.

*Table Check-In*
- The app must let a customer check into a table by scanning a QR code or entering a table number and code manually.
- A successful check-in must attach the table number to subsequent orders automatically.

*Waitlist & Assistance*
- The app must let a customer join a restaurant-wide waitlist with their party size.
- The app must let a seated customer send a service request to their assigned waiter, visible on the waiter's dashboard in real time.

**2. The Restaurant Staff Dashboard Modules**

*Order & Table Visibility*
- The dashboard must display each order's fulfillment type and current status.
- The dashboard must display a visual grid of tables with their current status (Available, Occupied, Needs Cleaning).

*Waiter Tools*
- The dashboard must show a live queue of active service requests for the waiter's assigned tables, with the table number and request type, updated in real time.
- The dashboard must provide a "Mark Served" action on a dine-in order once the kitchen has marked it Ready, and must not allow the kitchen alone to close out a dine-in order.

*Menu & Inventory Management*
- The dashboard must provide full CRUD for menu items, including setting an item photo by URL or direct file upload.
- The dashboard must provide an on/off toggle per item that immediately updates its visibility on the customer app.
- The dashboard must provide a way to increase an inventory item's recorded stock quantity (restocking), in addition to the existing decrease-only paths (order fulfillment, waste logging).

*Staff Account Management*
- Creating a new staff account must require the requester to already be authenticated as an admin or manager; there must be no public staff self-registration path.

**3. The Kitchen Display System (KDS) Modules**
- The KDS must use WebSockets to display incoming orders the moment they are placed (or released from hold).
- The KDS must display every modifier attached to each order item by name, visually distinguishing removal-type modifiers (e.g. "No Onions") from additions.
- The KDS must not offer a further advance action once a DINE_IN order reaches Ready — that order must wait for a waiter's "Mark Served" action.
- The KDS must continue to support the full Received → ... → Picked Up chain for Pickup, Delivery, and Order From Home orders.

*(PLANNED — NOT YET IMPLEMENTED: one-tap "THE USUAL?" reordering with automatic
3-orders-in-7-days detection; a per-table premium waitlist with SMS/push verification
codes; direct-to-kitchen refill requests bypassing the waiter; a customer-facing
"Split Bill" utility — split logic exists server-side but no interface uses it yet; a
checkout-time allergy questionnaire with a dedicated flashing "CRITICAL: ALLERGY"
banner — modifier-level removal flagging covers the same underlying need today; a flat
15-minute "! OVERDUE" flashing badge — a background timer exists server-side but isn't
surfaced on the display yet.)*

### 3.2.2 Non-Functional Requirements

**1. Performance**
Instant screen updates: kitchen status changes and service requests are pushed via
WebSocket and reflected on staff screens without a manual refresh. Menu and core
screens are designed to load quickly on mobile; not independently benchmarked.

**2. Usability**
Readable kitchen display: large text and color-coded status badges intended to be
legible from a short distance. Simple staff tools: waiter actions (acknowledge a
request, mark an order served) are single-tap, with no multi-step flow required.

**3. Security**
Role separation: customer accounts and staff accounts are entirely separate identity
systems — a customer's login token cannot pass any staff permission check, by
construction. Staff account creation requires an already-authenticated admin/manager —
there is no public staff registration endpoint. Server-side pricing: order totals, tax,
and combo pricing are always computed from the database at order time, never trusted
from the client. **Payment model note:** the customer-mobile app is currently
pay-at-counter, not in-app Stripe checkout — a deliberate decision, since Stripe's
React Native SDK requires native code incompatible with the Expo Go development
workflow this project depends on, and switching was judged too risky late in
development. A working Stripe integration exists and is used by the separate staff-web
checkout flow. Table check-in codes are also longer-lived than originally envisioned
(assigned per table, not short-lived/auto-expiring per reservation).

**4. Scalability**
Backend built to serve multiple simultaneous staff dashboards and customer sessions
over one shared database and WebSocket layer (see Reliability, below). *(TODO: state
honestly whether you load-tested concurrent sessions, or frame this as a known
limitation — horizontal scaling beyond one instance would need a shared Socket.IO
adapter, e.g. Redis, not currently in place.)*

**5. Reliability**
Order creation validates stock and pricing server-side within a database transaction,
so a failure partway through does not leave a half-created order. The backend serves
multiple simultaneous staff dashboards and customer sessions over one shared database
and WebSocket layer. *(Known gap: offline cart persistence with automatic
conflict-free sync on reconnect is not implemented — the cart is stored locally so
items survive an app close, but there's no reconnect/resync logic for a lost
connection.)*

**6. Maintainability**
Monorepo with a shared package (`@table-ready/shared`) so business logic (cart
behavior, types) isn't duplicated between the two frontends; a consistent
controller/error-handling convention across ~25 backend route files. *(Not covered in
the SRS — my addition based on the codebase structure; verify it matches your reasoning.)*

**7. Compatibility**
Staff web runs in any modern browser (Vite build); customer app targets iOS and
Android from one React Native/Expo codebase. *(Not covered in the SRS — my addition;
verify.)*

## 3.3 Feasibility Study
- **Technical:** all chosen technologies (Node/Express, PostgreSQL, React, React
  Native/Expo, Stripe, Socket.IO) are mature, well-documented, and free/low-cost for
  development.
- **Operational:** requires staff to have devices for the dashboard and guests to have
  smartphones for the QR/app flow — realistic for most modern restaurants.
- **Economic:** free-tier-friendly stack (Render free tier used for deployment, Stripe
  test mode for development). *(TODO: note real production costs — Stripe transaction
  fees, a paid Render tier for real uptime.)*

## 3.4 Existing System Analysis
See the Gap Analysis table in Chapter 2.1 — same source, reused here per the template's
structure. The core finding: existing systems (Toast KDS, Square for Restaurants,
OpenTable) each solve one slice (payment, reservations, prep visibility) well, but none
combine order-type visibility, granular receipt detail, and proactive table-availability
notification in one system.

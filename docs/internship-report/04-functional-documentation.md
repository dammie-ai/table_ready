# 2. Functional Documentation — draft, REWRITE before submitting

This section is written from the implemented code (routes + pages), not just the SRS.
**You must rewrite this in your own words** — it's the section most likely to get
follow-up questions.

## 2.1 System Roles
- **Guest / Customer** — can browse menu, order (dine-in/pickup/delivery/drive-thru),
  track an order, request service, join a waitlist, split a bill — without an account
  (guest checkout via `session_token`), or with a real account (login required as of
  the `feat: real customer accounts — login required before ordering` change).
- **Waiter** — table assignment, taking orders, hand-off to kitchen, service requests,
  reservation seating.
- **Kitchen** — live order queue (Kitchen Display), stock/inventory controls, order
  status progression, allergy-alert visibility.
- **Manager/Admin** — menu management, staff management, promotions, analytics/reports,
  surge pricing config, audit logs, tax config, purchase orders/suppliers, scheduling.
- **Driver** — delivery-order role (referenced in `user_roles`, delivery routes).

## 2.2 Core Features (map to `frontend/apps/*/src/pages|screens`)

**Customer-facing (mobile app, `customer-mobile`):**
- Welcome / table check-in via QR or table PIN
- Menu browsing, item detail, combo builder, modifiers (allergy/customization)
- Cart, group cart (shared cart across a table — `groupCartSync.ts`), checkout with
  Stripe payment, bill splitting (even or itemized)
- Location check / delivery geofencing (10-mile radius enforcement)
- Order tracking (live status via WebSocket), order history, "The Usual" one-tap reorder
- Reservations, waitlist join
- Service requests (call server, refill, bill request)
- Settings (theme, language via i18next, notification preferences)

**Staff-facing (web dashboard, `staff-web`):**
- Role-based login and dashboard routing
- Staff Dashboard / Waiter Dashboard — live order hand-off, table assignment
- Kitchen Display — live order queue, item-level status, allergy alerts, stock controls
- Menu Management — CRUD on items, categories, photos, ingredients/recipes
- Reservations & Waitlist management (seat, cancel, edit)
- Table management (floor layout, status, PIN verification)
- Promotions (Dish of the Week auto-calc + manual override)
- Manager Panel — surge pricing config, audit logs, tax jurisdictions/rates
- Staff Management — scheduling, time clock, staff leaderboard/performance
- Reports/Analytics — category sales, staff performance, dish-of-week stats (charts via Recharts)
- Settings — restaurant branding/theme configuration

## 2.3 Notable Design Decisions Worth Explaining
- **Accounts now required before ordering:** guest-only checkout was the original
  design (`session_token` carrying cart/order/"Usual" state for anonymous diners) but
  was deliberately removed — per your SRS, ordering now requires registration/sign-in,
  so every order ties back to a real account for order history and future reorder
  features. `session_token` still exists in the schema/API from the earlier design but
  the guest-checkout path is gone from the customer app.
- **Real-time everywhere it matters:** WebSockets (not polling) drive kitchen orders,
  service requests, table status, and order tracking — chosen because a restaurant
  floor needs sub-second updates (an order sitting in a stale queue is a real cost).
  *(TODO: this framing is a reasonable inference; confirm it matches your real reasoning before keeping it, per your professor's requirement that you can defend your explanations.)*
- **Recipe-based inventory:** menu items link to `inventory` via
  `menu_item_ingredients`, so placing an order deducts real stock, not just a menu-item
  counter — enables low-stock alerts and purchase-order automation.
- **Dynamic/surge pricing + Dish of the Week:** both are data-driven (calculated from
  actual order volume) with a manual admin override path — balances automation with
  staff control.

---
*TODO (you): reread this whole file, delete anything that doesn't match what you
actually built/remember, and rewrite every paragraph in your own words. Add
screenshots of each major screen (pairs well with the User Manual section).*

# 4. Database Documentation

## 4.1 Overview
PostgreSQL 15. Full schema lives in [`backend/src/config/init.sql`](../../backend/src/config/init.sql)
(base schema) plus 4 incremental migrations in `backend/src/db/migrations/` applied via
`npm run migrate` (`backend/src/config/migrate.js`):
- `001_add_waiter_assignment.sql`
- `002_add_service_ratings.sql`
- `003_add_delivery_coordinates.sql`
- `004_add_customer_password.sql`

## 4.2 Tables (50 total)
Grouped by domain — full column lists are in `init.sql`, referenced field-level detail
is also in [02-api-documentation.md](02-api-documentation.md) data model section.

- **Identity/Staff:** `users`, `user_roles` (multi-role per user), `employees`, `schedules`, `time_entries`
- **Customers:** `customer_profiles`, `customer_sessions`, `customer_favorite_combos` ("The Usual"), `customer_notification_preferences`
- **Menu:** `menu_items`, `menu_item_ingredients` (recipe → inventory link), `menu_modifiers`, `menu_item_modifiers`, `combo_meals`, `combo_meal_sides`
- **Ordering:** `carts`, `cart_items`, `orders`, `order_items`, `order_assignments`, `order_cook_tracking`, `order_discounts`, `order_payments`, `order_tax_details`
- **Tables/Sessions:** `restaurant_tables`, `table_sessions`, `sessions`, `reservations`, `waitlist_entries`
- **Inventory/Supply chain:** `inventory`, `low_stock_alerts`, `stock_logs`, `waste_logs`, `suppliers`, `purchase_orders`, `purchase_order_items`, `reorder_rules`
- **Pricing/Promotions:** `dish_of_week_config`, `promotions`, `surge_tiers`, `sales_audit_config`, `sales_audit_results`
- **Tax:** `tax_jurisdictions` (self-referencing hierarchy: country→state→county→city→special), `tax_rates`, `tax_exemptions`
- **Ops:** `service_requests`, `audit_logs`, `notification_templates`, `notification_logs`, `restaurant_config`, `settings`

## 4.3 Key Relationships & Constraints
All foreign keys are defined with explicit `ON DELETE` behavior (extracted from
`init.sql`) — the pattern is deliberate, not accidental, and worth explaining in the
report:

- **`CASCADE`** (child is meaningless without parent) — e.g. `cart_items → carts`,
  `order_items → orders`, `menu_item_ingredients → menu_items`, `user_roles → users`,
  `time_entries → employees`. Deleting the parent cleans up dependents automatically.
- **`RESTRICT`** (protect historical/financial integrity) — e.g. `order_items.item_id →
  menu_items` and `purchase_order_items.inventory_id → inventory`: you cannot delete a
  menu item or inventory SKU that's referenced by a real order/purchase order, so past
  orders never lose their line-item meaning.
- **`SET NULL`** (soft-detach, keep the row) — e.g. `orders.tax_exemption_id`,
  `dish_of_week_config.menu_item_id`, `service_requests.acknowledged_by`: if the
  referenced staff member or promo config is deleted, the order/log row survives with
  the link cleared instead of being deleted.

Notable structural points:
- `orders.master_order_id` is the central fact table — nearly every ordering-adjacent
  table (`order_items`, `order_discounts`, `order_payments`, `order_tax_details`,
  `order_cook_tracking`, `order_assignments`) hangs off it.
- `tax_jurisdictions` is self-referential (`parent_jurisdiction_id → tax_jurisdictions`),
  modeling nested tax authorities (a city's rate stacks on its county/state/country).
- Guest ordering is modeled explicitly: `carts.session_token` and
  `customer_sessions.session_token` let a device transact without a `customer_id`,
  which is why so many customer-facing tables have nullable `customer_id` +
  a `session_token` alternative.

## 4.4 Diagram
The report explicitly asks for a database diagram. Options, fastest first:
1. Generate one from the live schema with a free ERD tool that reads Postgres directly
   (e.g. pgAdmin's ERD tool, or DBeaver — both point-and-click against your local
   `docker-compose` database) and export as PNG.
2. Or run `docker-compose up -d && npm run migrate` and use any "SQL → ERD" web tool by
   pasting the raw `init.sql`.

---
*TODO (you): generate the actual diagram (above) and paste it in; also spot-check 3-4 of
the constraint examples above against `init.sql` yourself so you can defend the CASCADE
vs RESTRICT vs SET NULL reasoning if asked.*

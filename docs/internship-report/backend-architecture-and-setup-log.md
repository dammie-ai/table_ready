TableReady: Local Database Setup Log

*(unchanged from original — still accurate; the .env values here match what's used in production/dev today)*

Environment Configuration

Created a .env file in the root directory (C:\tableReady\table_ready\.env) to hold local credentials.

```
PORT=8000
NODE_ENV=development

# Database Settings
DB_USER=tableready_admin
DB_PASSWORD=SuperSecurePassword123!
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tableready_db

# Security
JWT_SECRET=YourSuperUltraSecureRandomSecretKeyStringHere123!
```

What Was Built

- `src/config/init.sql` — The database schema (now 53 tables across identity, menu, ordering, inventory, tax, and ops domains — see Database Reference doc).
- `src/config/db.js` — Handles the connection pool configuration using `pg` to talk to the PostgreSQL container.
- `src/config/migrate.js` — A script that reads `init.sql` and runs the queries to create the tables.

How I Ran the Setup

1. Fired up Docker Desktop on my machine.
2. Ran `docker compose up -d` in the terminal to start the Postgres container.
3. Ran `node src/config/migrate.js` to build the tables.

Database container is running locally and the schema has been migrated. Ready to start building backend routes.

---

TableReady: Backend System Architecture & Data Flow Guide

*(rewritten to match the current implementation — the original version below described an early design (a `table_sessions` table holding a `join_code`) that was superseded during development. That table still exists in the schema but nothing in the current backend touches it — it's dead. The mechanism that shipped is different, described below.)*

## 1. System Environment Configuration

- **Active Server Port:** 8001 (shifted from 8000 to avoid host permission blocks and zombie-process port contention).
- **Core Technology Stack:** Node.js, Express, PostgreSQL 15.
- **Database Schema State:** 53 tables, migrated via `init.sql` + 4 incremental migration files.

## 2. Core Database Schema Definition (current, verified against the live database)

### 2.1. `users` table
Staff/system accounts only — customer accounts live in a separate `customer_profiles` table (email-based login), not here.

- `id` (INTEGER, PRIMARY KEY, auto-increment)
- `username` (VARCHAR) — login identifier for staff; **there is no email column on this table**
- `password_hash` (VARCHAR)
- `role` (VARCHAR, default `'waiter'`) — e.g. `admin`, `manager`, `assistant_manager`, `kitchen`, `waiter`, `delivery`, `other`
- `employee_id` (INTEGER) — links to the `employees` table (name, schedule, lock status)
- `created_at` (TIMESTAMP)

### 2.2. `restaurant_tables` table
Physical dining-room layout **and** the current PIN-verification mechanism live on this same row — there's no separate join-code table.

- `table_id` (INTEGER, PRIMARY KEY, auto-increment)
- `table_number` (INTEGER) — the human-readable identifier customers actually type in
- `status_state` (VARCHAR, default `'Available'`) — `Available` / `Occupied` / `Needs Cleaning` / `Reserved` / `Dirty`
- `active_pin` (VARCHAR, nullable) — the current guest-facing verification code for this table; null when no one's seated
- `pin_expires_at` (TIMESTAMP, nullable)
- `capacity` (INTEGER, default 4)
- `section` (VARCHAR, default `'main'`)
- `waiter_id` (INTEGER) — assigned waiter
- `waitlist_queue_array` (INTEGER[])
- `reservation_time` (TIMESTAMP, nullable)
- `updated_at` (TIMESTAMP)

### 2.3. `table_sessions` table — **legacy, currently unused**
Still exists in the schema (`session_id` UUID, `table_id`, `is_group_setup`, `is_active`, `created_at`) but no controller or route in the current codebase reads or writes it. Kept from an earlier design; safe to ignore when tracing how table verification actually works today.

### 2.4. `sessions` table — exists, partially wired up
A *different* table than `table_sessions`, closer to this doc's original concept (`id`, `table_number`, `waiter_id`, `code`, `party_size`, `status`). `POST /api/sessions` and `POST /api/sessions/join-by-code` exist and would create/join a session by a 4-digit `code` this way — but nothing in either frontend app currently calls either one. Staff-web's Waiter Dashboard does call `GET /api/sessions` expecting a populated list, but since nothing creates a row, that panel is effectively always empty in practice.

## 3. Absolute Backend Rules & Edge Case Handling

- **The PIN is a string, not a number.** `active_pin` is stored/compared as `VARCHAR`, so a code like `"0342"` keeps its leading zero — the same reasoning as the original doc, just applied to `restaurant_tables.active_pin` instead of a `table_sessions.join_code`.
- **PIN expiry is enforced server-side.** `verifyTableCode` checks `pin_expires_at` and rejects an expired code even if it matches.
- **A PIN is generated at seating time, not on demand.** `active_pin`/`pin_expires_at` get set when a waitlist entry is seated (`waitlistController.js` / `autoSeatWaitlist.js`), and cleared back to `NULL` when the table is closed out or abandoned (`abandonedTableCleaner.js`). There's no standalone "generate a PIN for this table" endpoint — it's a side effect of the seating flow.
- **QR code is the alternative path.** `POST /api/tables/qr/verify` covers the scan-a-QR-code flow (with an optional geofence check via lat/long) as a second way into the same table, alongside typing in the PIN.
- **Strict Access Control:** No device can access ordering features without a verified `table_id`, obtained via one of the two paths above.

## 4. End-to-End Network Data Flow (current)

```
[Guest Mobile App]                    [Express API (Port 8001)]              [PostgreSQL]
      |                                        |                                  |
      | -- 1. Staff seats a waitlist entry --> |                                  |
      |    (via staff-web, not this device)    | -- 2. Generate PIN, set on ----->|
      |                                        |    restaurant_tables.active_pin  |
      |                                        |                                  |
      | -- 3. POST /tables/verify-code ------> |                                  |
      |    { table_number, code }              | -- 4. Look up table by number -->|
      |                                        | <- 5. Compare active_pin, check -|
      |                                        |    pin_expires_at                |
      | <- 6. 200 OK: { table_id, ------------ |                                  |
      |    waiter_name }                       |                                  |
```

Session Inception: A table's PIN isn't generated on request — it's a side effect of staff seating a party (from the waitlist, or the auto-seat flow). No dedicated "create session" call in the live path.

Customer Handshake: Guest opens the mobile app, types the table number shown at their table plus the PIN given at seating. `POST /api/tables/verify-code` checks it against `restaurant_tables`, and on success returns `table_id` so the app can start ordering against that table.

## 5. Active API Endpoints Reference (current)

### 5.1. Verify Table PIN
**Endpoint:** `POST /api/tables/verify-code`
**Purpose:** Called by the guest mobile app once the customer enters their table number and PIN.

Request:
```json
{ "table_number": 5, "code": "0342" }
```

Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Table verified successfully.",
  "table_id": 12,
  "waiter_name": "Jordan"
}
```

Error Responses:
- `404` — table number doesn't exist
- `400` — `"No active PIN set for this table."` (nobody's been seated there)
- `401` — `"Invalid verification code."` or `"Verification code expired."`

### 5.2. Verify QR Code (alternative to PIN entry)
**Endpoint:** `POST /api/tables/qr/verify`

Request:
```json
{ "qr_data": "{\"type\":\"tableready_table\",\"table_id\":12}", "latitude": 40.7128, "longitude": -74.0060 }
```

Backend Logic: Parses the QR payload, optionally checks the scanner is within the configured geofence radius, then resolves the same way PIN verification does.

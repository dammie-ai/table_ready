# CHAPTER 1 — INTRODUCTION
*(integrated from your SRS.docx — lightly restructured to fit the chapter template; review and adjust wording to taste, but this is your own original writing)*

## 1.1 Problem Statement
Restaurant order tracking today typically ends at a basic order confirmation — a
receipt with little more than a meal price, date, and customer name. Staff-side, kitchens
run on guesswork rather than an accurate live queue: modifiers and allergy-relevant
removals aren't always visible in a form the kitchen can't miss, and there is often no
explicit hand-off confirming a dine-in order actually reached the table. TableReady was
built to close that gap: one shared, live backend where an action on one side (kitchen
marking food Ready) is reflected on another (the customer's progress bar, the waiter's
dashboard) without a manual refresh.

## 1.2 Purpose of the Study
TableReady is a multi-sided food ordering and restaurant management ecosystem
connecting customers, waitstaff, and kitchen staff in real time. Customers order from
their own phones, track their order live, and can call for assistance or join a
restaurant-wide waitlist. Staff manage the floor, menu, and inventory from a web
dashboard; the kitchen sees every incoming order — including customizations and
allergy-relevant modifications — on a live-updating display board, and a waiter
confirms when a dine-in order actually reaches the table.

## 1.3 Objectives of the Project
Key features implemented:
- **Real-time order tracking** — a WebSocket-driven progress bar follows an order
  from placement through kitchen prep to pickup, delivery, or table service
- **Required customer accounts** — registration and sign-in are required before
  ordering; guest-only checkout was tried and removed in favor of real accounts tied
  to order history
- **Modifier and allergy visibility** — every customization a customer selects,
  including "no [ingredient]" removals, reaches the kitchen board by name, with
  removals visually flagged for the cook
- **A real waiter hand-off** — kitchen advances a dine-in order to Ready and stops
  there; a waiter, not the kitchen, marks it Served, confirming food actually reached
  the table
- **Menu and inventory management** — staff can create/edit menu items (including
  photo upload), toggle stock availability, and restock inventory from the manager
  dashboard
- **Flexible ordering** — dine-in (QR or manual table check-in), pickup, delivery,
  and order-ahead, all without requiring in-app payment on the customer app (see
  Non-Functional Requirements, Security, for why)
- **Restaurant-wide waitlist** — a queue customers can join and staff can manage from
  the floor dashboard

## 1.4 Scope of the Project
**Audience:** Customers ordering food with a registered account; restaurant
managers/admins configuring the menu, branding, and staff; waitstaff serving dine-in
tables; kitchen staff fulfilling orders; delivery drivers.

**In scope:** a full-stack restaurant management system spanning three user groups —
Customers, Front-of-House staff (waiters/managers), and Back-of-House kitchen staff —
sharing one live backend.

**Explicitly out of scope (planned but not implemented):**
"THE USUAL?" one-tap reorder shortcut with automatic 3-orders-in-7-days detection; a
per-table "Notify Me" premium-table waitlist with SMS/push verification codes;
direct-to-kitchen refill requests that bypass the waiter; a customer-facing split-bill
flow (the calculation logic exists server-side, but no UI uses it); a VIP/loyalty card
system; in-app Stripe payment on the customer-mobile app specifically (Stripe exists
and is used by the separate staff-web checkout flow — see 1.5/Non-Functional
Requirements for why customer-mobile stayed pay-at-counter); automated "Dish of the
Week" calculation is built on the backend but not wired into any manager-facing screen.

## 1.5 Importance and Relevance of the Project
Reviewed against Toast KDS, Square for Restaurants, and OpenTable during initial
planning (full comparison in Chapter 2 — Literature Review): existing systems each
cover pieces of this problem (receipts, cash/card payment, progress bars, table
availability) but none combine order-type visibility, real allergy-modifier
visibility, and a real waiter-confirmed hand-off in one system the way TableReady does.
Building it also demonstrates full-stack ownership of a production-shaped system: a
normalized relational schema, a REST API with role-based authorization, real-time
event handling, third-party payment integration, and two frontends sharing a common
package.

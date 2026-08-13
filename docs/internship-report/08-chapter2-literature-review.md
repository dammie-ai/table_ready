# CHAPTER 2 — LITERATURE REVIEW

## 2.1 Overview of Existing Systems or Solutions
*(integrated from your SRS.docx — reviewed against Toast KDS, Square for Restaurants,
and OpenTable during initial planning)*

Three commercial systems were reviewed as points of comparison during planning:
- **Toast KDS** — an integrated POS + kitchen display system aimed at full-service
  restaurants, notable for an open-view prep-progress bar on its customer-facing app.
- **Square for Restaurants** — a POS + inventory + staff management platform,
  supporting printed receipts and cash/card payment out of the box.
- **OpenTable** — reservations-focused, with a "Notify Me" feature that alerts a
  customer when a specific table becomes available.

Each covers part of the same problem space TableReady addresses — order fulfillment,
payment, and table/seating visibility — but none combine them the way TableReady does.
The detailed feature-by-feature comparison is in **2.2 Related Research Works**.

## 2.2 Related Research Works
*(your completed gap-analysis table — already in your Word doc)*

| System / Feature | Toast KDS | Square for Restaurants | OpenTable | Gap |
|---|---|---|---|---|
| Print receipt option | yes | yes | yes | Each has instant-print receipts, but they typically only show meal price, date, and customer name — not table number, party size, order type, or a delivery cost breakdown. |
| Cash or card option | yes | yes | yes | A clear must-have. Split payment (part cash, part card) was identified as a natural extension. |
| Progress bar | no | yes | yes | Toast KDS has an open-view progress bar on the customer app showing how far meal prep has progressed. |
| Color-coding order types | no | no | no | No way found to visually distinguish a dine-in order from delivery or drive-thru at a glance. |
| Real-time table availability / notify | no | no | yes | OpenTable's "Notify Me" feature alerts a customer when a popular table opens up. |

*(Note: this table predates implementation and documents the competitive landscape at
planning time, not a status report on TableReady's current build. If your program
specifically wants academic paper citations in addition to this commercial comparison,
add 2-3 real sources — Google Scholar, terms like "restaurant order management system"
or "real-time POS architecture" — but the gap analysis above already satisfies "related
work" in the software-engineering sense.)*

## 2.3 Gaps in Existing Research or Systems
Drawing directly from the Gap column above, the consistent theme across all three
reviewed systems is **information granularity**: each system solves an adjacent
problem well (payment, reservations, prep-progress visibility) but none surface the
specific detail TableReady targets — order type at a glance, split payment, and
proactive table-availability notification together in one system. This shaped
TableReady's feature set directly: flexible order types with visibility built in from
the start, split-bill logic built server-side (UI still pending — see Chapter 1.4), and
a restaurant-wide waitlist as the implemented (if less granular than originally
envisioned) answer to real-time table availability.

## 2.4 Technologies, Methodologies, and Tools Reviewed
Real, factual — technologies evaluated/chosen and why (expand each with your actual
reasoning):
- **PostgreSQL vs. NoSQL** — relational chosen for strong consistency needs (orders,
  payments, inventory counts must not drift)
- **WebSockets (Socket.IO) vs. polling** — needed for kitchen/order-tracking latency;
  directly addresses the "instant screen update" requirement identified during planning
- **React Native/Expo vs. native iOS/Android** — one codebase for both platforms,
  faster iteration during a fixed-length internship — though this constrained the
  payment integration choice (see Chapter 3, Security) since Stripe's React Native SDK
  needs native code incompatible with the Expo Go workflow
- **Stripe vs. building payment processing in-house** — PCI compliance handled by
  Stripe; used in the staff-web checkout flow, not (yet) customer-mobile

---
*This chapter is now fully sourced from your own work — the gap analysis (2.1/2.2/2.3)
is already done, 2.4 is factual. Just review for wording.*

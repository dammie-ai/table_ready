# CHAPTER 7 — CONCLUSION AND FUTURE WORK (draft, review before use)

## 7.1 Summary of Project Outcomes
TableReady was built as a full-stack restaurant management platform: an Express/
PostgreSQL backend (~100 endpoints across auth, menu, cart/orders, inventory,
promotions, staff scheduling, notifications, and tax compliance), a React staff-web
dashboard, and a React Native customer mobile app, sharing logic through a common
package. Guest ordering works with or without an account; kitchen, waiter, and manager
roles each get a purpose-built view; order status, service requests, and table status
propagate live via WebSockets. Through iterative testing (manual/Postman, Jest, and
live E2E device testing) a number of real security gaps (IDOR, missing ownership
checks, role-leak in dashboard routes) and correctness bugs (kitchen not seeing
allergy-relevant modifiers, incorrect tax/payment amounts) were found and fixed before
completion. The backend was deployed to Render with a managed Postgres instance.

## 7.2 Recommendations for Future Improvements or Extensions
Grounded in real, current gaps rather than generic ideas:
1. **Automated frontend testing** — the repo currently has backend Jest tests
   (`backend/tests/api.test.js`) but no automated tests for either frontend; component/
   integration tests would catch regressions like the ones fixed manually during
   E2E testing.
2. **Dedicated driver experience** — the `driver` role exists in the schema
   (`user_roles`) and delivery tracking endpoints exist, but there's no
   driver-specific UI comparable to the waiter/kitchen dashboards.
3. **WebSocket horizontal scaling** — Socket.IO currently runs in-process; scaling the
   backend beyond one instance would need a shared adapter (e.g. Redis) to keep
   real-time events consistent across instances.
4. **Expanded analytics** — current analytics cover category sales, staff performance,
   and dish-of-week stats; predictive features (demand forecasting for inventory
   reorder, e.g.) would build on the ingredient-level inventory data already tracked.
5. **Native app store deployment** — customer mobile currently runs via Expo Go/dev
   builds; a production release would need EAS Build + App Store/Play Store submission.

---
*TODO (you): adjust 7.2 to match what you'd genuinely prioritize if you kept working on
this — the grader may ask "which of these would you actually do first and why."*

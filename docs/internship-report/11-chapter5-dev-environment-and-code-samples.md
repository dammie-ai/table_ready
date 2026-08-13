# CHAPTER 5.2-5.3 (5.1 Technology Stack = see 01-technical-documentation.md)

## 5.2 Development Environment
- **OS:** Windows *(TODO: confirm — dev machine used for this repo is Windows per the
  local paths; state your actual dev OS)*
- **Version control:** Git + GitHub, single `main` branch workflow with feature/fix
  commits (112 commits across the project — see Testing Documentation for the bug-fix
  ones worth writing up)
- **Package management:** npm workspaces (single `npm install` at repo root installs
  `backend`, `frontend/apps/staff-web`, `frontend/apps/customer-mobile`,
  `frontend/packages/shared`)
- **Local database:** Docker Desktop running `postgres:15-alpine` via `docker-compose.yml`
- **API testing:** Postman, using the committed collection
  (`backend/TableReady API.postman_collection.json`)
- **Mobile testing:** Expo Go app on a physical device, plus LAN-IP config for
  real-device testing (`config: point mobile app at LAN IP for real-device testing over Expo Go`)
- **Deployment:** Render (`render.yaml` — backend web service, staff-web static site,
  managed Postgres)
- **IDE:** *(TODO: name yours — VS Code, WebStorm, etc.)*

## 5.3 Code Samples
*(TODO — you must add these; pick 3-5 snippets you can explain line-by-line.)*
Good candidates that show non-trivial logic (grep these in the repo and paste the real
code, don't retype from memory):
1. **Geofencing check** — the delivery radius calculation (search for the geofence/
   distance logic in `backend/src/services/` or `deliveryController.js`)
2. **RBAC middleware** — `backend/src/middleware/authGuard.js` (you had this open —
   good candidate: shows how role-based route protection actually works)
3. **Order checkout transaction** — cart → order + stock deduction in one DB
   transaction (in the cart/order controller or service)
4. **WebSocket emit on status change** — `PATCH /orders/:id/status` handler
5. **Surge/dynamic pricing multiplier calculation** — wherever `appliedMultiplier` is computed

For each: paste the code block, then 2-3 sentences explaining what it does and why it's
written that way (e.g. why the transaction matters, why the role check happens before
the query).

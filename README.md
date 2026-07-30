# TableReady Monorepo

Restaurant management platform with backend API, staff web dashboard, and customer mobile app.

## Structure

- `backend/` — Express API, routes, controllers, services, middleware
- `frontend/` — all frontend apps and shared packages
  - `frontend/apps/staff-web/` — React + Vite staff dashboard
  - `frontend/apps/customer-mobile/` — React Native / Expo customer app
  - `frontend/packages/shared/` — shared types, API helpers, Zustand stores

## Quick Start

```bash
# install all workspace dependencies
npm install

# start backend dev server
cd backend && npm run dev

# start staff web dev server
cd frontend/apps/staff-web && npm run dev

# start customer mobile dev server
cd frontend/apps/customer-mobile && npx expo start
```

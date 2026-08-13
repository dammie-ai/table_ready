# 1. Technical Documentation

## 1.1 Overview

TableReady is a restaurant management platform built as a monorepo with three deployable
pieces sharing one codebase:

- **Backend** — a single Node.js/Express REST API + WebSocket server
- **Staff Web** — a React (Vite) dashboard used by waiters, kitchen staff, and managers
- **Customer Mobile** — a React Native (Expo) app used by diners to browse, order, and pay
- **Shared package** — TypeScript types, API client helpers, and Zustand stores reused by
  both frontends, so business logic (e.g. cart behavior) isn't duplicated between web and mobile

## 1.2 Technology Stack

### Backend (`backend/`)

| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | express ^4.18.2 | HTTP API server and routing |
| PostgreSQL | 15 (via `postgres:15-alpine` image) | Primary relational database |
| `pg` | ^8.11.3 | PostgreSQL driver |
| `jsonwebtoken` | ^9.0.2 | Auth tokens (staff + customer login) |
| `bcrypt` | ^5.1.1 | Password hashing |
| `zod` | ^3.22.4 | Request payload validation |
| `socket.io` | ^4.7.2 | Real-time events (live order status, kitchen updates, service requests) |
| `stripe` | ^14.10.0 | Payment processing |
| `helmet` | ^7.1.0 | HTTP security headers |
| `express-rate-limit` | ^7.1.5 | Rate limiting on the API |
| `qrcode` | ^1.5.3 | QR code generation (table QR codes) |
| `cors` | ^2.8.5 | Cross-origin request handling |
| `dotenv` | ^16.3.1 | Environment variable loading |

### Staff Web (`frontend/apps/staff-web/`)

| Technology | Version | Purpose |
|---|---|---|
| React | ^19.1.0 | UI library |
| Vite | ^6.3.0 | Dev server / build tool |
| TypeScript | ~5.7.2 | Static typing |
| React Router | ^7.5.0 | Client-side routing |
| Zustand | ^5.0.0 | Client-side state management |
| TanStack Query | ^5.101.4 | Server-state caching/fetching |
| Tailwind CSS | ^4.1.0 | Styling |
| Recharts | ^3.10.1 | Analytics/reporting charts |
| Socket.IO client | ^4.8.3 | Real-time updates from the backend |
| Stripe.js / React Stripe.js | ^9.12.1 / ^6.8.0 | Payment UI |
| i18next / react-i18next | ^26.3.6 / ^17.0.11 | Internationalization |
| axios | ^1.8.0 | HTTP requests |

### Customer Mobile (`frontend/apps/customer-mobile/`)

| Technology | Version | Purpose |
|---|---|---|
| React Native | ^0.80.3 | Mobile app framework |
| Expo | ~54.0.0 | React Native tooling/build system |
| React Navigation (bottom-tabs, native, native-stack) | ^7.x | In-app navigation |
| Zustand | ^5.0.0 | Client-side state management |
| expo-camera | ~17.0.10 | QR code scanning (table check-in) |
| expo-location | ~19.0.8 | Geofencing / delivery radius check |
| expo-secure-store | ~15.0.8 | Secure token storage on device |
| Socket.IO client | ^4.8.3 | Real-time order tracking |

### Shared Package (`frontend/packages/shared/`)

TypeScript package (`@table-ready/shared`) consumed by both frontends via npm workspaces.
Contains shared Zustand stores (e.g. cart state), API helper functions, and shared TypeScript
types, so the two frontends can't drift apart on how they call the API or model an order.

### Tooling / Infrastructure

| Tool | Purpose |
|---|---|
| npm workspaces | Monorepo dependency management (`backend`, `staff-web`, `customer-mobile`, `shared` as workspaces of one root `package.json`) |
| Docker / Docker Compose | Local PostgreSQL instance (`docker-compose.yml`) |
| Postman | Manual/exploratory API testing (`TableReady API.postman_collection.json`) |
| Jest | Backend automated testing (`backend/jest.config.js`) |
| Render | Deployment target (`render.yaml` — backend as a web service, staff web as a static site, managed Postgres) |

## 1.3 Installation Guidelines

### Prerequisites
- Node.js (compatible with React 19 / Vite 6 — Node 18+ recommended)
- Docker Desktop (for local PostgreSQL) — or a local PostgreSQL 15 install
- Expo Go app (for testing the mobile app on a physical device) or an Android/iOS simulator

### Setup steps

```bash
# 1. Install all workspace dependencies from the repo root
npm install

# 2. Start a local PostgreSQL instance
docker-compose up -d

# 3. Configure backend environment variables
cd backend
cp .env.example .env
# then edit .env: DB credentials, JWT_SECRET, Stripe test keys

# 4. Run database migrations / initialize schema
npm run migrate

# 5. Start the backend API
npm run dev              # runs on PORT from .env (default 8001)

# 6. In a separate terminal, start the staff web dashboard
cd frontend/apps/staff-web
npm run dev              # Vite dev server, default http://localhost:5173

# 7. In a separate terminal, start the customer mobile app
cd frontend/apps/customer-mobile
npx expo start           # scan QR with Expo Go, or press a/i for simulator
```

### Environment variables (backend `.env`)

| Variable | Purpose |
|---|---|
| `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT` | PostgreSQL connection |
| `JWT_SECRET` | Signing secret for auth tokens |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe payment processing (test-mode keys in dev) |
| `PORT` | Port the API listens on |
| `ALLOWED_ORIGINS` | CORS allow-list for frontend origins |

### Deployment
Defined in `render.yaml`: the backend deploys as a Render web service, the staff web app as a
static site (built with `vite build`), and PostgreSQL as a managed Render database. Secrets
(`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are marked `sync: false` and set manually in the
Render dashboard rather than committed to the repo; `JWT_SECRET` is auto-generated by Render.

---
*TODO (you): confirm the Node.js version you actually developed with (`node -v`) and state it
explicitly rather than "18+", and mention if you deployed the customer mobile app anywhere
(App Store/Play Store/Expo preview) or kept it dev-only.*

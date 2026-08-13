# 5. User / Usage Manual — structure only, needs real screenshots

Run the app (`npm run dev` in `backend`, `frontend/apps/staff-web`, and
`npx expo start` in `frontend/apps/customer-mobile`) and walk each flow below,
screenshotting as you go. Suggested manual structure:

## Part A — Customer Mobile App
1. **Getting started** — scan table QR code or enter table PIN (screens:
   `WelcomeScreen`, `TablePinScreen`, `LocationCheckScreen`)
2. **Browsing & ordering** — menu, item detail, modifiers, combo builder
   (`MenuScreen`, `ItemDetailScreen`, `ModifierScreen`, `ComboBuilderScreen`)
3. **Cart & checkout** — solo cart, group/shared cart, payment
   (`CartScreen`, `TableCartScreen`, `GroupChoiceScreen`, `CheckoutScreen`)
4. **Order tracking** — live status screen (`OrderTrackingScreen`), order history
   (`OrderHistoryScreen`)
5. **Reservations & waitlist** (`ReservationsScreen`, `WaitlistScreen`)
6. **Account & settings** — login, preferences, language/theme (`LoginScreen`, `SettingsScreen`)

## Part B — Staff Web Dashboard
1. **Login & role routing** (`Login.tsx`)
2. **Waiter flow** — table assignment, taking/handing off orders (`WaiterDashboard.tsx`, `StaffDashboard.tsx`)
3. **Kitchen flow** — live queue, status updates, stock (`KitchenDisplay.tsx`)
4. **Manager flow** — menu management, promotions, reports, staff, settings
   (`MenuManagement.tsx`, `Promotions.tsx`, `Reports.tsx`, `StaffManagement.tsx`,
   `ManagerPanel.tsx`, `Settings.tsx`)
5. **Front-of-house** — reservations, waitlist, table PIN, floor status
   (`Reservations.tsx`, `Waitlist.tsx`, `TablePin.tsx`)

## What to capture per flow
- One annotated screenshot per screen showing the main state
- The "expected output" the report asks for — e.g. for checkout: "after tapping Pay,
  the order appears in the Kitchen Display within ~1s via WebSocket, and the customer's
  OrderTrackingScreen updates to RECEIVED"
- One edge case per major flow (e.g. delivery order outside the 10-mile radius gets
  rejected with an error; cancelling an order after it's already `COOKING` is blocked)

---
*TODO (you): this needs the app actually running with real screenshots — that can't be
faked or generated meaningfully; budget real time for this before Thursday.*

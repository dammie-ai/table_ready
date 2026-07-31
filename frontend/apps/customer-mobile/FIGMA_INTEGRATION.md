# Customer Mobile App

React Native / Expo customer-facing app for TableReady.

## Prerequisites

- Node.js v20 or v22
- npm 9+
- Expo CLI
- iOS Simulator / Android Emulator or Expo Go app

## Setup

```bash
cd frontend/apps/customer-mobile
npm install
npx expo start
```

## Figma Integration Instructions

### Step 1: Export assets from Figma
- Export icons as SVG, images as PNG
- Place them in:
  - `assets/images/` — food photos, banners
  - `assets/icons/` — tab icons, action icons

### Step 2: Theme file
Open `src/theme.ts` and replace the color/spacing values with the exact values from your Figma demo:
- Primary color
- Secondary color
- Background color
- Font sizes
- Border radius values

### Step 3: Update screens to match Figma
Open each screen file and compare with your Figma design. The current files are functional placeholders. You need to update:
- `src/screens/LocationCheckScreen.tsx`
- `src/screens/GroupChoiceScreen.tsx`
- `src/screens/LoginScreen.tsx`
- `src/screens/WelcomeScreen.tsx`
- `src/screens/MenuScreen.tsx`
- `src/screens/ItemDetailScreen.tsx`
- `src/screens/ModifierScreen.tsx`
- `src/screens/ComboBuilderScreen.tsx`
- `src/screens/CartScreen.tsx`
- `src/screens/TableCartScreen.tsx`
- `src/screens/CheckoutScreen.tsx`
- `src/screens/OrderTrackingScreen.tsx`
- `src/screens/OrderHistoryScreen.tsx`
- `src/screens/ReservationsScreen.tsx`
- `src/screens/WaitlistScreen.tsx`
- `src/screens/ServiceRequestsScreen.tsx`
- `src/screens/SettingsScreen.tsx`

For each screen:
1. Replace hardcoded colors with `colors.xxx` from `src/theme.ts`
2. Replace hardcoded spacing with `spacing.xxx` from `src/theme.ts`
3. Replace custom buttons with the reusable `Button` component from `src/components/Button.tsx`
4. Replace custom inputs with `Input` from `src/components/Input.tsx`
5. Replace custom cards with `Card` from `src/components/Card.tsx`
6. Add badges using `Badge` from `src/components/Badge.tsx`
7. Use exported images/icons from `assets/`

### Step 4: Update navigation
- `src/navigation/AppNavigator.tsx` controls the full stack flow
- `src/navigation/TabNavigator.tsx` controls the bottom tab bar
- If your Figma demo uses tabs, update the tab screens in `TabNavigator.tsx`
- If your Figma demo uses a different flow, update the stack order in `AppNavigator.tsx`

### Step 5: Connect real data
All screens currently call the API layer in `frontend/packages/shared/src/api.ts`. Make sure:
- Menu screens call `getMenuItems()` and `getMenuItemDetail()`
- Cart screens use `useCartStore` from `@table-ready/shared`
- Checkout calls `checkoutCart()` or `createOrder()`
- Order tracking listens to Socket.IO events

### Step 6: Test
```bash
npx expo start
```
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR with Expo Go

### Reusable components available
- `src/components/Button.tsx` — primary/secondary/tertiary variants
- `src/components/Card.tsx` — selectable card with icon
- `src/components/Input.tsx` — text input with label/error
- `src/components/Badge.tsx` — colored status badge

### Theme variables available
- `colors` — all colors
- `typography` — h1, h2, h3, body, caption
- `spacing` — xs through xxl
- `borderRadius` — sm through full

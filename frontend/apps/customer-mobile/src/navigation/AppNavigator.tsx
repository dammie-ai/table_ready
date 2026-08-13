import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { NavigationContainer } from '@react-navigation/native'
import { useGroupCartSync } from '@table-ready/shared'
import LocationCheckScreen from '../screens/LocationCheckScreen'
import GroupChoiceScreen from '../screens/GroupChoiceScreen'
import LoginScreen from '../screens/LoginScreen'
import WelcomeScreen from '../screens/WelcomeScreen'
import TablePinScreen from '../screens/TablePinScreen'
import MenuScreen from '../screens/MenuScreen'
import ItemDetailScreen from '../screens/ItemDetailScreen'
import ModifierScreen from '../screens/ModifierScreen'
import ComboBuilderScreen from '../screens/ComboBuilderScreen'
import CartScreen from '../screens/CartScreen'
import TableCartScreen from '../screens/TableCartScreen'
import CheckoutScreen from '../screens/CheckoutScreen'
import OrderTrackingScreen from '../screens/OrderTrackingScreen'
import OrderHistoryScreen from '../screens/OrderHistoryScreen'
import ReservationsScreen from '../screens/ReservationsScreen'
import WaitlistScreen from '../screens/WaitlistScreen'
import SettingsScreen from '../screens/SettingsScreen'
import TabNavigator from './TabNavigator'

export type RootStackParamList = {
  LocationCheck: undefined
  GroupChoice: undefined
  Login: undefined
  Welcome: undefined
  TablePin: { thenGroupRoom?: string } | undefined
  Main: undefined
  Menu: { mode?: string; table_number?: number }
  ItemDetail: { item: any }
  Modifier: { item: any; modifiers: any[] }
  Combos: undefined
  Cart: { newCombo?: any }
  TableCart: undefined
  Checkout: undefined
  OrderTracking: { id: string; orderType?: string }
  OrderHistory: undefined
  Reservations: undefined
  Waitlist: undefined
  Settings: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function Navigation() {
  // Kept mounted app-wide (not per-screen) so a teammate's item lands here
  // even while this device is browsing the menu, not the table-cart screen.
  useGroupCartSync()

  // Sign-in is the front door — no location gate up front anymore. That
  // used to block every visitor behind a tight dine-in-only geofence
  // before they'd even picked Pickup/Delivery/Order From Home/
  // Reservations, none of which require being near the restaurant.
  // LocationCheck is now only reached from Welcome's "Dine In"/"Join
  // Table" buttons, right before TablePin's QR/PIN check-in. Delivery
  // still runs its own separate, wider-radius check inline on Welcome.
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="LocationCheck" component={LocationCheckScreen} />
        <Stack.Screen name="GroupChoice" component={GroupChoiceScreen} options={{ title: 'Ordering Style' }} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ title: 'TableReady' }} />
        <Stack.Screen name="TablePin" component={TablePinScreen} options={{ title: 'Table Check-In' }} />
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu' }} />
        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item Detail' }} />
        <Stack.Screen name="Modifier" component={ModifierScreen} options={{ title: 'Customize' }} />
        <Stack.Screen name="Combos" component={ComboBuilderScreen} options={{ title: 'Combo Builder' }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Your Cart' }} />
        <Stack.Screen name="TableCart" component={TableCartScreen} options={{ title: 'Table Cart' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: 'Order Tracking' }} />
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Order History' }} />
        <Stack.Screen name="Reservations" component={ReservationsScreen} options={{ title: 'Reservations' }} />
        <Stack.Screen name="Waitlist" component={WaitlistScreen} options={{ title: 'Waitlist' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

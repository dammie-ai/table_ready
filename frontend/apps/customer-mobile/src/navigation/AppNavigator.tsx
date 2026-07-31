import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { NavigationContainer } from '@react-navigation/native'
import LocationCheckScreen from '../screens/LocationCheckScreen'
import GroupChoiceScreen from '../screens/GroupChoiceScreen'
import LoginScreen from '../screens/LoginScreen'
import WelcomeScreen from '../screens/WelcomeScreen'
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
import ServiceRequestsScreen from '../screens/ServiceRequestsScreen'
import SettingsScreen from '../screens/SettingsScreen'
import TabNavigator from './TabNavigator'

export type RootStackParamList = {
  LocationCheck: undefined
  GroupChoice: undefined
  Login: undefined
  Welcome: undefined
  Main: undefined
  Menu: { mode?: string }
  ItemDetail: { item: any }
  Modifier: { item: any; modifiers: any[] }
  Combos: undefined
  Cart: undefined
  TableCart: undefined
  Checkout: undefined
  OrderTracking: { id: string }
  OrderHistory: undefined
  Reservations: undefined
  Waitlist: undefined
  ServiceRequests: undefined
  Settings: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LocationCheck">
        <Stack.Screen name="LocationCheck" component={LocationCheckScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GroupChoice" component={GroupChoiceScreen} options={{ title: 'Ordering Style' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ title: 'TableReady' }} />
        <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
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
        <Stack.Screen name="ServiceRequests" component={ServiceRequestsScreen} options={{ title: 'Service Requests' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

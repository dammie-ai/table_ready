import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { NavigationContainer } from '@react-navigation/native'
import LocationCheckScreen from '../screens/LocationCheckScreen'
import GroupChoiceScreen from '../screens/GroupChoiceScreen'
import WelcomeScreen from '../screens/WelcomeScreen'
import MenuScreen from '../screens/MenuScreen'
import ComboBuilderScreen from '../screens/ComboBuilderScreen'
import CartScreen from '../screens/CartScreen'
import TableCartScreen from '../screens/TableCartScreen'
import CheckoutScreen from '../screens/CheckoutScreen'
import OrderTrackingScreen from '../screens/OrderTrackingScreen'

export type RootStackParamList = {
  LocationCheck: undefined
  GroupChoice: undefined
  Welcome: undefined
  Menu: { mode?: string }
  Combos: undefined
  Cart: undefined
  TableCart: undefined
  Checkout: undefined
  OrderTracking: { id: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LocationCheck">
        <Stack.Screen name="LocationCheck" component={LocationCheckScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GroupChoice" component={GroupChoiceScreen} options={{ title: 'Ordering Style' }} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ title: 'TableReady' }} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu' }} />
        <Stack.Screen name="Combos" component={ComboBuilderScreen} options={{ title: 'Combo Builder' }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Your Cart' }} />
        <Stack.Screen name="TableCart" component={TableCartScreen} options={{ title: 'Table Cart' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: 'Order Tracking' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

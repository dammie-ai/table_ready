import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';
import MenuScreen from '../screens/MenuScreen';
import CartScreen from '../screens/CartScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type TabParamList = {
  Menu: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {name === 'Menu' && '🍽️'}
      {name === 'Cart' && '🛒'}
      {name === 'Orders' && '📋'}
      {name === 'Profile' && '👤'}
    </Text>
  );
}

export default function TabNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: styles.label,
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        })}
      >
        <Tab.Screen name="Menu" component={MenuScreen} options={{ tabBarLabel: 'Menu' }} />
        <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarLabel: 'Cart' }} />
        <Tab.Screen name="Orders" component={OrderHistoryScreen} options={{ tabBarLabel: 'Orders' }} />
        <Tab.Screen name="Profile" component={SettingsScreen} options={{ tabBarLabel: 'Profile' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    height: 64,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  icon: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  iconFocused: {
    color: colors.primary,
  },
});

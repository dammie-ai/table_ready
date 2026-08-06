import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../stores/themeStore';
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

function TabIcon({ name, focused, activeColor, inactiveColor }: { name: string; focused: boolean; activeColor: string; inactiveColor: string }) {
  return (
    <Text style={[styles.icon, { color: focused ? activeColor : inactiveColor }]}>
      {name === 'Menu' && '🍽️'}
      {name === 'Cart' && '🛒'}
      {name === 'Orders' && '📋'}
      {name === 'Profile' && '👤'}
    </Text>
  );
}

export default function TabNavigator() {
  const colors = useThemeStore((s) => s.colors);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} activeColor={colors.primary} inactiveColor={colors.textSecondary} />
        ),
      })}
    >
      <Tab.Screen name="Menu" component={MenuScreen} options={{ tabBarLabel: 'Menu' }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarLabel: 'Cart' }} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} options={{ tabBarLabel: 'Orders' }} />
      <Tab.Screen name="Profile" component={SettingsScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
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
  },
});

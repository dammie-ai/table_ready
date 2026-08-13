import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { checkLocation, useCartStore } from '@table-ready/shared';
import Button from '../components/Button';
import BackButton from '../components/BackButton';
import { spacing, borderRadius, typography, contrastText } from '../theme';
import { useThemeStore } from '../stores/themeStore';

export default function WelcomeScreen({ navigation }: any) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [surgeActive] = useState(false);
  const [isOpen] = useState(true);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const setOrderType = useCartStore((s) => s.setOrderType);

  const handleOrder = (orderType: string) => {
    setOrderType(orderType);
    navigation.navigate('Menu', { mode: orderType });
  };

  const handleDelivery = async () => {
    setCheckingDelivery(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location needed',
          'We need your location to confirm delivery is available in your area.'
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const res = await checkLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        check_type: 'delivery',
      });
      if (!res.allowed) {
        Alert.alert(
          "Sorry, we don't deliver there",
          res.message || `You're outside our ${res.radius_miles}-mile delivery area. Try Pickup instead?`
        );
        return;
      }
      handleOrder('delivery');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not verify your location.');
    } finally {
      setCheckingDelivery(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BackButton navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content}>
      {!isOpen && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedText}>🔴 We're currently closed. Order ahead for later!</Text>
        </View>
      )}

      {surgeActive && (
        <View style={styles.surgeBanner}>
          <Text style={styles.surgeText}>⚡ Surge pricing active — prices may be higher than usual</Text>
        </View>
      )}

      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🍽️</Text>
        </View>
        <Text style={styles.heroTitle}>TableReady</Text>
        <Text style={styles.subtitle}>Order from your table or on the go</Text>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === 1 && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        {/* "Reorder Your Usual" removed — the real /customer/usual/reorder
            endpoint expects a guest session_token nothing in this app ever
            produces (customers now always carry a JWT instead), so this
            button just opened an empty cart. Needs a JWT-based backend
            path before it can come back. */}
        {/* A standalone "Combo Deals" shortcut used to jump straight into
            item selection here, skipping order-type/table selection
            entirely — the only path on this screen that did. Combos are
            still fully reachable from inside the Menu screen once an
            order type (and, for dine-in, a table) has actually been set. */}
        <Button title="🪑 Dine In" onPress={() => navigation.navigate('TablePin')} variant="secondary" style={styles.button} />
        <Button title="📦 Pickup" onPress={() => handleOrder('pickup')} variant="secondary" style={styles.button} />
        <Button
          title={checkingDelivery ? 'Checking your location...' : '🚗 Delivery'}
          onPress={handleDelivery}
          disabled={checkingDelivery}
          variant="secondary"
          style={styles.button}
        />
        <Button title="🏠 Order From Home" onPress={() => handleOrder('order-from-home')} variant="secondary" style={styles.button} />
      </View>

      <View style={styles.secondaryRow}>
        <Button title="🔑 Join Table" onPress={() => navigation.navigate('TablePin')} variant="tertiary" style={styles.secondaryButton} />
        <Button title="📋 Waitlist" onPress={() => navigation.navigate('Waitlist')} variant="tertiary" style={styles.secondaryButton} />
        <Button title="📅 Reserve" onPress={() => navigation.navigate('Reservations')} variant="tertiary" style={styles.secondaryButton} />
      </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  closedBanner: {
    backgroundColor: '#dc2626',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    width: '100%',
    maxWidth: 320,
  },
  closedText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  surgeBanner: {
    backgroundColor: '#f59e0b',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    width: '100%',
    maxWidth: 320,
  },
  surgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoIcon: {
    fontSize: 40,
  },
  heroTitle: {
    ...typography.h1,
    color: contrastText(colors.primary),
  },
  subtitle: {
    ...typography.body,
    color: contrastText(colors.primary),
    opacity: 0.8,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.secondary,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 320,
  },
  secondaryButton: {
    flex: 1,
  },
});

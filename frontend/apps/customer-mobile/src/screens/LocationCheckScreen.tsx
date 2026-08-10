import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { spacing, borderRadius, typography } from '../theme';
import { useThemeStore } from '../stores/themeStore';
import Button from '../components/Button';
import Input from '../components/Input';
import * as Location from 'expo-location';
import { checkLocation } from '@table-ready/shared';

export default function LocationCheckScreen({ navigation }: any) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  // 'intro' explains *why* we're about to ask before the OS permission
  // dialog fires — jumping straight to the system prompt with zero context
  // (the previous behavior) is exactly what tanks grant rates and gives no
  // recovery path if the user reflexively denies it.
  const [phase, setPhase] = useState<'intro' | 'loading' | 'success' | 'error' | 'manual'>('intro');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [withinGeofence, setWithinGeofence] = useState(true);

  const requestLocation = async () => {
    setPhase('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPhase('error');
        setErrorMsg('Location permission denied.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const res = await checkLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        // This is the general "are you actually near the restaurant"
        // gate, not the delivery-radius check — dine_in uses the tight
        // geofence radius instead of falling through to the (much wider)
        // delivery-mile default.
        check_type: 'dine_in',
      });

      if (res.allowed) {
        setWithinGeofence(true);
        setPhase('success');
        setTimeout(() => navigation.replace('GroupChoice'), 1500);
      } else {
        setWithinGeofence(false);
        setPhase('error');
        setErrorMsg('You are outside the restaurant geofence.');
      }
    } catch (err) {
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : 'Location error');
    }
  };

  const handleContinueAnyway = () => {
    setWithinGeofence(false);
    setPhase('manual');
  };

  const handleManualContinue = () => {
    navigation.replace('GroupChoice');
  };

  if (phase === 'intro') {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🍽️</Text>
          </View>
          <Text style={[typography.h2, { color: colors.text }]}>TableReady</Text>
          <Text style={styles.logoSub}>Order from anywhere</Text>
        </View>

        <View style={styles.statusArea}>
          <View style={styles.iconCircle}>
            <Text style={styles.mapIcon}>📍</Text>
          </View>
          <Text style={styles.message}>
            We use your location to confirm you're near the restaurant and to check delivery
            availability. You'll get an OS prompt next — allow it to skip straight to ordering.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Allow Location Access" onPress={requestLocation} variant="primary" style={styles.button} />
          <Button title="Continue Anyway" onPress={handleContinueAnyway} variant="tertiary" style={styles.button} />
        </View>
      </View>
    );
  }

  if (phase === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.message}>Checking your location...</Text>
      </View>
    );
  }

  if (phase === 'success') {
    return (
      <View style={styles.center}>
        <Text style={styles.successTitle}>You're in range!</Text>
        <Text style={styles.message}>Taking you to the ordering flow...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🍽️</Text>
        </View>
        <Text style={[typography.h2, { color: colors.text }]}>TableReady</Text>
        <Text style={styles.logoSub}>Order from anywhere</Text>
      </View>

      <View style={styles.statusArea}>
        <View style={styles.iconCircle}>
          <Text style={styles.mapIcon}>📍</Text>
        </View>
        <Text style={styles.message}>{errorMsg || 'We need your location to show available restaurants near you.'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Retry Location" onPress={requestLocation} variant="secondary" style={styles.button} />
        <Button title="Continue Anyway" onPress={handleContinueAnyway} variant="tertiary" style={styles.button} />
      </View>

      {phase === 'manual' && (
        <View style={styles.manualSection}>
          <Input
            label="Address or Note"
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder="Optional address or note for staff"
            multiline
          />
          <Button title="Continue" onPress={handleManualContinue} variant="primary" style={styles.button} />
        </View>
      )}

      <TouchableOpacity onPress={() => setPhase('error')} style={styles.simulateButton}>
        <Text style={styles.simulateText}>Simulate error</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  logoContainer: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 48,
  },
  logoSub: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  statusArea: {
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapIcon: {
    fontSize: 32,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  successTitle: {
    ...typography.h2,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
  manualSection: {
    width: '100%',
    maxWidth: 320,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  simulateButton: {
    marginTop: spacing.lg,
  },
  simulateText: {
    fontSize: 12,
    color: '#d1d5db',
  },
});

import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { spacing, typography, contrastText } from '../theme';
import { useThemeStore } from '../stores/themeStore';

// Customer accounts (sign in / register) are disabled for now — the
// backend's users table is the staff table (waiter/kitchen/manager/etc),
// with no real customer-identity model behind it yet. Ordering has always
// worked fully as a guest, so this just removes a form that couldn't
// actually authenticate anyone.
export default function LoginScreen({ navigation }: any) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🍽️</Text>
        </View>
        <Text style={styles.logoTitle}>TableReady</Text>
        <Text style={styles.logoSubtitle}>Accounts are coming soon</Text>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        <Text style={styles.message}>
          Sign-in and saved accounts aren't available yet — order as a guest for now. Nothing about ordering,
          tracking, or checkout requires an account.
        </Text>

        <Button
          title="Continue as Guest"
          onPress={() => navigation.replace('Main')}
          style={styles.guestButton}
        />

        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.primary,
    gap: spacing.sm,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: spacing.sm,
  },
  logoIcon: {
    fontSize: 36,
  },
  logoTitle: {
    ...typography.h2,
    color: contrastText(colors.primary),
  },
  logoSubtitle: {
    ...typography.caption,
    color: contrastText(colors.primary),
    opacity: 0.8,
  },
  form: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formContent: {
    padding: spacing.xxl,
    gap: spacing.lg,
    paddingTop: spacing.xxl * 1.5,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  guestButton: {
    width: '100%',
  },
});

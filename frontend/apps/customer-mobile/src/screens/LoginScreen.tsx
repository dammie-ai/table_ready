import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Input from '../components/Input';
import BackButton from '../components/BackButton';
import { spacing, borderRadius, typography, contrastText } from '../theme';
import { useThemeStore } from '../stores/themeStore';
import { customerLogin, customerRegister, useAuthStore } from '@table-ready/shared';

// The app's entry gate — customers must sign in before reaching Welcome.
// Separate identity system from staff: this hits /customer/login and
// /customer/register, tied to customer_profiles, never the staff users
// table those old (removed) forms accidentally touched.
export default function LoginScreen({ navigation }: any) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await customerLogin({ email, password })
        : await customerRegister({ email, password, first_name: firstName || undefined });
      setAuth(res.token, res.user);
      // Location is checked before Login now, not after — see LocationCheckScreen.
      navigation.navigate('GroupChoice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BackButton navigation={navigation} />
      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🍽️</Text>
        </View>
        <Text style={styles.logoTitle}>TableReady</Text>
        <Text style={styles.logoSubtitle}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
      </View>

      <View style={styles.toggleRow}>
        {(['login', 'register'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => { setMode(m); setError(''); }}
            style={[styles.toggleButton, mode === m && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        {mode === 'register' && (
          <Input
            label="Name (optional)"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Your name"
          />
        )}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button
          title={loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
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
    paddingVertical: spacing.xxl * 1.5,
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
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xxl,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.accent,
  },
  form: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formContent: {
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: spacing.md,
  },
});

import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Input from '../components/Input';
import { spacing, borderRadius, typography, contrastText } from '../theme';
import { useThemeStore } from '../stores/themeStore';
import { login as apiLogin, register as apiRegister } from '@table-ready/shared';
import { useAuthStore } from '@table-ready/shared';

export default function LoginScreen({ navigation }: any) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async () => {
    if (!email || !password || (mode === 'register' && !username)) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await apiLogin({ email, password })
        : await apiRegister({ username, email, password });
      setAuth(res.token, res.user);
      navigation.replace('Main');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            style={[
              styles.toggleButton,
              mode === m && styles.toggleButtonActive,
            ]}
          >
            <Text style={[
              styles.toggleText,
              mode === m && styles.toggleTextActive,
            ]}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        {mode === 'register' && (
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="your_username"
            autoCapitalize="none"
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

        {mode === 'login' && (
          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {mode === 'register' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              By registering you agree to our Terms of Service. Your token will be stored securely using expo-secure-store.
            </Text>
          </View>
        )}

        <Button
          title={loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue as guest</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title="Browse Without Account"
          onPress={() => navigation.replace('Main')}
          variant="secondary"
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
  },
  forgotText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
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
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  infoText: {
    fontSize: 12,
    color: '#1d4ed8',
    lineHeight: 18,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  guestButton: {
    width: '100%',
  },
});

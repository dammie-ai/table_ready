import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Button from '../components/Button';
import Input from '../components/Input';
import BackButton from '../components/BackButton';
import { spacing, borderRadius, typography, contrastText } from '../theme';
import { useThemeStore } from '../stores/themeStore';
import { customerLogin, customerRegister, useAuthStore, getStorageItem, setStorageItem } from '@table-ready/shared';

const REMEMBERED_KEY = 'tableready_remembered_credentials';
// Same shape the backend checks in customerAuthController.js -- kept in
// sync by hand since there's no shared validation module between the two.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login is the app's front door on every launch -- this just spares a
  // returning customer from retyping what they typed last time, same as
  // a browser remembering a password.
  useEffect(() => {
    getStorageItem(REMEMBERED_KEY).then((stored) => {
      console.log('[login] remembered credentials read:', stored ? 'found' : 'none stored yet');
      if (!stored) return;
      try {
        const { email: savedEmail, password: savedPassword } = JSON.parse(stored);
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
      } catch (err) {
        console.log('[login] failed to parse remembered credentials:', err);
      }
    }).catch((err) => console.log('[login] failed to read remembered credentials:', err));
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6 || password.length > 12) {
      setError('Password must be between 6 and 12 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await customerLogin({ email, password })
        : await customerRegister({
            email,
            password,
            first_name: firstName || undefined,
            date_of_birth: birthDate ? birthDate.toISOString().split('T')[0] : undefined,
          });
      setAuth(res.token, res.user);
      setStorageItem(REMEMBERED_KEY, JSON.stringify({ email, password }))
        .then(() => console.log('[login] remembered credentials saved'))
        .catch((err) => console.log('[login] failed to save remembered credentials:', err));
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
          <>
            <Input
              label="Name (optional)"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Your name"
            />

            {/* Just capturing this for now, nothing reads it yet -- the
                idea is birthday deals down the line, so it's fine that
                nobody's forced to fill it in. */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Birthday (optional)</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowBirthPicker(true)}>
                <Text style={birthDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                  {birthDate ? birthDate.toLocaleDateString() : 'Select a date'}
                </Text>
              </TouchableOpacity>
              {showBirthPicker && (
                <DateTimePicker
                  value={birthDate || new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(_e, d) => { setShowBirthPicker(false); if (d) setBirthDate(d); }}
                />
              )}
            </View>
          </>
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
          placeholder="6-12 characters"
          secureTextEntry
          maxLength={12}
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
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  dateButtonPlaceholder: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

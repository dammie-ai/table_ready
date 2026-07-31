import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Button from '../components/Button'
import Input from '../components/Input'
import { colors, spacing, typography } from '../../theme'
import { login as apiLogin, register as apiRegister } from '@table-ready/shared'
import { useAuthStore } from '@table-ready/shared'

export default function LoginScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = isLogin
        ? await apiLogin({ email, password })
        : await apiRegister({ username, email, password })
      setAuth(res.token, res.user)
      navigation.replace('Main')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={typography.h1}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
      <Text style={styles.subtitle}>TableReady</Text>

      {!isLogin && (
        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          autoCapitalize="none"
        />
      )}

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="Enter email"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter password"
        secureTextEntry
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.buttonRow}>
        <Button
          title={loading ? 'Please wait...' : isLogin ? 'Log In' : 'Sign Up'}
          onPress={handleSubmit}
          disabled={loading}
        />
      </View>

      <TouchableOpacity onPress={() => { setError(''); setIsLogin(!isLogin) }}>
        <Text style={styles.toggleText}>
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  subtitle: {
    ...typography.body,
    color: colors.primary,
    marginBottom: 40,
    fontWeight: '600',
  },
  buttonRow: {
    width: '100%',
    maxWidth: 360,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  toggleText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
})

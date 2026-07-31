import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import * as Location from 'expo-location'
import Button from '../components/Button'
import Input from '../components/Input'
import { colors, spacing, typography } from '../../theme'
import { checkLocation } from '@table-ready/shared'
import * as SecureStore from 'expo-secure-store'

const GEO_KEY = 'tableready_within_geofence'

export default function LocationCheckScreen({ navigation }: any) {
  const [status, setStatus] = useState<'loading' | 'error' | 'success' | 'manual'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [withinGeofence, setWithinGeofence] = useState(true)

  useEffect(() => {
    checkGeofence()
  }, [])

  const checkGeofence = async () => {
    try {
      const stored = await SecureStore.getItemAsync(GEO_KEY)
      if (stored !== null) {
        setWithinGeofence(stored !== 'false')
        setStatus('success')
        return
      }
    } catch {
      // ignore
    }
    requestLocation()
  }

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setStatus('error')
        setErrorMsg('Location permission denied.')
        return
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const res = await checkLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })

      if (res.is_within_geofence) {
        setWithinGeofence(true)
        setStatus('success')
        await SecureStore.setItemAsync(GEO_KEY, 'true')
        setTimeout(() => navigation.replace('GroupChoice'), 1500)
      } else {
        setWithinGeofence(false)
        setStatus('error')
        setErrorMsg('You are outside the restaurant geofence.')
        await SecureStore.setItemAsync(GEO_KEY, 'false')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Location error')
    }
  }

  const handleContinueAnyway = async () => {
    await SecureStore.setItemAsync(GEO_KEY, 'false')
    setWithinGeofence(false)
    setStatus('manual')
  }

  const handleManualContinue = () => {
    navigation.replace('GroupChoice')
  }

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.message}>Checking your location...</Text>
      </View>
    )
  }

  if (status === 'success') {
    return (
      <View style={styles.center}>
        <Text style={styles.successTitle}>You're in range!</Text>
        <Text style={styles.message}>Taking you to the ordering flow...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={typography.h2}>Location Check</Text>
      <Text style={styles.message}>{errorMsg || 'We need your location to show available restaurants.'}</Text>

      <Button title="Retry Location" onPress={requestLocation} variant="secondary" style={styles.button} />

      <Button
        title="Continue Anyway"
        onPress={handleContinueAnyway}
        variant="tertiary"
        style={styles.button}
      />

      {status === 'manual' && (
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
    </View>
  )
}

const styles = StyleSheet.create({
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
  successTitle: {
    ...typography.h2,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing.md,
  },
  manualSection: {
    width: '100%',
    maxWidth: 320,
    marginTop: spacing.lg,
  },
})

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import Button from '../components/Button'
import Card from '../components/Card'
import { colors, spacing, borderRadius, typography } from '../../theme'

const GEO_KEY = 'tableready_within_geofence'

export default function WelcomeScreen({ navigation }: any) {
  const [withinGeofence, setWithinGeofence] = useState(true)

  useEffect(() => {
    const checkGeofence = async () => {
      try {
        const value = await SecureStore.getItemAsync(GEO_KEY)
        setWithinGeofence(value !== 'false')
      } catch {
        setWithinGeofence(true)
      }
    }
    checkGeofence()
  }, [])

  const goToMain = () => navigation.replace('Main')
  const goToMenu = (mode: string) => navigation.navigate('Menu', { mode })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={typography.h1}>TableReady</Text>
      <Text style={styles.subtitle}>Order from your table or on the go</Text>

      <View style={styles.section}>
        <Button title="Combo Deals" onPress={goToMenu} variant="primary" />
      </View>

      {withinGeofence && (
        <View style={styles.section}>
          <Button title="Dine In" onPress={() => goToMenu('dine-in')} variant="secondary" />
        </View>
      )}

      <View style={styles.section}>
        <Button title="Pickup" onPress={() => goToMenu('pickup')} variant="secondary" />
      </View>

      <View style={styles.section}>
        <Button title="Delivery" onPress={() => goToMenu('delivery')} variant="secondary" />
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>More</Text>

      <View style={styles.section}>
        <Button title="Group Order / Table Cart" onPress={goToMain} variant="tertiary" />
      </View>
      <View style={styles.section}>
        <Button title="Reservations" onPress={() => navigation.navigate('Reservations')} variant="tertiary" />
      </View>
      <View style={styles.section}>
        <Button title="Join Waitlist" onPress={() => navigation.navigate('Waitlist')} variant="tertiary" />
      </View>
      <View style={styles.section}>
        <Button title="Order History" onPress={() => navigation.navigate('OrderHistory')} variant="tertiary" />
      </View>
      <View style={styles.section}>
        <Button title="Settings" onPress={() => navigation.navigate('Settings')} variant="tertiary" />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    alignItems: 'center',
    padding: spacing.xxl,
    paddingTop: 80,
  },
  subtitle: {
    ...typography.body,
    color: '#dbeafe',
    marginBottom: 40,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing.md,
  },
  divider: {
    width: '100%',
    maxWidth: 320,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#93c5fd',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
    width: '100%',
    maxWidth: 320,
    textAlign: 'left',
  },
})

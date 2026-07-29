import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

export default function WelcomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TableReady</Text>
      <Text style={styles.subtitle}>Order from your table or on the go</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Combos')}>
        <Text style={styles.primaryButtonText}>Combo Deals</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Menu', { mode: 'dine-in' })}>
        <Text style={styles.secondaryButtonText}>Dine In</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Menu', { mode: 'pickup' })}>
        <Text style={styles.secondaryButtonText}>Pickup</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Menu', { mode: 'delivery' })}>
        <Text style={styles.secondaryButtonText}>Delivery</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#1e40af',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#dbeafe',
    marginBottom: 40,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#1e40af',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
})

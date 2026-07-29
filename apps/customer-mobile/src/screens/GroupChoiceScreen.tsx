import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'

export default function GroupChoiceScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false)

  const generateGroupCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleSelect = async (mode: 'individual' | 'group') => {
    setLoading(true)
    try {
      if (mode === 'group') {
        const groupCode = generateGroupCode()
        // Store group code in secure storage
        navigation.replace('Welcome')
      } else {
        navigation.replace('Welcome')
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to set order mode')
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How are you ordering?</Text>
      <Text style={styles.subtitle}>Choose your dining style to get started</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelect('individual')}
        disabled={loading}
      >
        <Text style={styles.emoji}>👤</Text>
        <View>
          <Text style={styles.cardTitle}>Just Me</Text>
          <Text style={styles.cardSubtitle}>Ordering alone, paying alone</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelect('group')}
        disabled={loading}
      >
        <Text style={styles.emoji}>👥</Text>
        <View>
          <Text style={styles.cardTitle}>Group Order</Text>
          <Text style={styles.cardSubtitle}>Dining together, split the bill</Text>
        </View>
      </TouchableOpacity>

      {loading && <Text style={styles.loading}>Loading...</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    gap: 16,
  },
  emoji: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  loading: {
    marginTop: 24,
    color: '#6b7280',
  },
})

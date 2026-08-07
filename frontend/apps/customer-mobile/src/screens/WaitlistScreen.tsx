import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { joinWaitlist, cancelWaitlistEntry, getFloorLayout } from '@table-ready/shared'

export default function WaitlistScreen({ navigation }: any) {
  const [tables, setTables] = useState<{ table_id: number; table_number: number; status_state: string }[]>([])
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [partySize, setPartySize] = useState('2')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [myEntry, setMyEntry] = useState<any>(null)

  useEffect(() => {
    getFloorLayout()
      .then((res) => setTables(res.tables || []))
      .catch((err) => console.error('Failed to load tables:', err))
      .finally(() => setLoading(false))
  }, [])

  const handleJoin = async () => {
    if (!selectedTableId) {
      Alert.alert('Pick a table', 'Choose which table you’d like to wait for.')
      return
    }
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter your name so we can call you.')
      return
    }
    setJoining(true)
    try {
      const res = await joinWaitlist({
        table_id: selectedTableId,
        customer_name: name.trim(),
        phone: phone.trim() || undefined,
        party_size: parseInt(partySize, 10) || 1,
      })
      setMyEntry(res.entry)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to join waitlist')
    } finally {
      setJoining(false)
    }
  }

  const handleCancel = async () => {
    if (!myEntry) return
    try {
      await cancelWaitlistEntry(myEntry.entry_id)
      setMyEntry(null)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to cancel')
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    )
  }

  if (myEntry) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.title}>You're on the Waitlist</Text>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmLabel}>Your PIN</Text>
          <Text style={styles.confirmPin}>{myEntry.pin_code}</Text>
          <Text style={styles.confirmDetail}>Party of {myEntry.party_size}</Text>
          <Text style={styles.confirmHint}>We'll text or call {myEntry.customer_name} when your table is ready.</Text>
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Leave Waitlist</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>Join the Waitlist</Text>

      <Text style={styles.listTitle}>Pick a Table</Text>
      {tables.length === 0 ? (
        <Text style={styles.emptyQueue}>No tables available right now.</Text>
      ) : (
        <View style={styles.tableGrid}>
          {tables.map((t) => (
            <TouchableOpacity
              key={t.table_id}
              onPress={() => setSelectedTableId(t.table_id)}
              style={[styles.tableChip, selectedTableId === t.table_id && styles.tableChipActive]}
            >
              <Text style={[styles.tableChipText, selectedTableId === t.table_id && styles.tableChipTextActive]}>
                Table {t.table_number}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.form}>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone (optional)" keyboardType="phone-pad" />
        <TextInput style={styles.input} value={partySize} onChangeText={setPartySize} placeholder="Party Size" keyboardType="numeric" />
        <TouchableOpacity style={[styles.button, joining && { opacity: 0.6 }]} onPress={handleJoin} disabled={joining}>
          <Text style={styles.buttonText}>{joining ? 'Joining...' : 'Join Waitlist'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyQueue: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tableChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tableChipActive: {
    backgroundColor: '#c2410c',
    borderColor: '#c2410c',
  },
  tableChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tableChipTextActive: {
    color: '#ffffff',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#c2410c',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  confirmLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmPin: {
    fontSize: 40,
    fontWeight: '700',
    color: '#c2410c',
    letterSpacing: 4,
    marginVertical: 8,
  },
  confirmDetail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  confirmHint: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelButtonText: {
    color: '#dc2626',
    fontWeight: '600',
  },
})

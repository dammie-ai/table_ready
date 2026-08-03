import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native'
import { joinWaitlist, getWaitlist, cancelWaitlistEntry, getWaitlistQueue } from '@table-ready/shared'

export default function WaitlistScreen({ navigation }: any) {
  const [entries, setEntries] = useState<any[]>([])
  const [partySize, setPartySize] = useState('2')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWaitlist()
  }, [])

  const loadWaitlist = async () => {
    try {
      const [entriesRes, queueRes] = await Promise.all([getWaitlist(), getWaitlistQueue(0)])
      setEntries(entriesRes.entries)
      setQueue(queueRes.queue)
    } catch (err) {
      console.error('Failed to load waitlist:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    try {
      await joinWaitlist({ party_size: parseInt(partySize), name, phone })
      Alert.alert('Success', 'You have been added to the waitlist')
      loadWaitlist()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to join waitlist')
    }
  }

  const handleCancel = async (entryId: number) => {
    try {
      await cancelWaitlistEntry(entryId)
      setEntries((prev) => prev.filter((e) => e.entry_id !== entryId))
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Waitlist</Text>

      <View style={styles.form}>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
        <TextInput style={styles.input} value={partySize} onChangeText={setPartySize} placeholder="Party Size" keyboardType="numeric" />
        <TouchableOpacity style={styles.button} onPress={handleJoin}>
          <Text style={styles.buttonText}>Join Waitlist</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.listTitle}>Queue Position</Text>
      {queue.length === 0 ? (
        <Text style={styles.emptyQueue}>No one currently waiting</Text>
      ) : (
        queue.map((q, idx) => (
          <View key={q.entry_id || idx} style={styles.queueItem}>
            <Text style={styles.queuePosition}>#{idx + 1}</Text>
            <View>
              <Text style={styles.queueName}>{q.name}</Text>
              <Text style={styles.queueDetail}>Party of {q.party_size}</Text>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.listTitle, { marginTop: 24 }]}>My Waitlist Entries</Text>
      {entries.length === 0 ? (
        <Text style={styles.emptyQueue}>You are not on any waitlist</Text>
      ) : (
        entries.map((entry) => (
          <View key={entry.entry_id} style={styles.card}>
            <Text style={styles.cardTitle}>Party of {entry.party_size}</Text>
            <Text style={styles.cardDetail}>Status: {entry.status}</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancel(entry.entry_id)}>
              <Text style={styles.cancelButtonText}>Leave Waitlist</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
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
    backgroundColor: '#2563eb',
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
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  emptyQueue: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 16,
  },
  queuePosition: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
    width: 40,
    textAlign: 'center',
  },
  queueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  queueDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
})

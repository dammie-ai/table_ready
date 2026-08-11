import { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { joinWaitlist, cancelWaitlistEntry, getFloorLayout } from '@table-ready/shared'
import { useThemeStore } from '../stores/themeStore'
import { contrastText } from '../theme'
import BackButton from '../components/BackButton'

export default function WaitlistScreen({ navigation }: any) {
  const colors = useThemeStore((s) => s.colors)
  const styles = useMemo(() => createStyles(colors), [colors])
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
        <BackButton navigation={navigation} />
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
      <BackButton navigation={navigation} />
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
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone (optional)" placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />
        <TextInput style={styles.input} value={partySize} onChangeText={setPartySize} placeholder="Party Size" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
        <TouchableOpacity style={[styles.button, joining && { opacity: 0.6 }]} onPress={handleJoin} disabled={joining}>
          <Text style={styles.buttonText}>{joining ? 'Joining...' : 'Join Waitlist'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyQueue: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tableChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tableChipTextActive: {
    color: contrastText(colors.primary),
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: contrastText(colors.primary),
    fontSize: 16,
    fontWeight: '600',
  },
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  confirmLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmPin: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 4,
    marginVertical: 8,
  },
  confirmDetail: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  confirmHint: {
    fontSize: 13,
    color: colors.textSecondary,
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

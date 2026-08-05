import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { createReservation, getReservations, cancelReservation } from '@table-ready/shared'

export default function ReservationsScreen({ navigation }: any) {
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [partySize, setPartySize] = useState('2')
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState(new Date())
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  useEffect(() => {
    loadReservations()
  }, [])

  const loadReservations = async () => {
    try {
      const res = await getReservations()
      setReservations(res.reservations)
    } catch (err) {
      console.error('Failed to load reservations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const dateStr = date.toISOString().split('T')[0]
      const timeStr = time.toTimeString().slice(0, 5)
      await createReservation({
        date: dateStr,
        time: timeStr,
        party_size: parseInt(partySize),
        name,
        phone,
      })
      Alert.alert('Success', 'Reservation created')
      loadReservations()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create reservation')
    }
  }

  const handleCancel = async (id: number) => {
    try {
      await cancelReservation(id)
      setReservations((prev) => prev.filter((r) => r.reservation_id !== id))
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to cancel reservation')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reservations</Text>

      <View style={styles.form}>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
        <TextInput style={styles.input} value={partySize} onChangeText={setPartySize} placeholder="Party Size" keyboardType="numeric" />

        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => { setShowDatePicker(false); if (d) setDate(d) }}
          />
        )}

        <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
          <Text>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, t) => { setShowTimePicker(false); if (t) setTime(t) }}
          />
        )}

        <TouchableOpacity style={styles.button} onPress={handleCreate}>
          <Text style={styles.buttonText}>Book Reservation</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.listTitle}>My Reservations</Text>
      <FlatList
        data={reservations}
        keyExtractor={(item) => item.reservation_id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name} — Party of {item.party_size}</Text>
            <Text style={styles.cardDetail}>{item.date} at {item.time}</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancel(item.reservation_id)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
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
    justifyContent: 'center',
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

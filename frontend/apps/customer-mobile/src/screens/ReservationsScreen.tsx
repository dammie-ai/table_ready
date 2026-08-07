import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { createReservation } from '@table-ready/shared'

export default function ReservationsScreen({ navigation }: any) {
  const [myReservations, setMyReservations] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [partySize, setPartySize] = useState('2')
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState(new Date())
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter your name for the reservation.')
      return
    }
    setCreating(true)
    try {
      const reservation_date = date.toISOString().split('T')[0]
      const reservation_time = time.toTimeString().slice(0, 5)
      const res = await createReservation({
        reservation_date,
        reservation_time,
        party_size: parseInt(partySize, 10) || 1,
        customer_name: name.trim(),
        customer_phone: phone.trim() || undefined,
      })
      setMyReservations((prev) => [res.reservation, ...prev])
      Alert.alert('Reserved', `Table booked for ${reservation_date} at ${reservation_time}.`)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create reservation')
    } finally {
      setCreating(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
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

        <TouchableOpacity style={[styles.button, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
          <Text style={styles.buttonText}>{creating ? 'Booking...' : 'Book Reservation'}</Text>
        </TouchableOpacity>
      </View>

      {myReservations.length > 0 && (
        <>
          <Text style={styles.listTitle}>Your Reservations This Session</Text>
          {myReservations.map((item) => (
            <View key={item.reservation_id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.customer_name} — Party of {item.party_size}</Text>
              <Text style={styles.cardDetail}>{item.reservation_date} at {item.reservation_time}</Text>
              <Text style={styles.cardHint}>Need to change or cancel? Call the restaurant.</Text>
            </View>
          ))}
        </>
      )}
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
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
})

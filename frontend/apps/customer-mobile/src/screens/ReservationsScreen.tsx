import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { createReservation } from '@table-ready/shared'
import { useThemeStore } from '../stores/themeStore'

export default function ReservationsScreen({ navigation }: any) {
  const colors = useThemeStore((s) => s.colors)
  const styles = useMemo(() => createStyles(colors), [colors])
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
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />
        <TextInput style={styles.input} value={partySize} onChangeText={setPartySize} placeholder="Party Size" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />

        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.inputText}>{date.toLocaleDateString()}</Text>
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
          <Text style={styles.inputText}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
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

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.text,
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
    justifyContent: 'center',
  },
  inputText: {
    color: colors.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary,
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
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
})

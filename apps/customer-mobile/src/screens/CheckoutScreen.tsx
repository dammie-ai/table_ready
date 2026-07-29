import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native'

export default function CheckoutScreen({ navigation }: any) {
  const [orderType, setOrderType] = useState('PICKUP')
  const [tableNumber, setTableNumber] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')

  const handlePay = () => {
    // Integrate with Stripe or native payment
    navigation.replace('OrderTracking', { id: '1' })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Type</Text>
        <View style={styles.typeRow}>
          {['PICKUP', 'DELIVERY', 'IN_HOUSE'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, orderType === type && styles.typeButtonActive]}
              onPress={() => setOrderType(type)}
            >
              <Text style={[styles.typeButtonText, orderType === type && styles.typeButtonTextActive]}>
                {type.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {(orderType === 'IN_HOUSE' || orderType === 'DINE_IN') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Table Number</Text>
          <TextInput
            style={styles.input}
            value={tableNumber}
            onChangeText={setTableNumber}
            placeholder="Enter table number"
            keyboardType="numeric"
          />
        </View>
      )}

      {orderType === 'DELIVERY' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Enter delivery address"
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Instructions</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          placeholder="Any special requests?"
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity style={styles.payButton} onPress={handlePay}>
        <Text style={styles.payButtonText}>Pay Now</Text>
      </TouchableOpacity>
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
    marginBottom: 24,
    color: '#111827',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  typeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  typeButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  payButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 32,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
})

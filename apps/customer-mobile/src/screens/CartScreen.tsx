import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { useCartStore, type CartItem } from '@table-ready/shared'

export default function CartScreen({ navigation }: any) {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const total = useCartStore((s) => s.total())

  const renderItem = ({ item }: { item: CartItem }) => {
    if (item.combo_id) {
      return (
        <View style={styles.card}>
          <Text style={styles.comboName}>{item.name}</Text>
          <Text style={styles.comboLabel}>Combo Deal</Text>
          {item.combo_main && (
            <View style={styles.row}>
              <Text style={styles.label}>Main</Text>
              <Text style={styles.value}>{item.combo_main.name}</Text>
            </View>
          )}
          {item.combo_sides && item.combo_sides.length > 0 && (
            <View style={styles.sidesContainer}>
              <Text style={styles.label}>Sides</Text>
              {item.combo_sides.map((side, idx) => (
                <Text key={idx} style={styles.sideItem}>
                  {side.name}
                </Text>
              ))}
            </View>
          )}
          <View style={styles.footer}>
            <View style={styles.quantityRow}>
              <TouchableOpacity onPress={() => item.combo_main && updateQuantity(item.combo_main.menu_item_id, item.quantity - 1)}>
                <Text style={styles.qtyButton}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => item.combo_main && updateQuantity(item.combo_main.menu_item_id, item.quantity + 1)}>
                <Text style={styles.qtyButton}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.total}>${(item.base_price * item.quantity).toFixed(2)}</Text>
          </View>
        </View>
      )
    }

    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>${item.base_price.toFixed(2)}</Text>
        <View style={styles.footer}>
          <View style={styles.quantityRow}>
            <TouchableOpacity onPress={() => updateQuantity(item.menu_item_id!, item.quantity - 1)}>
              <Text style={styles.qtyButton}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity onPress={() => updateQuantity(item.menu_item_id!, item.quantity + 1)}>
              <Text style={styles.qtyButton}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => removeItem(item.menu_item_id!)}>
            <Text style={styles.removeButton}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
          <Text style={styles.link}>Browse Menu</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList data={items} renderItem={renderItem} keyExtractor={(item, index) => index.toString()} />
      <View style={styles.summary}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total().toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutButton} onPress={() => navigation.navigate('Checkout')}>
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={clearCart}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  link: {
    color: '#2563eb',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  comboName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  comboLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sidesContainer: {
    marginTop: 8,
  },
  sideItem: {
    fontSize: 14,
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyButton: {
    fontSize: 20,
    color: '#2563eb',
    fontWeight: '600',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  total: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  removeButton: {
    color: '#dc2626',
    fontSize: 14,
  },
  summary: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  checkoutButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
})

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native'
import { listenForCartUpdates, broadcastCartUpdate, type CartUpdatePayload } from '@table-ready/shared'
import { useCartStore, type CartItem } from '@table-ready/shared'

export default function TableCartScreen({ navigation }: any) {
  const [room, setRoom] = useState('')
  const [joined, setJoined] = useState(false)
  const [remoteItems, setRemoteItems] = useState<CartUpdatePayload['item'][]>([])
  const localItems = useCartStore((s) => s.items)

  useEffect(() => {
    const savedRoom = localStorage.getItem('tableready_group_code')
    if (savedRoom) {
      setRoom(savedRoom)
      setJoined(true)
    }
  }, [])

  useEffect(() => {
    if (!joined || !room) return

    const unsubscribe = listenForCartUpdates(room, (payload: CartUpdatePayload) => {
      if (payload.type === 'add' && payload.item) {
        setRemoteItems((prev) => {
          const exists = prev.find((i) => i?.menu_item_id === payload.item?.menu_item_id)
          if (exists) {
            return prev.map((i) =>
              i?.menu_item_id === payload.item?.menu_item_id
                ? { ...payload.item!, quantity: (i.quantity || 0) + (payload.item.quantity || 1) }
                : i
            )
          }
          return [...prev, payload.item!]
        })
      } else if (payload.type === 'remove' && payload.menu_item_id) {
        setRemoteItems((prev) => prev.filter((i) => i?.menu_item_id !== payload.menu_item_id))
      } else if (payload.type === 'update' && payload.menu_item_id && payload.quantity !== undefined) {
        setRemoteItems((prev) =>
          prev.map((i) => i?.menu_item_id === payload.menu_item_id ? { ...i!, quantity: payload.quantity! } : i)
        )
      }
    })

    return () => {
      unsubscribe()
    }
  }, [joined, room])

  const broadcastChange = (type: CartUpdatePayload['type'], item?: CartUpdatePayload['item'], menu_item_id?: number, quantity?: number) => {
    broadcastCartUpdate(room, {
      type,
      item,
      menu_item_id,
      quantity,
      timestamp: Date.now(),
    })
  }

  const handleAddItem = (item: { menu_item_id: number; name: string; base_price: number }) => {
    useCartStore.getState().addItem(item)
    broadcastChange('add', { ...item, quantity: 1 })
  }

  const mergeItems = () => {
    const merged: { menu_item_id: number; name: string; base_price: number; quantity: number }[] = []
    const allItems = [...localItems, ...remoteItems]
    allItems.forEach((item) => {
      if (!item) return
      const existing = merged.find((i) => i.menu_item_id === item.menu_item_id)
      if (existing) {
        existing.quantity += item.quantity || 1
      } else {
        merged.push({
          menu_item_id: item.menu_item_id!,
          name: item.name,
          base_price: item.base_price,
          quantity: item.quantity || 1,
        })
      }
    })
    return merged
  }

  if (!joined) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Shared Table Cart</Text>
        <Text style={styles.subtitle}>Enter your table code to join the group order.</Text>
        <TextInput
          style={styles.input}
          value={room}
          onChangeText={(text) => setRoom(text.toUpperCase())}
          placeholder="Table code"
          maxLength={6}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.joinButton} onPress={() => { if (room) { localStorage.setItem('tableready_group_code', room); setJoined(true) } }}>
          <Text style={styles.joinButtonText}>Join Table</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const mergedItems = mergeItems()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Table Cart</Text>
      <Text style={styles.room}>Room: {room}</Text>
      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.addButtonText}>Add Items</Text>
      </TouchableOpacity>
      {mergedItems.map((item) => (
        <View key={item.menu_item_id} style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>${item.base_price.toFixed(2)}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.checkoutButton} onPress={() => navigation.navigate('Checkout')}>
        <Text style={styles.checkoutButtonText}>Checkout</Text>
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
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  room: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 16,
  },
  joinButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  checkoutButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})

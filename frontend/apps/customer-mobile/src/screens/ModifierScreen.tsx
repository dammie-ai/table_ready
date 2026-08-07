import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCartStore, type MenuItem, type MenuItemModifier } from '@table-ready/shared'

export default function ModifierScreen({ route, navigation }: any) {
  const { item, modifiers } = route.params || {}
  const [selected, setSelected] = useState<{ modifier_id: number; quantity: number }[]>([])
  const addItem = useCartStore((s) => s.addItem)

  const toggle = (modifier: MenuItemModifier) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.modifier_id === modifier.modifier_id)
      if (exists) {
        return prev.filter((s) => s.modifier_id !== modifier.modifier_id)
      }
      return [...prev, { modifier_id: modifier.modifier_id, quantity: 1 }]
    })
  }

  const totalAdjustment = modifiers.reduce((sum: number, mod: MenuItemModifier) => {
    const sel = selected.find((s) => s.modifier_id === mod.modifier_id)
    return sum + (sel ? mod.price_adjustment * sel.quantity : 0)
  }, 0)

  const handleAdd = () => {
    const chosenModifiers = selected.map((s) => {
      const mod = modifiers.find((m: MenuItemModifier) => m.modifier_id === s.modifier_id)
      return { modifier_id: s.modifier_id, quantity: s.quantity, name: mod?.name, price_adjustment: mod?.price_adjustment ?? 0 }
    })
    addItem({
      menu_item_id: item.item_id,
      name: item.name,
      base_price: item.base_price + totalAdjustment,
      modifiers: chosenModifiers,
    })
    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Customize {item?.name}</Text>

      <FlatList
        data={modifiers}
        keyExtractor={(mod: MenuItemModifier) => mod.modifier_id.toString()}
        renderItem={({ item: mod }: { item: MenuItemModifier }) => {
          const isSelected = selected.some((s) => s.modifier_id === mod.modifier_id)
          return (
            <TouchableOpacity
              style={[styles.modifierCard, isSelected && styles.modifierCardSelected]}
              onPress={() => toggle(mod)}
            >
              <View style={styles.modifierInfo}>
                <Text style={styles.modifierName}>{mod.name}</Text>
                <Text style={styles.modifierDescription}>{mod.description}</Text>
              </View>
              <Text style={[styles.modifierPrice, mod.price_adjustment < 0 && styles.modifierPriceNegative]}>
                {mod.price_adjustment === 0 ? 'No change' : `${mod.price_adjustment >= 0 ? '+' : ''}$${mod.price_adjustment.toFixed(2)}`}
              </Text>
            </TouchableOpacity>
          )
        }}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Adjustment</Text>
          <Text style={styles.totalValue}>{totalAdjustment >= 0 ? '+' : ''}${totalAdjustment.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    margin: 16,
    color: '#111827',
  },
  modifierCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modifierCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  modifierInfo: {
    flex: 1,
  },
  modifierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modifierDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  modifierPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
  },
  modifierPriceNegative: {
    color: '#dc2626',
  },
  footer: {
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
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})

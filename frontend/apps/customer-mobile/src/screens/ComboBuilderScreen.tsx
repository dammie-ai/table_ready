import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native'
import { getComboMeals, getComboMealDetail, getMenuItems, type ComboMeal, type MenuItem } from '@table-ready/shared'
import { useCartStore } from '@table-ready/shared'

type Step = 'select-combo' | 'pick-main' | 'pick-sides' | 'review'

export default function ComboBuilderScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('select-combo')
  const [combos, setCombos] = useState<ComboMeal[]>([])
  const [selectedCombo, setSelectedCombo] = useState<ComboMeal | null>(null)
  const [mainItems, setMainItems] = useState<MenuItem[]>([])
  const [sideItems, setSideItems] = useState<MenuItem[]>([])
  const [selectedMain, setSelectedMain] = useState<MenuItem | null>(null)
  const [selectedSides, setSelectedSides] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  const addCombo = useCartStore((s) => s.addCombo)

  useEffect(() => {
    loadCombos()
  }, [])

  const loadCombos = async () => {
    try {
      const res = await getComboMeals()
      setCombos(res.combos)
    } catch (err) {
      console.error('Failed to load combos:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadComboDetail = async (combo: ComboMeal) => {
    setLoading(true)
    try {
      const detail = await getComboMealDetail(combo.combo_id)
      setSelectedCombo(detail.combo)

      const menuRes = await getMenuItems()
      setMainItems(menuRes.items.filter(i => i.category_type === detail.combo.required_main_category && i.is_active))
      setSideItems(menuRes.items.filter(i => i.category_type === detail.combo.sides_category && i.is_active))
      setStep('pick-main')
    } catch (err) {
      console.error('Failed to load combo detail:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSide = (item: MenuItem) => {
    setSelectedSides((prev) => {
      const exists = prev.find((s) => s.item_id === item.item_id)
      if (exists) return prev.filter((s) => s.item_id !== item.item_id)
      if (prev.length >= (selectedCombo?.max_sides || 2)) return prev
      return [...prev, item]
    })
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
      {step === 'select-combo' && (
        <FlatList
          data={combos}
          keyExtractor={(item) => item.combo_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.comboCard} onPress={() => loadComboDetail(item)}>
              <Text style={styles.comboName}>{item.name}</Text>
              <Text style={styles.comboDescription}>{item.description}</Text>
              <Text style={styles.comboPrice}>${item.base_price.toFixed(2)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No combo deals available.</Text>}
        />
      )}

      {step === 'pick-main' && selectedCombo && (
        <View>
          <Text style={styles.stepTitle}>Step 1: Pick Your Main</Text>
          <Text style={styles.stepSubtitle}>Choose one {selectedCombo.required_main_category}</Text>
          {mainItems.map((item) => (
            <TouchableOpacity key={item.item_id} style={styles.itemCard} onPress={() => { setSelectedMain(item); setStep('pick-sides') }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>${item.base_price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {step === 'pick-sides' && selectedCombo && (
        <View>
          <Text style={styles.stepTitle}>Step 2: Pick Your Sides</Text>
          <Text style={styles.stepSubtitle}>Choose up to {selectedCombo.max_sides} sides</Text>
          <Text style={styles.counter}>Selected: {selectedSides.length} / {selectedCombo.max_sides}</Text>
          {sideItems.map((item) => {
            const isSelected = selectedSides.some((s) => s.item_id === item.item_id)
            return (
              <TouchableOpacity
                key={item.item_id}
                style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                onPress={() => toggleSide(item)}
                disabled={!isSelected && selectedSides.length >= (selectedCombo.max_sides || 2)}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>${item.base_price.toFixed(2)}</Text>
              </TouchableOpacity>
            )
          })}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep('pick-main')}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.continueButton, selectedSides.length === 0 && styles.continueButtonDisabled]}
              disabled={selectedSides.length === 0}
              onPress={() => setStep('review')}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 'review' && selectedCombo && selectedMain && (
        <View>
          <Text style={styles.stepTitle}>Step 3: Review Your Combo</Text>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewComboName}>{selectedCombo.name}</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Main</Text>
              <Text style={styles.reviewValue}>{selectedMain.name}</Text>
            </View>
            {selectedSides.map((side) => (
              <View key={side.item_id} style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Side</Text>
                <Text style={styles.reviewValue}>{side.name}</Text>
              </View>
            ))}
            <View style={styles.reviewTotalRow}>
              <Text style={styles.reviewTotalLabel}>Combo Price</Text>
              <Text style={styles.reviewTotalValue}>${selectedCombo.base_price.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep('pick-sides')}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                if (!selectedCombo || !selectedMain) return
                addCombo({
                  combo_id: selectedCombo.combo_id,
                  name: selectedCombo.name,
                  base_price: selectedCombo.base_price,
                  combo_main: {
                    menu_item_id: selectedMain.item_id,
                    name: selectedMain.name,
                    base_price: selectedMain.base_price,
                  },
                  combo_sides: selectedSides.map((s) => ({
                    menu_item_id: s.item_id,
                    name: s.name,
                    base_price: s.base_price,
                  })),
                })
                Alert.alert('Success', 'Combo added to cart')
                navigation.navigate('Cart')
              }}
            >
              <Text style={styles.continueButtonText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    margin: 16,
    color: '#111827',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  counter: {
    fontSize: 14,
    color: '#2563eb',
    marginHorizontal: 16,
    marginBottom: 12,
    fontWeight: '600',
  },
  comboCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  comboName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  comboDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  comboPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 8,
  },
  itemCard: {
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
  itemCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  continueButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewComboName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reviewTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  reviewTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  reviewTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  empty: {
    textAlign: 'center',
    padding: 32,
    color: '#6b7280',
  },
})

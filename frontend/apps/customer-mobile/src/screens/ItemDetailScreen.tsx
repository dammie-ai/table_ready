import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert } from 'react-native'
import { getMenuItemDetail, useCartStore, type MenuItem, type MenuItemDetailResponse } from '@table-ready/shared'

export default function ItemDetailScreen({ route, navigation }: any) {
  const { item } = route.params || {}
  const [detail, setDetail] = useState<MenuItemDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    if (item?.item_id) {
      loadDetail()
    }
  }, [item])

  const loadDetail = async () => {
    try {
      const res = await getMenuItemDetail(item.item_id)
      setDetail(res)
    } catch (err) {
      console.error('Failed to load item detail:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomize = () => {
    if (detail?.modifiers && detail.modifiers.length > 0) {
      navigation.navigate('Modifier', { item: detail.item, modifiers: detail.modifiers })
    } else {
      Alert.alert('No customizations', 'This item has no available modifiers.')
    }
  }

  const outOfStock = !item?.is_active || item?.out_of_stock_flag || item?.stock_quantity <= 0

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      {item?.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
      )}
      <View style={styles.content}>
        <Text style={styles.name}>{item?.name}</Text>
        <Text style={styles.price}>${item?.base_price?.toFixed(2)}</Text>
        <Text style={styles.description}>{item?.description || 'No description available.'}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>Prep: {item?.prep_time_minutes} min</Text>
          <Text style={styles.meta}>Stock: {item?.stock_quantity}</Text>
        </View>

        {item?.is_trending && <Text style={styles.trending}>Trending</Text>}

        {detail?.ingredients && detail.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {detail.ingredients.map((ing: any, idx: number) => (
              <Text key={idx} style={styles.ingredient}>
                {ing.item_name} — {ing.quantity_required} units
              </Text>
            ))}
          </View>
        )}

        {detail?.item?.allergens && detail.item.allergens.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allergens</Text>
            {detail.item.allergens.map((allergen: string, idx: number) => (
              <Text key={idx} style={styles.allergen}>{allergen}</Text>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, outOfStock && styles.disabledButton]}
            disabled={outOfStock}
            onPress={() => {
              addItem({ menu_item_id: item.item_id, name: item.name, base_price: item.base_price })
              setAdded(true)
              setTimeout(() => setAdded(false), 1500)
            }}
          >
            <Text style={styles.primaryButtonText}>
              {outOfStock ? 'Out of Stock' : added ? 'Added ✓' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
          {detail?.modifiers && detail.modifiers.length > 0 && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCustomize}>
              <Text style={styles.secondaryButtonText}>Customize</Text>
            </TouchableOpacity>
          )}
        </View>
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
  },
  backButton: {
    padding: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  image: {
    width: '100%',
    height: 240,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  meta: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  trending: {
    backgroundColor: '#f97316',
    color: '#ffffff',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  ingredient: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  allergen: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: 4,
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
})

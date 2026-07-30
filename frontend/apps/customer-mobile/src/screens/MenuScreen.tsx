import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native'
import { getMenuItems, type MenuItem } from '@table-ready/shared'
import { useCartStore } from '@table-ready/shared'

export default function MenuScreen({ route, navigation }: any) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const mode = route.params?.mode
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    loadMenu()
  }, [])

  const loadMenu = async () => {
    try {
      const res = await getMenuItems()
      setItems(res.items)
    } catch (err) {
      console.error('Failed to load menu:', err)
      setError(err instanceof Error ? err.message : 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category_type)))]
  const filtered = selectedCategory === 'All' ? items : items.filter((i) => i.category_type === selectedCategory)
  const isOutOfStock = (item: MenuItem) => !item.is_active || item.out_of_stock_flag || item.stock_quantity <= 0

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading menu...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadMenu}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderItem = ({ item }: { item: MenuItem }) => {
    const outOfStock = isOutOfStock(item)
    return (
      <TouchableOpacity
        style={[styles.card, outOfStock && styles.cardDisabled]}
        onPress={() => !outOfStock && navigation.navigate('ItemDetail', { item })}
        disabled={outOfStock}
      >
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.name}</Text>
            {item.is_trending && <Text style={styles.trending}>Trending</Text>}
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.price}>${item.base_price.toFixed(2)}</Text>
            <TouchableOpacity
              style={[styles.addButton, outOfStock && styles.addButtonDisabled]}
              disabled={outOfStock}
              onPress={() => {
                if (!outOfStock) {
                  addItem({
                    menu_item_id: item.item_id,
                    name: item.name,
                    base_price: item.base_price,
                  })
                }
              }}
            >
              <Text style={styles.addButtonText}>{outOfStock ? 'Unavailable' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading menu...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.item_id.toString()}
        ListEmptyComponent={<Text style={styles.empty}>No items found in this category.</Text>}
        ListHeaderComponent={
          <View style={styles.categoryRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
              >
                <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
      />
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
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    flexWrap: 'wrap',
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  categoryPillActive: {
    backgroundColor: '#2563eb',
  },
  categoryText: {
    color: '#374151',
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: '#f3f4f6',
  },
  image: {
    width: '100%',
    height: 180,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  trending: {
    backgroundColor: '#f97316',
    color: '#ffffff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    padding: 32,
    color: '#6b7280',
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
})

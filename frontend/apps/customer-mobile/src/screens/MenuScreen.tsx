import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, Image } from 'react-native'
import { getMenuItems, type MenuItem } from '@table-ready/shared'
import { useCartStore } from '@table-ready/shared'
import Button from '../components/Button'
import { colors, spacing, borderRadius, typography } from '../../theme'

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
        <Button title="Retry" onPress={loadMenu} variant="secondary" />
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
            <Button
              title={outOfStock ? 'Unavailable' : 'Add'}
              onPress={() => {
                if (!outOfStock) {
                  addItem({
                    menu_item_id: item.item_id,
                    name: item.name,
                    base_price: item.base_price,
                  })
                }
              }}
              variant={outOfStock ? 'tertiary' : 'primary'}
              disabled={outOfStock}
              style={styles.addButton}
            />
          </View>
        </View>
      </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    flexWrap: 'wrap',
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    color: colors.text,
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
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
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  trending: {
    backgroundColor: colors.secondary,
    color: '#ffffff',
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  addButton: {
    minWidth: 80,
  },
  empty: {
    textAlign: 'center',
    padding: 32,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
})

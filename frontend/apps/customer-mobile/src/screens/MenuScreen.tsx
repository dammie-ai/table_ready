import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMenuItems, getComboMeals, getDishOfWeek, getSocket } from '@table-ready/shared';
import { useCartStore } from '@table-ready/shared';
import Button from '../components/Button';
import { spacing, borderRadius, typography, contrastText } from '../theme';
import { useThemeStore } from '../stores/themeStore';
import type { MenuItem } from '@table-ready/shared';

export default function MenuScreen({ route, navigation }: any) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showDowBanner, setShowDowBanner] = useState(true);
  const [dishOfWeek, setDishOfWeek] = useState<any>(null);
  const mode = route.params?.mode;
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    loadMenu();

    // Staff toggling an item's availability/stock broadcasts
    // 'menu_item_updated' globally (io.emit, not room-scoped, so this
    // isn't affected by the join/reconnect issue order tracking had) —
    // but nothing on this screen was listening for it, so a customer
    // already viewing the menu never saw an item go out of stock until
    // they backed out and reopened it. Patches just the changed fields
    // into the matching item in place.
    const socket = getSocket();
    const handleMenuItemUpdate = (data: { item_id: number; is_active?: boolean; out_of_stock_flag?: boolean }) => {
      setItems((prev) => prev.map((item) => (item.item_id === data.item_id ? { ...item, ...data } : item)));
    };
    socket.on('menu_item_updated', handleMenuItemUpdate);
    return () => {
      socket.off('menu_item_updated', handleMenuItemUpdate);
    };
  }, []);

  const loadMenu = async () => {
    try {
      const [menuRes, dowRes] = await Promise.all([
        getMenuItems(),
        getDishOfWeek().catch(() => ({ success: false })),
      ]);
      setItems(menuRes.items);
      if (dowRes.success) setDishOfWeek(dowRes.dish);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category_type)))];
  const filtered = selectedCategory === 'All' ? items : items.filter((i) => i.category_type === selectedCategory);
  const isOutOfStock = (item: MenuItem) => !item.is_active || item.out_of_stock_flag || item.stock_quantity <= 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading menu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={loadMenu} variant="secondary" />
      </View>
    );
  }

  const dowItem = dishOfWeek ? items.find((m) => m.item_id === dishOfWeek.menu_item_id) : null;
  const discountedPrice = dowItem ? dowItem.base_price * (1 - (dishOfWeek?.discount_percentage || 0) / 100) : 0;

  const renderItem = ({ item }: { item: MenuItem }) => {
    const outOfStock = isOutOfStock(item);
    const isDow = dowItem && item.item_id === dowItem.item_id;
    const displayPrice = isDow ? discountedPrice : item.base_price;

    return (
      <TouchableOpacity
        style={[styles.card, outOfStock && styles.cardDisabled]}
        onPress={() => !outOfStock && navigation.navigate('ItemDetail', { item })}
        disabled={outOfStock}
      >
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
        )}
        {outOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
        {item.is_trending && !outOfStock && (
          <View style={styles.trendingBadge}>
            <Text style={styles.trendingText}>🔥 Trending</Text>
          </View>
        )}
        {isDow && !outOfStock && (
          <View style={styles.dowBadge}>
            <Text style={styles.dowText}>🌟 {dishOfWeek.discount_percentage}% OFF</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.name}</Text>
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>
          <View style={styles.prepRow}>
            <Text style={styles.prepText}>⏱️ {item.prep_time_minutes} min prep</Text>
          </View>
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.price}>${displayPrice.toFixed(2)}</Text>
              {isDow && (
                <Text style={styles.originalPrice}>${item.base_price.toFixed(2)}</Text>
              )}
            </View>
            {outOfStock ? (
              <View style={styles.unavailableButton}>
                <Text style={styles.unavailableText}>Unavailable</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  addItem({
                    menu_item_id: item.item_id,
                    name: item.name,
                    base_price: displayPrice,
                  })
                }
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={[typography.h2, { color: colors.text }]}>Menu</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity onPress={() => navigation.navigate('Combos')} style={styles.comboButton}>
              <Text style={styles.comboButtonText}>🍽️ Combo Deals</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.comboButton}>
              <Text style={styles.comboButtonText}>🛒 Cart</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive,
              ]}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === cat && styles.categoryTextActive,
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.item_id.toString()}
        ListEmptyComponent={<Text style={styles.empty}>No items found in this category.</Text>}
        contentContainerStyle={styles.listContent}
      />

      {showDowBanner && dowItem && (
        <TouchableOpacity
          style={styles.dowBanner}
          onPress={() => setShowDowBanner(false)}
          activeOpacity={0.9}
        >
          <Image source={{ uri: dowItem.image_url }} style={styles.dowImage} resizeMode="cover" />
          <View style={styles.dowContent}>
            <Text style={styles.dowLabel}>🌟 Dish of the Week</Text>
            <Text style={styles.dowName}>{dowItem.name}</Text>
            <View style={styles.dowPriceRow}>
              <Text style={styles.dowDiscount}>{dishOfWeek.discount_percentage}% OFF</Text>
              <Text style={styles.dowPrice}>${discountedPrice.toFixed(2)}</Text>
              <Text style={styles.dowOriginal}>${dowItem.base_price.toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowDowBanner(false)}>
            <Text style={styles.dowClose}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  comboButton: {
    marginLeft: 'auto',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  comboButtonText: {
    color: contrastText(colors.secondary),
    fontSize: 13,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  categoryTextActive: {
    color: contrastText(colors.primary),
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#e5e7eb',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    backgroundColor: '#374151',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  trendingBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingText: {
    color: contrastText(colors.secondary),
    fontSize: 11,
    fontWeight: '700',
  },
  dowBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  dowText: {
    color: contrastText(colors.secondary),
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  prepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  prepText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: contrastText(colors.primary),
    fontSize: 13,
    fontWeight: '700',
  },
  unavailableButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  unavailableText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    padding: spacing.xxl,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  dowBanner: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  dowImage: {
    width: 96,
    height: 96,
    backgroundColor: '#fef3c7',
  },
  dowContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  dowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dowName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  dowPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dowDiscount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  dowPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
  },
  dowOriginal: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  dowClose: {
    fontSize: 16,
    color: colors.textSecondary,
    padding: spacing.md,
  },
});

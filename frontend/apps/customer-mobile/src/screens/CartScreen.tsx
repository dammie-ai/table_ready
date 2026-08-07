import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '@table-ready/shared';
import Button from '../components/Button';
import { spacing, borderRadius, typography } from '../theme';
import { useThemeStore } from '../stores/themeStore';

export default function CartScreen({ navigation, route }: any) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cart = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const addCombo = useCartStore((s) => s.addCombo);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const groupType = route.params?.groupType || 'solo';
  const newCombo = route.params?.newCombo;
  const addedComboRef = useRef(false);

  // Calling a store action directly in the component body (during render)
  // is invalid React — it was reliably crashing with "Cannot update a
  // component while rendering a different component" once this path
  // actually got exercised. The ref guard keeps it firing exactly once,
  // matching the original `cart.length === 0` intent without re-adding
  // if the cart is cleared later.
  useEffect(() => {
    if (newCombo && !addedComboRef.current) {
      addedComboRef.current = true;
      addCombo({
        type: 'combo',
        name: newCombo.name,
        base_price: newCombo.price,
        image: newCombo.main?.image,
        combo_id: newCombo.comboId,
        combo_main: { menu_item_id: newCombo.main?.id, name: newCombo.main?.name, base_price: newCombo.main?.price },
        combo_sides: newCombo.sides?.map((s: any) => ({ menu_item_id: s.id, name: s.name, base_price: s.price })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.base_price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  const isEmpty = cart.length === 0;

  const handleCheckout = () => {
    navigation.navigate('Checkout');
  };

  const renderItem = ({ item }: any) => {
    const isCombo = item.type === 'combo';
    return (
      <View style={[styles.itemCard, isCombo && styles.comboCard]}>
        {item.image && (
          <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
        )}
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{item.name}</Text>
          {isCombo && item.combo_main && (
            <Text style={styles.comboDetail}>Main: {item.combo_main.name}</Text>
          )}
          {isCombo && item.combo_sides && item.combo_sides.length > 0 && (
            <Text style={styles.comboDetail}>
              Sides: {item.combo_sides.map((s: any) => s.name).join(', ')}
            </Text>
          )}
          {item.modifiers && item.modifiers.length > 0 && (
            <Text style={styles.comboDetail}>
              {item.modifiers.map((m: any) => m.name).filter(Boolean).join(', ')}
            </Text>
          )}
          <Text style={styles.itemPrice}>${(item.base_price * item.quantity).toFixed(2)}</Text>
        </View>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => updateQuantity(item.cartId, item.quantity - 1)}
          >
            <Text style={styles.qtyButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyButton, styles.qtyButtonAdd]}
            onPress={() => updateQuantity(item.cartId, item.quantity + 1)}
          >
            <Text style={styles.qtyButtonTextAdd}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyEmoji}>🛒</Text>
        </View>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add items from the menu to get started</Text>
        <Button title="Browse Menu" onPress={() => navigation.navigate('Menu')} variant="secondary" style={styles.emptyButton} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={typography.h2}>Your Cart</Text>
      </View>

      <FlatList
        data={cart}
        renderItem={renderItem}
        keyExtractor={(item) => item.cartId}
        contentContainerStyle={styles.listContent}
      />

      {groupType === 'group' && (
        <TouchableOpacity
          style={styles.tableCartLink}
          onPress={() => navigation.navigate('TableCart')}
        >
          <View style={styles.tableCartIcon}>
            <Text style={styles.tableCartEmoji}>👥</Text>
          </View>
          <View style={styles.tableCartContent}>
            <Text style={styles.tableCartTitle}>View Table Cart</Text>
            <Text style={styles.tableCartSubtitle}>See what your group has ordered</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax (8%)</Text>
          <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>${total.toFixed(2)}</Text>
        </View>

        <View style={styles.summaryButtons}>
          <Button title="Clear" onPress={clearCart} variant="secondary" style={styles.clearButton} />
          <Button title="Proceed to Checkout" onPress={handleCheckout} variant="primary" style={styles.checkoutButton} />
        </View>
      </View>
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
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  listContent: {
    padding: spacing.lg,
    paddingBottom: 180,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  comboCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  comboDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: '#e5e7eb',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonAdd: {
    backgroundColor: colors.primary,
  },
  qtyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  qtyButtonTextAdd: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  tableCartLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderStyle: 'dashed',
  },
  tableCartIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCartEmoji: {
    fontSize: 20,
  },
  tableCartContent: {
    flex: 1,
  },
  tableCartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  tableCartSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  summaryTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  clearButton: {
    flex: 1,
  },
  checkoutButton: {
    flex: 2,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.caption,
    textAlign: 'center',
  },
  emptyButton: {
    width: 160,
  },
});

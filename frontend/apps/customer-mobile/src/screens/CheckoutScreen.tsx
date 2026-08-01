import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useCartStore } from '@table-ready/shared';
import Button from '../components/Button';
import { colors, spacing, borderRadius, typography } from '../theme';

const TIP_PRESETS = [0, 15, 18, 20];

export default function CheckoutScreen({ navigation }: any) {
  const [orderType, setOrderType] = useState('pickup');
  const [tableNumber, setTableNumber] = useState('');
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tipPercent, setTipPercent] = useState(18);
  const [customTip, setCustomTip] = useState('');
  const [splitBill, setSplitBill] = useState(false);
  const [splitMode, setSplitMode] = useState<'even' | 'itemized'>('even');
  const [splitCount, setSplitCount] = useState(2);

  const cart = useCartStore((s) => s.cart);
  const clearCart = useCartStore((s) => s.clearCart);

  const subtotal = cart.reduce((sum, item) => sum + item.base_price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const tipAmount = customTip !== '' ? parseFloat(customTip) || 0 : (subtotal * tipPercent) / 100;
  const grandTotal = subtotal + tax + tipAmount;
  const splitAmount = splitBill ? grandTotal / splitCount : grandTotal;

  const ORDER_TYPES = [
    { value: 'pickup', label: 'PICKUP', emoji: '📦' },
    { value: 'delivery', label: 'DELIVERY', emoji: '🚗' },
    { value: 'dine-in', label: 'IN_HOUSE', emoji: '🪑' },
    { value: 'order-from-home', label: 'FROM_HOME', emoji: '🏠' },
  ];

  const handlePay = () => {
    clearCart();
    navigation.replace('OrderTracking', { id: '1' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={typography.h2}>Checkout</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Order Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.orderTypeRow}>
              {ORDER_TYPES.map((ot) => (
                <TouchableOpacity
                  key={ot.value}
                  onPress={() => setOrderType(ot.value)}
                  style={[
                    styles.orderTypeButton,
                    orderType === ot.value && styles.orderTypeButtonActive,
                  ]}
                >
                  <Text style={styles.orderTypeEmoji}>{ot.emoji}</Text>
                  <Text style={[
                    styles.orderTypeText,
                    orderType === ot.value && styles.orderTypeTextActive,
                  ]}>
                    {ot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {orderType === 'order-from-home' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Order From Home</Text>
            <Text style={styles.infoText}>
              Your order will be held until you arrive and release it to the kitchen.
            </Text>
          </View>
        )}

        {orderType === 'dine-in' && (
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Table Number</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 12"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={tableNumber}
                onChangeText={setTableNumber}
              />
            </View>
          </View>
        )}

        {orderType === 'delivery' && (
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Delivery Address</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your full delivery address"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Special Instructions</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Allergies, preferences, or notes for the kitchen..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
              value={instructions}
              onChangeText={setInstructions}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tipHeader}>
            <Text style={styles.sectionLabel}>Add a Tip</Text>
          </View>
          <View style={styles.tipPresets}>
            {TIP_PRESETS.map((pct) => (
              <TouchableOpacity
                key={pct}
                onPress={() => { setTipPercent(pct); setCustomTip(''); }}
                style={[
                  styles.tipButton,
                  tipPercent === pct && customTip === '' && styles.tipButtonActive,
                ]}
              >
                <Text style={[
                  styles.tipButtonText,
                  tipPercent === pct && customTip === '' && styles.tipButtonTextActive,
                ]}>
                  {pct === 0 ? 'None' : `${pct}%`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customTipRow}>
            <Text style={styles.customTipLabel}>Custom</Text>
            <View style={styles.customTipInput}>
              <Text style={styles.customTipDollar}>$</Text>
              <TextInput
                style={styles.customTipField}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={customTip}
                onChangeText={(text) => { setCustomTip(text); setTipPercent(-1); }}
              />
            </View>
            {tipAmount > 0 && (
              <Text style={styles.customTipTotal}>${tipAmount.toFixed(2)}</Text>
            )}
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Order Summary</Text>
          {cart.map((item) => (
            <View key={item.cartId} style={styles.summaryItem}>
              <Text style={styles.summaryItemText} numberOfLines={1}>
                {item.quantity}× {item.name}
              </Text>
              <Text style={styles.summaryItemPrice}>
                ${(item.base_price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (8%)</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>
          {tipAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Tip {customTip === '' && tipPercent > 0 ? `(${tipPercent}%)` : ''}
              </Text>
              <Text style={[styles.summaryValue, styles.tipValue]}>${tipAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>${grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        {groupType === 'group' && (
          <View style={styles.splitCard}>
            <View style={styles.splitHeader}>
              <Text style={styles.sectionLabel}>Split Bill</Text>
              <TouchableOpacity
                onPress={() => setSplitBill((v) => !v)}
                style={[styles.toggle, splitBill && styles.toggleActive]}
              >
                <View style={[styles.toggleDot, splitBill && styles.toggleDotActive]} />
              </TouchableOpacity>
            </View>

            {splitBill && (
              <View style={styles.splitOptions}>
                <View style={styles.splitModeRow}>
                  {(['even', 'itemized'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setSplitMode(m)}
                      style={[
                        styles.splitModeButton,
                        splitMode === m && styles.splitModeButtonActive,
                      ]}
                    >
                      <Text style={[
                        styles.splitModeText,
                        splitMode === m && styles.splitModeTextActive,
                      ]}>
                        {m === 'even' ? 'Split Evenly' : 'Itemized'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {splitMode === 'even' && (
                  <View style={styles.splitEvenRow}>
                    <View style={styles.splitCounter}>
                      <TouchableOpacity
                        onPress={() => setSplitCount((c) => Math.max(2, c - 1))}
                        style={styles.splitCounterButton}
                      >
                        <Text style={styles.splitCounterText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.splitCountText}>{splitCount} people</Text>
                      <TouchableOpacity
                        onPress={() => setSplitCount((c) => Math.min(10, c + 1))}
                        style={[styles.splitCounterButton, styles.splitCounterButtonAdd]}
                      >
                        <Text style={styles.splitCounterTextAdd}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.splitAmountBox}>
                      <Text style={styles.splitAmountLabel}>Each pays</Text>
                      <Text style={styles.splitAmountValue}>${splitAmount.toFixed(2)}</Text>
                    </View>
                  </View>
                )}

                {splitMode === 'itemized' && (
                  <View style={styles.splitInfoBox}>
                    <Text style={styles.splitInfoText}>
                      Itemized split lets each person pay for their own items. Each payer gets a unique payment link.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.paymentCard}>
          <Text style={styles.sectionLabel}>Payment Method</Text>
          <View style={styles.paymentRow}>
            <View style={styles.cardBrand}>
              <Text style={styles.cardBrandText}>VISA</Text>
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.cardNumber}>Visa ending in 4242</Text>
              <Text style={styles.cardExpiry}>Exp 09/27</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.secureRow}>
            <Text style={styles.secureIcon}>🔒</Text>
            <Text style={styles.secureText}>Secured by Stripe. An idempotency key prevents duplicate charges.</Text>
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <View style={styles.payButtonContainer}>
        <TouchableOpacity style={styles.payButton} onPress={handlePay}>
          <Text style={styles.payButtonText}>
            Pay Now — {splitBill ? `$${splitAmount.toFixed(2)} each` : `$${grandTotal.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  orderTypeButton: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: '#f3f4f6',
    minWidth: 76,
  },
  orderTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  orderTypeEmoji: {
    fontSize: 20,
  },
  orderTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  orderTypeTextActive: {
    color: '#ffffff',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  input: {
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipPresets: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tipButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  tipButtonActive: {
    backgroundColor: colors.primary,
  },
  tipButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  tipButtonTextActive: {
    color: '#ffffff',
  },
  customTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  customTipLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customTipInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#f9fafb',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customTipDollar: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customTipField: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  customTipTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItemText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.md,
  },
  summaryItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  tipValue: {
    color: colors.success,
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  splitCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  toggleDotActive: {
    marginLeft: 20,
  },
  splitOptions: {
    gap: spacing.md,
  },
  splitModeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  splitModeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  splitModeButtonActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  splitModeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },
  splitModeTextActive: {
    color: colors.primary,
  },
  splitEvenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  splitCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  splitCounterButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitCounterButtonAdd: {
    backgroundColor: colors.primary,
  },
  splitCounterText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  splitCounterTextAdd: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  splitCountText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  splitAmountBox: {
    alignItems: 'flex-end',
  },
  splitAmountLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  splitAmountValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  splitInfoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  splitInfoText: {
    fontSize: 12,
    color: colors.primary,
    lineHeight: 18,
  },
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardBrand: {
    width: 40,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBrandText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  cardDetails: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  cardExpiry: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  changeText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  secureIcon: {
    fontSize: 14,
  },
  secureText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  payButtonContainer: {
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
  payButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

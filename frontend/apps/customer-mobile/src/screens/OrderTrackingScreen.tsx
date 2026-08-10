import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { spacing, borderRadius, typography } from '../theme';
import { useThemeStore } from '../stores/themeStore';
import { getOrder, releaseOrderHold, cancelOrder, createServiceRequest, getSocket, type Order } from '@table-ready/shared';

const STEPS = [
  { id: 'RECEIVED', label: 'Order Received', sublabel: 'We got your order!' },
  { id: 'IN_PREPARATION', label: 'In Preparation', sublabel: 'Gathering ingredients' },
  { id: 'COOKING', label: 'Cooking', sublabel: 'Your food is being prepared' },
  { id: 'READY', label: 'Ready', sublabel: 'Order is ready' },
  { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup', sublabel: 'Come collect your order' },
  { id: 'PICKED_UP', label: 'Picked Up', sublabel: 'On its way!' },
  { id: 'SERVED', label: 'Served', sublabel: 'Enjoy your meal!' },
  { id: 'COMPLETED', label: 'Completed', sublabel: 'Order complete 🎉' },
];

const SERVICE_TYPES = [
  { emoji: '💧', label: 'Water', type: 'refill' },
  { emoji: '🧻', label: 'Napkins', type: 'other' },
  { emoji: '🧾', label: 'Bill', type: 'bill_request' },
  { emoji: '🆘', label: 'Help', type: 'call_server' },
];

export default function OrderTrackingScreen({ navigation, route }: any) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const orderId = route.params?.id;
  const accessToken = route.params?.accessToken;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [showServiceToast, setShowServiceToast] = useState('');
  const [toastError, setToastError] = useState('');
  const [deliveryTracking, setDeliveryTracking] = useState<{ distance_miles: number | null; eta_minutes: number | null } | null>(null);

  const orderType = route.params?.orderType || 'dine-in';
  const isPickup = orderType === 'pickup';
  const isDelivery = orderType === 'delivery' || order?.order_type === 'DELIVERY';

  const currentStep = order ? Math.max(STEPS.findIndex((s) => s.id === order.status), 0) : 0;
  const isOnHold = order?.status === 'ON_HOLD';
  const isCancelled = order?.status === 'CANCELLED' || order?.status === 'CANCELLED_AND_REFUNDED';
  const isAtPickupStep = STEPS[currentStep]?.id === 'READY_FOR_PICKUP';

  useEffect(() => {
    if (!orderId) {
      setLoadError('No order ID provided.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    getOrder(Number(orderId))
      .then((res) => {
        if (!cancelled) {
          setOrder(res.order);
          if ((res.order as any).delivery_tracking) setDeliveryTracking((res.order as any).delivery_tracking);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load order');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const socket = getSocket();
    socket.emit('join_order', orderId);

    const handleStatusUpdate = (data: { status: string; progressPercentage: number }) => {
      setOrder((prev) => (prev ? { ...prev, status: data.status, progress_percentage: data.progressPercentage } : prev));
    };
    socket.on('order_status_updated', handleStatusUpdate);

    const handleDeliveryLocation = (data: { distance_miles: number | null; eta_minutes: number | null }) => {
      setDeliveryTracking({ distance_miles: data.distance_miles, eta_minutes: data.eta_minutes });
    };
    socket.on('delivery_location_updated', handleDeliveryLocation);

    return () => {
      cancelled = true;
      socket.off('order_status_updated', handleStatusUpdate);
      socket.off('delivery_location_updated', handleDeliveryLocation);
    };
  }, [orderId]);

  const handleRelease = useCallback(async () => {
    if (!orderId) return;
    setReleasing(true);
    try {
      await releaseOrderHold(Number(orderId));
      setShowPopup(false);
      const res = await getOrder(Number(orderId));
      setOrder(res.order);
    } catch (err) {
      setToastError(err instanceof Error ? err.message : 'Failed to release order');
      setTimeout(() => setToastError(''), 3000);
    } finally {
      setReleasing(false);
    }
  }, [orderId]);

  const handleCancel = useCallback(async () => {
    if (!orderId) return;
    setCancelling(true);
    try {
      const res = await cancelOrder(Number(orderId), accessToken);
      setOrder(res.order);
    } catch (err) {
      setToastError(err instanceof Error ? err.message : 'This order can no longer be cancelled');
      setTimeout(() => setToastError(''), 3000);
    } finally {
      setCancelling(false);
    }
  }, [orderId, accessToken]);

  const handleServiceRequest = useCallback(async (label: string, type: string) => {
    setSentRequests((prev) => new Set(prev).add(label));
    try {
      await createServiceRequest({
        table_number: order?.table_number ?? 0,
        request_type: type,
        notes: order ? `Order #${order.master_order_id}` : undefined,
      });
      setShowServiceToast(label);
      setTimeout(() => setShowServiceToast(''), 2000);
    } catch (err) {
      setSentRequests((prev) => {
        const next = new Set(prev);
        next.delete(label);
        return next;
      });
      setToastError(err instanceof Error ? err.message : 'Failed to send request');
      setTimeout(() => setToastError(''), 3000);
    }
  }, [order]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.message}>Loading your order...</Text>
      </View>
    );
  }

  if (loadError || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{loadError || 'Order not found.'}</Text>
        <Button title="Back to Menu" onPress={() => navigation.navigate('Menu')} variant="secondary" style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[typography.h2, { color: colors.text }]}>Order #{order.master_order_id}</Text>
          <Text style={styles.headerSub}>
            {isCancelled
              ? 'Cancelled'
              : isOnHold
                ? '⏸ On Hold — awaiting release'
                : STEPS[currentStep]?.sublabel}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: isCancelled ? '#fee2e2' : isOnHold ? '#fef3c7' : '#dcfce7' },
        ]}>
          <Text style={[
            styles.statusBadgeText,
            { color: isCancelled ? '#dc2626' : isOnHold ? '#92400e' : '#166534' },
          ]}>
            {isCancelled ? 'Cancelled' : isOnHold ? 'On Hold' : 'Active'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledIcon}>✕</Text>
            <View style={styles.cancelledContent}>
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
              <Text style={styles.cancelledText}>
                {order.payment_status === 'Refunded'
                  ? 'A refund has been processed.'
                  : order.payment_status === 'Paid'
                    ? 'A refund will be processed within 3–5 business days.'
                    : 'No payment was collected for this order.'}
              </Text>
            </View>
          </View>
        )}

        {isOnHold && !isCancelled && (
          <View style={styles.holdBanner}>
            <Text style={styles.holdIcon}>⚠️</Text>
            <View style={styles.holdContent}>
              <Text style={styles.holdTitle}>Order On Hold</Text>
              <Text style={styles.holdText}>
                Your order is queued and will be sent to the kitchen when you arrive and release it.
              </Text>
            </View>
          </View>
        )}

        {isPickup && isAtPickupStep && !isCancelled && order.pickup_code && (
          <View style={styles.pickupCodeBox}>
            <Text style={styles.pickupLabel}>Your Pickup Code</Text>
            <Text style={styles.pickupCode}>{order.pickup_code}</Text>
            <Text style={styles.pickupHint}>Show this at the counter</Text>
          </View>
        )}

        {isDelivery && !isCancelled && deliveryTracking && deliveryTracking.distance_miles != null && (
          <View style={styles.deliveryTrackingCard}>
            <Text style={styles.sectionLabel}>🚗 Your Order Is On The Way</Text>
            <View style={styles.deliveryStatsRow}>
              <View>
                <Text style={styles.deliveryStatValue}>{deliveryTracking.distance_miles} mi</Text>
                <Text style={styles.deliveryStatLabel}>away</Text>
              </View>
              <View>
                <Text style={styles.deliveryStatValue}>~{deliveryTracking.eta_minutes} min</Text>
                <Text style={styles.deliveryStatLabel}>estimated arrival</Text>
              </View>
            </View>
            <View style={styles.deliveryProgressTrack}>
              <View
                style={[
                  styles.deliveryProgressFill,
                  { width: `${Math.max(4, Math.min(100, 100 - (deliveryTracking.distance_miles / 10) * 100))}%` },
                ]}
              />
            </View>
          </View>
        )}

        {!isCancelled && (
          <View style={styles.progressCard}>
            <Text style={styles.sectionLabel}>Order Progress</Text>
            <View style={styles.progressList}>
              {STEPS.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                return (
                  <View key={step.id} style={styles.progressItem}>
                    <View style={styles.progressIndicator}>
                      <View style={[
                        styles.progressDot,
                        { backgroundColor: isDone || isActive ? colors.primary : '#e5e7eb' },
                      ]}>
                        {isDone ? (
                          <Text style={styles.progressCheck}>✓</Text>
                        ) : (
                          <Text style={[
                            styles.progressNumber,
                            { color: isDone || isActive ? '#ffffff' : '#9ca3af' },
                          ]}>
                            {idx + 1}
                          </Text>
                        )}
                      </View>
                      {idx < STEPS.length - 1 && (
                        <View style={[
                          styles.progressLine,
                          { backgroundColor: isDone ? colors.primary : '#e5e7eb' },
                        ]} />
                      )}
                    </View>
                    <View style={styles.progressTextContainer}>
                      <Text style={[
                        styles.progressLabel,
                        { color: isDone ? colors.success : isActive ? colors.primary : '#9ca3af' },
                      ]}>
                        {step.label}
                      </Text>
                      {(isDone || isActive) && (
                        <Text style={styles.progressSublabel}>{step.sublabel}</Text>
                      )}
                      {isActive && isOnHold && (
                        <View style={styles.pausedBadge}>
                          <Text style={styles.pausedText}>⏸ Paused</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {!isCancelled && ['RECEIVED', 'ON_HOLD'].includes(order.status) && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && { opacity: 0.5 }]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            <Text style={styles.cancelButtonText}>{cancelling ? 'Cancelling...' : 'Cancel Order'}</Text>
          </TouchableOpacity>
        )}

        {orderType === 'dine-in' && !isCancelled && (
          <View style={styles.serviceCard}>
            <Text style={styles.sectionLabel}>Request Service</Text>
            <View style={styles.serviceGrid}>
              {SERVICE_TYPES.map((s) => {
                const sent = sentRequests.has(s.label);
                return (
                  <TouchableOpacity
                    key={s.label}
                    onPress={() => !sent && handleServiceRequest(s.label, s.type)}
                    style={[
                      styles.serviceButton,
                      sent && styles.serviceButtonSent,
                    ]}
                    disabled={sent}
                  >
                    <Text style={styles.serviceEmoji}>{s.emoji}</Text>
                    <Text style={[
                      styles.serviceLabel,
                      sent && styles.serviceLabelSent,
                    ]}>
                      {s.label}
                    </Text>
                    {sent && <Text style={styles.serviceSentBadge}>Sent ✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {isOnHold && !isCancelled && (
        <View style={styles.bottomAction}>
          <Button title="🚀 Release to Kitchen" onPress={() => setShowPopup(true)} variant="primary" style={styles.bottomButton} />
        </View>
      )}

      {showPopup && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Text style={styles.modalIcon}>📍</Text>
            </View>
            <Text style={styles.modalTitle}>You're here!</Text>
            <Text style={styles.modalText}>
              Confirm you're at the restaurant and we'll send your order straight to the kitchen.
            </Text>
            <View style={styles.modalButtons}>
              <Button title={releasing ? 'Releasing...' : 'Yes, Release Order'} onPress={handleRelease} variant="primary" style={styles.modalButton} />
              <Button title="Cancel" onPress={() => setShowPopup(false)} variant="secondary" style={styles.modalButton} />
            </View>
          </View>
        </View>
      )}

      {showServiceToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✅ {showServiceToast} request sent</Text>
        </View>
      )}

      {toastError && (
        <View style={[styles.toast, { backgroundColor: colors.error }]}>
          <Text style={styles.toastText}>{toastError}</Text>
        </View>
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
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
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
  headerContent: {
    flex: 1,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cancelledBanner: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#fef2f2',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelledIcon: {
    fontSize: 20,
    color: colors.error,
    marginTop: 2,
  },
  cancelledContent: {
    flex: 1,
  },
  cancelledTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b91c1c',
    marginBottom: spacing.xs,
  },
  cancelledText: {
    fontSize: 13,
    color: '#dc2626',
    lineHeight: 20,
  },
  holdBanner: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#fffbeb',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  holdIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  holdContent: {
    flex: 1,
  },
  holdTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: spacing.xs,
  },
  holdText: {
    fontSize: 13,
    color: '#b45309',
    lineHeight: 20,
  },
  pickupCodeBox: {
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pickupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  pickupCode: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 4,
  },
  pickupHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  deliveryTrackingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  deliveryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  deliveryStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'center',
  },
  deliveryStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  deliveryProgressTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  deliveryProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressList: {
    gap: 0,
  },
  progressItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  progressIndicator: {
    alignItems: 'center',
    width: 32,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCheck: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  progressNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginVertical: 4,
  },
  progressTextContainer: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressSublabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pausedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  pausedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  cancelButton: {
    backgroundColor: '#fef2f2',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  serviceButton: {
    width: '47%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceButtonSent: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    opacity: 0.7,
  },
  serviceEmoji: {
    fontSize: 24,
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  serviceLabelSent: {
    color: colors.success,
  },
  serviceSentBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  bottomAction: {
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
  bottomButton: {
    width: '100%',
  },
  modalOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    zIndex: 50,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: spacing.lg,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIcon: {
    fontSize: 32,
  },
  modalTitle: {
    ...typography.h3,
    textAlign: 'center',
  },
  modalText: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtons: {
    width: '100%',
    gap: spacing.md,
  },
  modalButton: {
    width: '100%',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: '#111827',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    zIndex: 40,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
});

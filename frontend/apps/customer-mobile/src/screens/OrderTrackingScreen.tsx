import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Button from '../components/Button';
import { colors, spacing, borderRadius, typography } from '../theme';

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
  { emoji: '💧', label: 'Water' },
  { emoji: '🧻', label: 'Napkins' },
  { emoji: '🧾', label: 'Bill' },
  { emoji: '🆘', label: 'Help' },
];

export default function OrderTrackingScreen({ navigation, route }: any) {
  const [currentStep, setCurrentStep] = useState(2);
  const [isOnHold, setIsOnHold] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [showServiceToast, setShowServiceToast] = useState('');

  const orderType = route.params?.orderType || 'dine-in';
  const isPickup = orderType === 'pickup';
  const isAtPickupStep = STEPS[currentStep]?.id === 'READY_FOR_PICKUP';
  const PICKUP_CODE = 'TR-882';

  const handleRelease = () => {
    setIsOnHold(false);
    setShowPopup(false);
    if (currentStep < STEPS.length - 1) {
      setTimeout(() => setCurrentStep((s) => s + 1), 500);
    }
  };

  const handleServiceRequest = (label: string) => {
    setSentRequests((prev) => new Set(prev).add(label));
    setShowServiceToast(label);
    setTimeout(() => setShowServiceToast(''), 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={typography.h2}>Order #1</Text>
          <Text style={styles.headerSub}>
            {isCancelled
              ? '❌ Cancelled by restaurant'
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
                This order was cancelled by the restaurant: "Item no longer available." A refund will be processed within 3–5 business days.
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

        {isPickup && isAtPickupStep && !isCancelled && (
          <View style={styles.pickupCodeBox}>
            <Text style={styles.pickupLabel}>Your Pickup Code</Text>
            <Text style={styles.pickupCode}>{PICKUP_CODE}</Text>
            <Text style={styles.pickupHint}>Show this at the counter</Text>
          </View>
        )}

        {!isCancelled && (
          <View style={styles.estimateCard}>
            <View style={styles.estimateIcon}>
              <Text style={styles.estimateEmoji}>⏱️</Text>
            </View>
            <View>
              <Text style={styles.estimateLabel}>Estimated time</Text>
              <Text style={styles.estimateValue}>
                {isOnHold ? '—' : currentStep >= STEPS.length - 2 ? 'Done!' : '18–22 min'}
              </Text>
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

        {!isOnHold && !isCancelled && currentStep < STEPS.length - 1 && (
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => setCurrentStep((s) => s + 1)}
          >
            <Text style={styles.demoButtonText}>Next Step →</Text>
          </TouchableOpacity>
        )}

        {!isCancelled && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setIsCancelled(true)}
          >
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
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
                    onPress={() => !sent && handleServiceRequest(s.label)}
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

        {!isCancelled && currentStep >= STEPS.length - 2 && (
          <TouchableOpacity style={styles.receiptButton}>
            <Text style={styles.receiptButtonText}>📄 View Receipt</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {isOnHold && !isCancelled && (
        <View style={styles.bottomAction}>
          <Button title="🚀 Release to Kitchen" onPress={() => setShowPopup(true)} variant="primary" style={styles.bottomButton} />
        </View>
      )}

      {isPickup && isAtPickupStep && !isCancelled && (
        <View style={styles.bottomAction}>
          <Button title="✅ I've Arrived" onPress={() => setCurrentStep((s) => s + 1)} variant="secondary" style={styles.bottomButton} />
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
              <Button title="Yes, Release Order" onPress={handleRelease} variant="primary" style={styles.modalButton} />
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
  estimateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  estimateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimateEmoji: {
    fontSize: 24,
  },
  estimateLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  estimateValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
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
  demoButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
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
  receiptButton: {
    backgroundColor: '#eff6ff',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  receiptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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

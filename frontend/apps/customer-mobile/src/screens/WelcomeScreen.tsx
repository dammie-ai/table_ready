import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function WelcomeScreen({ navigation }: any) {
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [surgeActive] = useState(false);
  const [isOpen] = useState(true);

  const handleOrder = (orderType: string) => {
    navigation.navigate('Menu', { mode: orderType });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!isOpen && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedText}>🔴 We're currently closed. Order ahead for later!</Text>
        </View>
      )}

      {surgeActive && (
        <View style={styles.surgeBanner}>
          <Text style={styles.surgeText}>⚡ Surge pricing active — prices may be higher than usual</Text>
        </View>
      )}

      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🍽️</Text>
        </View>
        <Text style={typography.h1}>TableReady</Text>
        <Text style={styles.subtitle}>Order from your table or on the go</Text>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === 1 && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="⭐ Reorder Your Usual"
          onPress={() => navigation.navigate('Cart')}
          variant="tertiary"
          style={styles.usualButton}
        />

        <Button title="🍽️ Combo Deals" onPress={() => navigation.navigate('Combos')} variant="primary" style={styles.button} />
        <Button title="🪑 Dine In" onPress={() => handleOrder('dine-in')} variant="secondary" style={styles.button} />
        <Button title="📦 Pickup" onPress={() => handleOrder('pickup')} variant="secondary" style={styles.button} />
        <Button title="🚗 Delivery" onPress={() => handleOrder('delivery')} variant="secondary" style={styles.button} />
        <Button title="🏠 Order From Home" onPress={() => handleOrder('order-from-home')} variant="secondary" style={styles.button} />
      </View>

      <View style={styles.secondaryRow}>
        <Button title="🔑 Join Table" onPress={() => setShowJoinCode(true)} variant="tertiary" style={styles.secondaryButton} />
        <Button title="📋 Waitlist" onPress={() => navigation.navigate('Waitlist')} variant="tertiary" style={styles.secondaryButton} />
        <Button title="📅 Reserve" onPress={() => navigation.navigate('Reservations')} variant="tertiary" style={styles.secondaryButton} />
      </View>

      <Button title="Sign In / My Account" onPress={() => navigation.navigate('Login')} variant="tertiary" style={styles.button} />

      <Modal visible={showJoinCode} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowJoinCode(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join a Table</Text>
              <TouchableOpacity onPress={() => setShowJoinCode(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>
              Enter the 4–6 digit session code shown at your table or shared by your group.
            </Text>
            <TextInput
              style={styles.codeInput}
              value={sessionCode}
              onChangeText={setSessionCode}
              placeholder="e.g. 4892"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={6}
            />
            <Button
              title="Join Session"
              onPress={() => { setShowJoinCode(false); navigation.navigate('TableCart'); }}
              disabled={sessionCode.length < 4}
              variant="primary"
              style={styles.button}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    alignItems: 'center',
    padding: spacing.xxl,
    paddingTop: 80,
    gap: spacing.lg,
  },
  closedBanner: {
    backgroundColor: '#dc2626',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    width: '100%',
    maxWidth: 320,
  },
  closedText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  surgeBanner: {
    backgroundColor: '#f59e0b',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    width: '100%',
    maxWidth: 320,
  },
  surgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoIcon: {
    fontSize: 40,
  },
  subtitle: {
    ...typography.body,
    color: '#dbeafe',
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.secondary,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: spacing.md,
  },
  usualButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  button: {
    width: '100%',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 320,
  },
  secondaryButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
  },
  modalClose: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing.lg,
    letterSpacing: 3,
  },
});

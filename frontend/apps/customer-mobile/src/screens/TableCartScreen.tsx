import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useCartStore } from '@table-ready/shared';
import Button from '../components/Button';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function TableCartScreen({ navigation }: any) {
  const [roomCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const cart = useCartStore((s) => s.items);

  const handleJoin = () => {
    if (joinCode.length < 4) return;
    navigation.navigate('Cart', { groupType: 'group' });
  };

  const handleCreate = () => {
    navigation.navigate('Cart', { groupType: 'group' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={typography.h2}>Table Cart</Text>
      </View>

      <View style={styles.content}>
        {mode === 'create' ? (
          <View style={styles.card}>
            <View style={styles.codeSection}>
              <Text style={styles.codeLabel}>Your Room Code</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{roomCode}</Text>
              </View>
              <Text style={styles.codeHint}>Share this code with your table</Text>
            </View>
            <Button title="Start Group Cart →" onPress={handleCreate} variant="primary" style={styles.button} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.joinLabel}>Enter the room code</Text>
            <TextInput
              style={styles.codeInput}
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="e.g. 428931"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={6}
            />
            <Button
              title="Join Group"
              onPress={handleJoin}
              disabled={joinCode.length < 4}
              variant="primary"
              style={styles.button}
            />
          </View>
        )}

        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => setMode('create')}
            style={[
              styles.toggleButton,
              mode === 'create' && styles.toggleButtonActive,
            ]}
          >
            <Text style={[
              styles.toggleText,
              mode === 'create' && styles.toggleTextActive,
            ]}>
              + Create Group
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('join')}
            style={[
              styles.toggleButton,
              mode === 'join' && styles.toggleButtonActive,
            ]}
          >
            <Text style={[
              styles.toggleText,
              mode === 'join' && styles.toggleTextActive,
            ]}>
              🔑 Join Group
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>ℹ️</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Group orders</Text>
            <Text style={styles.infoText}>
              Everyone at your table can add items to a shared cart and pay individually or together.
            </Text>
          </View>
        </View>

        <View style={styles.cartPreview}>
          <Text style={styles.cartPreviewTitle}>Current Cart ({cart.length} items)</Text>
          {cart.length === 0 ? (
            <Text style={styles.cartPreviewEmpty}>No items yet. Start by adding items from the menu.</Text>
          ) : (
            <FlatList
              data={cart}
              keyExtractor={(item) => item.cartId}
              renderItem={({ item }) => (
                <View style={styles.cartItem}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemQty}>x{item.quantity}</Text>
                </View>
              )}
            />
          )}
        </View>
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
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  codeSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeBox: {
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  codeHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  button: {
    width: '100%',
  },
  joinLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
    letterSpacing: 3,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.primary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    fontSize: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cartPreview: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cartPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cartPreviewEmpty: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cartItemQty: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});

import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '@table-ready/shared';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import BackButton from '../components/BackButton';
import { spacing, typography, borderRadius } from '../theme';
import { useThemeStore } from '../stores/themeStore';

type SubMode = 'create' | 'join';

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function GroupChoiceScreen({ navigation }: any) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [groupSubMode, setGroupSubMode] = useState<SubMode | null>(null);
  const [roomCode] = useState(generateRoomCode);
  const [joinCode, setJoinCode] = useState('');
  const leaveGroupRoom = useCartStore((s) => s.leaveGroupRoom);

  const handleSolo = () => {
    leaveGroupRoom();
    navigation.navigate('Welcome');
  };

  // A group order is a shared table cart -- it needs an actual verified
  // table_number the same way solo dine-in does, or checkout falls back to
  // either no table at all (mislabeled as Pickup) or a stale table_number
  // left in storage from a previous, unrelated visit. Routing through
  // TablePin's QR scan first (same screen solo dine-in uses) establishes
  // that correctly; TablePinScreen sets the group room and redirects to
  // TableCart once verification succeeds instead of going to Menu.
  const handleCreateGroup = () => {
    navigation.navigate('TablePin', { thenGroupRoom: roomCode });
  };

  const handleJoinGroup = () => {
    if (joinCode.length < 4) return;
    navigation.navigate('TablePin', { thenGroupRoom: joinCode });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BackButton navigation={navigation} />
      <View style={styles.header}>
        <Text style={[typography.h2, { color: colors.text }]}>How are you ordering?</Text>
        <Text style={styles.subtitle}>Choose your dining style to get started</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity onPress={handleSolo} activeOpacity={0.9}>
          <Card
            title="Just Me"
            subtitle="Ordering alone, paying alone"
            icon="👤"
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setGroupSubMode('create')} activeOpacity={0.9}>
          <Card
            title="Group Order"
            subtitle="Dining together, split the bill"
            icon="👥"
            selected={groupSubMode === 'create'}
          />
        </TouchableOpacity>
      </View>

      {groupSubMode && (
        <View style={styles.groupOptions}>
          <View style={styles.toggleRow}>
            {(['create', 'join'] as SubMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setGroupSubMode(m)}
                style={[
                  styles.toggleButton,
                  groupSubMode === m && styles.toggleButtonActive,
                ]}
              >
                <Text style={[
                  styles.toggleText,
                  groupSubMode === m && styles.toggleTextActive,
                ]}>
                  {m === 'create' ? '+ Create Group' : '🔑 Join Group'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {groupSubMode === 'create' && (
            <View style={styles.card}>
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Your Room Code</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{roomCode}</Text>
                </View>
                <Text style={styles.codeHint}>Share this code with your table</Text>
              </View>
              <Button title="Start Group Cart →" onPress={handleCreateGroup} variant="primary" style={styles.button} />
            </View>
          )}

          {groupSubMode === 'join' && (
            <View style={styles.card}>
              <Input
                label="Enter the room code"
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder="e.g. 428931"
                keyboardType="numeric"
              />
              <Button
                title="Join Group"
                onPress={handleJoinGroup}
                variant="primary"
                disabled={joinCode.length < 4}
                style={styles.button}
              />
            </View>
          )}
        </View>
      )}

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
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeStore.getState>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  cards: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  groupOptions: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.border,
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
    color: colors.accent,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  codeContainer: {
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: 'auto',
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
});

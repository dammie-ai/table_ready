import { View, Text, StyleSheet } from 'react-native';
import { borderRadius, spacing } from '../theme';
import { useThemeStore } from '../stores/themeStore';

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
};

export default function Card({ title, subtitle, icon, onPress, selected, disabled }: Props) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        selected && { borderColor: colors.primary, backgroundColor: '#eff6ff' },
        disabled && styles.cardDisabled,
      ]}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <View style={styles.content}>
        <Text style={[styles.title, { color: selected ? colors.primary : colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    width: '100%',
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: '#f3f4f6',
  },
  icon: {
    fontSize: 32,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
});

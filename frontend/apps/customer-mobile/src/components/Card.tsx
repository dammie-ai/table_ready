import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
};

export default function Card({ title, subtitle, icon, onPress, selected, disabled }: Props) {
  return (
    <View style={[styles.card, selected && styles.cardSelected, disabled && styles.cardDisabled]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <View style={styles.content}>
        <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    width: '100%',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
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
    color: colors.text,
  },
  titleSelected: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

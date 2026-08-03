import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing } from '../theme';

type Props = {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
};

export default function Badge({ label, variant = 'primary' }: Props) {
  const backgroundColor =
    variant === 'secondary'
      ? colors.secondary
      : variant === 'success'
        ? colors.success
        : variant === 'error'
          ? colors.error
          : variant === 'warning'
            ? '#f97316'
            : colors.primary;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

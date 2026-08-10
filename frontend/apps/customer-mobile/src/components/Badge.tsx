import { View, Text, StyleSheet } from 'react-native';
import { borderRadius, spacing, contrastText } from '../theme';
import { useThemeStore } from '../stores/themeStore';

type Props = {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
};

export default function Badge({ label, variant = 'primary' }: Props) {
  const colors = useThemeStore((s) => s.colors);
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
      <Text style={[styles.text, { color: contrastText(backgroundColor) }]}>{label}</Text>
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
    fontSize: 12,
    fontWeight: '600',
  },
});

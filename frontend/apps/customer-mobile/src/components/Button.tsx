import { Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { borderRadius } from '../theme';
import { useThemeStore } from '../stores/themeStore';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
  loading?: boolean;
  style?: object;
};

export default function Button({ title, onPress, variant = 'primary', disabled, loading, style }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  const variantStyle = disabled
    ? { backgroundColor: colors.disabled, borderColor: colors.disabled }
    : isPrimary
    ? { backgroundColor: colors.primary }
    : isSecondary
    ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }
    // Used to be a hardcoded white tint (rgba(255,255,255,0.15) on white
    // text) — only ever legible against a strongly saturated colored
    // backdrop, and always wrong in dark mode or against a lighter
    // primary color. colors.surface/border/text already adapt correctly
    // to both.
    : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border };

  const textColor = isPrimary ? '#ffffff' : isSecondary ? colors.primary : colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, variantStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#ffffff' : colors.primary} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

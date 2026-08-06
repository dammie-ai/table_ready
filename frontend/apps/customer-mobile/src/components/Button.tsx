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
    : { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' };

  const textColor = isSecondary ? colors.primary : '#ffffff';

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

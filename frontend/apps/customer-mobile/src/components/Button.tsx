import { Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { borderRadius, contrastText } from '../theme';
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
    // A translucent white ring keeps this visible even when it sits on a
    // colors.primary-colored backdrop (e.g. WelcomeScreen's hero) — same
    // fill on same fill would otherwise render as no button at all,
    // regardless of which brand color is configured.
    ? { backgroundColor: colors.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }
    : isSecondary
    ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }
    // Used to be a hardcoded white tint (rgba(255,255,255,0.15) on white
    // text) — only ever legible against a strongly saturated colored
    // backdrop, and always wrong in dark mode or against a lighter
    // primary color. colors.surface/border/text already adapt correctly
    // to both.
    : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border };

  // Secondary/tertiary text used to read colors.primary — tying button
  // legibility to whatever brand color is configured, which breaks the
  // moment an admin picks a primary color too close in luminance to
  // colors.surface (their border stays colors.primary as an accent, but
  // the text needs the same guaranteed-readable-on-surface color as
  // everything else, independently configurable via dark mode's Text field).
  // Primary's own text used to be hardcoded white — wrong the moment
  // Primary Color itself is light — so it's computed from Primary's
  // luminance instead, same as the button fill it sits on.
  const textColor = isPrimary ? contrastText(colors.primary) : colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, variantStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? contrastText(colors.primary) : colors.primary} />
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

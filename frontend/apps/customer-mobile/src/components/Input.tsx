import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { borderRadius, spacing } from '../theme';
import { useThemeStore } from '../stores/themeStore';

type Props = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  numberOfLines?: number;
  error?: string;
  rightAction?: { label: string; onPress: () => void };
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  multiline,
  numberOfLines = 1,
  error,
  rightAction,
  autoCapitalize,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          { borderColor: colors.border, backgroundColor: colors.surface },
          error && { borderColor: colors.error },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }, multiline && styles.multiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry && !revealed}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setRevealed((r) => !r)}
            style={styles.rightAction}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Text style={[styles.rightActionText, { color: colors.accent }]}>
              {revealed ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        ) : rightAction ? (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.rightAction}>
            <Text style={[styles.rightActionText, { color: colors.accent }]}>{rightAction.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  multiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  rightAction: {
    marginLeft: spacing.sm,
  },
  rightActionText: {
    fontWeight: '600',
    fontSize: 14,
  },
  error: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
});

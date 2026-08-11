import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme';
import { useThemeStore } from '../stores/themeStore';

// Self-hides via canGoBack() rather than assuming every screen has a
// prior screen to return to (e.g. LocationCheck, the actual stack root).
export default function BackButton({ navigation, style }: { navigation: any; style?: object }) {
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  if (!navigation?.canGoBack?.()) return null;

  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={[styles.button, { top: insets.top + spacing.lg, backgroundColor: colors.border }, style]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.icon, { color: colors.text }]}>←</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
  },
});

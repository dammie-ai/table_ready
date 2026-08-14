import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { navigationRef } from '../navigation/navigationRef';
import { spacing } from '../theme';

// Sits as a sibling to the Stack.Navigator (see AppNavigator.tsx), not
// inside any one screen, so it floats on top of literally everything and
// reaches Settings — where dark/light mode already lives — no matter
// where in the flow someone is. Screens build their own custom headers
// (the navigator turns the default header off everywhere), so this was
// the one place to add it once instead of touching every single screen.
export default function FloatingSettingsButton() {
  const insets = useSafeAreaInsets();

  const openSettings = () => {
    navigationRef.current?.dispatch(CommonActions.navigate({ name: 'Settings' }));
  };

  return (
    <TouchableOpacity
      onPress={openSettings}
      style={[styles.button, { top: insets.top + spacing.lg }]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Settings"
    >
      <Text style={styles.icon}>⚙️</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
});

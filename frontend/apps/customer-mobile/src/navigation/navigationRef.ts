import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

// Lets a component that isn't itself a screen (FloatingSettingsButton sits
// as a sibling to the whole Stack.Navigator, not inside it) still trigger
// navigation, since it has no `navigation` prop of its own to call.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
